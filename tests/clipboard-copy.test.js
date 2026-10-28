/**
 * Clipboard fallback contract.
 *
 * These tests drive `copyPlainText` / `copyFromButton` against a deterministic
 * fake DOM so every failure mode is reachable: a missing async API, a
 * synchronous throw, an asynchronous rejection, and a legacy path that says
 * false or throws. The fake DOM is a fixture, not a claim about browser
 * behaviour — the real-browser run lives in tests/clipboard-fallback-e2e.mjs.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { copyFromButton, copyPlainText, legacyCopyText } from '../src/lib/clipboard.js';
import { setLocale, t } from '../src/lib/i18n.js';

let clipboardApi = null;
let execCommand = () => true;
let environment = null;

/** Minimal document/navigator stand-in: just enough for the legacy path. */
function installDom({ execCommand: command } = {}) {
  execCommand = command ?? (() => true);
  const body = {
    children: [],
    appendChild(node) { node.isConnected = true; node.parent = this; this.children.push(node); return node; },
    removeChild(node) {
      const index = this.children.indexOf(node);
      if (index >= 0) this.children.splice(index, 1);
      node.isConnected = false;
    },
  };
  const element = () => {
    const node = {
      isConnected: false, parent: null, value: '', readOnly: false, tabIndex: 0,
      selectionStart: 0, selectionEnd: 0, selectionDirection: 'none',
      focused: 0, selected: 0, attributes: {}, style: { cssText: '' },
      setAttribute(name, value) { this.attributes[name] = String(value); },
      focus() { this.focused += 1; documentRef.activeElement = this; },
      select() { this.selected += 1; },
      setSelectionRange(start, end, direction = 'none') {
        this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction;
      },
      remove() { this.parent?.removeChild(this); },
    };
    // Focusing the off-screen field is what a browser can turn into a scroll jump.
    node.focus = () => { node.focused += 1; documentRef.activeElement = node; globalThis.scrollY += 500; };
    return node;
  };
  const selection = {
    rangeCount: 2, removed: 0, added: [], lost: false,
    getRangeAt(index) { return { cloneRange: () => ({ clone: index }) }; },
    removeAllRanges() { selection.removed += 1; selection.lost = true; },
    addRange(range) { selection.added.push(range); },
  };
  const documentRef = {
    body, activeElement: null, selection, commands: [],
    createElement(tag) { if (tag !== 'textarea') throw new Error(`unexpected element ${tag}`); return element(); },
    execCommand(name) { documentRef.commands.push(name); return execCommand(name); },
    getSelection() { return selection; },
  };
  const navigatorRef = clipboardApi === null ? {} : { clipboard: clipboardApi };
  Object.defineProperty(globalThis, 'document', { value: documentRef, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'navigator', { value: navigatorRef, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'scrollX', { value: 0, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'scrollY', { value: 120, configurable: true, writable: true });
  let scrolled = null;
  Object.defineProperty(globalThis, 'scrollTo', {
    value: (x, y) => { scrolled = [x, y]; globalThis.scrollY = y; },
    configurable: true, writable: true,
  });
  environment = { document: documentRef, selection, scrolled: () => scrolled };
  return environment;
}

function clearDom() {
  delete globalThis.document;
  delete globalThis.navigator;
  delete globalThis.scrollTo;
  delete globalThis.scrollX;
  delete globalThis.scrollY;
  environment = null;
}

function fakeButton(label) {
  return { textContent: label, disabled: false, isConnected: true };
}

setLocale('en', { persist: false });

test('a missing async clipboard falls back to the legacy textarea copy', async () => {
  clipboardApi = null;
  const { document: doc, selection, scrolled } = installDom();
  const text = '【基础结构】\n人格 23.2 ｜ 设计 49.4\n闸门 8 — 保持 ✨ 日本語 🧭';
  assert.equal(await copyPlainText(text), true);
  assert.deepEqual(doc.commands, ['copy'], 'execCommand("copy") is the only path');
  assert.equal(doc.body.children.length, 0, 'the temporary textarea is removed');
  assert.equal(selection.added.length, 2, 'the document selection is restored');
  assert.deepEqual(scrolled(), [0, 120], 'the page is not left scrolled');
  clearDom();
});

test('the legacy path keeps the exact plain text, including CJK and Unicode', async () => {
  clipboardApi = null;
  let captured = null;
  const { document: doc } = installDom();
  // Read the textarea value at the moment the command runs.
  const original = doc.execCommand;
  doc.execCommand = name => { captured = doc.body.children[0]?.value; return original(name); };
  const text = '【基礎結構】\n人格 23.2 ｜ 設計 49.4\n第 8 卦 · 比 💧\n\tzwnj:\u200c';
  assert.equal(await copyPlainText(text), true);
  assert.equal(captured, text, 'textarea.value is the original text, unescaped');
  assert.equal(doc.body.children[0], undefined);
  clearDom();
});

test('a synchronous writeText throw falls back to legacy copy', async () => {
  let calls = 0;
  clipboardApi = { writeText() { calls += 1; throw new Error('NotAllowedError'); } };
  installDom();
  assert.equal(await copyPlainText('link'), true);
  assert.equal(calls, 1);
  assert.deepEqual(environment.document.commands, ['copy']);
  clearDom();
});

test('an asynchronous writeText rejection still lands on the clipboard via execCommand', async () => {
  const order = [];
  clipboardApi = { writeText() { order.push('writeText'); return Promise.reject(new Error('denied')); } };
  const { document: doc } = installDom();
  doc.execCommand = name => { order.push(name); return true; };
  const pending = copyPlainText('data');
  // The async API is started synchronously, inside the click, before any await.
  assert.deepEqual(order, ['writeText']);
  assert.equal(await pending, true);
  assert.deepEqual(order, ['writeText', 'copy']);
  clearDom();
});

test('a failed legacy command reports failure and still cleans up', async () => {
  clipboardApi = { writeText: () => Promise.reject(new Error('denied')) };
  const { document: doc, selection } = installDom({ execCommand: () => false });
  assert.equal(await copyPlainText('data'), false);
  assert.deepEqual(doc.commands, ['copy']);
  assert.equal(doc.body.children.length, 0);
  assert.equal(selection.added.length, 2);
  clearDom();
});

test('an exception from execCommand reports failure and still cleans up', async () => {
  clipboardApi = null;
  const { document: doc } = installDom({ execCommand: () => { throw new Error('SecurityError'); } });
  assert.equal(await copyPlainText('data'), false);
  assert.equal(doc.body.children.length, 0, 'cleanup runs in finally');
  clearDom();
});

test('focus, field selection and scroll are restored after the legacy copy', async () => {
  clipboardApi = null;
  const { document: doc } = installDom();
  const field = {
    isConnected: true, selectionStart: 3, selectionEnd: 7, selectionDirection: 'backward',
    focused: 0, focus() { this.focused += 1; doc.activeElement = this; },
    setSelectionRange(start, end, direction = 'none') {
      this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction;
    },
  };
  doc.activeElement = field;
  assert.equal(legacyCopyText('復原測試'), true);
  assert.equal(doc.activeElement, field, 'the previous focus owner is restored');
  assert.equal(field.focused, 1);
  assert.deepEqual([field.selectionStart, field.selectionEnd, field.selectionDirection], [3, 7, 'backward']);
  assert.equal(doc.selection.added.length, 0, 'an input keeps its own selection, not the document ranges');
  clearDom();
});

test('copyFromButton disables the button, blocks a second click and reports success once', async () => {
  let release = null;
  let copies = 0;
  clipboardApi = { writeText() { copies += 1; return new Promise(resolve => { release = resolve; }); } };
  installDom();
  const button = fakeButton('Copy data');
  const first = copyFromButton(button, 'text', { success: 'Data copied ✓', reset: 'Copy data' });
  assert.equal(button.disabled, true, 'the button is disabled while the copy is in flight');
  const second = await copyFromButton(button, 'text', { success: 'Data copied ✓', reset: 'Copy data' });
  assert.equal(second, false, 'a concurrent click is ignored');
  assert.equal(copies, 1);
  release();
  assert.equal(await first, true);
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, t('Data copied ✓'));
  clearDom();
});

test('every share-menu copy entry routes through the shared helper', () => {
  const source = readFileSync(new URL('../src/lib/view-share.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /navigator\.clipboard/, 'no entry calls the async API directly');
  assert.equal([...source.matchAll(/await copyFromEntry\(/g)].length, 3, 'the three entries share one copy path');
  assert.equal([...source.matchAll(/copyFromButton\(/g)].length, 1, 'that path has a single implementation');
  // The snapshot provider may throw; it must sit inside the handler's try block,
  // and the clipboard call may not be preceded by an await.
  const handler = source.slice(source.indexOf("document.getElementById('copy-data')"), source.indexOf("if (view === 'chart')"));
  assert.ok(handler.indexOf('try {') < handler.indexOf('providers[view]?.()'));
  assert.equal(handler.indexOf('await '), handler.indexOf('await copyFromEntry('), 'nothing awaits before the copy');
});
