# TASKS

## 작업할 내용

## 완료된 작업

- 로그인 웹용화면
- 회원목록 웹용화면
- 회원상세 웹용화면

### 고도화

- AI 상담(챗봇) 화면 (`/chat`) — health-ai RAG Agent 연동
- 회원상세 화면 "AI 소견 요약" 버튼 (최근 데이터+보유질환 기반 AI 요약)
- 회원상세 화면 기간별 조회(startAt~endAt) 기능
- (health-backend) 이상감지 Slack 알림 문구 AI 생성 + 실패 시 기본 문구 fallback

### 기본 요구사항 보완

- 회원상세 화면에 보유 질병 정보(칩)와 진단 메모(`diagContent`)를 표시 (`docs/REQUIREMENTS.md`의 "보유 질병 정보, 메모 정보" 요구사항 — 데이터는 API에 있었지만 화면에 렌더링되지 않던 것을 보완)
