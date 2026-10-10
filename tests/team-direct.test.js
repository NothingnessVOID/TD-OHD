import test from 'node:test';
import assert from 'node:assert/strict';
import { effectiveTeamBirth } from '../src/views/team-birth.js';
import { saveTeam, getTeam } from '../src/lib/team-repository.js';
test('unknown Team birth uses noon without mutating or removing uncertainty', () => {
 const source = Object.freeze({ birthDate: '1980-05-16', birthTime: '', timeUnknown: true, timezone: 0 });
 assert.deepEqual(effectiveTeamBirth(source), { ...source, birthTime: '12:00' });
 assert.equal(source.birthTime, '');
 const precise = { ...source, birthTime: '09:14', timeUnknown: false };
 assert.deepEqual(effectiveTeamBirth(precise), precise);
});
test('ten-person Team persists 5+5 with stable identities and rejects a sixth group member', () => {
 const values = new Map(); const storage = { getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value) };
 const members = Array.from({ length: 10 }, (_, i) => ({ memberId: `member-${i}`, personId: `fictional-${i}`, labelSnapshot: `Fictional ${i}` }));
 const groups = [0,1].map(i => ({ pentaId: `penta-${i}`, label: `Penta ${i}`, memberIds: members.slice(i * 5, i * 5 + 5).map(m => m.memberId) }));
 const saved = saveTeam({ teamId: 'fictional-team', name: 'Fictional ten', members, groups }, storage);
 assert.deepEqual(getTeam(saved.teamId, storage), saved);
 assert.throws(() => saveTeam({ ...saved, groups: [{ ...groups[0], memberIds: members.slice(0,6).map(m => m.memberId) }] }, storage), { code: 'GROUP_TOO_LARGE' });
 assert.deepEqual(getTeam(saved.teamId, storage), saved);
});
