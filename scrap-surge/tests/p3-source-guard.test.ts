import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import {
  assertSourceGuardUnchanged,
  captureSourceGuard,
  sourceContentManifestSHA256,
  sourceFileListSHA256,
} from "./p3-source-guard";

const execFileAsync = promisify(execFile);

async function git(cwd: string, ...args: string[]) {
  await execFileAsync("git", args, { cwd });
}

async function withFixture(
  run: (root: string, frozen: string) => Promise<void>,
) {
  const root = await mkdtemp(join(tmpdir(), "p3-source-guard-"));
  try {
    await mkdir(join(root, "src"));
    await git(root, "init", "-q");
    await git(root, "config", "user.email", "p3-test@example.invalid");
    await git(root, "config", "user.name", "P3 test");
    await writeFile(join(root, "src", "main.ts"), "export const value = 1;\n");
    await git(root, "add", ".");
    await git(root, "commit", "-q", "-m", "fixture");
    const frozen = (
      await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root })
    ).stdout.trim();
    await run(root, frozen);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("source guard accepts the frozen tree and exposes each manifest", async () => {
  await withFixture(async (root, frozen) => {
    const accepted = await captureSourceGuard(root, frozen);
    assert.equal(accepted.files.length, 1);
    assert.equal(accepted.files[0]!.path, "src/main.ts");
    assert.equal(accepted.fileListSHA256, sourceFileListSHA256(accepted.files));
    assert.equal(
      accepted.contentManifestSHA256,
      sourceContentManifestSHA256(accepted.files),
    );
    assert.equal(accepted.gitStatusClean, true);
    assert.equal(accepted.gitStatus, "");
  });
});

test("source guard rejects modified source bytes", async () => {
  await withFixture(async (root, frozen) => {
    await writeFile(join(root, "src", "main.ts"), "export const value = 2;\n");
    await assert.rejects(
      captureSourceGuard(root, frozen),
      /modified=\[src\/main\.ts\]/,
    );
  });
});

test("source guard rejects an untracked source file", async () => {
  await withFixture(async (root, frozen) => {
    await writeFile(join(root, "src", "extra.ts"), "export const extra = 1;\n");
    await assert.rejects(
      captureSourceGuard(root, frozen),
      /unknown=\[src\/extra\.ts\]/,
    );
  });
});

test("source guard rejects a missing frozen source file", async () => {
  await withFixture(async (root, frozen) => {
    await rm(join(root, "src", "main.ts"));
    await assert.rejects(
      captureSourceGuard(root, frozen),
      /missing=\[src\/main\.ts\]/,
    );
  });
});

test("source guard rejects dirty index state despite matching bytes", async () => {
  await withFixture(async (root, frozen) => {
    await writeFile(join(root, "src", "main.ts"), "export const value = 2;\n");
    await git(root, "add", "src/main.ts");
    await writeFile(join(root, "src", "main.ts"), "export const value = 1;\n");
    const before = await captureSourceGuard(root, frozen);
    assert.equal(before.gitStatusClean, false);
    assert.match(before.gitStatus, /src\/main\.ts/);
    await assert.rejects(
      async () => assertSourceGuardUnchanged(before, before),
      /dirty or untracked files/,
    );
  });
});
