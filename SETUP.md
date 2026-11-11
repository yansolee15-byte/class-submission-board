# 처음 설정하기

현재 Firebase 프로젝트/저장소는 아직 없습니다. 이 안내는 2026-11-11 공식 문서 기준이며 실제 콘솔의 언어·버전에 따라 메뉴명이 조금 다를 수 있습니다. 과금 활성화나 비밀번호 공유는 필요하지 않습니다. 처음에는 가상 이름만 사용합니다.

## 0. 현재 파일 실행
`config.js`가 `null`이면 화면 체험 모드입니다. 저장은 실행 중 메모리에만 반영되며 새로고침하면 초기화됩니다. 이 상태는 Firebase 연동 완료가 아닙니다.

이 폴더에서 터미널을 열고 `node dev-server.mjs`를 실행하면 `http://127.0.0.1:4173`에서 열립니다. 이 방식에는 Node.js가 필요합니다. 파일을 더블클릭해 `file://`로 여는 방식은 모듈 보안 제한 때문에 지원하지 않습니다. GitHub Pages 배포 뒤에는 설치 없이 주소만 열면 됩니다.

## 1. Firebase 프로젝트 만들기 — 지금 할 단계
1. https://console.firebase.google.com/ 에서 **프로젝트 만들기 / 프로젝트 추가**를 누릅니다.
2. 프로젝트 이름에 **우리 반 제출 현황판**을 입력합니다. 프로젝트 ID는 자동 제안값 또는 사용 가능한 `class-check-board-고유문자`로 설정합니다. 프로젝트 ID를 기록합니다.
3. Google Analytics는 이번 앱에 필요하지 않으므로 사용 설정을 끕니다. 추가 선택 화면이 나오면 AI 기능 등 선택 기능을 켤 필요가 없습니다.
4. **프로젝트 만들기** → 완료 후 **계속**을 누릅니다.
5. 결제 수단을 연결하지 말고 **Spark(무료)**인지 확인합니다. Blaze 전환 화면이 나오면 진행하지 않습니다.

## 2. 웹 앱 등록과 공개 구성 복사
1. 프로젝트 개요에서 웹 아이콘 **</>** 또는 **앱 추가 → 웹**을 누릅니다.
2. 앱 닉네임: `class-board-web`. Firebase Hosting 설정은 선택하지 않습니다(GitHub Pages 사용).
3. **앱 등록**을 누릅니다.
4. SDK 설정 화면에서 `const firebaseConfig = { ... }` 객체의 값을 복사합니다. 나중에는 **프로젝트 설정(톱니바퀴) → 일반 → 내 앱 → SDK 설정 및 구성 → 구성**에서도 확인할 수 있습니다.
5. 이 구성 객체를 전달하면 코드에 반영할 수 있습니다. Firebase 웹 API 키/authDomain/projectId/appId는 공개 웹 구성입니다. 서비스 계정의 private_key JSON은 복사하지 마세요.

## 3. 교사 계정 한 개 만들기
1. 왼쪽 **빌드(Build) → Authentication → 시작하기(Get started)**.
2. **Sign-in method / 로그인 방법 → 이메일/비밀번호**를 선택합니다.
3. 첫 번째 이메일/비밀번호 사용 설정만 켜고 저장합니다. 이메일 링크 로그인은 필요 없습니다.
4. **Users / 사용자 → 사용자 추가**에서 교사 이메일과 직접 정한 비밀번호를 입력합니다.
5. 만들어진 사용자의 **UID**를 복사합니다. UID는 비밀번호가 아니므로 코드 설정을 위해 전달해도 됩니다.
6. 비밀번호는 본인만 보관합니다. 채팅이나 저장소에 보내지 않습니다.
7. 코드의 `teacherUid`와 `firestore.rules`의 `REPLACE_WITH_TEACHER_UID`에 같은 UID를 설정합니다. UID 설정만으로 규칙이 콘솔에 자동 반영되지는 않습니다.

