import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  server: { port: 4188, strictPort: true, host: "0.0.0.0" },
});
