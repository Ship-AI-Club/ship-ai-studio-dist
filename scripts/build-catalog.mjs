// Regenerates catalog.json from the current tree. Run after any skill or asset edit.
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCatalog, catalogSha256 } from "./lib/catalog.mjs";

const root = resolve(process.argv[2] ?? fileURLToPath(new URL("..", import.meta.url)));
const catalog = buildCatalog(root);
writeFileSync(join(root, "catalog.json"), JSON.stringify(catalog, null, 2) + "\n");
console.log(`catalog.json: ${catalog.name} ${catalog.release}, ${catalog.skills.length} skills, ${catalog.files.length} files, sha256=${catalogSha256(root)}`);