## 4. Firestore 만들기
1. **빌드 → Firestore Database → 데이터베이스 만들기**.
2. 에디션 선택 시 **Standard**, 기본 데이터베이스 `(default)`를 사용합니다.
3. 위치는 한국 사용을 고려해 서울(`asia-northeast3`)이 제공되면 선택합니다. 생성 후 위치 변경이 쉽지 않으므로 확인합니다.
4. **프로덕션 모드**로 시작합니다. 테스트 모드의 전체 공개 규칙을 사용하지 않습니다.
5. 생성 후 **Rules / 규칙** 탭에 UID를 수정한 `firestore.rules` 전체 내용을 붙여넣고 **게시**합니다.
6. 게시 전 다시 확인: 현재 규칙은 공개 팝업용 명단 읽기와 제한된 상태 쓰기를 허용합니다. 가상 데이터만 넣으세요.
7. 데이터 탭에서 학생 문서를 수동 생성할 필요는 없습니다. 교사 화면에서 명단을 등록하면 생성됩니다.

## 5. Firebase 연결 코드 설정
`config.js`의 예:
```js
export const firebaseConfig = {
  apiKey: 'Firebase 웹 구성에서 복사',
  authDomain: '프로젝트ID.firebaseapp.com',
  projectId: '프로젝트ID',
  appId: 'Firebase 웹 구성에서 복사'
};
export const teacherUid = 'Authentication에서 복사한 UID';
```
공개 구성만 넣습니다. 실제 비밀번호, 서비스 계정 키, GitHub 토큰은 넣지 않습니다.

## 6. GitHub 저장소 생성과 업로드
1. https://github.com/ 에서 오른쪽 위 **+ → New repository**.
2. Repository name: `class-submission-board`.
3. **Public** 선택. 무료 GitHub Pages를 쓰기 위한 공개 소스 저장소입니다. 실제 학생 명단을 소스/문서에 넣지 않습니다.
4. **Create repository**.
5. **uploading an existing file** 또는 **Add file → Upload files**.
6. `class-board` 폴더 자체를 한 겹 더 넣지 말고, 폴더 안의 파일과 `tests` 폴더를 저장소 최상위에 업로드합니다. 최상위에 `index.html`, `app.js`, `style.css`, `config.js`, `core.js`, `demo-store.js`, `firebase-store.js`가 있어야 합니다. `node_modules`, 비밀 파일은 업로드하지 않습니다.
7. **Commit changes**로 저장합니다. 현재 코드가 준비된 뒤 원하면 브라우저 업로드를 함께 진행할 수 있습니다.

## 7. GitHub Pages 켜기
1. 저장소 **Settings → Pages**.
2. **Build and deployment → Source → Deploy from a branch**.
3. Branch: `main`, 폴더: `/(root)` → **Save**.
4. 배포가 끝나면 표시되는 사이트 주소를 확인합니다. 일반적으로 `https://사용자명.github.io/class-submission-board/`입니다. 실제 표시 주소를 기준으로 합니다.
5. 학생 시작 화면은 해당 주소, 교사 화면은 뒤에 `#admin`을 붙인 주소입니다.
6. 아직 config가 null이면 체험 모드라는 문구가 나옵니다. 이 상태를 최종 과제로 제출하지 않습니다.

## 8. 도메인과 API 키 제한 — 실제 주소가 생긴 뒤
### Authentication
1. Firebase **Authentication → Settings / 설정 → Authorized domains / 승인된 도메인**.
2. **도메인 추가**에 `사용자명.github.io` 입력. `https://`나 저장소 경로는 넣지 않습니다.
3. 로컬 인증 검증이 필요하면 개발용 호스트도 명시적으로 추가합니다. 기본 포함을 가정하지 않습니다.

### API 키
1. https://console.cloud.google.com/ 에서 같은 Firebase 프로젝트 선택.
2. **APIs & Services / API 및 서비스 → Credentials / 사용자 인증 정보**.
3. Firebase 웹 앱에서 사용하는 **Browser key (auto created by Firebase)** 선택. config의 키와 같은 키인지 확인.
4. **Application restrictions / 애플리케이션 제한사항 → Websites / 웹사이트(HTTP referrers)**.
5. 실제 사용자 도메인으로 `https://사용자명.github.io`와 `https://사용자명.github.io/*` 추가. 저장소 경로만 넣으면 브라우저가 경로를 생략하는 요청에서 실패할 수 있습니다. `*.github.io` 전체를 허용하지 않습니다.
6. 개발 중 필요할 때만 `http://127.0.0.1:4173/*`, `http://localhost:4173/*` 등 사용 중인 개발 출처를 추가합니다. 운영 전 불필요한 항목을 제거합니다.
7. **API restrictions**는 Firebase가 설정한 Firebase 관련 API 허용 목록을 유지하고 공식 문서와 대조합니다. Authentication에 필요한 Identity Toolkit API/Token Service API 등을 제거하지 않습니다. Gemini 등 무관한 API를 추가하지 않습니다.
8. 저장 후 실제 Pages 주소에서 교사 로그인/로그아웃/다시 로그인, 학생 읽기/저장, 새로고침, 다른 기기 동기화를 재확인합니다. 토큰 갱신도 확인합니다.
9. 403 또는 `API_KEY_SERVICE_BLOCKED` 등이 뜨면 요청한 API/도메인과 허용 목록을 대조합니다. 오류를 숨기기 위해 Firestore Rules를 전체 공개로 바꾸지 않습니다.

