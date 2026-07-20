# Healthcare 프로젝트 (전체 공통 규칙)

실시간 건강정보(심박수·혈당 등)를 시뮬레이터에서 받아 저장하고, 웹·모바일에서 모니터링하며, AI로 분석하는 교육용 모노레포.

## 공통 규칙

- 항상 참조: https://raw.githubusercontent.com/forrestchang/andrej-karpathy-skills/main/CLAUDE.md
- 화면 생성/수정 시 `docs/DESIGN-apple.md`를 먼저 참조 후 진행 (색상·간격·폰트·버튼·카드·입력폼·레이아웃 규칙). 상세: [docs/SCREEN_DESIGN.md](./docs/SCREEN_DESIGN.md)
- `health-ai`(Python)를 제외한 나머지(`health-backend`, `health-web`, `health-mobile`)는 모두 Node.js 기반이므로, 인터페이스·공통 함수 등 공유 가능한 코드는 각 프로젝트에 중복 작성하지 않고 `shared/`에 생성하여 참조한다.

## 문서 지도 — 기능 개발 전 해당 영역의 문서를 먼저 확인할 것

| 위치 | 용도 |
| --- | --- |
| `docs/REQUIREMENTS.md` | 전체 제품 요구사항 |
| `docs/DATA_MODEL.md` | 언어 중립 데이터 계약 (TS/Python 공용) |
| `docs/SCREEN_DESIGN.md` | 웹·앱 공통 화면 설계 |
| `docs/DESIGN.md` / `docs/DESIGN-apple.md` | 디자인 가이드 |
| `docs/ARCHITECTURE.md` | 전체 시스템 흐름 |
| `docs/ROADMAP.md` | 전체 마일스톤 |
| `health-backend/CLAUDE.md`, `health-backend/docs/{ARCHITECTURE,API_SPEC,SIMULATOR_API_SPEC,TASKS}.md` | NestJS 백엔드 (API_SPEC은 웹·앱이 소비하는 내부 API, SIMULATOR_API_SPEC은 백엔드가 외부 시뮬레이터에 접속하는 스펙) |
| `health-web/CLAUDE.md`, `health-web/docs/{ARCHITECTURE,TASKS}.md` | React + Vite 웹 (Vite, 브라우저 환경) |
| `health-mobile/CLAUDE.md`, `health-mobile/docs/{ARCHITECTURE,TASKS}.md` | React Native 앱 (Metro, 네이티브, 권한) |
| `health-ai/CLAUDE.md`, `health-ai/docs/{API_SPEC,TASKS}.md` | AI FastAPI (Python) |
| `shared/types.ts` | 백엔드·웹·앱 공유 TS 타입 (AI 제외) |
