import {STATES,nextState,statusOf,counts,changedRows,parseRoster,validateStudents} from './core.js';
import {createDemoStore} from './demo-store.js';
import {firebaseConfig,teacherUid} from './config.js';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data={students:[],items:[],statuses:{},rosterRevision:0},store,teacher=false,tab='overview',filterStudent='',noticeTimer;
let modal=null,busy=false,ready=false;
const badge=state=>`<span class="dot ${state}">${STATES[state].icon}</span>${STATES[state].label}`;
const legend=()=>`<div class="legend">${Object.keys(STATES).map(s=>`<span>${badge(s)}</span>`).join('')}</div>`;
const toast=text=>{$('#notice').textContent=text;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('#notice').textContent='',4500);};
const fail=(target,error)=>{target.textContent=error.message||'저장하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.';};
function receive(next){data=next;ready=true;render();}
function render(){
 if(!ready)return;
 if(location.hash==='#admin'){renderAdmin();return;}
 const active=data.items.filter(i=>!i.archived);
 $('#app').innerHTML=`<section class="intro"><div><h1>오늘도 하나씩, 차근차근.</h1><p class="muted">제출한 항목을 누르고 내 번호를 찾아 체크해요.</p></div><div class="summary">제출 항목 <strong>${active.length}</strong>개</div></section><div class="toolbar"><h2>우리 반 제출 현황</h2>${legend()}</div><section class="cards">${active.map(card).join('')||'<div class="panel empty">아직 제출 항목이 없어요.<br>선생님이 항목을 등록하면 여기에 나타나요.</div>'}</section>`;
 $('#app').querySelectorAll('[data-check]').forEach(b=>b.onclick=()=>openCheck(b.dataset.check));
}
function card(item){
 const c=counts(data,item.id);
 return `<button class="card" data-check="${esc(item.id)}" aria-label="${esc(item.title)} 체크하기"><div class="card-head"><span class="tag">${item.due?`제출 기한 ${esc(item.due.replaceAll('-','.'))}`:'기한 없이 차근차근'}</span><span class="arrow" aria-hidden="true">↗</span></div><h2>${esc(item.title)}</h2><div class="number-grid">${data.students.map(s=>{const state=statusOf(data,item.id,s.id);return `<span class="number ${state}" aria-label="${s.number}번 ${STATES[state].label}">${s.number}<small aria-hidden="true">${STATES[state].icon}</small></span>`;}).join('')}</div><div class="card-footer"><span><strong>${c.done}</strong> / ${data.students.length}명 완료</span><span>${item.allowProgress?`◷ 진행 중 ${c.doing}명`:'내 번호 체크하기'}</span></div><div class="progress" aria-hidden="true"><span style="width:${data.students.length?c.done/data.students.length*100:0}%"></span></div></button>`;
}
function openCheck(id){
 const item=data.items.find(i=>i.id===id);if(!item)return;
 modal={item:structuredClone(item),students:structuredClone(data.students),base:structuredClone(data.statuses[id]||{}),draft:{}};
 for(const s of modal.students)modal.draft[s.id]=statusOf(data,id,s.id);
 $('#check').innerHTML=`<div class="modal-head"><p class="eyebrow">나의 제출 체크</p><h2 id="check-title">${esc(item.title)}</h2><p>내 번호와 이름을 눌러요. ${item.allowProgress?'미완료 → 진행 중 → 완료':'미완료 ↔ 완료'}</p></div><div class="modal-body"><div id="student-buttons" class="student-grid"></div><p id="check-error" class="error" role="alert"></p></div><div class="modal-foot"><p id="change-count" aria-live="polite"></p><div class="inline"><button class="secondary" id="cancel-check">취소</button><button class="primary" id="save-check">완료 · 저장하기</button></div></div>`;
 renderDraft();$('#check').showModal();
 $('#cancel-check').onclick=()=>{if(!busy)$('#check').close();};
 $('#save-check').onclick=async()=>{
  const rows=changedRows(modal.base,modal.draft);
  if(!rows.length){$('#check').close();return;}
  busy=true;lockCheck(true);$('#check-error').textContent='';
  try{await store.saveStatuses(id,rows,teacher);$('#check').close();toast('체크한 내용을 저장했어요.');}
  catch(e){fail($('#check-error'),e);}
  finally{busy=false;lockCheck(false);}
 };
}
function lockCheck(value){$('#check').querySelectorAll('button').forEach(b=>b.disabled=value);$('#save-check').textContent=value?'저장 중…':'완료 · 저장하기';}
function renderDraft(){
 $('#student-buttons').innerHTML=modal.students.map(s=>{const state=modal.draft[s.id],changed=state!==(modal.base[s.id]?.state||'todo');return `<button class="student-button ${state} ${changed?'changed':''}" data-student="${esc(s.id)}" aria-label="${s.number}번 ${esc(s.name)}, ${STATES[state].label}. 누르면 다음 상태"><strong><span class="num">${s.number}번</span> ${esc(s.name)}</strong><small>${STATES[state].label}${changed?' · 변경됨':''}</small><span class="symbol" aria-hidden="true">${STATES[state].icon}</span></button>`;}).join('');
 $('#student-buttons').querySelectorAll('button').forEach(b=>b.onclick=()=>{const id=b.dataset.student;modal.draft[id]=nextState(modal.draft[id],modal.item.allowProgress);renderDraft();$('#student-buttons').querySelector(`[data-student="${id}"]`).focus();});
 $('#change-count').textContent=`${changedRows(modal.base,modal.draft).length}명 변경 · 저장하기를 누르면 반영돼요.`;
}
$('#check').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
function renderAdmin(){
 if(!teacher){
 $('#app').innerHTML=`<section class="panel login"><p class="eyebrow">TEACHER</p><h1>교사 로그인</h1><p class="muted">학생 명단과 제출 항목을 관리해요.</p>${store.mode==='demo'?'<p class="mode">화면 체험용입니다. 실제 인증이나 DB 저장은 하지 않습니다.</p><button id="demo-admin" class="primary">가상 데이터로 관리 화면 체험</button>':'<form id="login"><label>이메일<input name="email" type="email" autocomplete="username" required></label><label>비밀번호<input name="password" type="password" autocomplete="current-password" required></label><button class="primary">로그인</button><p class="error" id="login-error" role="alert"></p></form>'}</section>`;
 if(store.mode==='demo')$('#demo-admin').onclick=()=>{teacher=true;render();};
 else $('#login').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector('button');b.disabled=true;try{await store.login(f.email.value,f.password.value);f.reset();}catch(error){fail($('#login-error'),error);}finally{b.disabled=false;}};
 if(store.mode!=='demo'){
  const google=document.createElement('button');google.type='button';google.className='secondary';google.textContent='Google 계정으로 로그인';google.style.width='100%';google.style.marginTop='12px';$('#login').append(google);
  google.onclick=async()=>{google.disabled=true;$('#login-error').textContent='';try{await store.loginGoogle();}catch(error){const target=$('#login-error');if(target)fail(target,error);else toast(error.message);}finally{google.disabled=false;}};
 }
 return;}
 $('#app').innerHTML=`<div class="intro"><div><p class="eyebrow">TEACHER'S DESK</p><h1>우리 반 관리</h1><p class="muted">제출 기록을 살피고, 우리 반에 맞게 준비해요.</p></div><button id="logout" class="secondary">로그아웃</button></div><nav class="tabs" aria-label="교사 관리 메뉴">${[['overview','제출 현황'],['items','제출 항목 관리'],['students','학생 관리']].map(([id,label])=>`<button data-tab="${id}" class="${tab===id?'active':''}" aria-pressed="${tab===id}">${label}</button>`).join('')}</nav><div id="admin-content"></div>`;
 $('#logout').onclick=async()=>{try{await store.logout();teacher=false;render();}catch(e){toast(e.message);}};
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;renderAdmin();});
 if(tab==='overview')renderOverview();if(tab==='items')renderItems();if(tab==='students')renderStudents();
}
function renderOverview(){
 const active=data.items.filter(i=>!i.archived);
 if(!data.students.some(s=>s.id===filterStudent))filterStudent='';
 $('#admin-content').innerHTML=`<div class="stats"><div class="stat">전체 학생<strong>${data.students.length}명</strong></div><div class="stat">진행 중인 제출 항목<strong>${active.length}개</strong></div><div class="stat">보관한 항목<strong>${data.items.length-active.length}개</strong></div></div><div class="toolbar"><h2>항목별 · 학생별 현황</h2><div class="inline"><label for="student-filter">학생별 보기</label><select id="student-filter"><option value="">학급 전체</option>${data.students.map(s=>`<option value="${esc(s.id)}" ${filterStudent===s.id?'selected':''}>${s.number}번 ${esc(s.name)}</option>`).join('')}</select></div></div><div class="panel table-wrap"><table><thead><tr><th>제출 항목</th>${filterStudent?'<th>학생 상태</th>':'<th>완료</th><th>진행 중</th><th>미완료</th>'}<th>수정</th></tr></thead><tbody>${data.items.map(i=>{const c=counts(data,i.id);return `<tr><td>${esc(i.title)} ${i.archived?'<span class="tag">보관</span>':''}</td>${filterStudent?`<td>${badge(statusOf(data,i.id,filterStudent))}</td>`:`<td>${c.done}명</td><td>${i.allowProgress?c.doing+'명':'—'}</td><td>${c.todo}명</td>`}<td><button class="small" data-manage="${esc(i.id)}">상태 수정</button></td></tr>`;}).join('')}</tbody></table>${data.items.length?'':'<p class="empty">등록된 항목이 없습니다.</p>'}</div>`;
 $('#student-filter').onchange=e=>{filterStudent=e.target.value;renderOverview();};
 document.querySelectorAll('[data-manage]').forEach(b=>b.onclick=()=>openManage(b.dataset.manage));
}
function openManage(id){
 openCheck(id);
 const tools=document.createElement('div');tools.className='toolbar';
 tools.innerHTML=`<label><input type="checkbox" id="select-all"> 전체 선택</label><div class="inline"><button class="small" data-bulk="done">선택 학생 완료</button><button class="small" data-bulk="todo">선택 학생 미완료</button></div>`;
 $('#student-buttons').before(tools);
 // 상태 버튼과 독립적인 일괄 선택 체크박스. 변경은 저장 전까지 임시 상태입니다.
 const selections=new Set(filterStudent?[filterStudent]:[]);
 function addSelections(){
  $('#student-buttons').querySelectorAll('.student-button').forEach(button=>{
   const id=button.dataset.student,wrap=document.createElement('div');
   const label=document.createElement('label');label.style.marginBottom='6px';
   const input=document.createElement('input');input.type='checkbox';input.checked=selections.has(id);input.setAttribute('aria-label',`${modal.students.find(s=>s.id===id).number}번 일괄 변경 선택`);
   input.onchange=()=>{input.checked?selections.add(id):selections.delete(id);};label.append(input,document.createTextNode(' 선택'));button.replaceWith(wrap);wrap.append(label,button);button.style.width='100%';
   button.onclick=()=>{modal.draft[id]=nextState(modal.draft[id],modal.item.allowProgress);renderDraft();addSelections();};
  });
 }
 addSelections();
 $('#select-all').onchange=e=>{selections.clear();if(e.target.checked)modal.students.forEach(s=>selections.add(s.id));renderDraft();addSelections();};
 tools.querySelectorAll('[data-bulk]').forEach(b=>b.onclick=()=>{for(const id of selections)modal.draft[id]=b.dataset.bulk;renderDraft();addSelections();});
}
function renderItems(){
 $('#admin-content').innerHTML=`<div class="toolbar"><h2>제출 항목 ${data.items.length}개</h2><button class="primary" id="add-item">＋ 새 항목</button></div><div class="panel table-wrap"><table><thead><tr><th>항목명</th><th>기한</th><th>진행 중 허용</th><th>관리</th></tr></thead><tbody>${data.items.map(i=>`<tr><td>${esc(i.title)} ${i.archived?'<span class="tag">보관</span>':''}</td><td>${esc(i.due)||'없음'}</td><td>${i.allowProgress?'ON':'OFF'}</td><td><button class="small" data-edit-item="${esc(i.id)}">수정</button><button class="small" data-archive="${esc(i.id)}">${i.archived?'보관 해제':'보관'}</button><button class="small danger" data-delete-item="${esc(i.id)}">삭제</button></td></tr>`).join('')}</tbody></table></div>`;
 $('#add-item').onclick=()=>editItem();
 document.querySelectorAll('[data-edit-item]').forEach(b=>b.onclick=()=>editItem(data.items.find(i=>i.id===b.dataset.editItem)));
 document.querySelectorAll('[data-archive]').forEach(b=>b.onclick=async()=>{b.disabled=true;const i=data.items.find(i=>i.id===b.dataset.archive);try{await store.saveItem({...i,archived:!i.archived},i.revision);toast(i.archived?'보관을 해제했습니다.':'학생 화면에서 숨겼습니다.');}catch(e){toast(e.message);b.disabled=false;}});
 document.querySelectorAll('[data-delete-item]').forEach(b=>b.onclick=async()=>{const i=data.items.find(i=>i.id===b.dataset.deleteItem);if(!confirm(`‘${i.title}’ 항목과 모든 학생의 해당 제출 기록을 영구 삭제할까요? 복구할 수 없습니다. 기록을 남기려면 보관을 이용하세요.`))return;b.disabled=true;try{await store.deleteItem(i.id);toast('항목과 기록을 삭제했습니다.');}catch(e){toast(e.message);b.disabled=false;}});
}
function editor(title,body,save){
 const dialog=$('#editor');dialog.innerHTML=`<form id="edit-form"><div class="modal-head"><h2 id="editor-title">${title}</h2></div><div class="modal-body">${body}<p class="error" id="edit-error" role="alert"></p></div><div class="modal-foot"><button type="button" class="secondary" id="cancel-edit">취소</button><button type="submit" class="primary">저장하기</button></div></form>`;
 dialog.showModal();let saving=false;dialog.oncancel=e=>{if(saving)e.preventDefault();};$('#cancel-edit').onclick=()=>dialog.close();
 $('#edit-form').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;saving=true;f.querySelectorAll('button').forEach(b=>b.disabled=true);try{await save(f);dialog.close();toast('저장했습니다.');}catch(error){fail($('#edit-error'),error);}finally{saving=false;f.querySelectorAll('button').forEach(b=>b.disabled=false);}};
}
function editItem(existing){
 const item=structuredClone(existing||{id:crypto.randomUUID(),title:'',due:'',allowProgress:false,archived:false,revision:0});
 editor(existing?'제출 항목 수정':'새 제출 항목',`<label>제출 항목명<input name="title" value="${esc(item.title)}" maxlength="80" required></label><label>제출 기한 (선택)<input name="due" type="date" value="${esc(item.due)}"></label><label><input name="progress" type="checkbox" ${item.allowProgress?'checked':''}> 진행 중 허용</label><p class="muted">OFF: 미완료 ↔ 완료<br>ON: 미완료 → 진행 중 → 완료</p>`,async f=>{
   if(!f.elements.namedItem('title').value.trim())throw new Error('항목명을 입력해 주세요.');
   if(item.allowProgress&&!f.progress.checked&&!confirm('진행 중 허용을 끄면 이 항목의 기존 ‘진행 중’ 기록을 모두 ‘미완료’로 변경합니다. 완료 기록은 유지합니다. 계속할까요?'))throw new Error('설정 변경을 취소했습니다.');
   await store.saveItem({...item,title:f.elements.namedItem('title').value.trim(),due:f.due.value,allowProgress:f.progress.checked},item.revision);
 });
}
function renderStudents(){
 $('#admin-content').innerHTML=`<div class="toolbar"><h2>우리 반 학생 ${data.students.length}명</h2><div class="inline"><button class="secondary" id="bulk-students">여러 학생 등록</button><button class="primary" id="add-student">＋ 학생 추가</button></div></div><p class="muted">등록된 이름은 학생 체크 팝업에서 누구나 볼 수 있습니다. 현재는 가상 이름만 등록해 주세요.</p><div class="panel table-wrap"><table><thead><tr><th>출석번호</th><th>이름</th><th>관리</th></tr></thead><tbody>${data.students.map(s=>`<tr><td>${s.number}번</td><td>${esc(s.name)}</td><td><button class="small" data-edit-student="${esc(s.id)}">수정</button><button class="small danger" data-delete-student="${esc(s.id)}">삭제</button></td></tr>`).join('')}</tbody></table></div>`;
 $('#add-student').onclick=()=>editStudent();
 $('#bulk-students').onclick=()=>{const revision=data.rosterRevision,base=structuredClone(data.students);editor('여러 학생 등록','<p class="muted">한 줄에 번호와 이름을 입력해 주세요. 기존 명단에 추가됩니다.</p><label>학생 명단<textarea name="roster" rows="9" placeholder="1 김하늘\n2 박서준\n3 이지우" required></textarea></label>',async f=>{const students=validateStudents([...base,...parseRoster(f.roster.value)]);await store.saveRoster(students,revision);});};
 document.querySelectorAll('[data-edit-student]').forEach(b=>b.onclick=()=>editStudent(data.students.find(s=>s.id===b.dataset.editStudent)));
 document.querySelectorAll('[data-delete-student]').forEach(b=>b.onclick=async()=>{const s=data.students.find(s=>s.id===b.dataset.deleteStudent);if(!confirm(`${s.number}번 ${s.name} 학생과 모든 항목의 해당 학생 제출 기록을 영구 삭제할까요? 보관 항목의 기록도 삭제되며 복구할 수 없습니다.`))return;b.disabled=true;try{await store.saveRoster(data.students.filter(x=>x.id!==s.id),data.rosterRevision);toast('학생과 제출 기록을 삭제했습니다.');}catch(e){toast(e.message);b.disabled=false;}});
}
function editStudent(existing){
 const s=existing||{id:crypto.randomUUID(),number:'',name:''},base=structuredClone(data.students),revision=data.rosterRevision;
 editor(existing?'학생 정보 수정':'학생 추가',`<div class="form-grid"><label>출석번호<input name="number" type="number" min="1" max="99" value="${s.number}" required></label><label>이름<input name="studentName" value="${esc(s.name)}" maxlength="30" required></label></div><p class="muted">이름이나 번호를 수정해도 제출 기록은 유지됩니다.</p>`,async f=>{const next={id:s.id,number:Number(f.number.value),name:f.studentName.value.trim()};await store.saveRoster(validateStudents(existing?base.map(x=>x.id===s.id?next:x):[...base,next]),revision);});
}
window.addEventListener('hashchange',render);
async function start(){
 if(!firebaseConfig){store=createDemoStore(receive);$('#mode').textContent='화면 체험 모드 · 가상 학생 15명 · Firebase 미연결 · 새로고침하면 초기화됩니다';store.subscribe();return;}
 $('#mode').textContent='Firebase에 연결하고 있어요…';
 try{const {createFirebaseStore}=await import('./firebase-store.js');store=await createFirebaseStore(firebaseConfig,teacherUid,receive,value=>{teacher=value;if(store){store.subscribe(teacher);render();}},error=>{$('#mode').textContent='연결 오류 · 화면이 최신 상태가 아닐 수 있습니다';toast(error.message);});store.subscribe(teacher);$('#mode').textContent='';}
 catch(e){$('#mode').textContent='Firebase 연결 실패';$('#app').textContent=`연결하지 못했습니다. 설정과 인터넷 연결을 확인해 주세요. (${e.message})`;}
}
start();


