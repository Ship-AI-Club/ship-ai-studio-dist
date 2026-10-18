---
name: studio-intentional-ui-design
description: Design, implement, or improve digital interfaces with high visual craft, product-specific character, strong usability, and complete interaction states. Use for websites, web apps, mobile or desktop interfaces, prototypes, design systems, UI reviews, and standalone HTML artifacts. Apply at project kickoff or to an interface already in progress. Do not use for non-visual backend work or documents with no user interface.
---

# Intentional UI Design

Create interfaces that feel authored for a particular product and human task. Avoid generic, over-decorated, implausible, or mechanically assembled output commonly perceived as "AI-generated."

This skill governs both design decisions and implementation quality. Adapt it to the product, platform, audience, brand, and existing design system; it does not prescribe one visual style.

## Activation

When this file is loaded automatically, included in project instructions, attached to a conversation, or explicitly invoked, apply it to all UI-related work for the rest of that project or conversation unless the user overrides a principle. At the beginning of a project, use it to establish the design direction and quality bar. In a project already underway, first audit the existing experience and then apply the guidance without discarding sound work.

The file's presence alone cannot influence an assistant that does not read project files automatically. In those environments, attach or paste this file, invoke it by name, or reference it from that tool's persistent project-instructions file.

## Operating Contract

- Treat the user's stated requirements, established brand, product strategy, and existing design system as primary constraints.
- Preserve intentional patterns already present. Improve incoherent or weak patterns without redesigning unrelated areas.
- Do not mistake visual novelty for quality. Every prominent choice must support comprehension, action, trust, or product character.
- Make reasonable product-specific decisions when details are missing. State consequential assumptions, but do not block routine progress.
- Use realistic product language and representative content. Do not design around lorem ipsum, uniformly short labels, or conveniently perfect data.
- Consider the interface unfinished until its important responsive, interactive, empty, loading, error, and accessibility states have been addressed.

## Begin Every UI Task by Establishing Intent

Before creating or changing the interface, determine from the request and available project context:

1. The product's purpose and domain.
2. The primary user and their level of expertise.
3. The most important task on the current screen.
4. The information and actions that deserve first, second, and third attention.
5. The intended personality, trust level, and emotional tone.
6. The platform, input methods, breakpoints, and technical constraints.
7. Existing components, tokens, conventions, and content that should be reused.

Translate these into a compact internal design direction. Do not begin from a fashionable layout template.

When reference images, screenshots, brand assets, design files, or an existing implementation are available, inspect them before choosing the visual language. Infer the system behind them—type, spacing, color roles, shape, density, imagery, and interaction behavior—rather than copying isolated surface details.

## Choose the Correct Mode

### New interface

- Establish the core task flow and content hierarchy before styling.
- Select a visual direction that follows from the product's domain and desired character.
- Define a small, coherent foundation for type, spacing, color, shape, elevation, motion, and layout.
- Build one representative end-to-end view before multiplying components or pages.

### Existing interface

- Inspect the current structure, styling, components, states, and behavior before editing.
- Identify the few issues with the greatest effect on comprehension, usability, consistency, and perceived quality.
- Reuse sound patterns and tokens. Avoid parallel component systems and arbitrary one-off values.
- Make the smallest coherent set of changes that achieves the requested quality bar.
- Verify that improvements do not break adjacent flows, responsive behavior, or accessibility.

### Review or critique

- Diagnose causes, not just symptoms.
- Rank findings by user impact and system reach rather than personal taste.
- Connect every critique to a concrete remedy and the principle behind it.
- Distinguish usability defects, visual-system defects, content problems, and optional stylistic opportunities.

## Core Design Principles

### 1. Product specificity

The interface should reveal what the product is, who it serves, and what work happens there even without its logo. Derive character from domain-relevant content, workflows, language, data, imagery, and interaction—not from ornamental effects.

### 2. Task-first composition

Organize each view around the user's current decision or action. Make the primary path obvious and keep supporting information available without allowing it to compete.

### 3. Perceptual hierarchy

Create an unmistakable reading order using position, scale, weight, contrast, density, and whitespace. Do not rely on card borders or color alone to explain structure.

### 4. Semantic grouping

Use proximity and alignment before containers. Tight spacing means strong relationship; larger spacing marks a new group or idea. Introduce a surface, border, or divider only when it clarifies a meaningful boundary.

### 5. Deliberate restraint

Limit the number of competing type styles, accent colors, radii, shadows, and decorative treatments. Repetition should create coherence; variation should communicate meaning.

### 6. Familiar behavior

Follow platform conventions for navigation, focus, selection, disclosure, menus, forms, and feedback unless a departure clearly improves the task. Novel visuals must not produce unfamiliar behavior without benefit.

### 7. Honest content and data

Use concrete copy, plausible names, irregular values, long and short content, negative outcomes, and edge cases. Label units, time ranges, comparison baselines, and system status. Do not use charts as decoration.

### 8. State completeness

