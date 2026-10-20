import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { lstat, readdir, readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const GIT_MAX_BUFFER = 64 * 1024 * 1024;

export type P3SourceFile = Readonly<{
  path: string;
  sha256: string;
}>;

export type P3SourceGuardManifest = Readonly<{
  frozenCommit: string;
  files: readonly P3SourceFile[];
  fileListSHA256: string;
  contentManifestSHA256: string;
  manifestSHA256: string;
  gitStatusClean: boolean;
  gitStatus: string;
}>;

export function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

export function sourceFileListSHA256(files: readonly P3SourceFile[]) {
  return sha256(files.map((file) => file.path).join("\n"));
}

export function sourceContentManifestSHA256(files: readonly P3SourceFile[]) {
  return sha256(files.map((file) => `${file.path}\0${file.sha256}`).join("\n"));
}

async function git(cwd: string, args: readonly string[]) {
  const result = await execFileAsync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: GIT_MAX_BUFFER,
  });
  return result.stdout;
}

async function gitBytes(cwd: string, args: readonly string[]) {
  const result = await execFileAsync("git", args, {
    cwd,
    encoding: "buffer",
    maxBuffer: GIT_MAX_BUFFER,
  });
  return Buffer.from(result.stdout);
}

async function findGitRoot(cwd: string) {
  let current = resolve(cwd);
  while (true) {
    try {
      const stat = await lstat(resolve(current, ".git"));
      if (stat.isDirectory() || stat.isFile()) return current;
    } catch {
      // Keep walking to the containing worktree.
    }
    const parent = dirname(current);
    if (parent === current)
      throw new Error(`no Git worktree found above ${resolve(cwd)}`);
    current = parent;
  }
}

async function frozenFiles(cwd: string, commit: string) {
  const repoPrefix = (
    await git(cwd, ["rev-parse", "--show-prefix"]).catch(() => "")
  ).trim();
  const localPath = (path: string) =>
    path.startsWith(repoPrefix) ? path.slice(repoPrefix.length) : path;
  const output = await git(cwd, [
    "ls-tree",
    "-r",
    "--name-only",
    commit,
    "--",
    "src",
  ]);
  const paths = output.trim().split("\n").filter(Boolean).map(localPath).sort();
  return Promise.all(
    paths.map(async (path) => ({
      path,
      sha256: sha256(await gitBytes(cwd, ["show", `${commit}:./${path}`])),
    })),
  );
}

async function diskFiles(cwd: string) {
  const src = resolve(cwd, "src");
  const paths: string[] = [];
  const walk = async (directory: string) => {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = resolve(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile())
        paths.push(`src/${relative(src, absolute).replaceAll("\\", "/")}`);
    }
  };
  await walk(src);
  paths.sort();
  return Promise.all(
    paths.map(async (path) => ({
      path,
      sha256: sha256(await readFile(resolve(cwd, path))),
    })),
  );
}

export async function captureSourceGuard(
  cwd: string,
  frozenCommit: string,
): Promise<P3SourceGuardManifest> {
  const gitRoot = await findGitRoot(cwd);
  const [actual, status, localStatus] = await Promise.all([
    diskFiles(cwd),
    git(gitRoot, [
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
      "--",
      "src",
    ]),
    git(cwd, [
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
      "--",
      "src",
    ]).catch(() => ""),
  ]);
  const expected = await frozenFiles(cwd, frozenCommit);
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    const expectedPaths = new Set(expected.map((file) => file.path));
    const actualPaths = new Set(actual.map((file) => file.path));
    const missing = expected
      .filter((file) => !actualPaths.has(file.path))
      .map((file) => file.path);
    const unknown = actual
      .filter((file) => !expectedPaths.has(file.path))
      .map((file) => file.path);
    const modified = expected
      .filter((file) => {
        const current = actual.find((entry) => entry.path === file.path);
        return current && current.sha256 !== file.sha256;
      })
      .map((file) => file.path);
    throw new Error(
      `production source does not match ${frozenCommit}: ` +
        `missing=[${missing.join(",")}] unknown=[${unknown.join(",")}] ` +
        `modified=[${modified.join(",")}]`,
    );
  }
  const fileListSHA256 = sourceFileListSHA256(actual);
  const contentManifestSHA256 = sourceContentManifestSHA256(actual);
  return Object.freeze({
    frozenCommit,
    files: actual,
    fileListSHA256,
    contentManifestSHA256,
    manifestSHA256: sha256(
      `${frozenCommit}\n${fileListSHA256}\n${contentManifestSHA256}`,
    ),
    gitStatusClean: status.trim() === "" && localStatus.trim() === "",
    gitStatus: [status, localStatus].filter((entry) => entry.trim()).join(""),
  });
}

export function assertSourceGuardUnchanged(
  before: P3SourceGuardManifest,
  after: P3SourceGuardManifest,
) {
  if (!before.gitStatusClean || !after.gitStatusClean)
    throw new Error(
      `frozen production source has dirty or untracked files:\n${after.gitStatus}`,
    );
  if (before.manifestSHA256 !== after.manifestSHA256)
    throw new Error("production source changed across a diagnostic batch");
  return after;
}
