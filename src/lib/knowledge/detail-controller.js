/** Knowledge owns its selection; BodyGraph history/context remain in chart.js. */
import { getKnowledgeEntry, getKnowledgeEntryById } from './registry.js';
import { renderKnowledgeDetail } from './detail-renderer.js';
import { openDetailDialog, prepareDetailDialog, closeDetailDialog, fitDetailSheetHeight } from '../detail-dialog.js';
import { t } from '../i18n.js';
import { esc } from '../format.js';

let currentQuery = null;
let currentContext = null;
let currentLibraryId = null;
let currentTrigger = null;
const knowledgeDetailHistory = [];
const clearState = () => {
  // Locale redraw replaces chart cards. Restore the equivalent new trigger if needed.
  let replacement = null;
  if (currentTrigger && !currentTrigger.isConnected) {
    const kind = currentTrigger.dataset.knowledgeVariable;
    const selector = kind ? `${currentTrigger.classList.contains('arrow-card') ? '.arrow-card' : '.foundation-variable-slot'}[data-knowledge-variable="${kind}"]`
      : `[data-knowledge-object="${currentTrigger.dataset.knowledgeObject}"]`;
    replacement = document.querySelector(selector);
  }
  knowledgeDetailHistory.length = 0;
  currentQuery = null; currentContext = null; currentLibraryId = null; currentTrigger = null;
  replacement?.focus({ preventScroll: true });
};
export const getKnowledgeDetailState = () => currentQuery ? { query: currentQuery, context: currentContext, libraryId: currentLibraryId, historyDepth: knowledgeDetailHistory.length } : null;

function render() {
  const detail = document.getElementById('gate-detail');
  detail.innerHTML = `<div class="gate-detail-card"><div class="gate-detail-nav"><span class="gate-detail-handle" aria-hidden="true"></span><div class="gate-detail-nav-buttons">${knowledgeDetailHistory.length ? `<button type="button" class="gate-detail-back">← ${esc(t('Back'))}</button>` : '<span></span>'}<button type="button" class="gate-detail-close" title="${esc(t('Close'))}">&times;</button></div></div><div class="gate-detail-body">${renderKnowledgeDetail(currentQuery, { variableContext: currentContext?.variable, definitionComponents: currentContext?.definitionComponents })}<button type="button" class="reference-link knowledge-library-link">${esc(t('View in the library'))}</button></div></div>`;
  detail.querySelector('.gate-detail-back')?.addEventListener('click', () => {
    const previous = knowledgeDetailHistory.pop();
    currentQuery = previous.query; currentContext = previous.context; currentLibraryId = previous.libraryId;
    render();
    detail.querySelector('.knowledge-jump-card')?.focus({preventScroll:true});
  });
  detail.querySelector('[data-knowledge-jump]')?.addEventListener('click', event => {
    const entry = getKnowledgeEntryById(event.currentTarget.dataset.knowledgeJump);
    if (!entry) return;
    knowledgeDetailHistory.push({query:currentQuery,context:currentContext,libraryId:currentLibraryId});
    currentQuery = {objectType:entry.objectType,objectId:entry.objectId};
    currentContext = null; currentLibraryId = entry.id;
    render();
    detail.querySelector('.gate-detail-back')?.focus({preventScroll:true});
  });
  detail.querySelectorAll('[data-knowledge-gate]').forEach(button => button.addEventListener('click', () => {
    // Navigation only: chart owns the existing Gate renderer and its return stack.
    window.dispatchEvent(new CustomEvent('ohd-open-knowledge-gate', { detail: {
      gate: Number(button.dataset.knowledgeGate),
      source: { side: button.dataset.sourceSide, planet: button.dataset.sourcePlanet },
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
  fitDetailSheetHeight(detail.querySelector('.gate-detail-card'));
}
export function openKnowledgeDetail(query, context = null) {
  const entry = getKnowledgeEntry(query);
  if (!entry || entry.objectType === 'cognition') return false;
  prepareDetailDialog(document.getElementById('gate-detail'), 'knowledge');
  if (!currentQuery) currentTrigger = document.activeElement;
  knowledgeDetailHistory.length = 0;
  currentQuery = query;
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
