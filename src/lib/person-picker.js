/**
 * Shared person picker: search, select one or many, create or edit in place.
 * Built on the shared operation dialog, people store and person editor.
 *
 * @param {object} options
 * @param {string} options.title            - 已翻译的对话框标题
 * @param {boolean} [options.multiple=false] - 多选；单选模式下点击行即提交
 * @param {number} [options.max=1]          - multiple 时的选择上限
 * @param {string[]} [options.selected=[]]  - 预选中的 person id
 * @param {string[]} [options.exclude=[]]   - 从列表中隐藏的 person id
 * @param {string} [options.confirmLabel]   - multiple 时的确认按钮文案（已翻译）
 * @param {string} [options.searchPlaceholder] - 已翻译
 * @param {(ids: string[]) => (void | string | Promise<void | string>)} options.onCommit
 *   - 提交选中 id。返回字符串 = 作为错误显示并保持对话框打开；返回空 = 关闭
 * @param {() => void} [options.onCancel]
 * @returns {{ close(): void }}
 */
import '../styles/person-picker.css';
import { openOperationDialog, renderDialogHeader } from './operation-dialog.js';
import { openPersonEditor } from './person-editor.js';
import { listPeople, getPerson, birthFromPerson } from './people.js';
import { esc } from './format.js';
import { t } from './i18n.js';

// Legacy Team hooks. The Team view was the first caller and its end-to-end tests
// select these ids/classes; the shared structure below uses person-picker-*
// names, so only the hooks those tests assert are carried over.
const SEARCH_ID = 'team-person-search';
const CREATE_ID = 'team-person-create';
const COUNT_ID = 'team-selection-count';
const CONFIRM_ID = 'team-selection-confirm';

export function openPersonPicker(options = {}) {
 const {
  title = '',
  multiple = false,
  max = 1,
  selected = [],
  exclude = [],
  confirmLabel = t('Confirm'),
  searchPlaceholder = t('Search name, date or ID'),
  onCommit,
  onCancel = null
 } = options;
 if (typeof onCommit !== 'function') throw new TypeError('openPersonPicker requires onCommit.');
 const limit = multiple ? Math.max(1, Math.floor(Number(max)) || 1) : 1;
 const hidden = new Set(exclude || []);
 const state = { ids: [...(selected || [])].slice(0, limit), search: '' };
 // The picker unmounts while the person editor is open and mounts again on
 // return, so "is this dialog still on screen" is tracked per mount.
 let dialog = null, liveRoot = null, closed = false;

 const showError = (root, message) => { root.querySelector('.person-picker-error').textContent = message; };

 function row(person) {
  const chosen = state.ids.includes(person.id);
  const full = multiple && !chosen && state.ids.length >= limit;
  return `<div class="person-picker-row team-picker-row"><button type="button" class="btn-secondary person-picker-choice" data-add-person="${esc(person.id)}" aria-pressed="${chosen}"${full ? ' disabled' : ''}><span class="person-picker-check" aria-hidden="true">${chosen ? '☑' : '☐'}</span><span><strong>${esc(person.name)}</strong><small>${esc(person.birthDate)} · ${esc(person.timeUnknown ? t('Estimated · 12:00') : person.birthTime)} · ${esc(person.id.slice(-6))}</small></span></button><button type="button" class="btn-secondary" data-edit-person="${esc(person.id)}">${esc(t('Edit chart'))}</button></div>`;
 }

 function mount() {
  const actions = `<div class="modal-actions"><button type="button" class="btn-secondary" data-close>${esc(t('Cancel'))}</button>${multiple ? `<button type="button" id="${CONFIRM_ID}" class="btn-primary">${esc(confirmLabel)}</button>` : ''}</div>`;
  const content = `<section class="modal person-picker team-control-dialog" aria-label="${esc(title)}">${renderDialogHeader(title)}<div class="person-picker-body"><label class="modal-field">${esc(searchPlaceholder)}<input id="${SEARCH_ID}" type="search" placeholder="${esc(searchPlaceholder)}" aria-label="${esc(searchPlaceholder)}"></label><div class="person-picker-toolbar">${multiple ? `<p class="person-picker-count" id="${COUNT_ID}" role="status"></p>` : '<span></span>'}<button type="button" class="btn-secondary" id="${CREATE_ID}">${esc(t('New person'))}</button></div><div class="person-picker-results" id="person-picker-results"></div></div><p class="person-picker-error team-layer-error" role="alert"></p>${actions}</section>`;
  const opened = openOperationDialog({
   content,
   onClose: reason => {
    // 'editor' = the picker stepped aside for the person editor and will reopen.
    // 'commit' / 'caller' are not cancellations; only an actual dismissal is.
    if (reason === 'editor') return;
    if (dialog === opened) dialog = null;
    if (reason !== 'cancel' || closed) return;
    closed = true;
    onCancel?.();
   }
  });
  dialog = opened;
  const { root, close } = opened;
  liveRoot = root;
  const search = root.querySelector(`#${SEARCH_ID}`);
  const results = root.querySelector('#person-picker-results');
  const count = root.querySelector(`#${COUNT_ID}`);
  const render = () => {
   if (count) count.textContent = t('Selected {count}/{max}', { count: state.ids.length, max: limit });
   const query = state.search.toLowerCase();
   results.innerHTML = listPeople()
    .filter(person => !hidden.has(person.id))
    .filter(person => `${person.name} ${person.birthDate} ${person.id}`.toLowerCase().includes(query))
    .map(row).join('');
  };
  // A string result keeps the dialog open: non-empty shows the error, empty
  // lets a caller pause on a nested confirmation without reporting a failure.
  const commit = async () => {
   const result = await onCommit([...state.ids]);
   if (typeof result === 'string') { if (result) showError(root, result); return; }
   if (liveRoot === root && root.isConnected) close('commit');
  };
  const edit = id => {
   const person = id ? getPerson(id) : null;
   if (id && !person) { showError(root, t('Missing reference')); return; }
   close('editor');
   openPersonEditor(person ? { ...person, ...birthFromPerson(person) } : {}, {
    create: !person,
    onCancel: mount,
    onSaved: saved => {
     if (!person && state.ids.length < limit) state.ids = [...state.ids, saved.id].slice(0, limit);
     mount();
    }
   });
  };
  search.value = state.search;
  search.oninput = () => { state.search = search.value; render(); };
  root.querySelector(`#${CREATE_ID}`).onclick = () => edit(null);
  root.querySelector(`#${CONFIRM_ID}`)?.addEventListener('click', commit);
  root.addEventListener('click', event => {
   const button = event.target.closest('button');
   if (button?.dataset.addPerson) {
    const id = button.dataset.addPerson;
    if (!multiple) { state.ids = [id]; render(); commit(); return; }
    state.ids = state.ids.includes(id) ? state.ids.filter(value => value !== id) : [...state.ids, id].slice(0, limit);
    render();
    root.querySelector(`[data-add-person="${CSS.escape(id)}"]`)?.focus();
   }
   if (button?.dataset.editPerson) edit(button.dataset.editPerson);
  });
  render();
  search.focus();
 }

 mount();
 return { close() { closed = true; dialog?.close('caller'); } };
}
