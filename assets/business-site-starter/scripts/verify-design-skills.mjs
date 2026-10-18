import { createHash } from 'node:crypto';
import { readFile, realpath, mkdir, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const requiredSkills = [
  'studio-yc-interface-craft', 'studio-intentional-ui-design',
  'studio-illustration-design-grammar', 'studio-emil-design-eng',
  'studio-frontend-design', 'studio-product-marketing', 'studio-lead-magnets',
  'studio-copywriting', 'studio-copy-editing', 'studio-cro', 'studio-animate',
  'studio-animation-vocabulary', 'studio-animation-performance',
  'studio-review-animations', 'studio-find-animation-opportunities',
  'studio-improve-animations', 'studio-pick-ui-library', 'studio-prototype',
  'studio-break-ui', 'studio-ask-sonner', 'studio-workshop-owner-language',
];

function inside(root, path) {
  const rel = relative(root, path);
  return rel !== '..' && !rel.startsWith('../') && !isAbsolute(rel);
}

export async function verifyDesignSkills(root) {
  root = await realpath(root);
  const manifestBytes = await readFile(resolve(root, 'design-skill-library.json'));
  const manifest = JSON.parse(manifestBytes);
  const report = {
    status: 'FAIL', manifestSha256: createHash('sha256').update(manifestBytes).digest('hex'),
    skills: manifest.skills, files: [], errors: [],
    scope: 'File presence and integrity only. This does not prove that an agent read or applied a skill.',
  };
  if (!Array.isArray(manifest.files) || !manifest.files.length) {
    report.errors.push('The design file manifest is empty.');
    return report;
  }
  if (manifest.files.length < 54) report.errors.push('The shared design manifest is incomplete. Expected at least 54 files.');
  for (const path of ['SKILL.md', 'agents/openai.yaml', 'references/company-index.json', 'references/direction-workshop.md', 'references/motion-and-quality.md', 'references/research-and-examples.md', 'references/system-and-surfaces.md']) {
    if (!manifest.files.some(f => f.path === `.agents/skills/studio-yc-interface-craft/${path}`)) {
      report.errors.push(`Missing YC Interface Craft reference: ${path}`);
    }
  }
  const seen = new Set();
  for (const skill of requiredSkills) {
    if (!manifest.skills?.includes(skill) || !manifest.files.some(f => f.skill === skill && f.path === `.agents/skills/${skill}/SKILL.md`)) {
      report.errors.push(`Missing required skill: ${skill}`);
    }
  }
  for (const entry of manifest.files) {
    const file = { skill: entry.skill, path: entry.path, status: 'FAIL' };
    report.files.push(file);
    try {
      if (typeof entry.path !== 'string' || isAbsolute(entry.path) || seen.has(entry.path)) throw new Error('Invalid or duplicate path');
      seen.add(entry.path);
      if (!entry.path.startsWith(`.agents/skills/${entry.skill}/`)) throw new Error('File must belong to its named skill');
      const candidate = resolve(root, entry.path);
      if (!inside(root, candidate) || !inside(root, await realpath(candidate))) throw new Error('File is outside the project');
      file.sha256 = createHash('sha256').update(await readFile(candidate)).digest('hex');
      if (file.sha256 !== entry.sha256) throw new Error('SHA256 does not match');
      file.status = 'PASS';
    } catch (error) {
      report.errors.push(`${entry.path}: ${error.message}`);
    }
  }
  if (!report.errors.length) report.status = 'PASS';
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const rootAt = process.argv.indexOf('--root');
  const root = resolve(rootAt >= 0 ? process.argv[rootAt + 1] : process.cwd());
  try {
    const report = await verifyDesignSkills(root);
    await mkdir(resolve(root, 'evidence'), { recursive: true });
    await writeFile(resolve(root, 'evidence/design-skills.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`${report.status}: ${report.files.filter(f => f.status === 'PASS').length}/${report.files.length} design files verified.`);
    for (const error of report.errors) console.error(error);
    if (report.status !== 'PASS') process.exitCode = 1;
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
