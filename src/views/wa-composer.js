import '../styles/wa-composer.css';
import '../lib/wa/composer-messages.js';
import { t } from '../lib/i18n.js';
import { esc } from '../lib/format.js';
import { listPeople, getPerson, birthFromPerson } from '../lib/people.js';
import { listTeams as savedTeams } from '../lib/team-repository.js';
import { openPersonEditor } from '../lib/person-editor.js';
import { openOperationDialog } from '../lib/operation-dialog.js';
import { WA_ROLES, assertWaSnapshot } from '../lib/wa/model.js';
import { ensureWaComposerSlots, replaceWaSelection, waPersonIdsFromTeamGroup } from '../lib/wa/configuration.js';

const clone = value => structuredClone(value);
const msg = (key, params) => t(`Wa composer ${key}`, params);
const text = (key, params) => esc(msg(key, params));

/**
 * Draft-only composer. onCommit(next, context) must validate and atomically replace the
 * host draft, not save an entire Wa. Return false (or throw) to keep this editor open.
 * context = { originalSnapshot, annotationChanges:[{beforeSnapshot,issues}], isCurrent }.
 * The host retains these before snapshots when accepting annotation cleanup. No repo,
 * chart computation or birth persistence is owned here (only the public person editor).
 * validate() should capture the host's object/generation token. An async onCommit must
 * check context.isCurrent() immediately before its mutation. close() disposes children.
 */
