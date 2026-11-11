import {demoData,applyChanges,validateStudents} from './core.js';
export function createDemoStore(notify) {
 let data=demoData();
 const emit=()=>notify(structuredClone(data));
 return {mode:'demo',subscribe(){emit();}, async login(){return true;},async logout(){},
 async saveStatuses(itemId,rows,teacher=false){if(data.items.find(i=>i.id===itemId)?.archived&&!teacher)throw new Error('보관된 항목입니다. 취소 후 다시 열어 주세요.');applyChanges(data,itemId,rows);emit();},
 async saveItem(item,expected){
   const old=data.items.find(i=>i.id===item.id);
   if(old&&old.revision!==expected) throw new Error('항목이 변경되었습니다. 다시 열어 주세요.');
   if(old?.allowProgress&&!item.allowProgress) for(const v of Object.values(data.statuses[item.id]||{})) if(v.state==='doing'){v.state='todo';v.revision++;}
   const next={...item,revision:(old?.revision||0)+1};
   data.items=old?data.items.map(i=>i.id===item.id?next:i):[...data.items,next];emit();
 },async deleteItem(id){data.items=data.items.filter(i=>i.id!==id);delete data.statuses[id];emit();},
 async saveRoster(students,expected){
  if(data.rosterRevision!==expected)throw new Error('명단이 변경되었습니다. 다시 열어 주세요.');
  validateStudents(students);
  const ids=new Set(students.map(s=>s.id));
  for(const group of Object.values(data.statuses))for(const id of Object.keys(group))if(!ids.has(id))delete group[id];
  data.students=students;data.rosterRevision++;emit();
 },getData(){return structuredClone(data);}};
}
