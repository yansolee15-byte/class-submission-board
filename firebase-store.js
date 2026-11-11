import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js';
import {getAuth,setPersistence,browserSessionPersistence,onAuthStateChanged,signInWithEmailAndPassword,signOut,GoogleAuthProvider,signInWithPopup} from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js';
import {getFirestore,collection,doc,query,where,onSnapshot,runTransaction,getDocs,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';
import {validateStudents,STATES} from './core.js';

// 학생 데이터는 브라우저의 영구 캐시에 저장하지 않습니다.
export async function createFirebaseStore(config,teacherUid,notify,authChanged,onError){
 const app=initializeApp(config),db=getFirestore(app),auth=getAuth(app);
 await setPersistence(auth,browserSessionPersistence);
 const rosterRef=doc(db,'classroom','roster');
 let data={students:[],items:[],statuses:{},rosterRevision:0},unsubs=[],statusUnsubs=new Map(),isTeacher=false,generation=0;
 const emit=()=>notify(structuredClone(data));
 const requireTeacher=()=>{if(auth.currentUser?.uid!==teacherUid)throw new Error('교사 로그인이 필요합니다.');};
 const itemRef=id=>doc(db,'items',id),statusRef=(i,s)=>doc(db,'items',i,'statuses',s);
 const conflict=()=>new Error('다른 기기에서 기록이 변경되었어요. 취소 후 다시 열어 확인해 주세요.');
 const requireSize=n=>{if(n>450)throw new Error('한 번에 처리할 기록이 많습니다. 작업을 나누어 진행해 주세요.');};
 onAuthStateChanged(auth,user=>{isTeacher=!!teacherUid&&user?.uid===teacherUid;authChanged(isTeacher);});
 return {mode:'firebase',
 subscribe(admin=false){
  const gen=++generation;unsubs.forEach(f=>f());statusUnsubs.forEach(f=>f());statusUnsubs.clear();data={students:[],items:[],statuses:{},rosterRevision:0};
  let rosterReady=false,itemsReady=false;
  const emitReady=()=>{if(gen===generation&&rosterReady&&itemsReady)emit();};
  unsubs=[onSnapshot(rosterRef,s=>{data.students=s.data()?.students||[];data.rosterRevision=s.data()?.revision||0;rosterReady=true;emitReady();},onError),
   onSnapshot(admin?collection(db,'items'):query(collection(db,'items'),where('archived','==',false)),snap=>{
    data.items=snap.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>a.title.localeCompare(b.title,'ko'));
    const ids=new Set(data.items.map(i=>i.id));
    for(const [id,stop] of statusUnsubs)if(!ids.has(id)){stop();statusUnsubs.delete(id);delete data.statuses[id];}
    for(const item of data.items)if(!statusUnsubs.has(item.id))statusUnsubs.set(item.id,onSnapshot(collection(db,'items',item.id,'statuses'),s=>{if(gen!==generation)return;data.statuses[item.id]=Object.fromEntries(s.docs.map(d=>[d.id,d.data()]));emitReady();},onError));
    itemsReady=true;emitReady();
   },onError)];
 },
 async login(email,password){
  const credential=await signInWithEmailAndPassword(auth,email,password);
  if(credential.user.uid!==teacherUid){await signOut(auth);throw new Error('등록된 교사 계정이 아닙니다.');}
 },async loginGoogle(){
  const provider=new GoogleAuthProvider();
  provider.setCustomParameters({prompt:'select_account'});
  try {
   const credential=await signInWithPopup(auth,provider);
   if(!teacherUid||credential.user.uid!==teacherUid){await signOut(auth);throw new Error('등록된 교사 계정이 아닙니다. 최초 설정 중이면 Firebase 사용자 목록에서 본인 UID를 확인해 등록해 주세요.');}
  }catch(error){
   const messages={
    'auth/popup-closed-by-user':'로그인 창을 닫았습니다. 다시 시도할 수 있습니다.',
    'auth/cancelled-popup-request':'다른 로그인 요청이 진행 중입니다.',
    'auth/popup-blocked':'브라우저에서 팝업을 허용한 뒤 다시 눌러 주세요.',
    'auth/unauthorized-domain':'Firebase Authentication의 승인된 도메인에 현재 웹사이트 주소를 등록해 주세요.',
    'auth/operation-not-allowed':'Firebase Authentication에서 Google 로그인 사용 설정을 켜 주세요.',
    'auth/account-exists-with-different-credential':'같은 이메일의 기존 계정이 있습니다. 기존 로그인 방법으로 접속한 뒤 계정 연결 설정을 확인해 주세요.'
   };
   throw new Error(messages[error.code]||error.message||'Google 로그인에 실패했습니다. 다시 시도해 주세요.');
  }
 },async logout(){await signOut(auth);},
 async saveStatuses(id,rows){
  requireSize(rows.length);
  await runTransaction(db,async tx=>{
   const itemSnap=await tx.get(itemRef(id)),roster=await tx.get(rosterRef);
   if(!itemSnap.exists())throw new Error('삭제된 항목입니다.');
   const item=itemSnap.data(),students=roster.data()?.students||[];
   if(item.archived&&!isTeacher)throw new Error('보관된 항목입니다. 취소 후 다른 항목을 선택해 주세요.');
   const snapshots=await Promise.all(rows.map(row=>tx.get(statusRef(id,row.id))));
   rows.forEach((row,index)=>{
    if(!students.some(s=>s.id===row.id))throw new Error('학생 명단이 바뀌었어요. 취소 후 다시 열어 주세요.');
    if(!STATES[row.state]||(!item.allowProgress&&row.state==='doing'))throw new Error('진행 중 설정이 변경되었어요. 취소 후 다시 열어 주세요.');
    if((snapshots[index].data()?.revision||0)!==row.revision)throw conflict();
   });
   rows.forEach(row=>tx.set(statusRef(id,row.id),{state:row.state,revision:row.revision+1,updatedAt:serverTimestamp()}));
  });
 },
 async saveItem(item,expected){
  requireTeacher();
  await runTransaction(db,async tx=>{
   const ref=itemRef(item.id),old=await tx.get(ref),roster=await tx.get(rosterRef);
   if((old.data()?.revision||0)!==expected)throw conflict();
   const turnOff=old.data()?.allowProgress&&!item.allowProgress;
   const students=roster.data()?.students||[];
   const snapshots=turnOff?await Promise.all(students.map(s=>tx.get(statusRef(item.id,s.id)))):[];
   requireSize(snapshots.length+2);
   if(turnOff)snapshots.forEach((s,index)=>{if(s.data()?.state==='doing')tx.set(statusRef(item.id,students[index].id),{state:'todo',revision:s.data().revision+1,updatedAt:serverTimestamp()});});
   tx.set(ref,{title:item.title,due:item.due,allowProgress:item.allowProgress,archived:item.archived,revision:expected+1});
   // 학생 삭제와 항목 생성이 겹쳐도 삭제 대상 목록을 다시 읽게 합니다.
   if(roster.exists())tx.update(rosterRef,{catalogRevision:(roster.data().catalogRevision||0)+1});
  });
 },
 async deleteItem(id){
  requireTeacher();
  await runTransaction(db,async tx=>{
   const roster=await tx.get(rosterRef),item=await tx.get(itemRef(id));
   if(!item.exists())return;
   const ids=roster.data()?.students.map(s=>s.id)||[];
   requireSize(ids.length+2);
   ids.forEach(s=>tx.delete(statusRef(id,s)));tx.delete(itemRef(id));
   if(roster.exists())tx.update(rosterRef,{catalogRevision:(roster.data().catalogRevision||0)+1});
  });
 },
 async saveRoster(students,expected){
  requireTeacher();validateStudents(students);
  await runTransaction(db,async tx=>{
   const roster=await tx.get(rosterRef);
   if((roster.data()?.revision||0)!==expected)throw conflict();
   const removed=(roster.data()?.students||[]).filter(s=>!students.some(n=>n.id===s.id));
   // 교사의 항목 추가/삭제도 roster를 갱신하므로 이 조회와 경합하면 transaction이 재시도됩니다.
   const items=removed.length?(await getDocs(collection(db,'items'))).docs:[];
   requireSize(items.length*removed.length+1);
   for(const item of items)for(const s of removed)tx.delete(statusRef(item.id,s.id));
   tx.set(rosterRef,{students,ids:students.map(s=>s.id),revision:expected+1,catalogRevision:roster.data()?.catalogRevision||0});
  });
 }
 };
}
