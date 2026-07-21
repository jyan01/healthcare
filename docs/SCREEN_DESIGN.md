# Screen Design Guide

## 0. 디자인 시스템 참조

> 모든 화면 생성 및 수정 작업은 반드시 `./docs/DESIGN-apple.md`를 먼저 참조한 뒤 진행한다.
> 화면의 색상, 간격, 폰트, 버튼 스타일, 카드 스타일, 입력폼 스타일, 레이아웃 규칙은 `DESIGN-apple.md`의 정의를 우선 적용한다.

## 1. 화면 설계 요청 프로세스

화면을 설계/수정할 때는 아래 순서를 따른다.

1. 화면 설계 요청이 들어오면, HTML을 만들기 전에 먼저 본 문서(`SCREEN_DESIGN.md`)를 아래 항목으로 업데이트한다.
   - 무엇을 만드는지
   - 어떻게 배치할지
   - 어떤 정보를 보여줄지
   - 누가 사용할지
2. 디자인은 `docs/DESIGN-apple.md`를 참조한다.
3. **명시적으로 "만들어줘/진행해줘" 지시가 있기 전에는 HTML을 생성하지 않는다.** 문서 업데이트까지만 먼저 진행한다.
4. 지시가 있으면 검증을 위해 화면당 HTML 샘플을 2개(React Native용 1개, React 웹용 1개) 만든다.
   - React Native(모바일)용: 세로형(portrait) 레이아웃
   - React 웹용: 가로형 기준이나 반응형(responsive) 웹으로 대응
5. HTML 샘플은 `./demo` 폴더에 만든다.

## 2. 화면 목록 (Screen Registry)

### 2.1 로그인 화면

| 항목 | 내용 |
| --- | --- |
| 무엇을 만드는지 | 로그인 화면 |
| 어떻게 배치할지 | ID와 Password 입력 필드, 그 아래 로그인 버튼과 회원가입(가입하기) 진입 요소 |
| 어떤 정보를 보여줄지 | ID, Password |
| 누가 사용할지 | 의사, 환자 |
| 디자인 참조 | `docs/DESIGN-apple.md` |
| 상태 | HTML 샘플 생성 완료 — `demo/login-web.html`(React 웹, 반응형), `demo/login-mobile.html`(React Native, 세로형) |

### 2.2 환자목록화면

| 항목 | 내용 |
| --- | --- |
| 무엇을 만드는지 | 로그인 성공 후 의사가 환자 목록을 볼 수 있는 화면 |
| 어떻게 배치할지 | 상단에 환자이름·성별 검색 기능, 하단에 환자 목록 표시. (환자가 로그인한 경우에는 이 목록화면을 거치지 않고 자신의 건강 상세화면으로 바로 이동) |
| 어떤 정보를 보여줄지 | 목록의 각 항목에 환자 사진, 이름, 성별, 생년월일 표시 |
| 누가 사용할지 | 의사 |
| 디자인 참조 | `docs/DESIGN-apple.md` |
| 상태 | HTML 샘플 생성 완료 — `demo/patient-list-web.html`(React 웹, 반응형), `demo/patient-list-mobile.html`(React Native, 세로형) |

### 2.3 환자건강 상세화면

| 항목 | 내용 |
| --- | --- |
| 무엇을 만드는지 | 의사가 선택한 환자의 건강정보를 보는 화면. 환자가 로그인한 경우에는 본인의 건강정보를 보는 화면 |
| 어떻게 배치할지 | 상단에 환자 기본정보 표시, 그 아래 실시간으로 수신되는 건강정보(심박, 혈당, 혈압, 몸무게, BMI, 골격근량, 체지방률, 걸음수)를 각각 그래프로 실시간 모니터링 |
| 어떤 정보를 보여줄지 | 기본정보: 사진, 이름, 성별, 생년월일, 보유 질병(칩), 진단 메모 / 건강정보 그래프: 혈압, 심박, 혈당, 몸무게, BMI, 골격근량, 체지방률, 걸음수 |
| 누가 사용할지 | 의사, 환자 |
| 디자인 참조 | `docs/DESIGN-apple.md`, 데이터 소스: `health-backend/docs/SIMULATOR_API_SPEC.md` / `docs/DATA_MODEL.md`(외부 실시간 데이터) |
| 상태 | HTML 샘플 생성 완료 — `demo/patient-detail-web.html`(React 웹, 반응형), `demo/patient-detail-mobile.html`(React Native, 세로형). 8개 지표 모두 실시간 스트리밍 라인차트(크로스헤어 툴팁 포함)로 구현, 심박/혈압/혈당/체중·BMI는 상태뱃지 표시(체중·BMI는 저체중·정상·과체중·비만). 심박수가 "이상" 상태일 때는 배지 아래 상세 사유(`remark`, 예: "Possible tachycardia detected.")도 함께 표시. 골격근량/체지방률/걸음수는 백엔드가 판정하는 상태값이 없어 뱃지 없음. 보유 질병은 프로필 카드에 칩으로, 진단 메모(`diagContent`)가 있는 질병은 별도 카드에 목록으로 표시. **[고도화]** 상단에 기간(startAt~endAt) 선택 조회 기능, "AI 소견 요약" 버튼(health-ai RAG Agent에 최근 데이터+보유질환을 컨텍스트로 전달해 요약 생성) 추가 |

### 2.4 AI 상담(챗봇) 화면 — 고도화

| 항목 | 내용 |
| --- | --- |
| 무엇을 만드는지 | 의사·환자가 건강 관련 질문을 AI Agent(health-ai, RAG+Ollama)에 자유롭게 물어보는 채팅 화면 |
| 어떻게 배치할지 | 상단 GlobalNav의 "AI 상담" 링크로 진입. 메시지 목록(사용자 우측 말풍선/AI 좌측 말풍선) + 하단 입력창·전송 버튼 |
| 어떤 정보를 보여줄지 | 대화 내역(질문/답변), 답변 대기 중 로딩 표시 |
| 누가 사용할지 | 의사, 환자 |
| 디자인 참조 | `docs/DESIGN-apple.md` (기존 카드/버튼 색상 토큰 재사용) |
| 데이터 소스 | `health-backend`의 `POST /chat` → `health-ai`의 `POST /ask` (`health-backend/docs/API_SPEC.md` 1.6) |
| 상태 | 구현 완료 — `health-web/src/pages/Chat/ChatPage.tsx`. 대화 내역은 세션 동안만 유지(새로고침 시 초기화), 별도 HTML 데모는 생성하지 않음 |