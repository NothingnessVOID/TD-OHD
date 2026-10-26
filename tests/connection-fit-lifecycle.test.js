/**
 * Structural guard for the relationship graph's fit lifecycle.
 *
 * `observeGraphShell` registers a ResizeObserver plus window and visual-viewport
 * listeners. Both places that drop the relationship DOM must release them first:
 * `renderConnectionContent` before it re-observes, and `invalidateConnection`
 * before it empties the container. A missed `disconnect()` leaks listeners onto
 * a detached node and stacks a second set on the next comparison.
 *
 * That leak has no symptom on the page — the guarded callback no-ops once the
 * root is detached — so it cannot be caught by a browser test. This reads the
 * module instead and pins the two call sites.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/views/connection.js', import.meta.url), 'utf8');

test('invalidateConnection releases the shell fit before it clears the DOM', () => {
  const body = source.match(/export function invalidateConnection\(\) \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(body, 'invalidateConnection must exist');
  const disconnect = body.indexOf('connShellFit?.disconnect()');
  const reset = body.indexOf('connShellFit = null');
  const clear = body.indexOf('replaceChildren()');
  assert.ok(disconnect >= 0, 'invalidating must disconnect the shell fit');
  assert.ok(reset >= 0, 'the released fit must be cleared so it cannot be reused');
  assert.ok(disconnect < clear, 'the fit must be released before the nodes are removed');
  assert.ok(reset < clear, 'the reference must be cleared before the nodes are removed');
});

test('rendering a comparison releases the previous fit before observing again', () => {
  const calls = [...source.matchAll(/connShellFit\??\.disconnect\(\)/g)];
  const observes = [...source.matchAll(/connShellFit = observeGraphShell\(/g)];
  assert.equal(calls.length, 2, 'exactly two release points: invalidate and re-render');
  assert.equal(observes.length, 1, 'the shell is observed in one place');
  const render = source.indexOf('connShellFit = observeGraphShell(');
  const releaseBeforeObserve = source.lastIndexOf('connShellFit?.disconnect()', render);
  assert.ok(releaseBeforeObserve > 0 && releaseBeforeObserve < render,
    're-rendering must disconnect the previous fit before observing the new one');
});
