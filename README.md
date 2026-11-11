# 우리 반 제출 현황판

초등 학급의 안내장·신청서·과제 제출을 학생이 직접 체크하는 웹앱입니다.

**현재: 기본 구현 및 로컬 로직 테스트 완료 / Firebase 설정·실서버 검증·GitHub Pages 배포 전.**

- `index.html`: 배포용 시작 화면. `#admin`으로 교사 화면 이동.
- `미리보기.html`: 더블클릭할 수 있는 가상 데이터 화면 체험용 단일 파일. 실제 DB 연결 파일이 아닙니다.
- `config.js`: Firebase 공개 웹 구성과 교사 UID 설정. null이면 메모리 체험 모드.
- `firestore.rules`: 교사 UID 교체 후 검증/게시할 보안 규칙 초안.
- `SETUP.md`: Firebase와 GitHub 클릭 순서.
- `PLAN.md`, `REQUIREMENTS.md`, `SECURITY_REVIEW.md`: 설계·상태·보안 한계.
- `TEST_RESULTS.md`: 실행한 검증과 미검증 구분.
- `PROMPT_LOG.md`, `SUBMISSION.md`: 실제 요청 기록과 제출 초안.

시작: `node dev-server.mjs` → `http://127.0.0.1:4173`.
테스트: `node --test tests/core.test.mjs`.

Firebase가 연결되지 않은 체험 모드는 새로고침하면 초기화됩니다. 로그인 없는 이름 공개와 학생 사칭의 한계가 있으므로 실제 학생 이름은 아직 등록하지 않습니다. 자세한 내용은 SECURITY_REVIEW.md를 읽어 주세요.