export function openWaComposer({ snapshot, peopleStore = { list: listPeople, get: getPerson },
  listTeams = savedTeams, target = null, mode = 'people', validate = () => true, onCommit, onClose = null } = {}) {
  if (typeof onCommit !== 'function') throw new TypeError('Wa composer requires onCommit.');
  const originalSnapshot = clone(assertWaSnapshot(snapshot));
  const originalIdentity = JSON.stringify(snapshot);
  let draft = ensureWaComposerSlots(snapshot), generation = 0, closed = false, committing = false;
  let editorRoot = null;
  const children = new Set(), annotationChanges = [];
  const person = id => peopleStore.get(id);
  const member = id => draft.members.find(item => item.memberId === id);
  const personName = id => person(id)?.name || draft.members.find(item => item.personId === id)?.labelSnapshot || id;
  const memberName = id => member(id) ? personName(member(id).personId) : id;
  const groupName = id => {
    if (id === 'alpha') return 'Alpha';
    const group = draft.pentas.find(item => item.pentaId === id);
    return `Penta ${String.fromCharCode(65 + WA_ROLES.indexOf(group?.role))}${group?.title ? ` · ${group.title}` : ''}`;
  };
  const idsFor = id => (id === 'alpha' ? (draft.alphaId ? [draft.alphaId] : [])
    : draft.pentas.find(item => item.pentaId === id)?.memberIds || []).map(id => member(id).personId);
  const current = () => !closed && JSON.stringify(snapshot) === originalIdentity && validate() !== false;
  const checkCurrent = () => { if (!current()) throw Object.assign(new Error(msg('changed')), { code: 'COMPOSER_STALE' }); };
  const allPeople = () => new Map(peopleStore.list().map(item => [item.id, item]));
  const assignment = id => {
    const item = draft.members.find(item => item.personId === id);
    if (!item) return null;
    if (draft.alphaId === item.memberId) return 'alpha';
    return draft.pentas.find(group => group.memberIds.includes(item.memberId))?.pentaId || null;
  };
  const describeError = error => {
    if (error?.code === 'SELECTION_CONFLICT') {
      const issue = error.issues[0];
      return msg('conflict', { name: personName(issue.personId), targets: issue.targets.map(groupName).join(' / ') });
    }
    return msg(({ COMPOSER_STALE: 'changed', MISSING_PERSON_REFERENCE: 'missing', GROUP_TOO_LARGE: 'limit', DUPLICATE_PERSON_ID: 'duplicate' })[error?.code] || 'failed');
  };
  const errorAt = (root, error) => { root.querySelector('[data-error]').textContent = describeError(error); };
  const shell = (title, body) => `<section class="modal wa-composer" aria-label="${esc(title)}"><header><h2 class="modal-title">${esc(title)}</h2><button type="button" class="ui-icon-button" data-close aria-label="${text('close')}">×</button></header>${body}<p data-error class="wa-composer-error" role="alert"></p></section>`;
  const actions = (key, label) => `<div class="modal-actions"><button type="button" data-close>${text('cancel')}</button><button type="button" class="btn-primary" data-${key}>${text(label)}</button></div>`;
  function child(title, body, onDismiss = null) {
    const opened = openOperationDialog({ content: shell(title, body), onClose: reason => { children.delete(opened); onDismiss?.(reason); } });
    children.add(opened);
    return opened;
  }
  const main = openOperationDialog({
    content: shell(msg('title'), `<p class="wa-composer-note">${text('draft hint')}</p><label class="modal-field">${text('organization')}<input data-org-title maxlength="300" value="${esc(draft.title)}"></label><div data-cards class="wa-composer-cards"></div><p class="wa-composer-note">${text('group hint')}</p>${actions('apply', 'apply')}`),
    onClose: reason => {
      closed = true;
      editorRoot?.querySelector('[data-close]')?.click();
      for (const opened of [...children].reverse()) opened.close();
      onClose?.(reason);
    }
  });
  main.root.querySelector('[data-org-title]').oninput = event => { draft.title = event.target.value; generation++; };
  function renderCards() {
    const focused = document.activeElement;
    const restore = main.root.contains(focused) ? { pick: focused.dataset.pick, import: focused.dataset.import } : null;
    main.root.querySelector('[data-cards]').innerHTML = ['alpha', ...WA_ROLES.map(role => draft.pentas.find(group => group.role === role).pentaId)].map(id => {
      const group = draft.pentas.find(item => item.pentaId === id), ids = idsFor(id);
      return `<article class="wa-composer-card" data-target="${esc(id)}"><div class="wa-composer-card-heading"><h3>${id === 'alpha' ? 'Alpha' : `Penta ${String.fromCharCode(65 + WA_ROLES.indexOf(group.role))}`}</h3><span>${ids.length} / ${id === 'alpha' ? 1 : 5}</span></div>${group ? `<label class="modal-field">${text('group name')}<input data-group-title="${esc(id)}" value="${esc(group.title)}"></label>` : `<p class="wa-composer-note">${text('alpha hint')}</p>`}<div class="wa-composer-chips">${ids.map(personId => `<span class="wa-composer-chip">${esc(personName(personId))}${person(personId) ? '' : ` · ${text('missing')}`}</span>`).join('') || `<span class="wa-composer-note">${text('empty')}</span>`}</div><div class="wa-composer-card-actions"><button type="button" class="btn-secondary" data-pick="${esc(id)}">${text('select')}</button>${group ? `<button type="button" class="btn-secondary" data-import="${esc(id)}">${text('import')}</button>` : ''}</div></article>`;
    }).join('');
    main.root.querySelectorAll('[data-group-title]').forEach(input => { input.oninput = () => { draft.pentas.find(group => group.pentaId === input.dataset.groupTitle).title = input.value; generation++; }; });
    main.root.querySelectorAll('[data-pick]').forEach(button => { button.onclick = () => picker(button.dataset.pick); });
    main.root.querySelectorAll('[data-import]').forEach(button => { button.onclick = () => importer(button.dataset.import); });
    if (restore?.pick || restore?.import) {
      [...main.root.querySelectorAll('[data-pick],[data-import]')].find(button => restore.pick ? button.dataset.pick === restore.pick : button.dataset.import === restore.import)?.focus({ preventScroll: true });
    }
  }
  function cleanupConfirmation(issues) {
    return new Promise(resolve => {
      const labels = { MANUAL_EDGE_ENDPOINT_NOT_PARTICIPANT: 'edge', ALLY_NOT_PARTICIPANT: 'ally', UNKNOWN_METADATA_MEMBER: 'metadata', CONSULTATION_UNKNOWN_PENTA: 'area' };
      const details = issues.map(issue => {
        const annotation = issue.annotation;
        const name = issue.code === 'MANUAL_EDGE_ENDPOINT_NOT_PARTICIPANT'
          ? `${memberName(annotation.fromMemberId)} → ${memberName(annotation.toMemberId)}`
          : issue.code === 'ALLY_NOT_PARTICIPANT' ? memberName(annotation) : annotation?.memberId ? memberName(annotation.memberId) : groupName(annotation?.pentaId);
        return `<li><strong>${text(labels[issue.code] || 'metadata')} · ${esc(name)}</strong><pre>${esc(JSON.stringify(annotation, null, 2))}</pre></li>`;
      }).join('');
      const opened = child(msg('cleanup title'), `<p>${text('cleanup hint')}</p><ul class="wa-composer-annotations">${details}</ul>${actions('cleanup', 'cleanup confirm')}`, reason => resolve(reason === 'confirm'));
      opened.root.querySelector('[data-cleanup]').onclick = () => opened.close('confirm');
    });
  }
  async function applySelection(targetId, ids, opened) {
    if (opened.busy) return;
    opened.busy = true;
    const before = draft, token = generation, captured = clone(draft);
    const patch = targetId === 'alpha' ? { alphaPersonId: ids[0] ?? null } : { groups: [{ pentaId: targetId, personIds: [...ids] }] };
    try {
      checkCurrent();
      if (ids.length > (targetId === 'alpha' ? 1 : 5)) throw Object.assign(new Error(), { code: 'GROUP_TOO_LARGE' });
      const people = allPeople();
      let next;
      try { next = replaceWaSelection(captured, patch, people); }
      catch (error) {
        if (error.code !== 'ANNOTATION_CLEANUP_REQUIRED') throw error;
        if (!await cleanupConfirmation(error.issues)) return;
        checkCurrent();
        if (!opened.root.isConnected || before !== draft || token !== generation) throw Object.assign(new Error(), { code: 'COMPOSER_STALE' });
        next = replaceWaSelection(captured, patch, allPeople(), { confirmAnnotationCleanup: true });
        annotationChanges.push({ beforeSnapshot: captured, issues: clone(error.issues) });
      }
      checkCurrent();
      draft = next; generation++;
      opened.close('confirm'); renderCards();
    } catch (error) { if (opened.root.isConnected) errorAt(opened.root, error); }
    finally { opened.busy = false; }
  }
  function picker(targetId) {
    if (closed || committing) return;
    if (targetId !== 'alpha' && !draft.pentas.some(group => group.pentaId === targetId)) {
      errorAt(main.root, new Error()); return;
    }
    const selection = { ids: idsFor(targetId), search: '' }, max = targetId === 'alpha' ? 1 : 5;
    const opened = child(`${msg('select')} · ${groupName(targetId)}`, `<label class="modal-field">${text('search')}<input data-search type="search"></label><p data-count role="status"></p><div data-chips class="wa-composer-chips"></div><button type="button" data-create>${text('create')}</button><p class="wa-composer-note">${text('person hint')}</p><div data-results class="wa-composer-results"></div>${actions('selection', 'confirm')}`);
    const { root } = opened;
    const render = () => {
      if (closed || !root.isConnected) return;
      root.querySelector('[data-count]').textContent = msg('count', { count: selection.ids.length, max });
      root.querySelector('[data-chips]').innerHTML = selection.ids.map(id => `<button type="button" class="wa-composer-chip" data-deselect="${esc(id)}" aria-label="${text('remove', { name: personName(id) })}">${esc(personName(id))} ×</button>`).join('');
      const results = peopleStore.list().filter(record => `${record.name} ${record.birthDate || ''} ${record.id}`.toLowerCase().includes(selection.search.toLowerCase()));
      root.querySelector('[data-results]').innerHTML = results.map(record => {
        const selected = selection.ids.includes(record.id), assigned = assignment(record.id), conflict = assigned && assigned !== targetId;
        return `<div class="wa-composer-person"><button type="button" class="btn-secondary wa-composer-choice" data-person="${esc(record.id)}" aria-pressed="${selected}" ${!selected && (selection.ids.length >= max || conflict) ? 'disabled' : ''}><span aria-hidden="true">${selected ? '☑' : '☐'}</span><span><strong>${esc(record.name)}</strong><small>${esc(record.birthDate || '')} · ${esc(record.id.slice(-6))}${conflict ? ` · ${text('assigned', { target: groupName(assigned) })}` : ''}</small></span></button><button type="button" class="btn-secondary" data-edit="${esc(record.id)}">${text('edit')}</button></div>`;
      }).join('') || `<p class="wa-composer-note">${text('no results')}</p>`;
    };
    const edit = id => {
      try {
        checkCurrent();
        const record = id ? person(id) : null;
        if (id && !record) throw Object.assign(new Error(), { code: 'MISSING_PERSON_REFERENCE' });
        // Keep the picker mounted underneath: its search, selection and focus survive.
        openPersonEditor(record ? { ...record, ...birthFromPerson(record) } : {}, {
          create: !id,
          onCancel: () => { editorRoot = null; render(); },
          onSaved: saved => {
            editorRoot = null;
            if (closed || !root.isConnected) return;
            if (!id && selection.ids.length < max && !selection.ids.includes(saved.id)) selection.ids.push(saved.id);
            render(); renderCards();
          }
        });
        editorRoot = document.activeElement?.closest('.person-editor') || null;
      } catch (error) { errorAt(root, error); }
    };
    root.querySelector('[data-search]').oninput = event => { selection.search = event.target.value; render(); };
    root.querySelector('[data-create]').onclick = () => edit(null);
    root.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button || button.disabled) return;
      const id = button.dataset.person || button.dataset.deselect;
      if (id) {
        if (selection.ids.includes(id)) selection.ids = selection.ids.filter(item => item !== id);
        else if (selection.ids.length < max) selection.ids.push(id);
        render();
        [...root.querySelectorAll('[data-person]')].find(item => item.dataset.person === id)?.focus();
      }
      if (button.dataset.edit) edit(button.dataset.edit);
    });
    root.querySelector('[data-selection]').onclick = () => applySelection(targetId, selection.ids, opened);
    render(); root.querySelector('[data-search]').focus();
  }
  async function importer(targetId) {
    const opened = child(`${msg('import')} · ${groupName(targetId)}`, `<p class="wa-composer-note">${text('origin', { origin: location.origin })}</p><p>${text('import hint')}</p><div data-import-list class="wa-composer-imports" aria-busy="true"></div><div class="modal-actions"><button type="button" data-close>${text('cancel')}</button></div>`);
    try {
      const teams = clone(await listTeams());
      if (closed || !opened.root.isConnected) return;
      const entries = teams.flatMap(team => team.groups.map(group => ({ team, group })));
      const list = opened.root.querySelector('[data-import-list]');
      list.innerHTML = entries.map(({ team, group }, index) => `<button type="button" class="btn-secondary wa-composer-import-row" data-import-index="${index}"><strong>${esc(team.name || msg('unnamed team'))} / ${esc(group.label || msg('unnamed group'))}</strong><span>${text('import count', { count: group.memberIds.length })}</span><small>${group.memberIds.map(id => { const ref = team.members.find(item => item.memberId === id); return esc(ref ? person(ref.personId)?.name || ref.labelSnapshot : msg('missing')); }).join(' · ') || text('empty')}</small></button>`).join('') || `<p>${text('no teams')}</p>`;
      list.onclick = event => {
        const button = event.target.closest('[data-import-index]');
        if (!button) return;
        try {
          const { team, group } = entries[Number(button.dataset.importIndex)];
          const ids = waPersonIdsFromTeamGroup(team, group.pentaId);
          if (ids.some(id => !person(id))) throw Object.assign(new Error(), { code: 'MISSING_PERSON_REFERENCE' });
          applySelection(targetId, ids, opened);
        } catch (error) { errorAt(opened.root, error); }
      };
    } catch (error) { if (opened.root.isConnected) errorAt(opened.root, error); }
    finally { opened.root.querySelector('[data-import-list]').setAttribute('aria-busy', 'false'); }
  }
  main.root.querySelector('[data-apply]').onclick = async () => {
    if (committing) return;
    try {
      checkCurrent(); assertWaSnapshot(draft);
      committing = true;
      main.root.querySelector('[data-apply]').disabled = true;
      const token = generation;
      const context = { originalSnapshot: clone(originalSnapshot), annotationChanges: clone(annotationChanges), isCurrent: () => current() && generation === token };
      const accepted = await onCommit(clone(draft), context);
      if (accepted === false) throw Object.assign(new Error(), { code: 'COMPOSER_STALE' });
      if (!closed) main.close('commit');
    } catch (error) { if (!closed) errorAt(main.root, error); }
    finally { committing = false; if (!closed) main.root.querySelector('[data-apply]').disabled = false; }
  };
  renderCards();
  if (target !== null) {
    if (mode === 'import' && draft.pentas.some(group => group.pentaId === target)) importer(target);
    else picker(target);
  }
  return { close: () => main.close(), getDraft: () => clone(draft) };
}
