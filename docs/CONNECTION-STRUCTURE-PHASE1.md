# Relationship structure — Phase 1

This change starts from main at a548501 and derives structural facts from the existing CHANNELS/GATES catalog. It does not change astronomical calculations, appearance tokens, timeline, Knowledge Layer or person-entry persistence.

## Center model

For each person and the union of their gates, a channel is complete when both catalog gates are present. Centers at either end of a complete channel are defined. An undefined center with at least one activated gate has status `undefined`; an undefined center with no activated gate has status `open` (completely open). The nine-center formula counts defined centers versus all remaining centers, including completely open centers.

A Created center is defined in the composite and undefined in both individual topologies. Its detail lists the complete channels that define it. A newly completed channel is a separate count and need not create a new center. BodyGraph uses the same structural model for composite center ownership, retaining existing A/B/Created painting.

## Directional bridging

For each person, find connected components of their complete-channel center graph. Map those original regions into the composite graph. Fewer than two original regions means not applicable. No merging means not bridged; merging some but not all original regions means partially bridged; mapping every original region into one component means fully bridged. Additional composite components unrelated to the person's original regions do not prevent that person's complete bridging.

Each merged group records deterministic shortest witness paths between its first original region and the others. Paths contain catalog channels, centers, gates and self/partner/both contributions. They may traverse a partner's pre-existing channel or centers newly defined in the composite. Electromagnetic classification is independent of bridging.

Witness paths prove connectivity, but do not enumerate every possible alternate route or establish that each displayed channel is uniquely necessary. Bridging denotes structural connectivity only, not relationship quality, attraction, authority or decision advice.

## Output and UI contract

`compareHumanDesign` returns individual identity facts, structure, center states, four channel classifications, directional bridging and numeric summary facts. The arbitrary profile harmony weights and generated relationship advice are removed. The composite-derived type is descriptive topology and does not create a shared personal authority.

English, Simplified Chinese and Traditional Chinese displays show the formula, Created center count, three center states and separate A/B bridging. Existing four classifications and graph interaction remain.

The old connection full-output hashes intentionally cover retired interpretive fields. Their 64 captured inputs now have independent catalog-based assertions for all four classifications, composite centers/channels and Created centers; unrelated derived-output hash contracts remain unchanged.

## Validation

- Real catalog fixtures cover Created centers, bridging without electromagnetic channels, electromagnetic channels without bridging, partial bridging, A/B exchange, four classifications, frozen inputs, nine-center totals, bridging through a Created center and complete individual bridging within a split composite.
- Browser E2E covers all nine SVG statuses, center details, summary counts and directional bridging in all three languages.
- Full unit tests, build and language suite results are recorded in the PR.
