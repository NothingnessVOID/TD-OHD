/** Knowledge owns its selection; BodyGraph history/context remain in chart.js. */
import { getKnowledgeEntry, getKnowledgeEntryById } from './registry.js';
import { renderKnowledgeDetail } from './detail-renderer.js';
import { openDetailDialog, prepareDetailDialog, closeDetailDialog, fitDetailSheetHeight } from '../detail-dialog.js';
import { t } from '../i18n.js';
import { renderDetailNavigation } from '../object-detail-heading.js';
import { esc } from '../format.js';
import { bindQuarterReadingSwitch } from './quarter-detail.js';

let currentQuery = null;
let currentContext = null;
let currentLibraryId = null;
let currentTrigger = null;
// Quarter reading category lives in currentContext.quarterLens so Back and language refresh restore it.
let disposeQuarterSwitch = null;
const knowledgeDetailHistory = [];
const clearState = () => {
  // Locale redraw replaces chart cards. Restore the equivalent new trigger if needed.
  let replacement = null;
  if (currentTrigger && !currentTrigger.isConnected) {
    // Quarter entry is a new stable id; try it before the existing Knowledge trigger shapes.
    const quarterId = currentTrigger.dataset.quarterDetail;
    const kind = currentTrigger.dataset.knowledgeVariable;
    const selector = quarterId ? `[data-quarter-detail="${quarterId}"]`
      : kind ? `${currentTrigger.classList.contains('arrow-card') ? '.arrow-card' : '.foundation-variable-slot'}[data-knowledge-variable="${kind}"]`
      : `[data-knowledge-object="${currentTrigger.dataset.knowledgeObject}"]`;
    replacement = document.querySelector(selector);
  }
  knowledgeDetailHistory.length = 0;
  currentQuery = null; currentContext = null; currentLibraryId = null; currentTrigger = null;
  disposeQuarterSwitch?.(); disposeQuarterSwitch = null;
  replacement?.focus({ preventScroll: true });
};
export const getKnowledgeDetailState = () => currentQuery ? { query: currentQuery, context: currentContext, libraryId: currentLibraryId, historyDepth: knowledgeDetailHistory.length } : null;

function render() {
  const detail = document.getElementById('gate-detail');
  detail.innerHTML = `<div class="gate-detail-card"><div class="gate-detail-nav">${renderDetailNavigation({ canGoBack: knowledgeDetailHistory.length > 0 }).replace(" data-shared-back", "")}</div><div class="gate-detail-body">${renderKnowledgeDetail(currentQuery, { variableContext: currentContext?.variable, definitionComponents: currentContext?.definitionComponents, quarterContext: currentContext?.quarter ?? null, quarterLens: currentContext?.quarterLens ?? 'hd' })}<button type="button" class="reference-link knowledge-library-link">${esc(t('View in the library'))}</button></div></div>`;
  detail.querySelector('.gate-detail-back')?.addEventListener('click', () => {
    const previous = knowledgeDetailHistory.pop();
    currentQuery = previous.query; currentContext = previous.context; currentLibraryId = previous.libraryId;
    render();
    detail.querySelector('.knowledge-jump-card')?.focus({preventScroll:true});
  });
  detail.querySelectorAll('[data-knowledge-jump]').forEach(button=>button.addEventListener('click', event => {
    const entry = getKnowledgeEntryById(event.currentTarget.dataset.knowledgeJump);
    if (!entry) return;
    knowledgeDetailHistory.push({query:currentQuery,context:currentContext,libraryId:currentLibraryId});
    currentQuery = {objectType:entry.objectType,objectId:entry.objectId};
    currentContext = null; currentLibraryId = entry.id;
    render();
    detail.querySelector('.gate-detail-back')?.focus({preventScroll:true});
  }));
  detail.querySelectorAll('[data-knowledge-gate]').forEach(button => button.addEventListener('click', () => {
    // Navigation only: chart owns the existing Gate renderer and its return stack.
    window.dispatchEvent(new CustomEvent('ohd-open-knowledge-gate', { detail: {
      gate: Number(button.dataset.knowledgeGate),
      source: { side: button.dataset.sourceSide, planet: button.dataset.sourcePlanet },
      returnKnowledge: { query: currentQuery, context: currentContext, activation: button.dataset.activation }
    } }));
  }));
  detail.querySelectorAll('[data-quarter-gate]').forEach(button => button.addEventListener('click', () => {
    // Same Knowledge → Gate bridge; the quarter keeps its context and selected reading category.
    window.dispatchEvent(new CustomEvent('ohd-open-knowledge-gate', { detail: {
      gate: Number(button.dataset.quarterGate),
      source: null,
      returnKnowledge: { query: currentQuery, context: currentContext, activation: button.dataset.activation }
    } }));
  }));
  detail.querySelector('.knowledge-library-link').addEventListener('click', () => {
    const id = currentLibraryId;
    closeDetailDialog();
    // Existing Reference navigation infrastructure owns URL/history and view changes.
    window.dispatchEvent(new CustomEvent('ohd-open-knowledge-reference', { detail: { id } }));
  });
  openDetailDialog(detail, clearState, { owner: 'knowledge', label: t('Knowledge details') });
  disposeQuarterSwitch?.();
  disposeQuarterSwitch = null;
  // Bind the article node, not the shared sheet: another owner replacing this content drops the listener with it.
  const quarterArticle = detail.querySelector('[data-quarter-article]');
  if (quarterArticle) disposeQuarterSwitch = bindQuarterReadingSwitch(quarterArticle, { onChange: lens => {
    // Immutable update: any returnKnowledge snapshot already taken keeps its own category.
    currentContext = { ...(currentContext ?? {}), quarterLens: lens };
  } });
  fitDetailSheetHeight(detail.querySelector('.gate-detail-card'));
}
export function openKnowledgeDetail(query, context = null) {
  const entry = getKnowledgeEntry(query);
  if (!entry || entry.objectType === 'cognition') return false;
  prepareDetailDialog(document.getElementById('gate-detail'), 'knowledge');
  if (!currentQuery) currentTrigger = document.activeElement;
  knowledgeDetailHistory.length = 0;
  currentQuery = query;
  // Context carries the selected quarter category when returning from a gate; a fresh open is hd.
  currentContext = context;
  currentLibraryId = entry.properties.introductionKnowledgeId ?? entry.id;
  render();
  return true;
}
export function refreshKnowledgeDetail() {
  if (currentQuery && document.getElementById('gate-detail')?.dataset.detailOwner === 'knowledge') render();
}
export function closeKnowledgeDetail() {
  if (currentQuery) closeDetailDialog();
}
