# AGENTS.md

## Project identity

Frontier Pulse is an AI intelligence and momentum-tracking website.
It helps readers understand the AI race through:
- fast news aggregation
- explainable momentum scoring
- company profiles
- leaderboard and compare views
- trend/timeline views
- a readable daily digest

This is primarily an editorial intelligence product, not a social app.
Protect clarity, trust, freshness, and speed above all else.

## Product priorities

When making decisions, optimize in this order:

1. Freshness of information
2. Accuracy and editorial trust
3. Readability and scanability
4. Stability and performance
5. Clean visual polish
6. Feature expansion

Do not add complexity unless it clearly improves the core product.

## What matters most

Codex should preserve and strengthen these qualities:

- The site must feel current, fast, and alive.
- The homepage must quickly answer: what changed, who is moving, and why it matters.
- Leaderboards and momentum views must feel explainable, not arbitrary.
- Editorial summaries should sound clear, sharp, and factual.
- The UI should feel modern and high-signal, not noisy or gimmicky.
- Every page should help users understand the competitive AI landscape faster.

## Guardrails for changes

Unless explicitly asked, do not:
- add paywalls, subscriptions, pricing logic, or monetization flows
- add user profiles, social features, comments, or personal watchlists
- bloat the app with unnecessary onboarding
- introduce heavy animations that hurt performance
- replace concise editorial writing with hype language
- ship fake, hardcoded, misleading, or stale-looking data
- hide weak data quality behind decorative UI

Prefer improving the core content engine and presentation over adding product sprawl.

## Source-of-truth principles

This product lives or dies on trust.

When working on ingestion, ranking, summaries, labeling, or timestamps:

- prefer real source data over placeholder data
- make freshness visible when possible
- preserve links back to source material
- avoid duplicate stories and duplicate events
- avoid misleading precision in scores
- keep ranking logic interpretable
- handle missing or partial data gracefully
- fail transparently rather than pretending everything is fresh

If data is stale, missing, delayed, or uncertain, surface that honestly in the UI or logs.

## Editorial standards

Write in a tone that is:
- clear
- sharp
- modern
- restrained
- informative

Avoid:
- exaggerated marketing language
- empty "future of AI" filler
- vague claims with no substance
- breathless or sensational tone

Prefer:
- concrete verbs
- short paragraphs
- strong headings
- useful summaries
- direct explanation of why a story matters

Good editorial framing:
- what happened
- who it affects
- whether it changes momentum
- why it matters in the larger AI race

## Design standards

The design should feel premium, modern, and information-dense without being cramped.

Prefer:
- strong hierarchy
- excellent spacing
- obvious scannability
- restrained motion
- clean typography
- high contrast
- dashboard clarity with editorial warmth

Avoid:
- clutter
- oversized decorative elements
- too many accent colors
- cards that look identical without priority cues
- layouts that bury the most important movement of the day

Every important page should have a clear top-level focal point.

## UX standards

When editing UI or flows:

- reduce friction
- reduce ambiguity
- make important state obvious
- prefer fewer stronger choices
- keep navigation intuitive
- prioritize mobile usability
- make loading, empty, and error states feel intentional

Key user questions the product should answer fast:
- What changed today?
- Which company is gaining momentum?
- Which launch matters most?
- What is the broader trend?
- What should I read first?

If a screen does not answer one of these well, improve it.

## Page-specific guidance

### Homepage
The homepage should quickly communicate:
- biggest moves
- latest important stories
- current leaderboard pulse
- trend signals
- digest entry points

Do not overload it.
Above the fold should feel instantly useful.

### News / feed views
Optimize for:
- freshness
- deduplication
- headline clarity
- source credibility
- skim-first consumption

### Leaderboard
Scores and changes should feel explainable.
If logic changes, preserve consistency and document the reason.

### Company pages
Each company page should feel like a compact intelligence brief:
- what the company is doing
- recent moves
- strategic position
- notable strengths or weaknesses
- relevant launches or infrastructure signals

### Compare views
Comparisons should be clean, side-by-side, and actually decision-useful.
Do not create comparison widgets that look flashy but reveal little.

### Daily digest
This should be one of the clearest and most valuable surfaces in the product.
Bias toward readability, prioritization, and synthesis over volume.

## Engineering standards

Prefer:
- small focused components
- readable functions
- explicit naming
- predictable data flow
- server/client boundaries that are easy to reason about
- minimal, well-contained state
- reusable UI primitives only where reuse is real

Avoid:
- giant components
- deeply nested conditionals
- fragile implicit assumptions
- magic constants without explanation
- premature abstraction
- duplicating ranking/business logic in multiple places

If code becomes hard to explain, simplify it.

## Data and ranking logic

Any code that affects:
- momentum scoring
- ranking
- trend detection
- launch classification
- source normalization
- deduplication
- digest generation

must be handled carefully.

Rules:
- document non-obvious logic
- preserve explainability
- avoid silent behavioral drift
- add tests for ranking or classification changes
- state assumptions clearly in comments when needed
- prefer deterministic behavior where possible

If a ranking change will visibly alter the product, note it in the final summary.

## Performance standards

This site should feel fast.

When changing code:
- keep bundles lean
- avoid unnecessary client-side work
- avoid heavy re-renders
- lazy load where it helps
- optimize images and media responsibly
- watch for slow feed rendering and expensive transforms
- avoid polling patterns that create needless load

Do not trade obvious speed for cosmetic flourishes.

## SEO and metadata

Because this is a content and discovery product:
- preserve semantic headings
- maintain good metadata
- keep canonical structure sensible
- ensure articles, company pages, and digest pages have strong titles and descriptions
- avoid generic page titles

Do not break linkability or crawlability without a strong reason.

## Accessibility

Every meaningful UI change should preserve or improve accessibility:
- keyboard navigation works
- focus states are visible
- color contrast is sufficient
- buttons and links are clear
- loading and error states are understandable
- charts or score indicators should not rely on color alone

## Testing and validation

For meaningful changes, Codex should do the relevant checks before finishing.

At minimum:
- run lint
- run type checks
- run the relevant tests
- add or update tests when behavior changes
- review the changed files for regressions and edge cases

If tests or checks cannot be run, say so explicitly in the final summary.

## Expected workflow for Codex

For non-trivial tasks, follow this sequence:

1. Understand the request and identify affected areas
2. Inspect related components, utilities, and data logic
3. Make the smallest high-quality change that solves the problem
4. Update tests or add tests when behavior changes
5. Run relevant validation commands
6. Review the diff for correctness, clarity, and regressions
7. Summarize what changed, risks, and any follow-up suggestions

Do not make broad opportunistic refactors unless the task requires them.

## Final response expectations

At the end of a task, provide:
- what changed
- why it changed
- any assumptions made
- checks/tests run
- anything still uncertain
- any risks to freshness, ranking quality, or UI behavior

Be explicit and concise.

## If there is a conflict

If instructions conflict, use this order:
1. direct user request
2. this AGENTS.md
3. existing codebase conventions
4. general preferences

If the codebase and this file disagree, do not blindly follow either one.
Use judgment and explain the tradeoff.

## Practical bias

When in doubt, choose:
- simpler implementation
- clearer UI
- fresher data
- more honest labeling
- better editorial readability
- less feature bloat

Frontier Pulse should feel like a trustworthy AI intelligence product, not a toy dashboard.
