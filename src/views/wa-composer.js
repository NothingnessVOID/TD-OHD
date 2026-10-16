import '../styles/wa-composer.css';
import '../lib/wa/composer-messages.js';
import { t } from '../lib/i18n.js';
import { esc } from '../lib/format.js';
import { listPeople, getPerson, birthFromPerson } from '../lib/people.js';
import { listTeams as savedTeams } from '../lib/team-repository.js';
import { openPersonEditor } from '../lib/person-editor.js';
import { openOperationDialog, confirmOperation, renderDialogHeader } from '../lib/operation-dialog.js';
import { WA_ROLES, assertWaSnapshot } from '../lib/wa/model.js';
import { replaceWaSelection, waPersonIdsFromTeamGroup } from '../lib/wa/configuration.js';

const clone=value=>structuredClone(value);
const msg=(key,params)=>t(`Wa composer ${key}`,params);
const text=(key,params)=>esc(msg(key,params));

/** One atomic edit. Only invalidated annotations require an extra confirmation. */
export async function prepareWaSelectionChange(snapshot,patch,peopleMap,{isCurrent=()=>true}={}) {
  const captured=clone(assertWaSnapshot(snapshot));
  const check=()=>{if(!isCurrent())throw Object.assign(new Error(msg('changed')),{code:'COMPOSER_STALE'});};
  check();
  try {return {next:replaceWaSelection(captured,patch,peopleMap),annotationChanges:[]};}
  catch(error){
    if(error.code!=='ANNOTATION_CLEANUP_REQUIRED')throw error;
    const name=id=>{const ref=captured.members.find(member=>member.memberId===id);const person=peopleMap instanceof Map?peopleMap.get(ref?.personId):peopleMap?.[ref?.personId];return person?.name||ref?.labelSnapshot||id;};
    const labels={MANUAL_EDGE_ENDPOINT_NOT_PARTICIPANT:'edge',ALLY_NOT_PARTICIPANT:'ally',UNKNOWN_METADATA_MEMBER:'metadata',CONSULTATION_UNKNOWN_PENTA:'area'};
    const items=error.issues.map(issue=>{
      const value=issue.annotation;
      const description=issue.code==='MANUAL_EDGE_ENDPOINT_NOT_PARTICIPANT'?`${name(value.fromMemberId)} → ${name(value.toMemberId)}${value.label?` · ${value.label}`:''}`:issue.code==='ALLY_NOT_PARTICIPANT'?name(value):value?.memberId?name(value.memberId):value?.pentaId||'';
      return `${msg(labels[issue.code]||'metadata')} · ${description}`;
    });
    if(!await confirmOperation(`${msg('cleanup hint')}\n\n${items.join('\n')}`))return null;
    check();
    return {next:replaceWaSelection(captured,patch,peopleMap,{confirmAnnotationCleanup:true}),annotationChanges:[{beforeSnapshot:captured,issues:clone(error.issues)}]};
  }
}

