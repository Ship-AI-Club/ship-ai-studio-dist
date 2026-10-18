# Studio role registry

Data: [studio-role-registry.json](studio-role-registry.json). The owner-facing PM creates every role with CreateAgent using exactly `name`, `description` and `section_id` ([studio-team-setup](skills/studio-team-setup/SKILL.md)). CreateAgent cannot attach plugins, so the PM's first message points each bot to its entry skill and the PM verifies the bot's resolve output before any work.

| Role id | Display name | Entry skill | Status | Created when | Reports to |
|---|---|---|---|---|---|
| pm | `<Project> · Product Manager` | `studio-pm` | ready | First. The owner creates it from the exportable PM entry config, [pm-config/pm.json](pm-config/pm.json); it creates every other role. | owner |
| researcher | `<Project> · Researcher` | `studio-researcher` | ready | Breakout 1, after the owner answers the intake questions. | pm |
| designer | `<Project> · Product Designer` | `studio-designer` | ready | Breakout 2. Review mode: automatically, once positioning is proposed with source and rationale, or approved. Staged approvals: after the owner approves positioning. | pm |
| frontend | `<Project> · Frontend Engineer` | `studio-frontend` | ready | Breakout 3. Review mode: automatically, once product scope is proposed with source and rationale, or approved, and the design contract is written. Staged approvals: after the owner approves scope and design direction. | pm |
| backend | `<Project> · Backend Engineer` | `studio-backend` | ready | Breakout 3, only when the journey needs server behavior. | pm |
| social-media-manager | `<Project> · Social Media Manager` | `studio-social-media-manager` | ready | Breakout 3, before the first site build. | pm |
| performance-marketer | `<Project> · Performance Marketer` | `studio-performance-marketer` | ready | Breakout 4, after the owner approves the working site. In complete-draft-bundle mode (the owner asked to see the site, static and video drafts together), created after the internal site review passes; the site stays unapproved. | social-media-manager |
| static-creator | `<Project> · Static Creator` | `studio-static-creator` | ready | Breakout 4, after the owner approves the working site. In complete-draft-bundle mode (the owner asked to see the site, static and video drafts together), created after the internal site review passes; the site stays unapproved. | social-media-manager |
| video-creator | `<Project> · Video Creator` | `studio-video-creator` | ready | Breakout 4, after the owner approves the working site. In complete-draft-bundle mode (the owner asked to see the site, static and video drafts together), created after the internal site review passes; the site stays unapproved. | social-media-manager |

## Role prerequisites

`setup.approvalFlow` in the brief decides how roles with `prerequisites` (Designer, Frontend) are created. `review`, the default, means the team works from its reviewed internal drafts: the PM creates the role automatically once `node scripts/role-gate.mjs --role <id> --project <project>` reports `create: true`, with no owner question. `staged`, set only when the owner chose staged approvals, holds the role until the owner's own approvals are recorded in `setup.stagedApprovals`. The gate only reads. It never writes, infers or backfills an approval.

## Model setup

| Field | Use | Default |
|---|---|---|
| `setup.siteBuildModel` / `setup.siteBuildEffort` | Website implementation (Frontend) | `claude-opus-5-5` / `medium`, fast `false` |
| `setup.creativeBuildModel` / `setup.creativeBuildEffort` | Static and video creative production | `claude-sonnet-5-5` / `reasoning_effort` `medium`; no fast param exists, none is passed |

Creative runs never fall back to the site model or upgrade silently. Each records the real model setting in `gate-evidence/<asset>/model.json`.
