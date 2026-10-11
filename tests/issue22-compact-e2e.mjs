/** Paired cards: identical before/after capture plus geometry and exact full-detail status checks. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { SKINS } from '../src/lib/skin-registry.js';
const base = process.env.E2E_URL || 'http://127.0.0.1:19975';
const phase = process.env.ISSUE22_COMPACT_PHASE || 'after';
assert.ok(['before', 'after'].includes(phase));
const root = resolve(process.env.ISSUE22_COMPACT_EVIDENCE_DIR || 'artifacts/issue22-compact');
const out = resolve(root, phase); mkdirSync(out, { recursive: true });
const baselinePath = resolve(root, 'before/results.json');
const baseline = phase === 'after' && existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, 'utf8')).cases : [];
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'msedge', headless: true });
const results = []; let activePage;
const detail = page => page.locator('#gate-detail:not(.hidden)');
async function invoke(page, gate) {
  await page.evaluate(async gate => {
    const path = '/src/views/chart.js';
    const chart = await import(performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === path)?.name || path);
    if (gate === 'center') chart.showCenterDetail('spleen'); else chart.showGateDetail(gate);
  }, gate);
}
async function close(page) { await page.keyboard.press('Escape'); await page.locator('#gate-detail').waitFor({ state: 'hidden' }); }
async function skin(page, id) {
  if (!(await page.locator('#more-menu').evaluate(n => n.open))) await page.locator('#more-toggle').click();
  await page.locator('#skin-settings-button').click();
  await page.locator(`#skin-picker [data-skin-id="${id}"]`).click();
  await page.keyboard.press('Escape');
}
async function status(locator) {
  return locator.evaluate(n => {
    const s = getComputedStyle(n);
    const props = ['fontFamily','fontSize','fontWeight','lineHeight','color','backgroundColor','backgroundImage','marginTop','marginRight','marginBottom','marginLeft','paddingTop','paddingRight','paddingBottom','paddingLeft','borderRadius','letterSpacing','textTransform'];
    return { text: n.textContent.trim(), classes: [...n.classList].sort(), style: Object.fromEntries(props.map(p => [p,s[p]])) };
  });
}
async function metrics(page) {
  return detail(page).locator('.gate-detail-channel').evaluateAll(nodes => nodes.map((n, i) => {
    const box = el => { const b = el.getBoundingClientRect(); return { top:b.top,bottom:b.bottom,left:b.left,right:b.right,width:b.width,height:b.height }; };
    const title = n.querySelector('[data-channel]'), badges = n.querySelector('.channel-circuit-badges'), status = n.querySelector(':scope > .transit-source-badge'), paired = n.querySelector('[data-paired-gate]');
    const b = box(n), t = box(title), c = box(badges), s = box(status), p = box(paired);
    // Measure rendered text, excluding the new centering wrapper's line box.
    const walker = document.createTreeWalker(paired, NodeFilter.SHOW_TEXT); const textRects = [];
    while (walker.nextNode()) {
      const range = document.createRange(); range.selectNodeContents(walker.currentNode);
      textRects.push(...[...range.getClientRects()].filter(r => r.height > 0));
    }
    const textTop = Math.min(...textRects.map(r => r.top)), textBottom = Math.max(...textRects.map(r => r.bottom));
    const style = getComputedStyle(n);
    return { channel:title.dataset.channel, card:b, title:t, badges:c, status:s, hit:p,
      gaps:{ titleBadges:c.top-t.bottom, badgesStatus:s.top-c.bottom, statusHit:p.top-s.bottom, statusText:textTop-s.bottom,
        textBottom:p.bottom-textBottom, adjacent:i ? b.top-box(nodes[i-1]).bottom : null },
      padding:style.padding, display:style.display, overflow:n.scrollWidth > n.clientWidth+1,
      badgeSizes:[...badges.children].map(e => ({ text:e.textContent, width:box(e).width,height:box(e).height })) };
  }));
}
try {
  for (const width of [1280,390,320]) for (const locale of ['en','zh-CN','zh-Hant']) {
    const context = await browser.newContext({ viewport:{width,height:900},hasTouch:width<600,reducedMotion:'reduce' });
    await context.addInitScript(locale => localStorage.setItem('ohd-language',locale),locale);
    await context.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\//, r => r.abort());
    const page = activePage = await context.newPage(); const errors=[]; page.on('pageerror',e => errors.push(e.message));
    await page.clock.setFixedTime(new Date('2026-10-01T06:31:21Z'));
    await page.goto(`${base}/?d=2000-05-10&t=12%3A30&tz=8`);
    await page.locator('#foundation-panel .reliability').waitFor({timeout:60000}); await page.evaluate(() => document.fonts.ready);
    const skins = width===1280 && locale==='en' ? SKINS.map(s => s.id) : ['default-light','default-dark','high-contrast','midnight-contrast'];
    for (const id of skins) {
      console.log(`${phase} compact ${width}/${locale}/${id}`); await skin(page,id);
      await invoke(page,'center'); const center = await detail(page).locator('.gate-detail-channel').evaluateAll(ns => ns.map(n => ({html:n.outerHTML,height:n.getBoundingClientRect().height,display:getComputedStyle(n).display}))); await close(page);
      await invoke(page,20); await detail(page).locator('[data-lens="gk"]').click();
      await detail(page).locator('[data-paired-gate]').last().scrollIntoViewIfNeeded(); await page.mouse.move(0,0);
      const rows = await metrics(page); assert.deepEqual(rows.map(r=>r.channel),['10-20','20-34','20-57']);
      writeFileSync(resolve(out,`${width}-${locale}-${id}-metrics.json`),JSON.stringify(rows,null,2)+'\n');
      const previous = baseline.find(r=>r.width===width && r.locale===locale && r.skin===id);
      if (['default-light','default-dark'].includes(id)) {
        await page.screenshot({path:resolve(out,`${width}-${locale}-${id}-sheet.png`)});
        const first=rows[0].card,last=rows.at(-1).card;
        await page.screenshot({path:resolve(out,`${width}-${locale}-${id}-rows.png`),clip:{x:first.left,y:first.top,width:first.width,height:last.bottom-first.top}});
      }
      if (phase==='after') {
        assert.ok(previous,'matched baseline required'); assert.deepEqual(center,previous.center,'center markup/layout unchanged');
        rows.forEach((r,i)=>{
          assert.ok(r.card.height < previous.rows[i].card.height,`${r.channel} must shrink`);
          assert.ok(['grid','flex'].includes(r.display)); assert.ok(!r.overflow && r.card.left>=0 && r.card.right<=width);
          assert.ok(r.gaps.titleBadges>=4 && r.gaps.titleBadges<=6); assert.ok(r.gaps.badgesStatus>=4 && r.gaps.badgesStatus<=6);
          assert.ok(r.hit.height>=44 && r.hit.width>=44 && r.gaps.statusHit>=0);
          // A 320px English label can become one line when the full link uses weight 500.
          // Compare text gaps only when the baseline was also one line; always bound
          // the real gap and verify centering and card-height reduction independently.
          const prior = previous.rows[i];
          const priorTextHeight = prior.hit.height - (prior.gaps.statusText-prior.gaps.statusHit) - prior.gaps.textBottom;
          if (priorTextHeight < 25) assert.ok(r.gaps.statusText < prior.gaps.statusText,'same-line text distance improves');
          assert.ok(r.gaps.statusText>=0 && r.gaps.statusText<=14.5,'centered text stays close without overlapping status');
          assert.ok(Math.abs((r.gaps.statusText-r.gaps.statusHit)-r.gaps.textBottom)<=2,'text vertically centered in hit target');
          assert.ok(r.gaps.adjacent===null || r.gaps.adjacent>=8,'cards remain distinct');
          assert.deepEqual(r.badgeSizes,previous.rows[i].badgeSizes,'original badge geometry preserved');
        });
      }
      await close(page);
      let comparisons=0;
      if (phase==='after') for (const gate of [20,37,57]) {
        await invoke(page,gate);
        const keys=await detail(page).locator('[data-channel]').evaluateAll(ns=>ns.map(n=>n.dataset.channel));
        for (const key of keys) {
          const row=detail(page).locator('.gate-detail-channel').filter({has:page.locator(`[data-channel="${key}"]`)});
          const original=await status(row.locator(':scope > .transit-source-badge'));
          await row.locator('[data-channel]').click(); assert.deepEqual(await status(detail(page).locator('.tl-detail-channel-status')),original,`${gate}/${key} exact full status`); comparisons++;
          await detail(page).locator('.gate-detail-back').click();
          const pair=row.locator('[data-paired-gate]'); const target=await pair.getAttribute('data-paired-gate');
          const link=pair.locator('.gate-detail-paired-gate-link');
          await page.keyboard.press('Tab'); await pair.focus(); assert.equal(await pair.evaluate(n=>n.matches(':focus-visible')),true);
          assert.ok((await link.evaluate(n=>getComputedStyle(n).textDecorationLine)).includes('underline'));
          await pair.press(gate===37?'Space':'Enter'); assert.ok((await detail(page).locator('.tl-detail-heading > .detail-label').textContent()).includes(target));
          await detail(page).locator('.gate-detail-back').click();
          if(width===1280){await pair.hover();assert.ok((await link.evaluate(n=>getComputedStyle(n).textDecorationLine)).includes('underline'));}
          await detail(page).locator('.gate-detail-close').focus(); await page.mouse.move(0,0);
          assert.equal(await link.evaluate(n=>getComputedStyle(n).textDecorationLine),'none');
          await pair.scrollIntoViewIfNeeded(); const hit=await pair.boundingBox();
          if(width<600) await page.touchscreen.tap(hit.x+4,hit.y+hit.height-2); else await page.mouse.click(hit.x+4,hit.y+hit.height-2);
          assert.ok((await detail(page).locator('.tl-detail-heading > .detail-label').textContent()).includes(target)); await detail(page).locator('.gate-detail-back').click();
        }
        const boxes=await detail(page).locator('.gate-detail-channel, .channel-circuit-badges, .circuit-badge, [data-paired-gate]').evaluateAll(ns=>ns.map(n=>({left:n.getBoundingClientRect().left,right:n.getBoundingClientRect().right,scroll:n.scrollWidth,client:n.clientWidth})));
        for(const b of boxes) assert.ok(b.left>=0 && b.right<=width && b.scroll<=b.client+1,'no layout overflow');
        await close(page);
      }
      results.push({width,locale,skin:id,rows,center,comparisons});
    }
    assert.deepEqual(errors,[]); await context.close(); activePage=null;
  }
  writeFileSync(resolve(out,'results.json'),JSON.stringify({phase,passed:true,cases:results},null,2)+'\n');
  console.log(`PASS ${results.length} compact cases; ${results.reduce((n,r)=>n+r.comparisons,0)} exact status comparisons`);
} catch(error) {
  if(activePage) await activePage.screenshot({path:resolve(out,`failure-${Date.now()}.png`)}).catch(()=>{});
  writeFileSync(resolve(out,`failure-${Date.now()}.json`),JSON.stringify({error:error.stack,completed:results},null,2)); throw error;
} finally { await browser.close(); }
