import { localApi, initializeLocal, lockLocal, flushLocal, getLocalSaveNotice } from './local-store.js';
import { LOCALES, getLocale, setLocale, onLocaleChange, registerMessages, translatePage, setMessage } from './i18n.js';
import localMessages from '../locales/zh-CN/ui-local.json' with { type: 'json' };
import traditionalLocalMessages from '../locales/zh-Hant/ui-local.json' with { type: 'json' };
import './local-account.css';

registerMessages('zh-CN', localMessages);
registerMessages('zh-Hant', traditionalLocalMessages);
onLocaleChange(() => {
  const select = document.querySelector('#local-auth .language-switcher');
  if (select) select.value = getLocale();
});

export async function unlockLocal() {
  if (!document.getElementById('local-auth')) document.body.insertAdjacentHTML('afterbegin', `
  <section id="local-auth" class="local-auth" hidden>
    <div class="local-auth-card">
      <select class="language-switcher" aria-label="Language" data-i18n-aria-label="Language"></select>
      <div class="local-auth-brand"><span aria-hidden="true">◇</span> <em style="font-style:normal">TD-OHD</em> <small data-i18n="Local library">Local library</small></div>
      <h1 id="local-auth-title" data-i18n="Connecting to the local library">Connecting to the local library</h1>
      <p id="local-auth-intro" data-i18n="Your data is stored on this Mac.">Your data is stored on this Mac.</p>
      <form id="local-auth-form">
        <label for="local-password" data-i18n="Password">Password</label>
        <input id="local-password" type="password" autocomplete="current-password" minlength="8" maxlength="128" placeholder="At least 8 characters" data-i18n-placeholder="At least 8 characters" required>
        <div id="local-confirm-wrap"><label for="local-confirm" data-i18n="Confirm password">Confirm password</label>
          <input id="local-confirm" type="password" autocomplete="new-password" minlength="8" maxlength="128"></div>
        <label class="checkbox-label local-remember"><input id="local-remember" type="checkbox" checked> <span data-i18n="Stay signed in for 30 days in this browser">Stay signed in for 30 days in this browser</span></label>
        <button id="local-auth-submit" type="submit" class="btn-primary" data-i18n="Unlock">Unlock</button>
      </form>
      <p id="local-auth-status" class="local-auth-status" role="status" aria-live="polite"></p>
      <a id="local-auth-reload" class="btn-primary" href="/" hidden data-i18n="Enter the password again">Enter the password again</a>
      <div class="local-auth-foot" data-i18n="Stored locally · Shared across browsers · No email needed">Stored locally · Shared across browsers · No email needed</div>
    </div>
  </section>
  `);
  const gate = document.getElementById('local-auth');
  const language = gate.querySelector('.language-switcher');
  language.innerHTML = LOCALES.map(({ code, label }) => `<option value="${code}" lang="${code}">${label}</option>`).join('');
  language.value = getLocale();
  language.addEventListener('change', () => setLocale(language.value));
  translatePage(gate);
  const app = document.getElementById('app');
  app.hidden = true; gate.hidden = false;
  const title = document.getElementById('local-auth-title');
  const intro = document.getElementById('local-auth-intro');
  const status = document.getElementById('local-auth-status');
  const form = document.getElementById('local-auth-form');
  const submit = document.getElementById('local-auth-submit');
  let info;
  try { info = await localApi('status'); }
  catch {
    setMessage(title, 'Local service is not connected');
    setMessage(intro, 'Reopen this page from the Human Design app, or refresh to try again.');
    form.hidden = true;
    return false;
  }
  const start = async () => {
    setMessage(status, 'Reading local data…');
    await initializeLocal();
    gate.hidden = true; app.hidden = false;
    return true;
  };
  if (info.authenticated) {
    try { return await start(); } catch (e) { setMessage(status, e.source || 'Local service connection failed.'); }
  }
  const setup = !info.configured;
  let loggedIn = info.authenticated;
  setMessage(title, setup ? 'Set a password for your library' : 'Open your Human Design');
  setMessage(intro, setup
    ? 'Set it once. Use the same password to open your data in different browsers on this computer.'
    : 'Enter the local password to keep viewing and recording.');
  setMessage(submit, setup ? 'Set password and start' : 'Unlock');
  document.getElementById('local-confirm-wrap').hidden = !setup;
  document.getElementById('local-confirm').required = setup;
  document.getElementById('local-password').autocomplete = setup ? 'new-password' : 'current-password';
  document.getElementById('local-password').focus();
  return new Promise(resolve => {
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const password = document.getElementById('local-password').value;
      if (setup && password !== document.getElementById('local-confirm').value) {
        setMessage(status, 'Passwords do not match.'); return;
      }
      submit.disabled = true; setMessage(status, setup ? 'Setting up…' : 'Unlocking…');
      try {
        if (!loggedIn) {
          await localApi(setup ? 'setup' : 'login', { method:'POST', body:JSON.stringify({ password, remember: document.getElementById('local-remember').checked }) });
          loggedIn = true;
        }
        if (await start()) { form.reset(); resolve(true); }
      } catch (e) { setMessage(status, e.source || 'Local service connection failed.'); }
      finally { submit.disabled = false; }
    });
  });
}

