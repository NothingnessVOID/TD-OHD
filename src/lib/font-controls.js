import './font-messages.js';
import { t, translatePage, onLocaleChange } from './i18n.js';
import { getFontPreference, setFontPreference, onFontPreferenceChange } from './font-preference.js';

export function setupFontControls() {
 const picker = document.getElementById('font-picker'), status = document.getElementById('font-status');
 let generation = 0, statusKey = '';
 for (const [id, name, description] of [['lxgw','LXGW Neo ZhiSong','Font LXGW description'], ['original','Original font','Font original description']]) {
  const button = document.createElement('button');button.type='button';button.className='appearance-choice-card font-choice';button.dataset.fontChoice=id;
  const title=document.createElement('span');title.className='appearance-choice-name';title.dataset.i18n=name;
  const preview=document.createElement('span');preview.className=`font-preview font-preview-${id}`;preview.dataset.i18n='Font Chinese preview';
  const caption=document.createElement('span');caption.className='font-choice-description';caption.dataset.i18n=description;
  const check=document.createElement('span');check.className='appearance-choice-check';check.textContent='✓';check.setAttribute('aria-hidden','true');
  button.append(title,preview,caption,check);button.onclick=()=>setFontPreference(id);picker.append(button);
 }
 const ipa=document.getElementById('font-restore-ipa');ipa.onclick=()=>setFontPreference('ipa');
 function refresh(){const font=getFontPreference();picker.querySelectorAll('[data-font-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.fontChoice===font)));ipa.setAttribute('aria-pressed',String(font==='ipa'));status.textContent=statusKey?t(statusKey):'';}
 async function load(){const token=++generation,font=getFontPreference();statusKey=font==='original'?'':'Font loading';refresh();if(font==='original')return;
  try {const family=font==='ipa'?'TD IPA Original':'TD LXGW Neo ZhiSong';const faces=await document.fonts.load(`16px "${family}"`,'天地乾坤');if(!faces.length)throw Error('Font face unavailable');if(token===generation){statusKey='Font loaded';refresh();}}
  catch{if(token===generation){statusKey='Font failed';refresh();}}
 }
 onFontPreferenceChange(load);onLocaleChange(()=>{translatePage(picker);refresh();});translatePage(picker);refresh();
 // Opening the settings already renders its live font preview; check only the selected face.
 document.getElementById('skin-settings-button').addEventListener('click',load);
}