## 9. 가상 명단 등록
교사 화면 → 학생 관리 → 여러 학생 등록 → 아래를 붙여넣고 저장:
```text
1 김하늘
2 박서준
3 이지우
4 최도윤
5 정서아
6 강민준
7 윤하린
8 장시우
9 임지안
10 한예준
11 오수아
12 서지호
13 신유나
14 권우진
15 황다은
```
위 이름은 가상 예시입니다. 제출 항목 관리에서 OFF 항목과 ON 항목을 하나씩 생성해 검증합니다.

## 10. 필수 실제 테스트
1. 학생 화면의 번호만 표시되는지, 팝업에 가상 이름이 표시되는지 확인.
2. OFF/ON 순환, 저장 전 취소, 저장 성공 후 닫힘, 새로고침 유지.
3. PC와 태블릿에서 서로 다른 학생을 동시에 저장 → 둘 다 유지.
4. 두 기기에서 같은 학생을 열고 순차 저장 → 뒤의 오래된 변경 거부.
5. 인터넷을 끄고 저장 → 성공 안내 없이 팝업 유지 및 오류. 다시 연결 후 재시도.
6. 학생 명단 변경, 추가 기본값, 중복 번호, 삭제 확인.
7. 진행 중 OFF 전환 확인, 보관/복원, 보관 항목 접근 차단.
8. Rules 테스트에서 비로그인 관리 작업·잘못된 상태/필드·없는 학생 쓰기 거부.
9. 모든 결과를 TEST_RESULTS/REQUIREMENTS에 실제 수행한 만큼 기록.

## 참고
- https://firebase.google.com/docs/web/alt-setup
- https://firebase.google.com/docs/projects/api-keys
- https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys
- https://docs.github.com/en/pages/quickstart

## Google 교사 로그인 추가 (2026-11-11)
1. 왼쪽 **보안 → Authentication → 로그인 방법(Sign-in method)**을 엽니다.
2. **새 제공업체 추가(Add new provider) → Google**을 선택합니다. 처음 화면에 Google이 보이면 바로 선택합니다.
3. **사용 설정**을 켭니다.
4. 프로젝트 공개 이름을 요구하면 `우리 반 제출 현황판`을 입력하고, **프로젝트 지원 이메일**에서 본인 이메일을 선택합니다.
5. **저장**합니다. 기존 이메일/비밀번호 로그인도 사용할 경우 켜 둡니다.
6. 배포 도메인을 Authentication 승인된 도메인에 추가한 뒤, 웹앱 교사 화면에서 Google 로그인 버튼을 시험합니다. 제공업체 설정만으로 로그인 사용자가 생성되지는 않습니다.
7. 첫 로그인 후 Authentication 사용자 목록에서 해당 계정의 UID를 확인해 config.js와 Rules에 동일하게 등록합니다. UID 등록 전에는 관리 권한이 거부되는 것이 정상입니다. 최초 로그인 시 계정 레코드가 만들어져도 관리 권한은 자동 부여하지 않습니다.
8. 이메일/비밀번호와 Google 로그인에 같은 교사 계정을 쓰려면 각 로그인 후 UID가 같은지 확인합니다. 이메일이 같다는 이유만으로 동일 UID라고 가정하지 않습니다. 다르면 권한 허용 UID를 추가하지 말고 계정 연결을 별도로 검토합니다. 기존 계정을 삭제하지 않습니다.

현재 Google 버튼/팝업 로그인 코드는 추가했지만 실제 로그인·계정 연결·팝업 차단·도메인 검증은 미실행입니다. 학생은 로그인 없이 이용합니다.
공식 문서: https://firebase.google.com/docs/auth/web/google-signin
