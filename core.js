export const STATES = {todo: {label:'미완료',icon:'○'}, doing:{label:'진행 중',icon:'◷'}, done:{label:'완료',icon:'✓'}};
export function nextState(value, allowProgress) {
  const order = allowProgress ? ['todo','doing','done'] : ['todo','done'];
  return order[(order.indexOf(value) + 1) % order.length];
}
export function statusOf(data,itemId,studentId) {return data.statuses[itemId]?.[studentId]?.state || 'todo';}
export function counts(data,itemId) {
  const result={todo:0,doing:0,done:0};
  for(const s of data.students) result[statusOf(data,itemId,s.id)]++;
  return result;
}
export function changedRows(base,draft) {
  return Object.entries(draft).filter(([id,state])=>state!==(base[id]?.state||'todo')).map(([id,state])=>({id,state,revision:base[id]?.revision||0}));
}
export function validateStudents(students) {
  const nums=new Set();
  for(const s of students) {
    if(!Number.isInteger(s.number)||s.number<1||s.number>99) throw new Error('출석번호는 1~99 사이의 정수로 입력해 주세요.');
    if(!s.name.trim()||s.name.length>30) throw new Error('이름은 1~30자로 입력해 주세요.');
    if(nums.has(s.number)) throw new Error(`${s.number}번이 중복됩니다. 출석번호를 확인해 주세요.`);
    nums.add(s.number);
  }
  return students.sort((a,b)=>a.number-b.number);
}
export function parseRoster(text) {
  return text.trim().split(/\r?\n/).filter(Boolean).map(line=>{
    const match=line.trim().match(/^(\d+)\s*[,\t ]\s*(.+)$/);
    if(!match) throw new Error('한 줄에 번호와 이름을 입력해 주세요. 예: 1 김하늘');
    return {id:crypto.randomUUID(),number:Number(match[1]),name:match[2].trim()};
  });
}
export function applyChanges(data,itemId,rows) {
  const item=data.items.find(i=>i.id===itemId);
  if(!item) throw new Error('삭제된 항목입니다.');
  const current=data.statuses[itemId]||{};
  if(rows.some(r=>(current[r.id]?.revision||0)!==r.revision)) throw new Error('다른 기기에서 같은 학생의 상태가 바뀌었어요. 취소 후 항목을 다시 열어 확인해 주세요.');
  for(const row of rows) {
    if(!data.students.some(s=>s.id===row.id)) throw new Error('학생 명단이 변경되었어요. 취소 후 다시 열어 주세요.');
    if(!STATES[row.state]||(!item.allowProgress&&row.state==='doing')) throw new Error('진행 중 설정이 변경되었어요. 취소 후 다시 열어 주세요.');
  }
  data.statuses[itemId] ||= {};
  for(const row of rows) data.statuses[itemId][row.id]={state:row.state,revision:row.revision+1,updatedAt:Date.now()};
}
export function demoData() {
 const names=['김하늘','박서준','이지우','최도윤','정서아','강민준','윤하린','장시우','임지안','한예준','오수아','서지호','신유나','권우진','황다은'];
 const students=names.map((name,i)=>({id:`demo-${i+1}`,number:i+1,name}));
 const items=[{id:'trip',title:'현장체험학습 참가 신청서',due:'',allowProgress:false,archived:false,revision:1},{id:'math',title:'수학 익힘책 검사',due:'',allowProgress:true,archived:false,revision:1},{id:'reading',title:'독서 기록장',due:'',allowProgress:true,archived:false,revision:1},{id:'consent',title:'개인정보 동의서',due:'',allowProgress:false,archived:false,revision:1}];
 const statuses={};
 items.forEach((item,j)=>{statuses[item.id]={};students.forEach((s,i)=>{statuses[item.id][s.id]={state:i<(8-j)?'done':item.allowProgress&&i<11?'doing':'todo',revision:1};});});
 return {students,items,statuses,rosterRevision:1};
}
