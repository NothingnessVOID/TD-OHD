import assert from 'node:assert/strict';
import { waAuditHistoricalSource } from './wa-audit-history-projection.js';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');
const base = 'f7cb220b880b54d482ca5c23889123f39c2c632e';
// Only the authored integration hooks below may differ from immutable historical audits.
const edits = {
  "tests/helpers/paired-card-header-projection.js": [
    {
      "oldText": "import assert from 'node:assert/strict';",
      "newText": "import assert from 'node:assert/strict';\nimport { pentaIntegrationProjection } from './penta-integration-projection.js';"
    },
    {
      "oldText": "export function pairedCardHeaderProjection(source, file) {\n  if (!pairedCardHeaderPaths.includes(file)) return source;",
      "newText": "export function pairedCardHeaderProjection(source, file) {\n  source = pentaIntegrationProjection(source, file);\n  if (!pairedCardHeaderPaths.includes(file)) return source;"
    }
  ],
  "tests/helpers/release-increment-projection.js": [
    {
      "oldText": "import assert from 'node:assert/strict';",
      "newText": "import assert from 'node:assert/strict';\nimport { pentaAddedPaths, assertPentaIntegrationApproval, assertPentaIntegrationSource } from './penta-integration-projection.js';"
    },
    {
      "oldText": "  const expected = [...new Set([...git('ls-tree', '-r', '--name-only', incrementHead).toString().trim().split('\\n').filter(protectedPath), ...validationPaths])].sort();",
      "newText": "  const historicalExpected = [...new Set([...git('ls-tree', '-r', '--name-only', incrementHead).toString().trim().split('\\n').filter(protectedPath), ...validationPaths])].sort();\n  const expected = [...historicalExpected, ...pentaAddedPaths].sort();"
    },
    {
      "oldText": "  for (const file of expected) assert.equal(sha256(issueDetailsProjection(read(file), file)), sha256(snapshotBytes(validationPaths.includes(file) ? validationHead : incrementHead, file)), `Unreviewed increment source: ${file}`);",
      "newText": "  assertPentaIntegrationApproval();\n  for (const file of expected) {\n    if (pentaAddedPaths.includes(file)) {\n      assertPentaIntegrationSource(read(file), file);\n      continue;\n    }\n    assert.equal(sha256(issueDetailsProjection(read(file), file)), sha256(snapshotBytes(validationPaths.includes(file) ? validationHead : incrementHead, file)), `Unreviewed increment source: ${file}`);\n  }"
    },
    {
      "oldText": "  const invariantPaths = expected.filter(file =>",
      "newText": "  const invariantPaths = historicalExpected.filter(file =>"
    }
  ]
,
  "tests/paired-card-layout-scope.test.js": [
    {
      "oldText": "import test from 'node:test';",
      "newText": "import test from 'node:test';\nimport { pentaAddedPaths, pentaIntegrationPaths, pentaIntegrationProjection } from './helpers/penta-integration-projection.js';"
    },
    {
      "oldText": ".toString().trim().split('\\n').filter(protectedPath);",
      "newText": ".toString().trim().split('\\n').filter(protectedPath);\ninventory.push(...pentaAddedPaths);"
    },
    {
      "oldText": "assert.strictEqual(pairedCardLayoutProjection(current, file), current);",
      "newText": "assert.deepEqual(pairedCardLayoutProjection(current, file), pentaIntegrationProjection(current, file));"
    },
    {
      "oldText": "assert.strictEqual(pairedCardLayoutProjection(mutated, file), mutated);",
      "newText": "if (pentaIntegrationPaths.includes(file)) assert.throws(() => pairedCardLayoutProjection(mutated, file), /Unreviewed increment source/);\n    else assert.strictEqual(pairedCardLayoutProjection(mutated, file), mutated);"
    }
  ],
  "tests/channel-status-scope.test.js": [
    {
      "oldText": "import test from 'node:test';",
      "newText": "import test from 'node:test';\nimport { pentaAddedPaths, pentaIntegrationPaths, pentaIntegrationProjection } from './helpers/penta-integration-projection.js';"
    },
    {
      "oldText": ".toString().trim().split('\\n').filter(protectedPath);",
      "newText": ".toString().trim().split('\\n').filter(protectedPath);\ninventory.push(...pentaAddedPaths);"
    },
    {
      "oldText": "assert.strictEqual(channelStatusProjection(current, p), current);",
      "newText": "assert.deepEqual(channelStatusProjection(current, p), pentaIntegrationProjection(current, p));"
    },
    {
      "oldText": "assert.strictEqual(channelStatusProjection(mutated, p), mutated);",
      "newText": "if (pentaIntegrationPaths.includes(p)) assert.throws(() => channelStatusProjection(mutated, p), /Unreviewed increment source/);\n    else assert.strictEqual(channelStatusProjection(mutated, p), mutated);"
    }
  ],
  "tests/paired-gate-visual-scope.test.js": [
    {
      "oldText": "import test from 'node:test';",
      "newText": "import test from 'node:test';\nimport { pentaAddedPaths, pentaIntegrationPaths, pentaIntegrationProjection } from './helpers/penta-integration-projection.js';"
    },
    {
      "oldText": ".toString().trim().split('\\n').filter(protectedPath);",
      "newText": ".toString().trim().split('\\n').filter(protectedPath);\ninventory.push(...pentaAddedPaths);"
    },
    {
      "oldText": "assert.strictEqual(pairedGateVisualProjection(current, file), current);",
      "newText": "assert.deepEqual(pairedGateVisualProjection(current, file), pentaIntegrationProjection(current, file));"
    },
    {
      "oldText": "assert.strictEqual(pairedGateVisualProjection(mutated, file), mutated);",
      "newText": "if (pentaIntegrationPaths.includes(file)) assert.throws(() => pairedGateVisualProjection(mutated, file), /Unreviewed increment source/);\n    else assert.strictEqual(pairedGateVisualProjection(mutated, file), mutated);"
    }
  ],
  "tests/issue-details-scope.test.js": [
    {
      "oldText": "import test from 'node:test';",
      "newText": "import test from 'node:test';\nimport { pentaAddedPaths, pentaIntegrationPaths, pentaIntegrationProjection } from './helpers/penta-integration-projection.js';"
    },
    {
      "oldText": ".toString().trim().split('\\n').filter(protectedPath);",
      "newText": ".toString().trim().split('\\n').filter(protectedPath);\ninventory.push(...pentaAddedPaths);"
    },
    {
      "oldText": "assert.strictEqual(issueDetailsProjection(mutated, file), mutated);",
      "newText": "if (pentaIntegrationPaths.includes(file)) assert.throws(() => issueDetailsProjection(mutated, file), /Unreviewed increment source/);\n    else assert.strictEqual(issueDetailsProjection(mutated, file), mutated);"
    }
  ],
  "tests/paired-card-final-scope.test.js": [
    {
      "oldText": "import test from 'node:test';",
      "newText": "import test from 'node:test';\nimport { pentaAddedPaths, pentaIntegrationPaths, pentaIntegrationProjection } from './helpers/penta-integration-projection.js';\nimport { historicalAuditSource } from './helpers/penta-audit-history-projection.js';"
    },
    {
      "oldText": "  .toString().trim().split('\\n').filter(protectedPath);",
      "newText": "  .toString().trim().split('\\n').filter(protectedPath);\ninventory.push(...pentaAddedPaths);"
    },
    {
      "oldText": "assert.strictEqual(pairedCardFinalProjection(source, file), source);",
      "newText": "if (pentaIntegrationPaths.includes(file)) assert.throws(() => pairedCardFinalProjection(source, file), /Unreviewed increment source/);\n    else assert.strictEqual(pairedCardFinalProjection(source, file), source);"
    },
    {
      "oldText": "]) assert.deepEqual(read(file), snapshotBytes(",
      "newText": "]) assert.deepEqual(historicalAuditSource(file), snapshotBytes("
    }
  ],
  "tests/paired-card-header-scope.test.js": [
    {
      "oldText": "import test from 'node:test';",
      "newText": "import test from 'node:test';\nimport { pentaAddedPaths, pentaIntegrationPaths, pentaIntegrationProjection } from './helpers/penta-integration-projection.js';\nimport { historicalAuditSource } from './helpers/penta-audit-history-projection.js';"
    },
    {
      "oldText": "  .toString().trim().split('\\n').filter(protectedPath);",
      "newText": "  .toString().trim().split('\\n').filter(protectedPath);\ninventory.push(...pentaAddedPaths);"
    },
    {
      "oldText": "assert.strictEqual(pairedCardHeaderProjection(changed, other), changed);",
      "newText": "if (pentaIntegrationPaths.includes(other)) assert.throws(() => pairedCardHeaderProjection(changed, other), /Unreviewed increment source/);\n    else assert.strictEqual(pairedCardHeaderProjection(changed, other), changed);"
    },
    {
      "oldText": "]) assert.deepEqual(read(file), snapshotBytes(",
      "newText": "]) assert.deepEqual(historicalAuditSource(file), snapshotBytes("
    }
  ],
  "tests/release-increment-scope.test.js": [
{"oldText":"validateMutation('src/lib/shared-object-details.js', text => text.replace(\"entry.reviewStatus !== 'reviewed'\", 'false'));","newText":"validateMutation('src/lib/knowledge/penta-reading-policy.js', text => text.replace(\"reviewStatus !== 'reviewed'\", 'false'));"},
    {
      "oldText": "import test from 'node:test';",
      "newText": "import test from 'node:test';\nimport { pentaAddedPaths, pentaIntegrationPaths, pentaIntegrationProjection } from './helpers/penta-integration-projection.js';"
    },
    {
      "oldText": "inventory.push(...validationPaths.filter(file=>!inventory.includes(file)));",
      "newText": "inventory.push(...validationPaths.filter(file=>!inventory.includes(file)));\ninventory.push(...pentaAddedPaths);"
    },
    {
      "oldText": "validateMutation('src/views/penta-matrix.js', text => text.replace(\"entry.properties.interpretationStatus !== 'verified'\", 'false'));",
      "newText": "validateMutation('src/lib/knowledge/penta-reading-policy.js', text => text.replace(\"if (!policy) return null;\", \"if (false) return null;\"));"
    }
  ]
};
export function historicalAuditSource(file, source = readFileSync(path.join(root, file))) {
  source = waAuditHistoricalSource(file, source);
  if (!Object.hasOwn(edits, file)) return source;
  let text = source.toString();
  for (const { oldText, newText } of edits[file]) {
    const at = text.indexOf(newText);
    assert.ok(at >= 0 && text.indexOf(newText, at + 1) < 0, 'Unreviewed historical audit hook: ' + file);
    text = text.slice(0, at) + oldText + text.slice(at + newText.length);
  }
  const historical = execFileSync('git', ['show', base + ':' + file], {cwd:root});
  assert.deepEqual(Buffer.from(text), historical, 'Unreviewed historical audit source: ' + file);
  return historical;
}
