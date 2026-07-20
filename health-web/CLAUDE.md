# health-web (React + Vite 웹)

건강정보 모니터링 웹 클라이언트. React + Vite 기반, 브라우저 환경에서 동작한다.

## 작업 전 확인할 문서

| 위치 | 용도 |
| --- | --- |
| `docs/ARCHITECTURE.md` | health-web 구현 설계 — 기술스택·폴더구조·데이터 흐름 결정 |
| `docs/TASKS.md` | 작업할 내용 목록 |
| [`../docs/SCREEN_DESIGN.md`](../docs/SCREEN_DESIGN.md) | 화면 명세 (공통) |
| [`../docs/DESIGN-apple.md`](../docs/DESIGN-apple.md) | 디자인 가이드 (색상·간격·폰트·버튼·카드·입력폼·레이아웃) |
| [`../health-backend/docs/API_SPEC.md`](../health-backend/docs/API_SPEC.md) | health-backend가 제공하는 API 명세 |

화면을 생성/수정할 때는 `../docs/DESIGN-apple.md`를 먼저 참조한다 (루트 `CLAUDE.md` 공통 규칙).

## 공통 코드

`health-backend`와 공유 가능한 타입·인터페이스는 이 프로젝트에 중복 작성하지 않고 [`../shared/`](../shared/)를 참조한다.
