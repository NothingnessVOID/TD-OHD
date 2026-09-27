import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { TIMELINE_RULE_VERSION } from '../src/features/transit-timeline/version.js';

export function buildInfo(mode) {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
  let commit = 'unknown';
  try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch {}
  return { app: 'TD-OHD', version: pkg.version, commit, builtAt: new Date().toISOString(),
    engine: pkg.dependencies.natalengine, knowledgeVersion: 1, ruleVersion: TIMELINE_RULE_VERSION, target: mode };
}
