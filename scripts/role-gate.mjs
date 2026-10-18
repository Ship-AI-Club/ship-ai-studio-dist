// Decides whether the PM may create a role now, from the role's registry `prerequisites` and the
// project's own files. Review mode (the default): the team's reviewed internal drafts are enough.
// Staged mode (only when the owner chose staged approvals): the owner's recorded approvals are
// required. It only reads; it never writes, infers or backfills an approval.
//
// Usage: node <root>/scripts/role-gate.mjs --role <id> --project <project folder>
// Exit 0: create now. Exit 2: held, `missing` says why. Exit 1: error.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = fileURLToPath(new URL("..", import.meta.url));
const PLACEHOLDER = "<!-- design-contract: placeholder -->";
const filled = v => typeof v === "string" && v.trim() !== "";

export class RoleGateError extends Error {
  constructor(reason) { super(`Role gate refused: ${reason}`); this.name = "RoleGateError"; }
}

function check(req, { brief, project }) {
  if (req.brief) {
    const x = brief[req.brief];
    if (x?.status === "approved") return null;
    if (x?.status === "proposed" && filled(x.source) && filled(x.rationale) && x.approved !== true && x.approvedBy == null && x.approvedAt == null) return null;
    return `${req.item}: record it as "proposed" with its source and rationale (an internal draft), or the owner's approval`;
  }
  if (req.approval) {
    const a = brief.setup?.stagedApprovals?.[req.approval];
    if (a && filled(a.approvedBy) && filled(a.message) && !Number.isNaN(Date.parse(a.approvedAt ?? ""))) return null;
    return `${req.item}: the owner chose staged approvals; wait for the owner's own approval (setup.stagedApprovals.${req.approval}: approvedBy, approvedAt, message)`;
  }
  if (req.contract) {
    const f = join(project, req.contract);
    if (existsSync(f) && !readFileSync(f, "utf8").includes(PLACEHOLDER)) return null;
    return `${req.item}: ${req.contract} is still the starter placeholder`;
  }
  throw new RoleGateError(`unknown prerequisite ${JSON.stringify(req)}`);
}

export function roleGate({ role, project, root = here }) {
  if (!role) throw new RoleGateError("--role is required");
  if (!project) throw new RoleGateError("--project is required");
  const reg = JSON.parse(readFileSync(join(root, "studio-role-registry.json"), "utf8"));
  const r = reg.roles.find(x => x.id === role);
  if (!r) throw new RoleGateError(`role ${role} is not in the registry`);
  if (!r.prerequisites) throw new RoleGateError(`role ${role} has no prerequisites; create it when its createdWhen moment arrives`);
  const file = join(resolve(project), "brief/project.json");
  if (!existsSync(file)) throw new RoleGateError(`no project brief at ${file}; the PM prepares the project first`);
  const brief = JSON.parse(readFileSync(file, "utf8"));
  const flowSpec = reg.setup.approvalFlow;
  const flow = brief.setup?.[flowSpec.field.replace(/^setup\./, "")] ?? flowSpec.default;
  if (!Object.hasOwn(flowSpec.values, flow)) throw new RoleGateError(`setup.approvalFlow must be one of ${Object.keys(flowSpec.values).join(", ")}`);
  const reqs = r.prerequisites[flow];
  const missing = reqs.map(q => check(q, { brief, project: resolve(project) })).filter(Boolean);
  return { role, flow, create: missing.length === 0, satisfied: reqs.filter(q => !missing.some(m => m.startsWith(`${q.item}:`))).map(q => q.item), missing, writes: "none" };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const a = k => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : undefined; };
  try {
    const out = roleGate({ role: a("--role"), project: a("--project") });
    console.log(JSON.stringify(out, null, 2));
    process.exitCode = out.create ? 0 : 2;
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
