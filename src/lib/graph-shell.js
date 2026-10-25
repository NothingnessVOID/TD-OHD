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
 * Width the canvas may take while the sticky column still fits the viewport.
 * Mirrors the home chart's height budget: viewport minus the column's sticky
 * top, minus everything in the card that is not the graph. Returns Infinity
 * when the column is not sticky, so the width rules decide alone.
 */
function heightFitWidth({ root, shell, aspect, fitHeight, minCanvasWidth }) {
  if (!fitHeight) return Infinity;
  const column = root.closest('.chart-column');
  if (!column || getComputedStyle(column).position !== 'sticky') return Infinity;
  const viewport = window.visualViewport?.height ?? document.documentElement.clientHeight;
  const stickyTop = parseFloat(getComputedStyle(column).top) || 0;
  // The card's own chrome — heading, legend, padding — is fixed, so subtracting
  // the shell from the card leaves a constant that does not depend on the width
  // we are about to pick.
  const card = shell.closest('.composite-wrap');
  const chrome = card ? Math.max(0, card.offsetHeight - shell.offsetHeight) : 0;
  const budget = viewport - stickyTop - chrome;
  if (!(budget > 0)) return Infinity;
  return Math.max(minCanvasWidth, budget * aspect);
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
} = {}) {
  if (!root || !aspect) return null;
  const shell = root.matches('.ohd-graph-shell') ? root : root.querySelector('.ohd-graph-shell');
  const stage = shell?.querySelector('.ohd-graph-shell-stage');
  const canvas = shell?.querySelector('.ohd-graph-canvas');
  if (!shell || !stage || !canvas) return null;

  const style = getComputedStyle(root);
  const available = Math.max(1, root.clientWidth
    - (parseFloat(style.paddingLeft) || 0)
    - (parseFloat(style.paddingRight) || 0));

  // The home chart's rule: the canvas fills the container up to the reference
  // width, and the side bands overlay it from the outside edges. They are not
  // laid out beside the canvas, so they never take width away from the graph.
  const canvasWidth = Math.min(available, idealWidth,
    heightFitWidth({ root, shell, aspect, fitHeight, minCanvasWidth }));
  // A band may grow to its own content, but the pair is capped at the
  // container width so the two sides can never meet over the graph centre.
  const cap = Math.max(Math.floor(available / 2), minSlotWidth);
  const slot = Math.max(Math.min(slotContentWidth(shell), cap), Math.min(minSlotWidth, cap));
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
 * Fit on mount, whenever the shell or its container changes size, and — when the
 * fit depends on the viewport height — whenever the viewport itself changes.
 * The home chart arms the same three listeners for the same reason: a column
 * that fits the screen has to notice the screen changing.
 */
export function observeGraphShell(root, options) {
  const apply = () => { if (root?.isConnected && root.getClientRects().length) fitGraphShell(root, options); };
  apply();
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(apply) : null;
  observer?.observe(root);
  if (root?.parentElement) observer.observe(root.parentElement);
  const onViewport = () => apply();
  if (options?.fitHeight) {
    window.addEventListener('resize', onViewport);
    window.visualViewport?.addEventListener('resize', onViewport);
  }
  // Slot content renders after the first fit; re-fit once it has settled.
  const settle = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(apply) : null;
  return {
    apply,
    disconnect: () => {
      observer?.disconnect();
      if (options?.fitHeight) {
        window.removeEventListener('resize', onViewport);
        window.visualViewport?.removeEventListener('resize', onViewport);
      }
      if (settle) cancelAnimationFrame(settle);
    }
  };
}
