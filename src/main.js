/**
 * Open Human Design — entry point.
 *
 * Slim orchestrator: theme, navigation, boot sequence, people switcher.
 * The views live in src/views/, calculation in src/lib/chartdata.js,
 * persistence in src/lib/people.js (backed by local birth profiles).
 */

import { syncPopoverHeading, setupSyncPopoverDismiss } from './lib/sync-popover-ui.js';
import { closeDetailDialog } from './lib/detail-dialog.js';
import { refreshKnowledgeDetail } from './lib/knowledge/detail-controller.js';
import './lib/knowledge/detail-access.css';
import { computeChart, sensitivityCheck, invalidateBirth } from './lib/chartdata.js';
import { openPersonEditor } from './lib/person-editor.js';
import { presentationIdentity } from './lib/person-input.js';
import { esc } from './lib/format.js';
import { listPeople, getPerson, savePerson, deletePerson, birthFromPerson, getLastPersonId, setLastPersonId, enableSync, setAiAccess, getAiAccess, setSharedGuest, onPeopleChange } from './lib/people.js';
import { syncAvailable, getSessionUser, requestMagicLink, signOut, startSync } from './lib/sync.js';
import { paramsToBirth, birthToParams } from './lib/share.js';
import { configureShareMenu } from './lib/view-share.js';
import { setupEntryView } from './views/entry.js';
import { renderChartView, setupPanelTabs, rerenderBodygraph, refreshChartLanguage, clearCurrentChart } from './views/chart.js';
import { invalidateTransits, setupTransitView, renderTransits, refreshTransitLanguage, getCurrentTransitExportData } from './views/transits.js';
import { invalidateConnection, refreshConnectionPeople, setupConnectionView, renderConnectionView, compareWithGuest, rerenderConnectionGraphs, refreshConnectionLanguage } from './views/connection.js';
import { setupTeamView, renderTeamView, refreshTeamLanguage } from './views/team.js';
import { localMode, reportSaveFailure } from './lib/local-store.js';
import { LOCALES, t, getLocale, setLocale, onLocaleChange, translatePage, setMessage, setHtmlMessage } from './lib/i18n.js';
import { setupTimelineView, timelineLanguageOptions } from './views/timeline.js';
import { setupReferenceView, renderReferenceView, openReference, deactivateReferenceDetail } from './views/reference.js';
import { getTheme, initAppearance, onAppearanceChange, setTheme } from './lib/appearance.js';
import { setupAppearanceControls } from './lib/appearance-controls.js';
import { onFontPreferenceChange } from './lib/font-preference.js';

// ==========================================
// State
// ==========================================
let currentData = null; // { birth, chart, geneKeys, sensitivity }
let birthRequest = 0;
let loadingPersonId = null;
let pendingCompare = false; // a connection invite is waiting for the visitor's own chart
let entryApi = null;
let timelineView = null;
const shareDataProviders = { transits: getCurrentTransitExportData, timeline: () => timelineView?.getCurrentTransitExportData() };
let localAccountUi = null;
let initialized = false;

// Language is a display preference, independent of chart storage and accounts.
function setupLanguageSwitcher() {
  const select = document.getElementById('language-switcher');
  select.innerHTML = LOCALES.map(({ code, label }) => `<option value="${code}" lang="${code}">${label}</option>`).join('');
  select.value = getLocale();
  select.addEventListener('change', () => setLocale(select.value));
  const menu = document.getElementById('language-menu');
  const actions = menu.querySelector('.language-actions');
  actions.innerHTML = LOCALES.map(({ code, label }) => `<button type="button" class="btn-secondary btn-small" data-language="${code}" lang="${code}">${label}</button>`).join('');
  const refreshChoices = () => actions.querySelectorAll('[data-language]').forEach(button =>
    button.setAttribute('aria-pressed', String(button.dataset.language === getLocale())));
  refreshChoices();
  actions.addEventListener('click', event => {
    const button = event.target.closest('[data-language]');
    if (!button) return;
    setLocale(button.dataset.language);
    menu.open = false;
    menu.querySelector('summary').focus();
  });
  translatePage();
  document.documentElement.removeAttribute('data-booting');
  onLocaleChange(() => {
    select.value = getLocale();
    refreshChoices();
    translatePage();
    if (!initialized) return;
    const chartVisible = !document.getElementById('chart-view').classList.contains('hidden');
    if (currentData) refreshChartLanguage();
    refreshKnowledgeDetail();
    document.getElementById('chart-view').classList.toggle('hidden', !chartVisible);
    renderPeopleSwitcher();
    entryApi?.refreshLanguage();
    refreshConnectionLanguage();
    refreshTeamLanguage();
    refreshTransitLanguage();
    timelineView?.setLanguage(timelineLanguageOptions());
    if (!document.getElementById('library-view').classList.contains('hidden')) renderReferenceView({ languageChange: true });
    localAccountUi?.refreshLocalLanguage();
    configureShareMenu(document.querySelector('.nav-link.active')?.dataset.view || 'chart', currentData, shareDataProviders);
  });
}

