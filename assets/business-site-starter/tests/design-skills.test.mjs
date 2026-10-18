import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyDesignSkills } from '../scripts/verify-design-skills.mjs';

const source = fileURLToPath(new URL('../', import.meta.url));
test('the complete shared library has valid file hashes', async () => {
  const result = await verifyDesignSkills(source);
  assert.equal(result.status, 'PASS', result.errors.join('\n'));
  assert.equal(result.files.length, 54);
});

test('missing or changed design files block the build', async () => {
  const root = await mkdtemp(join(tmpdir(), 'studio-skills-'));
  try {
    await cp(join(source, '.agents'), join(root, '.agents'), { recursive: true });
    await cp(join(source, 'design-skill-library.json'), join(root, 'design-skill-library.json'));
    const skill = join(root, '.agents/skills/studio-frontend-design/SKILL.md');
    await writeFile(skill, 'A summary is not the full skill.');
    let result = await verifyDesignSkills(root);
    assert.equal(result.status, 'FAIL');
    assert.ok(result.errors.some(e => e.includes('SHA256')));
    await rm(skill);
    result = await verifyDesignSkills(root);
    assert.equal(result.status, 'FAIL');
    assert.ok(result.errors.some(e => e.includes('frontend-design/SKILL.md')));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('an empty or reduced manifest cannot pass', async () => {
  const root = await mkdtemp(join(tmpdir(), 'studio-manifest-'));
  try {
    const manifest = JSON.parse(await readFile(join(source, 'design-skill-library.json')));
    manifest.files = [];
    await writeFile(join(root, 'design-skill-library.json'), JSON.stringify(manifest));
    assert.equal((await verifyDesignSkills(root)).status, 'FAIL');
    const reduced = JSON.parse(await readFile(join(source, 'design-skill-library.json')));
    reduced.files = reduced.files.filter(f => !f.path.endsWith('references/company-index.json'));
    await cp(join(source, '.agents'), join(root, '.agents'), { recursive: true });
    await writeFile(join(root, 'design-skill-library.json'), JSON.stringify(reduced));
    const report = await verifyDesignSkills(root);
    assert.equal(report.status, 'FAIL');
    assert.ok(report.errors.some(e => e.includes('company-index.json')));
  } finally { await rm(root, { recursive: true, force: true }); }
});
