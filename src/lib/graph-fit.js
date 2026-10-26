/**
 * Shared sizing for every BodyGraph surface.
 *
 * The home chart and the relationship composite were solved twice: both needed
 * to know how much room a graph actually has, both re-measured when the layout
 * moved, and both had to tear those listeners down on a re-render. The measuring
 * and the observation are the same problem on both pages, so they live here.
 *
 * What stays with each surface is the part that is genuinely different: the
 * natal chart also measures its planet columns and variable arrows and turns the
 * budget into one scaled stage, while the composite turns it into a canvas plus
 * two overlaid activation bands. Those numbers are not shared, and pretending
 * otherwise would flatten both of them.
 *
 * Consumers (see docs/development/UI_COMPONENT_INVENTORY.md):
 *   - `views/chart.js`   natal graph, `stickyColumn` height budget
 *   - `views/connection.js` composite graph via `lib/graph-shell.js`
 */

/**
 * Room a graph may occupy inside `root`, in CSS pixels.
 *
 * `chrome` is the height of everything inside the sticky column that is not the
 * graph itself — the caller measures it, because only the caller knows what it
 * put around the graph.
 *
 * `requireSticky` is the difference between the two current consumers: the
 * composite only fits itself to the viewport while its column is actually
 * pinned, and otherwise answers to width alone; the natal chart has always used
 * the same budget whether or not the column is pinned, because its stage is what
 * gives the column its height in the first place.
 */
export function graphFitBudget(root, { fitHeight = false, chrome = 0, requireSticky = false } = {}) {
  if (!root) return { availableWidth: 1, availableHeight: null };
  const style = getComputedStyle(root);
  const availableWidth = Math.max(1, root.clientWidth
    - (parseFloat(style.paddingLeft) || 0)
    - (parseFloat(style.paddingRight) || 0));
  let availableHeight = null;
  if (fitHeight) {
    const column = root.closest('.chart-column');
    const pinned = column && getComputedStyle(column).position === 'sticky';
    if (column && (pinned || !requireSticky)) {
      const viewport = window.visualViewport?.height ?? document.documentElement.clientHeight;
      const stickyTop = parseFloat(getComputedStyle(column).top) || 0;
      const budget = viewport - stickyTop - (parseFloat(chrome) || 0);
      if (budget > 0) availableHeight = budget;
    }
  }
  return { availableWidth, availableHeight };
}

/**
 * Height of the fixed chrome inside a card, so a fitted graph never grows past
 * its own container. Constant with respect to the graph's width: the heading,
 * legend and padding do not resize when the canvas does.
 */
export function cardChrome(card, graph) {
  if (!card || !graph) return 0;
  return Math.max(0, card.offsetHeight - graph.offsetHeight);
}

/**
 * Run `apply` now and again whenever the box it measured can have changed:
 * the graph element, its container, the window, and the visual viewport.
 *
 * The viewport listeners matter as much as the resize observer: a window that
 * changes height without changing any element's width never fires the observer,
 * which leaves a height-fitted graph stuck at the size the page loaded with.
 */
export function observeGraphFit(root, apply, {
  fitHeight = false,
  shouldApply = null,
  alsoObserve = [],
} = {}) {
  const guarded = () => {
    if (!root?.isConnected || !root.getClientRects().length) return;
    if (shouldApply && !shouldApply()) return;
    apply();
  };
  guarded();
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(guarded) : null;
  observer?.observe(root);
  if (root?.parentElement) observer.observe(root.parentElement);
  for (const node of alsoObserve) if (node) observer?.observe(node);
  const onViewport = () => guarded();
  if (fitHeight) {
    window.addEventListener('resize', onViewport);
    window.visualViewport?.addEventListener('resize', onViewport);
  }
  // Content that renders after the first pass changes the box once more.
  const settle = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(guarded) : null;
  return {
    apply: guarded,
    disconnect: () => {
      observer?.disconnect();
      if (fitHeight) {
        window.removeEventListener('resize', onViewport);
        window.visualViewport?.removeEventListener('resize', onViewport);
      }
      if (settle) cancelAnimationFrame(settle);
    }
  };
}