// ==========================================
// Appearance
// ==========================================
function refreshAppearanceGraphs() {
  // SVG colors are read from skin tokens at render time. CSS-only details,
  // legends and planetary rows update as soon as the root attributes change.
  if (currentData) {
    rerenderBodygraph();
    rerenderConnectionGraphs();
    if (!document.getElementById('transits-view').classList.contains('hidden')) renderTransits();
    timelineView?.refresh();
  }
}

function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

// ==========================================
// Navigation
// ==========================================
const VIEWS = ['chart', 'transits', 'connection', 'team', 'timeline', 'library'];

function showView(view, { fromHistory = false } = {}) {
  if (!VIEWS.includes(view)) return;
  if (view === 'library' && !location.hash.startsWith('#library') && !fromHistory) {
    openReference();
    return;
  }
  // A reference route redraw must not run its user-dismiss callback.
  if (view !== 'library') deactivateReferenceDetail();
  if (view !== 'library' || document.getElementById('reference-mobile-detail')?.dataset.detailOwner !== 'reference') closeDetailDialog();
  if (view !== 'timeline') timelineView?.deactivate();
  if (view !== 'library' && location.hash.startsWith('#library') && !fromHistory) {
    history.pushState({ ohdView: view }, '', `${location.pathname}${location.search}`);
  }
  document.body.classList.toggle('timeline-active', view === 'timeline' && !!currentData);
  document.body.classList.remove('mobile-nav-open');
  document.getElementById('mobile-menu-toggle').setAttribute('aria-expanded', 'false');
  configureShareMenu(view, currentData, shareDataProviders);

  document.querySelectorAll('.nav-link').forEach(l =>
    l.classList.toggle('active', l.dataset.view === view));
  const activeLink = document.querySelector(`.nav-link[data-view="${view}"]`);
  const nav = activeLink?.parentElement;
  if (nav && nav.scrollWidth > nav.clientWidth) {
    nav.scrollLeft = activeLink.offsetLeft - nav.offsetLeft - (nav.clientWidth - activeLink.offsetWidth) / 2;
  }

  for (const v of VIEWS) {
    document.getElementById(`${v}-view`).classList.add('hidden');
  }
  document.getElementById('chart-required-view').classList.add('hidden');
  document.getElementById('birth-entry').classList.toggle('hidden', !!currentData || view !== 'chart');

  if (!currentData && view !== 'library' && view !== 'team') {
    if (view !== 'chart') document.getElementById('chart-required-view').classList.remove('hidden');
    return;
  }
  document.getElementById(`${view}-view`).classList.remove('hidden');

  // Per-view refresh on open
  if (view === 'transits') renderTransits();
  if (view === 'connection') renderConnectionView();
  if (view === 'team') renderTeamView();
  if (view === 'timeline') timelineView?.activate();
  if (view === 'library') {
    renderReferenceView();
  }
}

function setupNavigation() {
  const menu = document.getElementById('mobile-menu-toggle');
  menu.addEventListener('click', () => {
    const open = !document.body.classList.contains('mobile-nav-open');
    document.body.classList.toggle('mobile-nav-open', open);
    menu.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.header') && !event.target.closest('.tl-mobile-exit')) {
      document.body.classList.remove('mobile-nav-open');
      menu.setAttribute('aria-expanded', 'false');
    }
  });
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => showView(link.dataset.view));
  });
  document.getElementById('chart-required-entry').addEventListener('click', () => {
    showView('chart');
    const first = ['birth-date', 'birth-time', 'birth-place'].find(id =>
      id !== 'birth-time' || !document.getElementById('time-unknown').checked
        ? !document.getElementById(id).value : false);
    document.getElementById(first || 'birth-date').focus();
  });
  window.addEventListener('ohd-reference-navigation', () => showView('library', { fromHistory: true }));
  window.addEventListener('popstate', event => showView(location.hash.startsWith('#library') ? 'library' : event.state?.ohdView || 'chart', { fromHistory: true }));
  window.addEventListener('hashchange', () => showView(location.hash.startsWith('#library') ? 'library' : history.state?.ohdView || 'chart', { fromHistory: true }));
}

