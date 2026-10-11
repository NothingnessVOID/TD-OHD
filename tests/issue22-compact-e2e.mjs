/** Paired cards: identical before/after capture plus geometry and exact full-detail status checks. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { SKINS } from '../src/lib/skin-registry.js';
const base = process.env.E2E_URL || 'http://127.0.0.1:19976';
const phase = process.env.ISSUE22_COMPACT_PHASE || 'after';
assert.ok(['before', 'after'].includes(phase));
const root = resolve(process.env.ISSUE22_COMPACT_EVIDENCE_DIR || 'artifacts/issue22-final-layout');
const out = resolve(root, phase); mkdirSync(out, { recursive: true });
const baselinePath = resolve(process.env.ISSUE22_COMPACT_BASELINE || resolve(root, 'before/results.json'));
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
    const title = n.querySelector('[data-channel]'), badges = n.querySelector('.channel-circuit-badges'), status = n.querySelector('.transit-source-badge'), paired = n.querySelector('[data-paired-gate]');
    const b = box(n), t = box(title), c = box(badges), s = box(status), p = box(paired);
    // Measure rendered text, excluding the new centering wrapper's line box.
    const walker = document.createTreeWalker(paired, NodeFilter.SHOW_TEXT); const textRects = [];
    while (walker.nextNode()) {
      const range = document.createRange(); range.selectNodeContents(walker.currentNode);
      textRects.push(...[...range.getClientRects()].filter(r => r.height > 0));
    }
    const textTop = Math.min(...textRects.map(r => r.top)), textBottom = Math.max(...textRects.map(r => r.bottom));
    const style = getComputedStyle(n);
    const probe = document.createElement('span'); probe.style.cssText='color:var(--border);border-top:1.5px solid var(--border)'; n.append(probe);
    const borderColor = getComputedStyle(probe).color, expectedBorderWidth = getComputedStyle(probe).borderTopWidth; probe.remove();
    const header = n.querySelector('.gate-detail-channel-header');
    return { channel:title.dataset.channel, card:b, title:t, badges:c, status:s, hit:p,
      gaps:{ titleBadges:c.top-t.bottom, badgesStatus:s.top-c.bottom, statusHit:p.top-s.bottom, statusText:textTop-s.bottom,
        textBottom:p.bottom-textBottom, adjacent:i ? b.top-box(nodes[i-1]).bottom : null },
      header: header ? box(header) : null, statusIndependent: status.parentElement === n,
      sameRow: Math.min(t.bottom,c.bottom) > Math.max(t.top,c.top), borderColor, expectedBorderWidth,
      separator: { width:getComputedStyle(paired).borderTopWidth, style:getComputedStyle(paired).borderTopStyle, color:getComputedStyle(paired).borderTopColor, token:getComputedStyle(paired).getPropertyValue('--border').trim() },
      padding:style.padding, display:style.display, overflow:n.scrollWidth > n.clientWidth+1,
      badgeSizes:[...badges.children].map(e => ({ text:e.textContent, width:box(e).width,height:box(e).height })) };
  }));
}
try {
  for (const width of (process.env.ISSUE22_POINTER_ONLY==='1' ? [] : [1280,390,320])) for (const locale of ['en','zh-CN','zh-Hant']) {
    const context = await browser.newContext({ viewport:{width,height:900},hasTouch:width<600,reducedMotion:'reduce' });
    await context.addInitScript(locale => localStorage.setItem('ohd-language',locale),locale);
    await context.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\//, r => r.abort());
    const page = activePage = await context.newPage(); const errors=[]; page.on('pageerror',e => errors.push(e.message));
    await page.clock.setFixedTime(new Date('2026-10-01T06:31:21Z'));
    await page.goto(`${base}/?d=2000-05-10&t=12%3A30&tz=8`);
    await page.locator('#foundation-panel .reliability').waitFor({timeout:60000}); await page.evaluate(() => document.fonts.ready);
    const skins = process.env.ISSUE22_QUICK === '1'
      ? ['default-light', ...(locale === 'zh-CN' ? ['default-dark'] : []), ...(width===1280 && locale==='en' ? ['high-contrast','midnight-contrast'] : [])]
      : width===1280 && locale==='en' ? SKINS.map(s => s.id) : ['default-light','default-dark','high-contrast','midnight-contrast'];
    for (const id of skins) {
      console.log(`${phase} compact ${width}/${locale}/${id}`); await skin(page,id);
      await invoke(page,'center'); const center = await detail(page).locator('.gate-detail-channel').evaluateAll(ns => ns.map(n => ({html:n.outerHTML,height:n.getBoundingClientRect().height,display:getComputedStyle(n).display}))); await close(page);
      await invoke(page,20); await detail(page).locator('[data-lens="gk"]').click();
      await detail(page).locator('[data-paired-gate]').last().scrollIntoViewIfNeeded(); await page.mouse.move(0,0);
      const rows = await metrics(page); assert.deepEqual(rows.map(r=>r.channel),['10-20','20-34','20-57']);
      writeFileSync(resolve(out,`${width}-${locale}-${id}-metrics.json`),JSON.stringify(rows,null,2)+'\n');
      const previous = baseline.find(r=>r.width===width && r.locale===locale && r.skin===id);
      if (process.env.ISSUE22_SCREENSHOTS !== '0' && locale==='zh-CN' && width!==320 && ['default-light','default-dark'].includes(id)) {
        await page.screenshot({path:resolve(out,`${width}-${locale}-${id}-sheet.png`)});
        const first=rows[0].card,last=rows.at(-1).card;
        await page.screenshot({path:resolve(out,`${width}-${locale}-${id}-rows.png`),clip:{x:first.left,y:first.top,width:first.width,height:last.bottom-first.top}});
      }
      if (phase==='after') {
        assert.ok(previous,'matched baseline required'); assert.deepEqual(center,previous.center,'center markup/layout unchanged');
        rows.forEach((r,i)=>{
          assert.ok(['grid','flex'].includes(r.display)); assert.ok(!r.overflow && r.card.left>=0 && r.card.right<=width);
          assert.ok(r.header, 'title and badges share a header');
          const fits = r.title.width + r.badges.width + 8 <= r.header.width + 0.02;
          assert.equal(r.sameRow, fits, 'title and badges stay together when they fit, otherwise naturally wrap');
          if (fits) assert.ok(r.badges.left-r.title.right>=6 && r.badges.left-r.title.right<=8.1, 'natural flex-start header gap');
          else assert.ok(r.badges.top >= r.title.bottom + 4, 'wrapped badges have a real gap');
          assert.ok(r.statusIndependent && r.status.top >= r.header.bottom+4 && r.status.top<=r.header.bottom+6, 'status has an independent second row');
          assert.ok(r.hit.top >= r.status.bottom + 4 && r.hit.top <= r.status.bottom + 6);
          assert.ok(r.hit.height >= (width<=600 ? 44 : 30) && r.hit.width>=44 && r.gaps.statusHit>=0);
          assert.equal(r.separator.width,r.expectedBorderWidth, '1.5px uses the same browser/DPR quantization as a declared border probe'); assert.equal(r.separator.style,'solid');
          assert.ok(r.separator.token, 'existing border token resolves');
          assert.equal(r.separator.color, r.borderColor, 'separator uses resolved border token');
          r.heightDeltaFromThreeRow = r.card.height-previous.rows[i].card.height;
          // Moving badges from the metadata row to the title changes each row's max height.
          const oldMiddle = previous.rows[i].metadata?.height ?? previous.rows[i].header?.height;
          assert.ok(Number.isFinite(oldMiddle), 'explicit three-row baseline required');
          const expectedDelta = r.header.height+r.status.height-previous.rows[i].title.height-oldMiddle
            + parseFloat(r.separator.width)-parseFloat(previous.rows[i].separator.width);
          assert.ok(Math.abs(r.heightDeltaFromThreeRow-expectedDelta)<=1, 'height change follows the restored header rather than an obsolete 20px shrink target');
          if (fits && width===1280 && locale!=='en') assert.ok(r.card.height<=92,'typical desktop card near 90px');
          if (fits && width<600 && locale!=='en') assert.ok(r.card.height<=106,'typical mobile card near 103px');
          if (!fits) assert.ok(r.card.height<=106+r.badges.height+4+(width<600?14:0),'narrow wrapping remains compact');
          assert.ok(r.gaps.statusText>=0 && r.gaps.statusText<=20,'4px row gap, 2px badge height difference and centered 44px hit target stay close');
          assert.ok(Math.abs((r.gaps.statusText-r.gaps.statusHit)-r.gaps.textBottom)<=4,'text stays centered including the 1px separator and font glyph bounds');
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
          const original=await status(row.locator('.transit-source-badge'));
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
  const pointerCases = [];
  if (phase==='after') for (const [width,hasTouch] of [[1280,true],[390,false]]) {
    const context = await browser.newContext({viewport:{width,height:900},hasTouch,reducedMotion:'reduce'});
    await context.addInitScript(()=>localStorage.setItem('ohd-language','zh-CN'));
    await context.route(/https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)\//,r=>r.abort());
    const page=activePage=await context.newPage();
    await page.goto(`${base}/?d=2000-05-10&t=12%3A30&tz=8`);
    await page.locator('#foundation-panel .reliability').waitFor({timeout:60000});
    await page.locator('#bodygraph-container .bg-gate[data-gate="20"]').click();
    const heights=await detail(page).locator('[data-paired-gate]').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().height));
    assert.equal(heights.length,3); assert.ok(heights.every(h=>h>=44),'width and coarse-pointer independently preserve 44px targets');
    pointerCases.push({width,hasTouch,heights}); await context.close(); activePage=null;
  }
  writeFileSync(resolve(out,'results.json'),JSON.stringify({phase,passed:true,quick:process.env.ISSUE22_QUICK==='1',pointerCases,cases:results},null,2)+'\n');
  console.log(`PASS ${results.length} compact cases; ${results.reduce((n,r)=>n+r.comparisons,0)} exact status comparisons`);
} catch(error) {
  if(activePage) await activePage.screenshot({path:resolve(out,`failure-${Date.now()}.png`)}).catch(()=>{});
  writeFileSync(resolve(out,`failure-${Date.now()}.json`),JSON.stringify({error:error.stack,completed:results},null,2)); throw error;
} finally { await browser.close(); }
