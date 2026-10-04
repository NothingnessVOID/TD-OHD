import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getLocale, setLocale, t } from '../src/lib/i18n.js';
import { getKnowledgeEntry } from '../src/lib/knowledge/registry.js';
import { knowledgeContent } from '../src/lib/knowledge/content/index.js';
import { renderKnowledgeDetail } from '../src/lib/knowledge/detail-renderer.js';
import { resolveKnowledgeText } from '../src/lib/knowledge/terms.js';

const q = (objectType, objectId) => ({ objectType, objectId });
const noDatabaseUI = html => assert.doesNotMatch(html, /knowledge-facts|<h3>|<h4>|data-version|Family|Taxonomy|Type identity|Subtype|Component count|Structured Facts|结构信息|結構資訊|specificDetailStatus/);
const source = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

for (const [locale, signature, notSelf, theme] of [['en','Signature','Not-Self','Not-Self Theme'], ['zh-CN','标志','非我','非我主题'], ['zh-Hant','標誌','非我','非我主題']]) {
  test(`${locale}: approved terminology and object-specific presentation`, () => {
    const previous = getLocale();
    try {
      setLocale(locale, { persist: false });
      assert.equal(t('Signature'), signature); assert.equal(t('Not-Self'), notSelf); assert.equal(t('Not-Self Theme'), theme);
      assert.doesNotMatch(t('Signature') + t('Not-Self Theme') + t('Not-Self:'), /签名|簽名|非自己/);
      const type = renderKnowledgeDetail(q('type','manifestingGenerator'));
      assert.match(type, /<div class="detail-label">/); assert.match(type, /<h2 class="detail-name">/);
      assert.match(type, new RegExp(`<dt>${signature}</dt>`)); assert.match(type, new RegExp(`<dt>${theme}</dt>`));
      assert.equal((type.match(/<dt>/g) ?? []).length, 3); noDatabaseUI(type);
      const properties = getKnowledgeEntry(q('type','manifestingGenerator')).properties;
      assert.equal(properties.family, 'generator'); assert.equal(properties.taxonomy, 'subtype');
      for (const id of ['egoManifested','egoProjected']) {
        const entry = getKnowledgeEntry(q('authority',id)), html = renderKnowledgeDetail(entry);
        assert.equal(entry.properties.family, 'ego'); noDatabaseUI(html);
        assert.doesNotMatch(html, /knowledge-type-properties|knowledge-secondary/);
      }
      for (const id of ['1/3','4/1','6/2']) {
        const entry = getKnowledgeEntry(q('profile',id)), html = renderKnowledgeDetail(entry);
        assert.ok(html.includes(`<h2 class="detail-name">${id} `)); assert.match(html, /knowledge-secondary/);
        assert.ok(entry.properties.geometry); noDatabaseUI(html);
      }
      for (const id of ['none','single','split','tripleSplit','quadrupleSplit']) {
        const entry = getKnowledgeEntry(q('definition',id)), html = renderKnowledgeDetail(entry);
        assert.ok('componentCount' in entry.properties); noDatabaseUI(html);
        assert.doesNotMatch(html, /knowledge-type-properties|knowledge-secondary/);
      }
      for (const [kind,valueId,side] of [['determination','taste','design'],['environment','caves','design'],['motivation','hope','personality'],['perspective','survival','personality']]) {
        const query = q('variable',`${kind}:${valueId}`), slot = { color:2, tone:5, base:3 }, html = renderKnowledgeDetail(query, { variableContext:slot });
        assert.ok(getKnowledgeEntry(query)); assert.match(html, new RegExp(`data-source="${side}"`)); noDatabaseUI(html);
        assert.ok(html.indexOf('detail-name') < html.indexOf('knowledge-summary'));
        assert.ok(html.indexOf('knowledge-summary') < html.indexOf('knowledge-context'));
        assert.ok(html.indexOf('knowledge-direction') < html.indexOf('knowledge-substructure'));
        assert.ok(html.indexOf('knowledge-substructure') < html.indexOf('knowledge-body'));
        const context = html.match(/<aside class="knowledge-context">(.*?)<\/aside>/s)[1];
        assert.ok(context.includes('→')); assert.equal((context.match(/2/g) ?? []).length, 1);
        assert.equal((context.match(/5/g) ?? []).length, 1); assert.equal((context.match(/3/g) ?? []).length, 1);
        assert.equal(html.replace(/<aside class="knowledge-context">.*?<\/aside>/s,''), renderKnowledgeDetail(query));
      }
      const crossQuery = { ...q('cross','RightAngleCrossOfExplanation2'), cross: { rawId:'RightAngleCrossOfExplanation2', name:'Explanation', fullName:'Right Angle Cross of Explanation 2 (23/43 | 49/4)', angle:'right', gates:[23,43,49,4] } };
      const cross = renderKnowledgeDetail(crossQuery); noDatabaseUI(cross);
      assert.match(cross, /knowledge-cross-meta/); assert.match(cross, /23 \/ 43 \/ 49 \/ 4/);
      assert.doesNotMatch(cross, /knowledge-missing/); assert.equal(getKnowledgeEntry(crossQuery).detailStatus, 'missing');
      const introduction = getKnowledgeEntry(q('cross','introduction'));
      assert.ok(cross.includes(resolveKnowledgeText(introduction.detail.template.split('\n\n')[0], {rich:true})));
      for (const [key, record] of Object.entries(knowledgeContent[locale])) {
        const [objectType, objectId] = key.split(/\.(.*)/s);
        const html = renderKnowledgeDetail(q(objectType,objectId));
        for (const paragraph of record.detail.split(/\n\n+/)) assert.ok(html.includes(resolveKnowledgeText(paragraph,{rich:true})), `${key}: unchanged body`);
      }
    } finally { setLocale(previous, {persist:false}); }
  });
}

test('semantic accents are scoped to Knowledge labels/direction; shared renderer has no facts frame', () => {
  const css = source('src/lib/knowledge/detail-access.css');
  for (const token of ['--hd-design','--hd-personality','--hd-type-generator','--hd-type-manifesting-generator','--hd-type-projector','--hd-type-manifestor','--hd-type-reflector']) assert.ok(css.includes(`var(${token})`));
  assert.doesNotMatch(css, /knowledge-facts|#[\da-f]{3,8}\b|gradient\(/i);
  assert.match(css, /\.knowledge-detail \.detail-label, \.knowledge-direction/);
  assert.doesNotMatch(source('src/lib/knowledge/detail-renderer.js'), /sourceId|reviewStatus|provenance|Structured Facts|Shared Cross introduction|Specific Cross detail/);
  assert.match(source('src/views/reference.js'), /renderKnowledgeDetail\(entry\.id\)/);
  assert.match(source('src/lib/knowledge/detail-controller.js'), /renderKnowledgeDetail\(currentQuery/);
});
