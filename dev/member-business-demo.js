// Development-only demo for the member business analysis. Never imported by the application.
// Everything lives in memory: three explicitly fictional people, an in-memory repository and a
// no-op storage shim, so no PeopleStore, Wa database or localStorage is written on this origin.
import { mountWa } from '../src/views/wa.js';
import { computeChart } from '../src/lib/chartdata.js';
import { createWaDraft, createWaMember, assertWaSnapshot } from '../src/lib/wa/model.js';
import { setLocale } from '../src/lib/i18n.js';
// Public UI primitives load last, exactly as src/main.js does: `mountWa` above pulls in the feature
// stylesheets (wa.css / wa-details.css / wa-member-business.css), so ui-system.css must follow them
// to win the cascade. These are the dialog header and close/back controls the reader actually uses;
// nothing is copied here and main.js is never imported (no PeopleStore or nav bootstrap).
import '../src/styles/ui-system.css';

const status = document.querySelector('#status');
const openButton = document.querySelector('#open-business');
const localeSelect = document.querySelector('#locale');
const LAST_ORGANIZATION = 'ohd-wa-last-organization-v1';
// The demo always starts in Simplified Chinese on its own origin unless ?lang= asks otherwise.
// persist:false keeps the rest of the site on the visitor's stored language preference.
const demoLocale = ['zh-CN', 'zh-Hant', 'en'].includes(new URLSearchParams(location.search).get('lang'))
  ? new URLSearchParams(location.search).get('lang') : 'zh-CN';
setLocale(demoLocale, { persist: false });
document.documentElement.lang = demoLocale;

// Birth dates are assembled at runtime so the demo file never carries a readable birth record.
const FICTIONAL = [
  { id: 'demo-fictional-1', name: '虚构成员甲', date: [1987, 2, 14], time: '12:00', timezone: 8 },
  { id: 'demo-fictional-2', name: '虚构成员乙', date: [1973, 8, 29], time: '12:00', timezone: 8 },
  { id: 'demo-fictional-3', name: '虚构成员丙', date: [1998, 11, 6], time: '12:00', timezone: 8 }
];
const padding = value => String(value).padStart(2, '0');
const birthDate = parts => `${parts[0]}-${padding(parts[1])}-${padding(parts[2])}`;

const people = FICTIONAL.map(entry => ({
  id: entry.id,
  name: entry.name,
  birthDate: birthDate(entry.date),
  birthTime: entry.time,
  timezone: entry.timezone,
  timeUnknown: false,
  location: { name: '虚构城市', iana: 'Asia/Shanghai' }
}));

document.querySelector('#demo-people').innerHTML = people.map(person =>
  `<li>${person.name} · ${person.birthDate} ${person.birthTime} · UTC+${person.timezone}</li>`).join('');

const peopleStore = {
  list: () => people.map(person => structuredClone(person)),
  get: id => {
    const person = people.find(item => item.id === id);
    return person ? structuredClone(person) : null;
  },
  subscribe: () => () => {}
};

// In-memory organization snapshot: one Alpha plus a two-person group, in observation layout.
const draft = createWaDraft({ title: '虚构演示组织' });
draft.layoutMode = 'observation';
draft.members = people.map(person => createWaMember({ personId: person.id, labelSnapshot: person.name }));
draft.alphaId = draft.members[0].memberId;
draft.pentas[0].memberIds = [draft.members[1].memberId, draft.members[2].memberId];
assertWaSnapshot(draft);

const saved = new Map([[draft.organizationId, structuredClone(draft)]]);
const repository = {
  list: async () => [...saved.values()].map(snapshot => ({ organizationId: snapshot.organizationId,
    title: snapshot.title, revision: snapshot.revision, revisionId: snapshot.revisionId, savedAt: snapshot.savedAt })),
  get: async id => saved.has(id) ? structuredClone(saved.get(id)) : null,
  save: async (snapshot, { expectedRevision } = {}) => {
    const next = structuredClone(snapshot);
    next.revision = (Number.isInteger(expectedRevision) ? expectedRevision : 0) + 1;
    next.revisionId = `demo-revision-${next.revision}`;
    next.savedAt = new Date().toISOString();
    saved.set(next.organizationId, structuredClone(next));
    return next;
  },
  history: async () => [],
  exportOrganization: async id => saved.has(id) ? structuredClone(saved.get(id)) : null
};

// No-op storage: only the last-organization key is answered, nothing is ever persisted.
const storage = {
  getItem: key => key === LAST_ORGANIZATION ? draft.organizationId : null,
  setItem: () => {},
  removeItem: () => {}
};

if (!import.meta.env.DEV) {
  status.textContent = '本页只在 npm run dev 的开发服务器可用，不进入正式构建。';
} else {
  localeSelect.value = demoLocale;
  let view;
  try {
    view = mountWa(document.getElementById('wa-view'), {
      peopleStore, computeChart, repository, storage, listTeams: () => [], restoreLast: true
    });
  } catch (error) {
    status.textContent = `加载失败：${error?.message ?? error}`;
  }
  localeSelect.addEventListener('change', () => {
    setLocale(localeSelect.value, { persist: false });
    document.documentElement.lang = localeSelect.value;
    view?.refreshLanguage();
  });

  // The entry card is part of the ordinary Wa render, so the demo never opens a dialog for it.
  // This page only reflects the card's own state and can scroll the card into view when asked.
  const viewRoot = document.getElementById('wa-view');
  const card = () => viewRoot.querySelector('[data-wa-member-business-panel]');
  const syncStatus = () => {
    const node = card();
    openButton.disabled = !node;
    if (!node) { status.textContent = '正在准备虚构成员…'; return; }
    if (node.dataset.state === 'ready') {
      status.textContent = `已用真实引擎计算 ${people.length} 位虚构成员；右栏「成员商业分析」卡片可直接点开每位成员。`;
    } else if (node.dataset.state === 'loading') {
      status.textContent = '正在用真实引擎计算虚构成员的出生图…';
    } else {
      status.textContent = '个人分析暂不可用，请先处理页面上方提示。';
    }
  };
  const observer = new MutationObserver(syncStatus);
  observer.observe(viewRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state'] });
  syncStatus();
  openButton.addEventListener('click', () => {
    const node = card();
    if (!node) { status.textContent = '成员商业分析卡片尚未渲染完成，请稍候。'; return; }
    node.scrollIntoView({ block: 'start' });
  });
  window.addEventListener('beforeunload', () => { observer.disconnect(); view?.dispose(); });
}
