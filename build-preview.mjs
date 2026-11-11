import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('./',import.meta.url);
const parts=await Promise.all(['core.js','demo-store.js','app.js'].map(async name=>(await readFile(new URL(name,root),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'')));
parts.unshift("const firebaseConfig = null; const teacherUid = ''; // 단일 파일 미리보기는 항상 가상 데이터만 사용");
const css=(await readFile(new URL('style.css',root),'utf8')).replace(/^@import[^;]+;\r?\n/,'');
const html=(await readFile(new URL('index.html',root),'utf8')).replace('<link rel="stylesheet" href="./style.css">',`<style>${css}</style>`).replace('<script type="module" src="./app.js"></script>',()=>`<script type="module">${parts.join('\n').replaceAll('</script>','<\\/script>')}</script>`);
await writeFile(new URL('미리보기.html',root),html,'utf8');
console.log('미리보기.html 생성 완료 (가상 데이터 화면 체험용)');
