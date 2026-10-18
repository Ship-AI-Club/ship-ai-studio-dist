import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

export const HASH_METHOD = "sha256 over the sorted lines '<path relative to the folder>\\0<sha256 of the file>\\n' for every file in the folder";
export const CATALOG_FILES = ["studio-role-registry.json", "studio-role-registry.md", "plugin.json", "distribution.json", "LICENSE", "THIRD_PARTY_NOTICES.md", "PROVENANCE.md", "design-skill-library.json"];
export const CATALOG_TREES = ["assets", "scripts", "licenses", "roles", "provenance", "templates", "pm-config"];
const SKIP = new Set(["node_modules", ".git", ".remotion", "out", ".next"]);

export const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const posix = p => p.split(sep).join("/");

export function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.isFile()) out.push(p);
  }
  return out.sort();
}

export function treeHash(dir) {
  const lines = walk(dir).map(f => `${posix(relative(dir, f))}\0${sha256(readFileSync(f))}\n`).sort();
  return sha256(lines.join(""));
}

export function skillNames(root) {
  return readdirSync(join(root, "skills"), { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort();
}

export function buildCatalog(root) {
  const plugin = JSON.parse(readFileSync(join(root, "plugin.json"), "utf8"));
  const skills = skillNames(root).map(name => ({ name, path: `skills/${name}`, sha256: treeHash(join(root, "skills", name)) }));
  const files = [
    ...CATALOG_FILES.filter(f => existsSync(join(root, f))).map(f => join(root, f)),
    ...CATALOG_TREES.filter(d => existsSync(join(root, d))).flatMap(d => walk(join(root, d))),
  ].map(f => ({ path: posix(relative(root, f)), sha256: sha256(readFileSync(f)), bytes: statSync(f).size }))
    .sort((a, b) => a.path.localeCompare(b.path));
  return {
    schemaVersion: 1,
    name: plugin.name,
    release: plugin.version,
    hashMethod: HASH_METHOD,
    skills,
    files,
  };
}

export const catalogSha256 = root => sha256(readFileSync(join(root, "catalog.json")));
