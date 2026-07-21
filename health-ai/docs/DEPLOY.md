# health-ai 배포 가이드

> 실제 산출물: [`Dockerfile`](../Dockerfile), [`docker-compose.yml`](../docker-compose.yml), [`.github/workflows/deploy-ai.yml`](../../.github/workflows/deploy-ai.yml), [`requirements.txt`](../requirements.txt).
> 이 문서는 위 파일들이 왜 이렇게 구성되었는지, 배포 서버를 여러 학생이 공유할 때 무엇을 지켜야 하는지를 설명한다.

## 1. 전제: 왜 build context가 monorepo 루트가 아니라 health-ai/ 자체인가

health-backend/health-web은 TypeScript 공용 코드(`shared/`)를 참조하기 때문에 monorepo 루트를 build context로 삼아야 했다. **health-ai는 Python 프로젝트이고 `shared/`(TS 전용, 루트 `CLAUDE.md`에 "health-ai(Python)를 제외한 나머지"로 명시)를 전혀 참조하지 않으므로, health-ai/ 폴더 자체가 build context다.** 그래서 서버에 업로드할 때도 `shared/`를 같이 올릴 필요가 없다 (`docs/DEPLOY.md`의 배포 흐름 참고).

## 2. 네임스페이스: AI_API_PORT

배포 서버 한 대를 health-backend/health-web과 함께 공유하므로, **학생마다 고유하게 배정된 `AI_API_PORT`(GitHub Variable)를 네임스페이스로 사용**한다.

| 리소스 | 값 | 비고 |
| --- | --- | --- |
| 서버 소스 디렉터리 | `~/deploy/health-ai-${AI_API_PORT}/` | health-ai/ 내용만 그대로 업로드 |
| Docker Compose 프로젝트명 | `health-ai-${AI_API_PORT}` | `docker-compose.yml`의 최상위 `name:` |
| Docker 이미지명 | `health-ai-${AI_API_PORT}:latest` | |
| 컨테이너명 | `health-ai-${AI_API_PORT}` | |
| 호스트:컨테이너 포트 | `${AI_API_PORT}:${AI_API_PORT}` | health-backend(BACKEND_PORT)와 동일하게 양쪽 다 같은 값 사용 |

## 3. 환경변수 매핑

### 새로 등록할 것 (health-ai만의 값)

| GitHub 이름 | 종류 | 값 예시 | 비고 |
| --- | --- | --- | --- |
| `AI_API_PORT` | Variable | `20018` | 학생별 할당 포트 |

### health-backend와 그대로 재사용하는 것

health-ai는 health-backend와 **같은 배포 서버·같은 DB**를 쓰므로 아래 값들은 **새로 등록하지 않고** health-backend 배포 때 이미 등록해둔 것을 그대로 참조한다.

| GitHub 이름 | 종류 | 앱이 읽는 env 키 | 비고 |
| --- | --- | --- | --- |
| `SERVER_HOST` / `SERVER_PORT` | Variable | (해당 없음) | 배포 대상 서버 SSH 접속 정보 |
| `SERVER_USER` / `SSH_KEY` | Secret | (해당 없음) | 배포용 SSH 인증 정보 |
| `DB_HOST` | Variable | `DB_HOST` | 이름 동일 |
| `DB_PORT` | Variable | `DB_PORT` | 이름 동일 |
| `DB_NAME` | Variable | `DB_NAME` | 이름 동일 (pgvector 문서 테이블이 있는 그 DB) |
| `DB_USER` | Secret | `DB_USER` | 이름 동일 |
| `DB_PASSWORD` | Secret | `DB_PASSWORD` | 이름 동일 |

### GitHub Secret/Variable에 없는 값 → `docker-compose.yml`에 고정값으로 사용

| 키 | 고정값 | 비고 |
| --- | --- | --- |
| `OLLAMA_BASE_URL` | `https://ai.iranglab.com` | 교수님이 공용으로 열어주신 Ollama 서버(**기간 한정** — 강의 공지 기준 해당 주까지). 이후 접속이 안 되면 각자 로컬/전용 Ollama 서버 주소로 교체해야 함 |
| `LLM_MODEL` | `qwen2.5:3b` | 답변 생성 모델 |
| `EMBED_MODEL` | `bge-m3` | 임베딩 모델 (기존에 pgvector에 저장된 임베딩과 반드시 동일 모델이어야 검색이 정확함) |

## 4. 배포 흐름

