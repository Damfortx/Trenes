#!/usr/bin/env node
// concat-ts.mjs
import { promises as fs } from "fs";
import path from "path";

const IGNORES = new Set([
  "node_modules", "dist", "build", ".git", ".next", ".turbo", ".vite",
  "coverage", "out", ".parcel-cache"
]);

function skipDir(name) { return IGNORES.has(name); }

async function* walk(dir) {
  for await (const d of await fs.opendir(dir)) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) {
      if (skipDir(d.name)) continue;
      yield* walk(p);
    } else if (d.isFile() && /\.ts$/i.test(d.name) && !/\.d\.ts$/i.test(d.name)) {
      yield p;
    }
  }
}

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const out  = process.argv[3] ? path.resolve(process.argv[3]) : path.join(root, "ts_sources_bundle.txt");

const files = [];
for await (const f of walk(root)) files.push(f);
files.sort((a, b) => a.localeCompare(b));

let chunks = [];
for (const f of files) {
  const rel = path.relative(root, f).split(path.sep).join("/");
  const content = await fs.readFile(f, "utf8");
  chunks.push(`\n/* ===== FILE: ${rel} ===== */\n${content}\n`);
}

await fs.writeFile(out, chunks.join(""), "utf8");
console.log(`Bundled ${files.length} files into: ${out}`);
