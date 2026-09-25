/**
 * Runs the pure-logic test suite in tests/logic.test.ts.
 *
 * The suite has no framework: it is bundled with esbuild (already a Vite
 * dependency) and executed with Node, so `npm test` needs nothing extra and
 * works offline.
 */
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const entry = path.join(root, "tests", "logic.test.ts");
const outfile = path.join(root, "node_modules", ".cache", "logic-test.mjs");

await build({
  entryPoints: [entry],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile,
  logLevel: "error",
});

const result = spawnSync(process.execPath, [outfile], { stdio: "inherit" });
process.exit(result.status ?? 1);