export function setupLocalAccount() {
  setMessage(document.querySelector('.entry-subtitle'), 'Your personal library, stored on this Mac');
  setMessage(document.querySelector('.entry-explain'), 'Enter birth details and your chart will be saved automatically. Sign in with the same local password in another browser to view it there.');
  setMessage(document.querySelector('label[for="birth-name"] .label-soft'), '(optional; data is saved automatically)');
  setMessage(document.querySelector('.footer > span:last-child'), 'Local password protection · Automatic saving · Shared across browsers on this computer');
  const button = document.getElementById('sync-button');
  const popover = document.getElementById('sync-popover');
  button.classList.remove('hidden'); setMessage(button, 'Local data');
  popover.innerHTML = `<div class="panel-title" data-i18n="Your local library">Your local library</div>
    <p class="panel-intro" data-i18n="Generated charts are saved automatically. Enter the same password in another browser to see them there.">Generated charts are saved automatically. Enter the same password in another browser to see them there.</p>
    <p class="local-storage-status" id="local-save-detail" role="status" aria-live="polite"></p>
    <div class="local-account-actions"><button id="local-retry" class="btn-secondary btn-small" data-i18n="Sync now">Sync now</button>
    <a class="btn-secondary btn-small" href="/api/local/backup" download data-i18n="Export backup">Export backup</a></div>
    <details class="local-password-settings"><summary data-i18n="Change password">Change password</summary><form id="local-change-password">
      <label><span data-i18n="Current password">Current password</span><input id="local-current" type="password" autocomplete="current-password" required minlength="8" maxlength="128"></label>
      <label><span data-i18n="New password">New password</span><input id="local-next" type="password" autocomplete="new-password" required minlength="8" maxlength="128"></label>
      <label><span data-i18n="Confirm new password">Confirm new password</span><input id="local-next-confirm" type="password" autocomplete="new-password" required minlength="8" maxlength="128"></label>
      <button class="btn-primary btn-small" type="submit" data-i18n="Save new password">Save new password</button></form></details>
    <p id="local-account-message" role="status"></p>
    <button id="local-lock" class="link-button" data-i18n="Lock and sign out of this browser">Lock and sign out of this browser</button>`;
  const status = document.getElementById('local-save-detail');
  const updateSaveStatus = ({ state, source, params }) => {
    setMessage(status, source, params); status.dataset.state = state;
  };
  updateSaveStatus(getLocalSaveNotice());
  translatePage(popover);
  window.addEventListener('ohd-save-status', event => {
    updateSaveStatus(event.detail);
  });
  window.addEventListener('ohd-session-expired', () => {
    document.getElementById('app').hidden = true;
    document.getElementById('local-auth').hidden = false;
    setMessage(document.getElementById('local-auth-title'), 'Please unlock again');
    setMessage(document.getElementById('local-auth-intro'), 'The session expired or the password changed in another browser. Pending data will be kept; sign in again to continue saving.');
    document.getElementById('local-auth-form').hidden = true;
    const reload = document.getElementById('local-auth-reload'); reload.hidden = false;
  });
  button.addEventListener('click', () => popover.classList.toggle('hidden'));
  document.addEventListener('click', event => { if (!popover.contains(event.target) && event.target !== button) popover.classList.add('hidden'); });
  const message = document.getElementById('local-account-message');
  document.getElementById('local-retry').onclick = () => flushLocal().catch(e => { setMessage(message, e.source || 'Local service connection failed.'); });
  document.getElementById('local-lock').onclick = () => lockLocal().catch(e => { setMessage(message, e.source || 'Local service connection failed.'); });
  document.getElementById('local-change-password').onsubmit = async event => {
    event.preventDefault();
    const password = document.getElementById('local-next').value;
    if (password !== document.getElementById('local-next-confirm').value) { setMessage(message, 'New passwords do not match.'); return; }
    const save = event.target.querySelector('button'); save.disabled = true;
    try {
      await localApi('password', { method:'POST', body:JSON.stringify({ currentPassword: document.getElementById('local-current').value, password }) });
      event.target.reset(); setMessage(message, 'Password updated. Other browsers must sign in again with the new password.');
    } catch (e) { setMessage(message, e.source || 'Local service connection failed.'); }
    finally { save.disabled = false; }
  };
}

export function refreshLocalLanguage() {
  const select = document.querySelector('#local-auth .language-switcher');
  if (select) select.value = getLocale();
  const status = document.getElementById('local-save-detail');
  if (status) {
    const notice = getLocalSaveNotice();
    setMessage(status, notice.source, notice.params);
  }
}