/** Single target, single selection/import dialog. The organization editor stays on the page. */
export function openWaMemberPicker({snapshot,target,mode='people',peopleStore={list:listPeople,get:getPerson},
  listTeams=savedTeams,validate=()=>true,onCommit,onClose=null}={}) {
  if(typeof onCommit!=='function')throw new TypeError('Wa picker requires onCommit.');
  assertWaSnapshot(snapshot);
  const group=target==='alpha'?null:snapshot.pentas.find(item=>item.pentaId===target);
  if(target!=='alpha'&&!group)throw new RangeError('Select a Wa Alpha or Penta target.');
  const original=clone(snapshot),identity=JSON.stringify(snapshot),max=target==='alpha'?1:5;
  const targetName=target==='alpha'?msg('leader'):`Penta ${String.fromCharCode(65+WA_ROLES.indexOf(group.role))}${group.title?` · ${group.title}`:''}`;
  const refs=new Map(snapshot.members.map(member=>[member.memberId,member]));
  const initial=(target==='alpha'?(snapshot.alphaId?[snapshot.alphaId]:[]):group.memberIds).map(id=>refs.get(id).personId);
  let ids=[...initial],search='',opened=null,closed=false,busy=false,editorRoot=null,request=0;
  const current=()=>!closed&&validate()!==false&&JSON.stringify(snapshot)===identity;
  const personName=id=>peopleStore.get(id)?.name||snapshot.members.find(member=>member.personId===id)?.labelSnapshot||id;
  const groupName=id=>id==='alpha'?'Alpha':snapshot.pentas.find(item=>item.pentaId===id)?.title||`Penta ${String.fromCharCode(65+WA_ROLES.indexOf(snapshot.pentas.find(item=>item.pentaId===id)?.role))}`;
  const assigned=id=>{const member=snapshot.members.find(item=>item.personId===id);if(!member)return null;if(member.memberId===snapshot.alphaId)return 'alpha';return snapshot.pentas.find(item=>item.memberIds.includes(member.memberId))?.pentaId||null;};
  function finish(reason='cancel') {
    if(closed)return;closed=true;request++;
    const dialog=opened;opened=null;dialog?.close(reason);
    editorRoot?.querySelector('[data-close]')?.click();onClose?.(reason);
  }
  const fail=(root,error)=>{
    if(!root?.isConnected)return;
    if(error?.code==='SELECTION_CONFLICT'){const issue=error.issues[0];root.querySelector('[data-error]').textContent=msg('conflict',{name:personName(issue.personId),targets:issue.targets.map(groupName).join(' / ')});}
    else root.querySelector('[data-error]').textContent=error?.code==='COMPOSER_STALE'?msg('changed'):error?.message||msg('failed');
  };
  async function commit(nextIds) {
    if(busy||!current()) {if(!current())fail(opened?.root,{code:'COMPOSER_STALE'});return;}
    const root=opened.root;busy=true;
    root.querySelectorAll('[data-selection],[data-import-index]').forEach(node=>node.disabled=true);
    try {
      if(nextIds.length>max)throw Error(msg('limit'));
      const peopleMap=new Map(peopleStore.list().map(person=>[person.id,person]));
      if(nextIds.some(id=>!peopleMap.has(id)&&!initial.includes(id)))throw Error(msg('missing'));
      const patch=target==='alpha'?{alphaPersonId:nextIds[0]??null}:{groups:[{pentaId:target,personIds:[...nextIds]}]};
      const edit=await prepareWaSelectionChange(original,patch,peopleMap,{isCurrent:()=>current()&&root.isConnected});
      if(!edit)return;
      if(!current()||!root.isConnected)throw Object.assign(new Error(msg('changed')),{code:'COMPOSER_STALE'});
      const accepted=await onCommit(edit.next,{originalSnapshot:clone(original),annotationChanges:edit.annotationChanges,isCurrent:()=>current()&&root.isConnected});
      if(accepted===false)throw Object.assign(new Error(msg('changed')),{code:'COMPOSER_STALE'});
      finish('commit');
    }catch(error){fail(root,error);}
    finally{busy=false;if(root.isConnected)root.querySelectorAll('[data-selection],[data-import-index]').forEach(node=>node.disabled=false);}
  }
  function editor(id=null) {
    if(!current())return;
    const person=id?peopleStore.get(id):null;if(id&&!person){fail(opened.root,Error(msg('missing')));return;}
    const dialog=opened;opened=null;dialog.close('person-editor');
    const back=()=>{editorRoot=null;if(current())show();else finish();};
    openPersonEditor(person?{...person,...birthFromPerson(person)}:{},{create:!id,onCancel:back,onSaved:saved=>{
      if(!id){if(max===1)ids=[saved.id];else if(ids.length<max&&!ids.includes(saved.id))ids.push(saved.id);}back();
    }});
    editorRoot=document.activeElement?.closest('.person-editor')||null;
  }
  function renderPeople(root) {
    root.querySelector('[data-count]').textContent=msg('count',{count:ids.length,max});
    root.querySelector('[data-results]').innerHTML=peopleStore.list().filter(person=>`${person.name} ${person.birthDate||''}`.toLowerCase().includes(search.toLowerCase())).map(person=>{
      const selected=ids.includes(person.id),owner=assigned(person.id),conflict=owner&&owner!==target;
      return `<div class="wa-composer-person"><button type="button" class="btn-secondary wa-composer-choice" data-person="${esc(person.id)}" aria-pressed="${selected}" ${!selected&&(conflict||(max>1&&ids.length>=max))?'disabled':''}><span aria-hidden="true">${max===1?selected?'●':'○':selected?'☑':'☐'}</span><span><strong>${esc(person.name)}</strong><small>${esc(person.birthDate||'')}${conflict?` · ${text('assigned',{target:groupName(owner)})}`:''}</small></span></button><button type="button" class="btn-secondary" data-edit="${esc(person.id)}">${text('edit')}</button></div>`;
    }).join('')||`<p>${text('no results')}</p>`;
  }
  function show() {
    if(!current())return finish();
    const token=++request;
    const body=mode==='import'?`<p class="wa-composer-note">${text('import hint')}</p><div data-import-list class="wa-composer-imports" aria-busy="true"></div><p class="wa-composer-note">${text('origin',{origin:location.origin})}</p>`:`<label class="modal-field">${text('search')}<input type="search" data-search value="${esc(search)}"></label><div class="wa-composer-toolbar"><p data-count role="status"></p><button type="button" class="btn-secondary" data-create>${text('create')}</button></div><div class="wa-composer-results" data-results></div>`;
    opened=openOperationDialog({content:`<section class="modal wa-composer wa-target-picker" aria-label="${esc(targetName)}">${renderDialogHeader(`${msg(mode==='import'?'import':'select')} · ${targetName}`)}<div class="wa-composer-body">${body}<p class="wa-composer-error" data-error role="alert"></p></div><div class="modal-actions">${target==='alpha'?'':`<button class="btn-secondary" data-switch-mode>${text(mode==='import'?'pick people':'import')}</button>`}<button class="btn-secondary" data-close>${text('cancel')}</button>${mode==='people'?`<button class="btn-primary" data-selection>${text('confirm')}</button>`:''}</div></section>`,onClose:reason=>{if(reason!=='person-editor'&&reason!=='switch'&&!closed)finish(reason);}});
    const root=opened.root;
    root.querySelector('[data-switch-mode]')?.addEventListener('click',()=>{const dialog=opened;opened=null;dialog.close('switch');mode=mode==='import'?'people':'import';show();});
    if(mode==='import'){
      Promise.resolve().then(()=>listTeams()).then(teams=>{
        if(!current()||token!==request||!root.isConnected)return;
        const entries=teams.flatMap(team=>team.groups.map(group=>({team,group})));
        root.querySelector('[data-import-list]').innerHTML=entries.map(({team,group},index)=>`<button class="btn-secondary wa-composer-import-row" data-import-index="${index}"><strong>${esc(team.name)} / ${esc(group.label)}</strong><span>${text('import count',{count:group.memberIds.length})}</span><small>${group.memberIds.map(id=>{const ref=team.members.find(member=>member.memberId===id);return esc(ref?personName(ref.personId):msg('missing'));}).join(' · ')}</small></button>`).join('')||`<p>${text('no teams')}</p>`;
        root.querySelectorAll('[data-import-index]').forEach(button=>button.addEventListener('click',()=>{try{const entry=entries[Number(button.dataset.importIndex)];commit(waPersonIdsFromTeamGroup(entry.team,entry.group.pentaId));}catch(error){fail(root,error);}}));
      }).catch(error=>fail(root,error)).finally(()=>{if(root.isConnected)root.querySelector('[data-import-list]').setAttribute('aria-busy','false');});
    }else{
      root.querySelector('[data-search]').addEventListener('input',event=>{search=event.target.value;renderPeople(root);});
      root.querySelector('[data-create]').addEventListener('click',()=>editor());
      root.querySelector('[data-selection]').addEventListener('click',()=>commit(ids));
      root.addEventListener('click',event=>{const button=event.target.closest('button');if(!button||button.disabled)return;
        const id=button.dataset.person;
        if(id){if(max===1)ids=[id];else if(ids.includes(id))ids=ids.filter(value=>value!==id);else if(ids.length<max)ids.push(id);renderPeople(root);[...root.querySelectorAll('[data-person]')].find(node=>node.dataset.person===id)?.focus();}
        if(button.dataset.edit)editor(button.dataset.edit);
      });
      renderPeople(root);root.querySelector('[data-search]').focus();
    }
  }
  show();return {close:()=>finish(),getSelection:()=>[...ids]};
}
