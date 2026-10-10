import test from 'node:test';
import assert from 'node:assert/strict';
import { createUuid } from '../src/lib/uuid.js';
import { createMember } from '../src/lib/human-design/team-members.js';
import { saveTeam } from '../src/lib/team-repository.js';

const v4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('UUID prefers the native secure-context method', () => {
  assert.equal(createUuid({ randomUUID: () => 'native-uuid' }), 'native-uuid');
});

test('LAN HTTP UUID uses getRandomValues with correct version and variant bits', () => {
  const value = createUuid({ getRandomValues(bytes) { return bytes.map((_, index) => index); } });
  assert.equal(value, '00010203-0405-4607-8809-0a0b0c0d0e0f');
  assert.match(value, v4);
});

test('UUID fails explicitly when secure randomness is unavailable', () => {
  assert.throws(() => createUuid({}), /Secure random generation is unavailable/);
});

test('member and team IDs work on LAN without crypto.randomUUID', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const native = globalThis.crypto;
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: { getRandomValues: native.getRandomValues.bind(native) }
  });
  try {
    const member = createMember({ personId: 'fixture-person', displayName: 'Fictional', origin: 'saved' });
    assert.match(member.memberId, v4);
    const values = new Map();
    const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    const team = saveTeam({ name: 'LAN test', members: [member], groups: [] }, storage);
    assert.match(team.teamId, v4);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor);
    else delete globalThis.crypto;
  }
});