Design the experience across first use, populated, empty, loading, partial, stale, offline, permission-denied, validation, error, success, and recovery states as relevant. Preserve user input and provide a clear next action when something fails.

### 9. Accessibility as visual quality

Use sufficient contrast, visible keyboard focus, adequate hit targets, logical focus order, semantic structure, non-color status cues, readable type, zoom resilience, and reduced-motion support. Accessibility is part of the composition, not a compliance layer added later.

### 10. Appropriate density

Match density to task frequency, user expertise, device, and consequence. Repeated expert workflows can be compact; unfamiliar or high-risk actions need stronger guidance and more separation.

### 11. Responsive intent

Do not merely stack the desktop layout. Preserve priority at each width: reorder, condense, disclose progressively, or change the interaction model when needed. Verify both narrow and wide extremes as well as intermediate widths.

### 12. Feedback and causality

Every action should produce timely, proportionate feedback. Make hover, focus, pressed, selected, disabled, busy, success, and failure states visibly distinct without causing layout shift or excessive motion.

## Eyebrow Text and Letter Case

Do not use an all-caps eyebrow, overline, kicker, or category label above a heading as a default composition device. This pattern is heavily overused in generated interfaces and often adds visual ceremony without adding information.

- Default interface copy, labels, section introductions, and navigation to sentence case.
- Remove an eyebrow when it merely repeats the page category, heading, navigation location, or adjacent context.
- If context is genuinely needed, prefer incorporating it into the heading, subheading, metadata, breadcrumb, or a concise sentence-case label.
- Establish hierarchy through type size, weight, spacing, position, and color before changing capitalization.
- Do not justify all caps solely because a label is small, tertiary, or needs to look "designed."
- Permit all caps only when the content itself requires it—such as a genuine acronym, initialism, code, model name, or legally prescribed notation—or when an established brand or design system uses it for a clear, tested reason.
- When an exception is justified, keep it brief, preserve legibility, use restrained tracking, and never apply it to sentences or substantial instructional text.

Treat unexplained `text-transform: uppercase`, uppercase utility classes, and manually capitalized eyebrow copy as review findings. Remove or revise them unless the exception is evident from the content or product system.

## Twenty AI-Slop Signals and Their Remedies

Use these as diagnostic signals, not blanket prohibitions. A technique is valid when it has a product-specific purpose and is executed coherently.

1. **Everything is a rounded card.** Remove unnecessary containers; group first with spacing, alignment, typography, and dividers.
2. **Gradients, glows, glass, and blur dominate.** Keep only effects that reinforce atmosphere, depth, hierarchy, or brand; reduce their area and intensity.
3. **One exaggerated corner radius appears everywhere.** Create a restrained radius hierarchy appropriate to control size, nesting, and platform.
4. **The headline is grandiose but vague.** State the product, user, outcome, and differentiator in concrete language.
5. **The composition follows a generic template.** Sequence content around the user's questions, objections, decisions, and tasks.
6. **Most elements have similar visual weight.** Establish clear primary, secondary, and supporting levels.
7. **Several saturated calls to action compete.** Use one primary action per decision context and demote alternatives according to importance.
8. **Pills and badges are decorative filler.** Reserve them for status, filters, compact choices, or meaningful metadata; distinguish static labels from controls.
9. **Copy is unnaturally symmetrical.** Design for realistic variation and edit language for comprehension instead of geometric convenience.
10. **Icons are generic or inconsistent.** Use one coherent icon language, choose recognizable metaphors, and add labels when meaning is not immediate.
11. **The shell looks polished but the workflow is unclear.** Show credible inputs, outputs, transitions, constraints, consequences, and recovery paths.
12. **All sample data is conveniently positive.** Include variation, gaps, outliers, zeros, long labels, and negative states.
13. **Charts lack a decision purpose.** Start with the question the visualization must answer; add units, context, comparison, and accessible summaries.
14. **Spacing is mechanically uniform.** Use spacing relationally: close within groups, larger between groups, and largest between sections.
15. **Typography relies on all-caps eyebrows or fashionable styling.** Remove redundant overlines, default to sentence case, and define purposeful text roles. Verify size, measure, leading, contrast, wrapping, and weight on real screens.
16. **Platform conventions are ignored.** Restore expected control behavior and change conventions only for a demonstrable usability benefit.
17. **Only the ideal populated state exists.** Implement relevant system, data, permission, and recovery states.
18. **Density conflicts with the job.** Tune layout density to frequency, expertise, urgency, and device rather than a universal spacious aesthetic.
19. **Accessibility is absent or bolted on.** Build accessible semantics, interaction, contrast, targets, and motion behavior into the system from the start.
20. **The product has no recognizable point of view.** Derive a distinct visual and behavioral language from the domain and brand, not interchangeable decoration.

Also watch for repeated AI-era cliches: gratuitous all-caps eyebrow text, sparkle icons, purple-blue neon palettes chosen without rationale, enormous display headlines, floating gradient orbs, fake testimonials, fabricated logos, excessive dashboard metrics, three-card feature rows, and animation on every element. Do not automatically ban them; require a credible reason for their presence.

