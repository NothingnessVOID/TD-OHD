import test from 'node:test';
import assert from 'node:assert/strict';
import { contrastRatio, readableRGB } from '../src/lib/source-contrast.js';
test('contrast uses WCAG luminance and retains already readable source hue', () => {
  assert.equal(contrastRatio([0,0,0],[255,255,255]),21);
  assert.deepEqual(readableRGB([100,30,80],[[255,255,255]]),[100,30,80]);
});
test('custom light/dark colors mix toward page text until all surfaces pass', () => {
  for(const [source,bgs,text] of [[[240,230,190],[[255,255,255],[245,245,245]],[20,20,20]],[[20,30,50],[[15,15,15],[35,35,35]],[230,230,230]]]) {
    const result=readableRGB(source,bgs,text);
    assert.ok(bgs.every(bg=>contrastRatio(result,bg)>=4.5));
  }
});
test('opposite stripe surfaces cannot share a qualifying single foreground', () => {
  const backgrounds=[[40,40,40],[255,255,255]];
  const result=readableRGB([200,50,40],backgrounds);
  assert.ok(backgrounds.some(bg=>contrastRatio(result,bg)<4.5), 'renderer needs a local number backing');
});
