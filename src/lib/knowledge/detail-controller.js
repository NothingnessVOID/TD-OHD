/** Knowledge owns its selection; BodyGraph history/context remain in chart.js. */
import { getKnowledgeEntry } from './registry.js';
import { renderKnowledgeDetail } from './detail-renderer.js';
import { openDetailDialog, prepareDetailDialog, closeDetailDialog, fitDetailSheetHeight } from '../detail-dialog.js';
import { t } from '../i18n.js';
import { esc } from '../format.js';

let currentQuery = null;
let currentContext = null;
let currentLibraryId = null;
let currentTrigger = null;
const clearState = () => {
  // Locale redraw replaces chart cards. Restore the equivalent new trigger if needed.
  let replacement = null;
  if (currentTrigger && !currentTrigger.isConnected) {
    const kind = currentTrigger.dataset.knowledgeVariable;
    const selector = kind ? `${currentTrigger.classList.contains('arrow-card') ? '.arrow-card' : '.foundation-variable-slot'}[data-knowledge-variable="${kind}"]`
      : `[data-knowledge-object="${currentTrigger.dataset.knowledgeObject}"]`;
    replacement = document.querySelector(selector);
  }
  currentQuery = null; currentContext = null; currentLibraryId = null; currentTrigger = null;
  replacement?.focus({ preventScroll: true });
};
export const getKnowledgeDetailState = () => currentQuery ? { query: currentQuery, context: currentContext, libraryId: currentLibraryId } : null;

function render() {
  const detail = document.getElementById('gate-detail');
  detail.innerHTML = `<div class="gate-detail-card"><div class="gate-detail-nav"><span class="gate-detail-handle" aria-hidden="true"></span><div class="gate-detail-nav-buttons"><span></span><button type="button" class="gate-detail-close" title="${esc(t('Close'))}">&times;</button></div></div><div class="gate-detail-body">${renderKnowledgeDetail(currentQuery, { variableContext: currentContext?.variable })}<button type="button" class="reference-link knowledge-library-link">${esc(t('View in the library'))}</button></div></div>`;
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
  currentQuery = query;
  currentContext = context;
  currentLibraryId = entry.objectType === 'cross' ? 'hd.cross.introduction' : entry.id;
  render();
  return true;
}
export function refreshKnowledgeDetail() {
  if (currentQuery && document.getElementById('gate-detail')?.dataset.detailOwner === 'knowledge') render();
}
export function closeKnowledgeDetail() {
  if (currentQuery) closeDetailDialog();
}
