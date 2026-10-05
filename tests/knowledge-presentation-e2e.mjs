/** Round 2B: public Detail policies, long titles and both shared surfaces. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';

const base = process.env.E2E_URL || 'http://127.0.0.1:5201';
const browser = await chromium.launch({channel:process.env.CHROME_CHANNEL || 'chrome',headless:true});
const results = [];
const sceneNames = ['type','authority','profile-right','profile-fixed','profile-left','definition','determination','environment','perspective','motivation','cross'];
const bodyWithoutContext = locator => locator.evaluate(node => {
  const copy = node.cloneNode(true); copy.querySelector('.knowledge-context')?.remove(); copy.querySelectorAll('.knowledge-yours').forEach(n=>n.remove()); return copy.innerHTML;
});
try {
  for (const width of [1224,903,664,390]) for (const locale of ['en','zh-CN','zh-Hant']) {
    console.log(`Checking Knowledge presentation ${width}/${locale}`);
    const context = await browser.newContext({viewport:{width,height:900},locale,reducedMotion:'reduce'});
    await context.addInitScript(locale => localStorage.setItem('ohd-language',locale),locale);
    await context.route(/https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com)\//,route => route.abort());
    const page = await context.newPage(), errors = [];
    page.on('pageerror',error => errors.push(error.message));
    await page.goto(`${base}/?d=2000-05-10&t=12%3A30&tz=8`,{waitUntil:'domcontentloaded'});
    await page.locator('#foundation-panel .reliability').waitFor({timeout:60000});
    await page.evaluate(async () => {await document.fonts.ready; return true;});
    for (const name of sceneNames) {
      await page.evaluate(async name => {
        const {openKnowledgeDetail} = await import('/src/lib/knowledge/detail-controller.js');
        const {getCurrentChart} = await import('/src/views/chart.js');
        const {chartKnowledgeQuery} = await import('/src/lib/knowledge/access.js');
        const chart = getCurrentChart().chart;
        const fixed = {
          type:{objectType:'type',objectId:'manifestingGenerator'},
          authority:{objectType:'authority',objectId:'egoProjected'},
          'profile-right':{objectType:'profile',objectId:'1/3'},
          'profile-fixed':{objectType:'profile',objectId:'4/1'},
          'profile-left':{objectType:'profile',objectId:'5/2'},
          definition:{objectType:'definition',objectId:'quadrupleSplit'}
        };
        const variable = ['determination','environment','perspective','motivation'].includes(name);
        const query = fixed[name] || chartKnowledgeQuery(chart,variable?'variable':'cross',variable?name:null);
        openKnowledgeDetail(query,variable?{variable:chart.variable[name]}:null);
      },name);
      const article = page.locator('#gate-detail .knowledge-detail');
      const text = await article.innerText();
      if (locale === 'en') assert.doesNotMatch(text,/[\u3400-\u9fff]/);
      else if(locale==='zh-Hant') assert.doesNotMatch(text,/[A-Za-z]/);
      assert.equal(await article.locator('h2.detail-name').count(),1);
      assert.equal(await article.locator('.knowledge-facts,[data-version]').count(),0);
      const geometry = await article.evaluate(node => {
        const body = node.closest('.gate-detail-body'), title = node.querySelector('.detail-name'), close = document.querySelector('#gate-detail .gate-detail-close');
        const c = close.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(title);
        const titleAvoidsClose = [...range.getClientRects()].every(t => t.right<=c.left+1 || t.left>=c.right || t.top>=c.bottom || t.bottom<=c.top);
        return {fits:body.scrollWidth<=body.clientWidth+1,titleAvoidsClose,titleFont:getComputedStyle(title).fontSize,headingOrder:[...node.children].map(x=>x.className)};
      });
      assert.equal(geometry.fits,true,`${width}/${locale}/${name}: horizontal overflow`);
      assert.equal(geometry.titleAvoidsClose,true,`${width}/${locale}/${name}: close overlap`);
      assert.equal(geometry.titleFont,'22px');
      assert.deepEqual(geometry.headingOrder.slice(0,3),['detail-label','detail-name','knowledge-summary']);
      if (['determination','environment','perspective','motivation'].includes(name)) {
        assert.equal(await article.locator('.knowledge-context').count(),1);
        assert.equal(await article.locator('.knowledge-type-properties').count(),0);
        assert.ok(geometry.headingOrder.indexOf('knowledge-context')>geometry.headingOrder.indexOf('knowledge-summary'));
        const palette = await article.evaluate(node => {
          const css = getComputedStyle(node), direction = getComputedStyle(node.querySelector('.knowledge-direction'));
          const sample = document.createElement('span');sample.style.color = `var(--hd-${node.dataset.source})`;node.append(sample);
          const expected = getComputedStyle(sample).color;sample.remove();
          return {label:getComputedStyle(node.querySelector('.detail-label')).color,direction:direction.color,expected};
        });
        assert.equal(palette.label,palette.expected);assert.equal(palette.direction,palette.expected);
      }
      const body = await bodyWithoutContext(article);
      const reading = await article.locator('.knowledge-body').innerHTML();
      if (process.env.KNOWLEDGE_SCREENSHOT_DIR && ['type','authority','profile-left','motivation','cross'].includes(name)) {
        mkdirSync(process.env.KNOWLEDGE_SCREENSHOT_DIR,{recursive:true});
        await page.screenshot({path:`${process.env.KNOWLEDGE_SCREENSHOT_DIR}/${width}-${locale}-${name}-modal.png`});
      }
      await page.locator('#gate-detail .knowledge-library-link').click();
      const library = page.locator('#reference-detail .knowledge-detail'); await library.waitFor();
      if (name !== 'cross') assert.equal(await bodyWithoutContext(library),body);
      else assert.equal(await library.locator('.knowledge-body').innerHTML(),reading);
      assert.equal(await library.locator('.knowledge-context,.knowledge-facts,.knowledge-yours').count(),0);
      assert.equal(await library.locator('.detail-name').evaluate(n=>getComputedStyle(n).fontSize),'22px');
      const fit = await library.evaluate(n=>({fits:n.scrollWidth<=n.clientWidth+1,containerFits:n.parentElement.scrollWidth<=n.parentElement.clientWidth+1}));
      assert.equal(fit.fits,true);assert.equal(fit.containerFits,true);
      if (process.env.KNOWLEDGE_SCREENSHOT_DIR && name === 'profile-left') await page.screenshot({path:`${process.env.KNOWLEDGE_SCREENSHOT_DIR}/${width}-${locale}-${name}-library.png`});
      results.push({width,locale,object:name,modal:true,library:true,heading:true,noOverflow:true,sameBody:true});
    }
    assert.deepEqual(errors,[]);await context.close();
  }
  if (process.env.KNOWLEDGE_PRESENTATION_OUTPUT) writeFileSync(process.env.KNOWLEDGE_PRESENTATION_OUTPUT,JSON.stringify({cases:results},null,2)+'\n');
  console.log(`PASS ${results.length} Knowledge Modal/Library presentation cases across 12 width/language combinations`);
} finally {await browser.close();}