## Visual-System Requirements

Create or preserve a small set of reusable decisions rather than styling each element independently.

- **Typography:** Assign explicit roles for display, headings, body, labels, data, and helper text. Default to sentence case, reject decorative all-caps eyebrows, and use no more variation than the content hierarchy needs.
- **Color:** Define roles such as canvas, surface, text, muted text, border, accent, success, warning, and danger. Ensure accent colors retain meaning instead of becoming decoration.
- **Spacing:** Use a consistent base rhythm with optical adjustments where geometry requires them. Nested spacing must explain grouping.
- **Shape:** Relate radius and control geometry to product character, size, platform, and nesting.
- **Elevation:** Prefer few levels. Use shadow, border, tone, and overlap only to communicate actual layering or emphasis.
- **Layout:** Use deliberate grids, alignment anchors, readable measures, and stable responsive rules. Avoid accidental near-alignment.
- **Motion:** Use motion to explain change, location, causality, or status. Keep it brief, interruptible, and respectful of reduced-motion preferences.
- **Imagery:** Use imagery with a defined role and coherent art direction. Avoid filler photography, random abstract art, or mismatched illustration styles.

Do not expose design-token machinery merely to appear systematic. A small interface may need only a few shared values; a large product may warrant a fuller token architecture.

## Implementation Standards

- Prefer semantic native elements and expected browser or platform behavior before custom controls.
- Make controls functional, not ornamental. Buttons, menus, tabs, filters, forms, and navigation must have real behavior where the artifact supports interaction.
- Use reusable components for genuinely repeated patterns, while avoiding abstractions that erase meaningful differences.
- Prevent layout shifts, clipped text, overlapping controls, broken wrapping, and hover-dependent access to essential information.
- Keep touch targets usable and place destructive actions away from routine actions. Confirm destructive operations in proportion to consequence.
- Provide labels and instructions before users need them; write error messages that explain what happened and how to recover.
- Preserve user work during validation failures, retries, and navigation whenever possible.
- Avoid dependencies, assets, or APIs that are unavailable in the target environment. When an asset cannot be used, choose an intentional fallback rather than a broken placeholder.
- Maintain reasonable performance. Decorative polish is not valuable when it delays primary content or interaction.

## Standalone HTML Artifact Guidance

When generating an HTML artifact in a chat environment:

- Produce a complete, runnable artifact using the environment's supported HTML, CSS, and JavaScript.
- Make the first viewport useful; do not spend most of it on decorative hero space when the user's task is below it.
- Use responsive CSS and test the logic mentally or with an available preview at narrow, medium, and wide widths.
- Prefer system fonts when external font loading is unreliable. If external assets are permitted, include robust fallbacks.
- Use inline SVG or simple CSS shapes only when they are semantically appropriate and visually coherent; do not substitute random emoji for interface icons.
- Implement essential interactions and state changes. If an action is intentionally illustrative, label it clearly rather than pretending it works.
- Keep the artifact self-contained unless the user requested a framework, external assets, or integration.

## Quality-Control Pass

Before declaring a UI task complete, inspect the actual rendered result when preview or screenshot capability exists. Review it at representative narrow and wide sizes and exercise important interactions. If rendering is unavailable, inspect the implementation against the same criteria and disclose that visual verification was not possible.

Ask:

- Is the primary task apparent within a few seconds?
- Does the reading order match user priority?
- Can any card, label, icon, effect, or sentence be removed without loss?
- Does the interface still work with long content, sparse content, errors, and small screens?
- Are interactive and static elements visually distinguishable?
- Are state changes visible and recoverable?
- Are spacing, alignment, typography, color, shape, and iconography coherent?
- Is any all-caps eyebrow text present without a content, brand, legal, or system requirement?
- Does the result look specific to this product rather than a reusable AI template?
- Can keyboard, touch, zoom, contrast, and reduced-motion users complete the core task?
- Is the interface credible with realistic content and data?

Resolve material failures before finishing. Prioritize corrections in this order:

1. Broken task flow, inaccessible interaction, or missing recovery.
2. Incorrect hierarchy, content, navigation, or responsive behavior.
3. Inconsistent system decisions and component behavior.
4. Typography, spacing, alignment, color, and icon refinement.
5. Decorative polish and optional motion.

## Completion Standard

The result is ready when it is:

- **Specific:** visibly and verbally grounded in its product and users.
- **Clear:** hierarchy and behavior are understandable without explanation.
- **Coherent:** repeated visual and interaction decisions form a system.
- **Complete:** relevant content, responsive, interaction, and failure states exist.
- **Inclusive:** core tasks remain usable across input methods and accessibility needs.
- **Restrained:** decoration supports the experience rather than becoming the experience.
- **Crafted:** fine details hold up in the rendered interface, not only in source code or a design description.

The goal is not to make an interface look "less AI." The goal is to make every consequential choice feel intentional, explainable, and appropriate to a particular human task.
