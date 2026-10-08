import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
export const contrastScope=JSON.parse(readFileSync(new URL('../../docs/source-contrast-scope.json',import.meta.url)));
export function contrastProjection(source,file) {
 const digest=contrastScope.files[file];
 if(!digest)return source;
 assert.equal(createHash('sha256').update(source).digest('hex'),digest,`unreviewed contrast delta: ${file}`);
 return execFileSync('git',['show',`${contrastScope.base}:${file}`]);
}
