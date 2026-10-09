import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
export const inkScope=JSON.parse(readFileSync(new URL('../../docs/gate-ink-v2-scope.json',import.meta.url)));
export function inkProjection(source,file) {
 if(!inkScope.files[file])return source;
 assert.equal(createHash('sha256').update(source).digest('hex'),inkScope.files[file],`unreviewed gate ink delta: ${file}`);
 return execFileSync('git',['show',`${inkScope.base}:${file}`]);
}
