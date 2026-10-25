/**
 * Shared BodyGraph shell: one canvas with a replaceable left slot, the graph
 * itself, and a replaceable right slot.
 *
 * The home chart puts its Design and Personality planet columns in the slots.
 * The relationship view puts one person's centre-symmetric activation module in
 * each slot. Both get the same placement rule, so the slots stay on the canvas
 * beside the graph at every width instead of stacking underneath it on phones.
 *
 * The shell owns geometry only. Slots are plain elements: whatever a host puts
 * inside keeps its own semantics, styles and interaction.
 */

import { cardChrome, graphFitBudget, observeGraphFit } from './graph-fit.js';

/** Markup for a shell. `left`/`right`/`graph` are host-owned content. */
export function graphShellMarkup({ left = '', right = '', graph = '', className = '' } = {}) {
  const rootClass = className ? `ohd-graph-shell ${className}` : 'ohd-graph-shell';
  return `<div class="${rootClass}">
    <div class="ohd-graph-shell-stage">
      <div class="ohd-graph-shell-grid">
        <div class="ohd-graph-slot" data-slot="left">${left}</div>
        <div class="ohd-graph-canvas">${graph}</div>
        <div class="ohd-graph-slot" data-slot="right">${right}</div>
      </div>
    </div>
  </div>`;
}

/** Height of the tallest slot's content, so the shell never clips a slot. */
export function measureSlotContent(shell) {
  if (!shell) return 0;
  return Math.max(0, ...[...shell.querySelectorAll('.ohd-graph-slot')].map(slot => slot.scrollHeight));
}

/**
 * Width a slot asks for, declared by its content as `--ohd-slot-content-width`.
 * A host knows what it puts in the slot; the shell does not guess it.
 */
export function slotContentWidth(shell) {
  if (!shell) return 0;
  return Math.max(0, ...[...shell.querySelectorAll('.ohd-graph-slot')].map(node => {
    const inner = node.firstElementChild;
    const value = inner ? parseFloat(getComputedStyle(inner).getPropertyValue('--ohd-slot-content-width')) : NaN;
    return Number.isFinite(value) ? value : 0;
  }));
}

/**
 * Fit one shell by the home chart's rule: the canvas fills the container up to
 * its reference width and keeps its aspect ratio, while the side bands overlay
 * it from the outside edges. The bands never take width away from the graph,
 * and they never stack underneath it — on a phone they simply get narrower.
 *
 * With `fitHeight`, the canvas is also capped by the height the sticky column
 * has left. That is the rest of the home chart's rule: the natal graph is sized
 * to `viewport - sticky top - insets`, which is why its column needs no
 * scrollbar of its own. Without it a tall graph pins at the top and loses its
 * bottom edge off-screen.
 */
export function fitGraphShell(root, {
  aspect,
  idealWidth = 510,
  minSlotWidth = 76,
  fitHeight = false,
  minCanvasWidth = 220,
  maxSlotRatio = 0.28,
} = {}) {
  if (!root || !aspect) return null;
  const shell = root.matches('.ohd-graph-shell') ? root : root.querySelector('.ohd-graph-shell');
  const stage = shell?.querySelector('.ohd-graph-shell-stage');
  const canvas = shell?.querySelector('.ohd-graph-canvas');
  if (!shell || !stage || !canvas) return null;

  // The room this graph has is the shared question; how the shell spends it is
  // not. `fitHeight` only applies while the column is actually pinned, because
  // an unpinned column has no viewport edge to fit against.
  const card = shell.closest('.composite-wrap');
  const { availableWidth: available, availableHeight } = graphFitBudget(root, {
    fitHeight,
    chrome: fitHeight ? cardChrome(card, shell) : 0,
    requireSticky: true
  });

  // The home chart's rule: the canvas fills the container up to the reference
  // width, and the side bands overlay it from the outside edges. They are not
  // laid out beside the canvas, so they never take width away from the graph.
  // The height budget wins over the comfort floor: a graph that does not fit the
  // pinned card is worse than a small one, because the rest of it is off-screen
  // and unreachable. Width has its floor; height does not.
  const heightFit = availableHeight ? availableHeight * aspect : Infinity;
  const canvasWidth = Math.max(96, Math.min(available, idealWidth, heightFit));
  // A band may grow to its own content, but it never takes more than
  // `maxSlotRatio` of the canvas and the pair never meets over the graph
  // centre. The home chart does the same thing with its 76/88 step: the column
  // is sized against the graph, not against the page, so a narrow column gets a
  // narrow band instead of a band that swallows the graph.
  const cap = Math.max(Math.floor(available / 2), minSlotWidth);
  const room = Math.max(minSlotWidth, Math.round(canvasWidth * maxSlotRatio));
  const slot = Math.max(Math.min(slotContentWidth(shell), cap, room), Math.min(minSlotWidth, cap));
  const canvasHeight = canvasWidth / aspect;
  const slotContent = measureSlotContent(shell);
  const stageHeight = Math.max(canvasHeight, slotContent);

  // Write on the shell element itself: the styles read these on `.ohd-graph-shell`.
  shell.style.setProperty('--ohd-shell-slot-width', `${slot}px`);
  shell.style.setProperty('--ohd-shell-canvas-width', `${canvasWidth}px`);
  shell.style.setProperty('--ohd-shell-canvas-height', `${canvasHeight}px`);
  shell.style.setProperty('--ohd-shell-stage-width', `${available}px`);
  shell.style.setProperty('--ohd-shell-stage-height', `${stageHeight}px`);
  return { slot, canvasWidth, canvasHeight, stageWidth: available, stageHeight, slotContent };
}

/**
 * Fit on mount and whenever the box the shell measures can have changed. The
 * measuring and listener lifecycle are shared with every other graph surface;
 * see `lib/graph-fit.js`.
 */
export function observeGraphShell(root, options) {
  return observeGraphFit(root, () => fitGraphShell(root, options), { fitHeight: options?.fitHeight });
}