1. **GitHub Actions 트리거**: `main` 브랜치에 `health-ai/**` 변경이 push되거나, 수동 실행(`workflow_dispatch`).
2. **rsync 업로드**: `health-ai/` 전체를 서버의 `~/deploy/health-ai-${AI_API_PORT}/`로 업로드 (`--delete`로 서버 쪽 잔여 파일 정리). `shared/`는 올리지 않는다 (1장 참고).
3. **SSH 원격 실행**: 서버에 접속해 `health-ai-${AI_API_PORT}/` 디렉터리에서 `docker compose up -d --build` 실행. **`.env` 파일은 서버에 생성되지 않는다.**
4. `docker image prune -f`로 이전 빌드가 남긴 dangling 이미지 정리.

## 5. 파일별 설명

### `Dockerfile`

단일 스테이지: `python:3.12-slim` 위에 `requirements.txt` 설치 후 소스 전체 COPY. `CMD`는 `AI_API_PORT` 환경변수를 uvicorn의 `--port`로 그대로 전달한다 (`sh -c`로 셸 변수 확장 필요).

로컬 테스트:

```bash
# health-ai/ 안에서 실행
docker build -t health-ai-test .
docker run --rm -p 8000:8000 \
  -e AI_API_PORT=8000 \
  -e DB_HOST=... -e DB_PORT=5432 -e DB_NAME=... -e DB_USER=... -e DB_PASSWORD=... \
  -e OLLAMA_BASE_URL=https://ai.iranglab.com \
  health-ai-test
curl http://localhost:8000/
```

### `requirements.txt`

`health-ai-api.py`/`rag_query.py`가 실제로 import하는 패키지만 담았다 (Jupyter/torch 등 실습용 패키지는 API 서버 실행에 불필요하므로 제외). 버전은 강의용 `.venv`에서 동작 확인된 조합으로 고정했다.

### `docker-compose.yml`

- `build.context: .` — health-ai/ 자체 (1장 참고).
- `network_mode: bridge` — 단일 서비스라 전용 네트워크가 필요 없어, 공유 서버의 Docker 네트워크 주소 풀 소진 문제를 피하려고 기본 bridge를 재사용한다 (health-web과 동일한 조치).
- 모든 필수 변수는 `${VAR:?...}` 문법으로 선언되어, 셸에 값이 없으면 명확한 에러와 함께 즉시 실패한다.

### `.github/workflows/deploy-ai.yml`

- health-backend/health-web과 동일한 서버 SSH 정보(`SERVER_HOST`/`SERVER_PORT`/`SERVER_USER`/`SSH_KEY`)를 재사용한다.
- `health-ai/` 폴더 하나만 업로드한다 (`shared/` 업로드 스텝 없음).

### `.dockerignore`

Jupyter 노트북(`*.ipynb`), 체크포인트, `docs/*.pdf`(이미 벡터DB에 적재된 원본 문서 — 런타임에 불필요)를 빌드 컨텍스트에서 제외해 이미지 크기와 전송 시간을 줄인다.

## 6. 트러블슈팅

| 증상 | 원인 | 조치 |
| --- | --- | --- |
| `docker compose up`이 `variable is required` 에러로 즉시 실패 | 필요한 환경변수가 셸/SSH 세션에 export되지 않음 | GitHub Variables 등록 여부(`AI_API_PORT`) 및 workflow `env:`/`envs:` 목록 확인 |
| `GET /`은 되는데 `/ask` 호출 시 타임아웃/500 | `OLLAMA_BASE_URL`(`https://ai.iranglab.com`)에 접속이 안 되는 경우 — 교수님 공지대로 기간이 지나 서버가 닫혔을 수 있음 | 접속 여부를 별도로 확인하고, 필요 시 강의 채널에 문의하거나 자체 Ollama 서버 주소로 `OLLAMA_BASE_URL`을 교체 |
| `/ask` 응답이 느림(수 초~수십 초) | LLM 추론 자체의 특성 (Agent가 문서 검색 Tool까지 호출하면 더 느려짐) | health-backend의 `AiAgentService`가 30초 타임아웃을 두고 있음. 그래도 느리면 `top_k`를 낮추거나 더 가벼운 모델로 교체 검토 |
| pgvector 검색 결과가 이상함/빈 결과 | `EMBED_MODEL`이 문서를 적재할 때 쓴 모델과 다름 | 벡터 차원·모델이 적재 시점과 반드시 일치해야 함 (`EMBEDDING_DIM=1024`, `bge-m3` 고정 유지) |
| `docker build`에서 `ModuleNotFoundError` | `requirements.txt`에 없는 패키지를 새로 import했는데 반영 안 함 | `rag_query.py`/`health-ai-api.py`의 import 목록을 다시 확인해 `requirements.txt`에 추가 |
