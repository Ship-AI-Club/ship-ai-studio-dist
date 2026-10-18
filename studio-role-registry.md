# Studio role registry

Data: [studio-role-registry.json](studio-role-registry.json). The owner-facing PM creates every role with CreateAgent using exactly `name`, `description` and `section_id` ([studio-team-setup](skills/studio-team-setup/SKILL.md)). CreateAgent cannot attach plugins, so the PM's first message points each bot to its entry skill and the PM verifies the bot's resolve output before any work.

| Role id | Display name | Entry skill | Status | Created when | Reports to |
|---|---|---|---|---|---|
| pm | `<Project> · Product Manager` | `studio-pm` | stub | First. Created from the template by the owner; it creates every other role. | owner |
| researcher | `<Project> · Researcher` | `studio-researcher` | stub | Breakout 1, after the owner answers the intake questions. | pm |
| designer | `<Project> · Product Designer` | `studio-designer` | stub | Breakout 2, after the owner approves positioning. | pm |
| frontend | `<Project> · Frontend Engineer` | `studio-frontend` | stub | Breakout 3, after the owner approves scope and design direction. | pm |
| backend | `<Project> · Backend Engineer` | `studio-backend` | stub | Breakout 3, only when the journey needs server behavior. | pm |
| social-media-manager | `<Project> · Social Media Manager` | `studio-social-media-manager` | ready | Breakout 3, before the first site build. | pm |
| performance-marketer | `<Project> · Performance Marketer` | `studio-performance-marketer` | ready | Breakout 4, after the owner approves the working site. | social-media-manager |
| static-creator | `<Project> · Static Creator` | `studio-static-creator` | ready | Breakout 4, after the owner approves the working site. | social-media-manager |
| video-creator | `<Project> · Video Creator` | `studio-video-creator` | ready | Breakout 4, after the owner approves the working site. | social-media-manager |

Product roles are stubs; the Product repair fills their descriptions and entry skills. Until then the PM does not create them.

## Model setup

| Field | Use | Default |
|---|---|---|
| `setup.siteBuildModel` / `setup.siteBuildEffort` | Website implementation (Frontend) | `claude-opus-5-5` / `medium`, fast `false` |
| `setup.creativeBuildModel` / `setup.creativeBuildEffort` | Static and video creative production | `claude-sonnet-5-5` / `reasoning_effort` `medium`; no fast param exists, none is passed |

Creative runs never fall back to the site model or upgrade silently. Each records the real model setting in `gate-evidence/<asset>/model.json`.
