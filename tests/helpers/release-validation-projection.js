import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
// Second, narrow review: only release-blocker fixes, not another UI feature scope.
export const validationHead='8da006e0e05fa21013b78e96234c47d1ba87c5cd';
export const validationBase='8475a4a12311089f64dbec1ba8b37449cd238537';
export const validationPaths=Object.freeze(['scripts/check-font-distribution.mjs','scripts/package-chinese-fonts.py','scripts/release-speed-diagnostic.mjs','scripts/serve-pages-check.mjs','src/styles/team-controls.css']);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const cache=new Map();
export function validationBytes(file,ref=validationHead){const key=ref+':'+file;if(!cache.has(key))cache.set(key,execFileSync('git',['show',key]));return Buffer.from(cache.get(key));}
export function validationProjection(source,file){if(!validationPaths.includes(file))return source;assert.equal(sha(source),sha(validationBytes(file)),`Unreviewed increment source: ${file}`);if(['scripts/package-chinese-fonts.py','src/styles/team-controls.css'].includes(file))return validationBytes(file,validationBase);return source;}
