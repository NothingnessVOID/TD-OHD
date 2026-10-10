import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('artifacts/visual-review/penta-restoration'),out=path.resolve('docs/development/screenshots/penta-restoration');await mkdir(out,{recursive:true});
const groups=[
 ['01-graph-history',440,564,3,[['graph-fe4e5fd','Phase 1C: fe4e5fd'],['graph-8d9d141','Before: 8d9d141'],['graph-working','Restored']]],
 ['02-page-scroll',720,480,2,[['04-top-1440','Top operations'],['05-sticky-middle','Document scroll: 650px'],['06-sticky-reading','Continue reading'],['10-page-end','Document bottom']]],
 ['03-gate-details',720,480,2,[['01-birth-gate','Birth gate 14'],['08-penta-gate-members','Penta gate 14: member contributions']]],
 ['04-channel-details',720,480,2,[['02-birth-channel','Birth channel 2-14'],['09-penta-channel','Penta channel 2-14'],['09b-penta-related-gates','Shared related gate cards']]],
 ['05-operations',720,480,2,[['03-picker','Multi-select draft'],['11-editor','Person editor'],['12-save','Save'],['13-manage','Manage'],['14-switcher','Team / Penta switcher']]],
 ['06-responsive',640,420,2,[['15-layout-1280-800','1280 desktop'],['16-sticky-1280-640','Short desktop: sticky fits'],['15-layout-390-844','390 mobile'],['17-mobile-gate','Mobile group detail']]],
 ['07-languages-skins',720,480,2,[['20-en-default-dark','English / default dark'],['20-zh-Hant-high-contrast','Traditional / high contrast'],['20-zh-CN-default-light','Simplified / default light']]]
];
for(const[name,w,h,cols,items]of groups){const gap=16,title=32,rows=Math.ceil(items.length/cols),layers=[];for(let i=0;i<items.length;i++){const[file,label]=items[i],x=gap+i%cols*(w+gap),y=gap+Math.floor(i/cols)*(h+title+gap);layers.push({input:Buffer.from(`<svg width="${w}" height="${title}"><text x="4" y="22" font-family="Arial" font-size="16" fill="#222">${label}</text></svg>`),left:x,top:y});layers.push({input:await sharp(path.join(root,file+'.png')).resize(w,h,{fit:'contain',background:'#eee'}).toBuffer(),left:x,top:y+title});}await sharp({create:{width:cols*(w+gap)+gap,height:rows*(h+title+gap)+gap,channels:3,background:'#eee'}}).composite(layers).png().toFile(path.join(out,name+'.png'));}console.log(out);