// ==========================================
// People switcher (header)
// ==========================================
function renderPeopleSwitcher() {
  const select = document.getElementById('people-switcher');
  const people = listPeople();
  if (!people.length && !currentData) {
    select.classList.add('hidden');
    return;
  }
  select.classList.remove('hidden');
  const currentId = currentData?.birth?.id || '';
  const unsaved = currentData && !currentData.birth.id
    ? `<option value="__current" selected>${esc(currentData.birth.name) || t('Current chart')}</option>` : '';
  // Never impersonate a loaded person: when nothing is loaded, show an
  // explicit placeholder instead of letting the browser display option #1.
  const placeholder = !currentData && people.length
    ? `<option value="" selected disabled>${t('— saved charts —')}</option>` : '';
  select.innerHTML = `
    ${placeholder}
    ${unsaved}
    ${people.map(p => `<option value="${esc(p.id)}" ${p.id === currentId ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
    <option value="__new">${t('+ New chart…')}</option>
    ${currentId ? `<option value="__edit">${esc(t(localMode ? 'Edit name…' : 'Edit name & AI access…'))}</option>` : ''}
    ${currentId ? `<option value="__delete">${t('Remove this person…')}</option>` : ''}
  `;
}

function setupPeopleSwitcher() {
  const select = document.getElementById('people-switcher');
  select.addEventListener('change', () => {
    const value = select.value;
    if (value === '__new') {
      timelineView?.deactivate();
      ++birthRequest; loadingPersonId = null;
      invalidateConnection(); invalidateTransits(); closeDetailDialog(); clearCurrentChart();
      currentData = null;
      setLastPersonId(null);
      history.replaceState(null, '', window.location.pathname);
      document.querySelectorAll('.view-section, .chart-view').forEach(s => s.classList.add('hidden'));
      document.getElementById('birth-entry').classList.remove('hidden');
      entryApi?.renderQuickPick();
      renderPeopleSwitcher();
      return;
    }
    if (value === '__delete') {
      const id = currentData?.birth?.id;
      if (id && confirm(t('Remove {name} from saved charts?', { name: currentData.birth.name }))) {
        timelineView?.deactivate();
        try { deletePerson(id); } catch (e) { console.warn('Could not delete person:', e); renderPeopleSwitcher(); return; }
        // The shared people-change handler clears dependent views while preserving
        // independent Team/library workspaces and their current selections.
        entryApi?.renderQuickPick();
      }
      renderPeopleSwitcher();
      return;
    }
    if (value === '__edit') {
      if (currentData?.birth?.id) openEditPerson(currentData.birth);
      renderPeopleSwitcher(); // reset the select back to the loaded person
      return;
    }
    if (value === '__current') return;
    const person = getPerson(value);
    if (person) loadBirth(birthFromPerson(person), { save: false });
  });
}

// Edit a saved person — rename (re-save under the same id) and toggle whether
// the AI connector may read this chart. (P1-7: backend existed, no UI did.)
function openEditPerson(birth) { openPersonEditor(birth); }

// ==========================================
// Chart loading
// ==========================================
async function loadBirth(birth, { save = false, preserveView = false } = {}) {
  const request = ++birthRequest;
  loadingPersonId = birth.id || null;
  if (localMode && !birth.id && !save) {
    const existing = listPeople().find(p => p.name === birth.name && p.birthDate === birth.birthDate && p.birthTime === birth.birthTime && p.location?.timezone === birth.timezone);
    if (existing) birth = birthFromPerson(existing);
  }
  let resolved = birth;
  if (save && (birth.name || localMode)) {
    // Storage can fail (private mode, quota, 50-profile cap) — the chart
    // must render regardless.
    try {
      const saved = savePerson(birth);
      resolved = { ...birth, id: saved.id, name: saved.name };
      if (birth.aiAccess) setAiAccess(saved.id, true);
    } catch (e) {
      console.warn('Could not save person:', e);
      if (localMode) reportSaveFailure(e);
    }
  }

  const snapshot = resolved.id ? presentationIdentity(getPerson(resolved.id)) : null;
  let data;
  try {
    data = await computeChart(resolved);
    data.sensitivity = resolved.timeUnknown ? null : await sensitivityCheck(resolved, data.chart);
    if (request !== birthRequest || (resolved.id && snapshot !== presentationIdentity(getPerson(resolved.id)))) return null;
  } catch (error) {
    if (request !== birthRequest) return null;
    console.error('Birth chart calculation failed:', error);
    const notice = document.getElementById('entry-invite');
    setMessage(notice, `Birth chart calculation failed: ${error.message}`);
    notice?.classList.remove('hidden');
    document.getElementById('birth-entry')?.classList.remove('hidden');
    return null;
  }

  currentData = data;
  loadingPersonId = null;
  if (resolved.id) setLastPersonId(resolved.id);
  history.replaceState(null, '', `${window.location.pathname}?${birthToParams(resolved)}`);

  renderChartView(currentData);
  renderPeopleSwitcher();
  showView(preserveView ? document.querySelector('.nav-link.active')?.dataset.view || 'chart' : 'chart');
  return currentData;
}

// ==========================================
// Sync (optional accounts)
// ==========================================
async function setupSync() {
  if (!syncAvailable) return;
  const button = document.getElementById('sync-button');
  const popover = document.getElementById('sync-popover');
  const status = document.getElementById('sync-status');
  button.classList.remove('hidden');

  // Surface magic-link failures (expired / already used) instead of
  // silently booting — better-auth redirects here with ?error=...
  const params = new URLSearchParams(window.location.search);
  const authError = params.get('error');
  if (authError) {
    params.delete('error');
    history.replaceState(null, '', `${window.location.pathname}${params.size ? '?' + params : ''}`);
  }

  const user = await getSessionUser();

  if (!user && authError) {
    popover.classList.remove('hidden');
    setMessage(status, authError === 'INVALID_TOKEN'
      ? 'That sign-in link expired or was already used — request a fresh one.'
      : "Sign-in didn't complete ({error}) — try again.", { error: authError });
  }

  button.addEventListener('click', () => popover.classList.toggle('hidden'));
  document.addEventListener('click', (e) => {
    if (!popover.contains(e.target) && e.target !== button) popover.classList.add('hidden');
  });

  if (user) {
    // The AI-access checkbox only means something once an account exists
    document.getElementById('ai-access-wrap')?.classList.remove('hidden');
    enableSync();
    startSync({
      onRemoteChange: () => {
        renderPeopleSwitcher();
        entryApi?.renderQuickPick();
      }
    });
    setMessage(button, '✓ Synced');
    const refreshTitle = () => { button.title = t('Signed in as {email}', { email: user.email }); };
    refreshTitle(); onLocaleChange(refreshTitle);

    const mcpUrl = `${window.location.origin}/mcp`;
    popover.innerHTML = `
      ${syncPopoverHeading('Account')}
      <p class="panel-intro" id="sync-account-intro"></p>

      <div class="panel-title" style="margin-top:14px" data-i18n="Connect your AI">${t('Connect your AI')}</div>
      <p class="panel-intro" data-i18n="Let Claude (or any MCP-capable AI) pull up your charts by name.">${t('Let Claude (or any MCP-capable AI) pull up your charts by name.')}</p>
      <div class="mcp-url-row">
        <code id="mcp-url">${esc(mcpUrl)}</code>
        <button id="copy-mcp" class="btn-secondary btn-small" data-i18n="Copy">${t('Copy')}</button>
      </div>
      <ol class="mcp-steps">
        <li data-i18n-html="In Claude: <em>Settings → Connectors → Add custom connector</em>, paste the URL"></li>
        <li data-i18n="Approve the connection (uses this same sign-in)"></li>
        <li data-i18n-html="Tick <em>&quot;Let my connected AI see this person&quot;</em> when saving people here"></li>
        <li data-i18n-html="Ask: <em>&quot;Pull up Mom's chart&quot;</em>"></li>
      </ol>
      <button id="sign-out" class="link-button" style="margin:10px 0 0" data-i18n="Sign out (charts stay on this device)"></button>
    `;
    setHtmlMessage(document.getElementById('sync-account-intro'), 'Signed in as <strong>{email}</strong> — your saved people sync across devices.', { email: esc(user.email) });
    translatePage(popover);
    document.getElementById('copy-mcp').addEventListener('click', async (e) => {
      try {
        await navigator.clipboard.writeText(mcpUrl);
        setMessage(e.target, 'Copied ✓');
      } catch {
        setMessage(e.target, 'Copy failed');
      }
      setTimeout(() => { setMessage(e.target, 'Copy'); }, 2000);
    });
    document.getElementById('sign-out').addEventListener('click', async () => {
      await signOut();
      window.location.reload();
    });
    return;
  }

  setMessage(button, 'Sync');
  button.dataset.i18nTitle = 'Sign in to sync your charts and connect your AI';
  button.title = t(button.dataset.i18nTitle);

  document.getElementById('sync-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('sync-email').value.trim();
    if (!email) return;
    setMessage(status, 'Sending…');
    try {
      await requestMagicLink(email);
      setMessage(status, 'Check your email — the sign-in button works once. ✓');
    } catch {
      setMessage(status, window.location.hostname.endsWith('openhumandesign.com')
        ? 'Could not send the email just now — please try again in a moment.'
        : 'Sync lives at openhumandesign.com — this copy of the app has no server.');
    }
  });
}

// ==========================================
// Boot
// ==========================================
async function init() {
  setupSyncPopoverDismiss();
  onAppearanceChange(refreshAppearanceGraphs);
  onFontPreferenceChange(refreshAppearanceGraphs);
  setupAppearanceControls();
  setupNavigation();
  setupPanelTabs();
  setupTransitView();
  setupConnectionView();
  setupTeamView();
  setupReferenceView();
  timelineView = setupTimelineView();
  setupPeopleSwitcher();

  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  if (localMode) {
    localAccountUi.setupLocalAccount();
    // Local writes, sync snapshots and cross-tab updates converge in PeopleStore.
  } else if (syncAvailable) setupSync();

  entryApi = setupEntryView({
    onSubmit: async (birth, { savedPerson = false } = {}) => {
      if (!await loadBirth(birth, { save: !savedPerson && (localMode || !!birth.name) })) return;
      if (pendingCompare) {
        pendingCompare = false;
        document.getElementById('entry-invite')?.classList.add('hidden');
        showView('connection');
        compareWithGuest();
      }
    }
  });
  onPeopleChange(change => {
    if (change.calculationChanged && change.before) {
      try { invalidateBirth(birthFromPerson(change.before)); } catch { /* Invalid legacy input has no usable calculation cache. */ }
    }
    renderPeopleSwitcher(); entryApi?.renderQuickPick();
    refreshConnectionPeople(change);
    renderTeamView();
    if (change.personId !== currentData?.birth?.id && change.personId !== loadingPersonId) return;
    closeDetailDialog();
    clearCurrentChart();
    invalidateTransits();
    timelineView?.invalidateBirth();
    const visibleView = document.querySelector('.nav-link.active')?.dataset.view || 'chart';
    if (!change.after) {
      ++birthRequest; loadingPersonId = null; currentData = null;
      invalidateConnection(); setLastPersonId(null);
      history.replaceState(null, '', window.location.pathname);
      renderPeopleSwitcher();
      showView(['team', 'library'].includes(visibleView) ? visibleView : 'chart');
      return;
    }
    currentData = null;
    if (!['team', 'library'].includes(visibleView)) document.querySelectorAll('.view-section, .chart-view').forEach(section => section.classList.add('hidden'));
    loadBirth(birthFromPerson(change.after), { preserveView: true }).then(data => {
      if (data) refreshConnectionPeople(change, { currentReloaded: true });
    });
  });
  initialized = true;

  // Boot order: connection invite → shared URL → last person → entry form
  // (read the deep-link view before loadBirth rewrites the URL)
  const deepLinkView = new URLSearchParams(window.location.search).get('view');
  const libraryLink = location.hash.startsWith('#library') ? location.hash : null;
  const connectInvite = new URLSearchParams(window.location.search).get('connect') === '1';
  const fromUrl = paramsToBirth(window.location.search.slice(1));

  if (fromUrl && connectInvite) {
    // "Compare designs with me" invite: the sender is the OTHER person.
    setSharedGuest(fromUrl);
    history.replaceState(null, '', window.location.pathname); // don't re-trigger on reload
    const lastId = getLastPersonId();
    const me = lastId && getPerson(lastId);
    if (me) {
      await loadBirth(birthFromPerson(me), { save: false }); // returning visitor → straight to the compare
      showView('connection');
      compareWithGuest();
    } else {
      pendingCompare = true; // new visitor enters their chart first, then we compare
      const invite = document.getElementById('entry-invite');
      if (invite) {
        setHtmlMessage(invite, '<strong>{name}</strong> invited you to compare designs — enter your birth below to see your connection.', { name: esc(fromUrl.name || t('Someone')) });
        invite.classList.remove('hidden');
      }
      document.getElementById('birth-entry')?.classList.remove('hidden');
      renderPeopleSwitcher();
    }
    return;
  }

  if (fromUrl) {
    await loadBirth(fromUrl, { save: false });
    if (libraryLink) { history.replaceState(null, '', `${location.pathname}${libraryLink}`); showView('library'); return; }
    if (deepLinkView && VIEWS.includes(deepLinkView)) showView(deepLinkView);
    // Shared-chart landing: someone opened a link to a chart that isn't
    // theirs — invite them to make their own (the viral loop).
    if (!getLastPersonId() && fromUrl.name) {
      setSharedGuest(fromUrl); // keep them available to compare after "make your own"
      const banner = document.getElementById('shared-cta');
      if (banner) {
        banner.innerHTML = `<span id="shared-person-intro"></span>
          <button id="make-own" class="link-button" style="display:inline;margin:0;font-size:inherit" data-i18n="make your own free chart →">${t('make your own free chart →')}</button>`;
        setHtmlMessage(document.getElementById('shared-person-intro'), "Looking at <strong>{name}</strong>'s chart —", { name: esc(fromUrl.name) });
        banner.classList.remove('hidden');
        document.getElementById('make-own').addEventListener('click', () => {
          timelineView?.deactivate();
          ++birthRequest; loadingPersonId = null;
          invalidateConnection(); invalidateTransits(); closeDetailDialog(); clearCurrentChart();
          currentData = null;
          history.replaceState(null, '', window.location.pathname);
          banner.classList.add('hidden');
          document.querySelectorAll('.view-section, .chart-view').forEach(s => s.classList.add('hidden'));
          document.getElementById('birth-entry').classList.remove('hidden');
          renderPeopleSwitcher();
        });
      }
    }
    return;
  }
  if (new URLSearchParams(window.location.search).has('d')) {
    const params = new URLSearchParams(window.location.search);
    const date = params.get('d');
    const time = params.get('t');
    if (/^\d{4}-\d{2}-\d{2}$/.test(date || '')) document.getElementById('birth-date').value = date;
    if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time || '')) document.getElementById('birth-time').value = time;
    if (params.get('tu') === '1') {
      const unknown = document.getElementById('time-unknown');
      unknown.checked = true;
      unknown.dispatchEvent(new Event('change'));
    }
    const notice = document.getElementById('entry-invite');
    setMessage(notice, 'The shared birth details are incomplete. Please fill in the missing information.');
    notice.classList.remove('hidden');
    showView('chart');
    document.getElementById(!date ? 'birth-date' : !time && params.get('tu') !== '1' ? 'birth-time' : 'birth-place').focus();
    return;
  }
  const lastId = getLastPersonId();
  if (lastId) {
    const person = getPerson(lastId);
    if (person) {
      await loadBirth(birthFromPerson(person), { save: false });
      if (libraryLink) { history.replaceState(null, '', `${location.pathname}${libraryLink}`); showView('library'); }
      return;
    }
  }
  renderPeopleSwitcher();
  showView(libraryLink ? 'library' : 'chart');
}

async function boot() {
  initAppearance();
  setupLanguageSwitcher();
  if (localMode) {
    document.getElementById('app').hidden = true;
    localAccountUi = await import('./lib/local-account.js');
    if (!(await localAccountUi.unlockLocal())) return;
  }
  document.getElementById('app').hidden = false;
  try { await init(); } finally { document.getElementById('boot-status').hidden = true; }
}
boot().catch(error => {
  console.error('Could not open local library:', error.message);
  setMessage(document.getElementById('local-auth-status'), 'The library could not be opened. Refresh to try again.');
});

// Knowledge uses the existing Reference route/view infrastructure.
window.addEventListener('ohd-open-knowledge-reference', event => openReference('knowledge', event.detail.id));
