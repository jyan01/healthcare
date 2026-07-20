# health-web 배포 가이드

> 실제 산출물: [`Dockerfile`](../Dockerfile), [`nginx.conf`](../nginx.conf), [`docker-compose.yml`](../docker-compose.yml), [`.github/workflows/deploy-web.yml`](../../.github/workflows/deploy-web.yml).
> 이 문서는 위 파일들이 왜 이렇게 구성되었는지, 배포 서버를 여러 학생이 공유할 때 무엇을 지켜야 하는지를 설명한다.

## 1. 전제: 왜 monorepo 루트가 build context여야 하는가

`health-web/tsconfig.app.json`은 `include`에 `"../shared/**/*.ts"`를 두고 있고, `health-web/src/shared.ts`는 `export * from '../../shared/types'`로 monorepo 루트의 `shared/`를 참조한다 (health-backend와 동일한 패턴). 즉 **health-web도 단독으로 빌드되지 않고, 항상 `shared/`와 함께 빌드되어야 한다.**

따라서:

- Docker build context는 **monorepo 루트**(`d:/healthcare`)여야 하고, `Dockerfile`은 `health-web/`와 `shared/`를 각각 `COPY`한다.
- 배포 서버에도 `health-web/`와 `shared/`가 **같은 상위 디렉터리 아래 나란히** 있어야 한다.
- `d:/healthcare/.dockerignore`는 health-backend와 health-web이 **공유**한다 (둘 다 build context가 monorepo 루트이기 때문). `health-mobile`, `health-ai`, `demo`만 제외 대상이고 `health-web`/`health-backend`는 서로를 막지 않는다.

## 2. 정적 사이트 배포이기 때문에 다른 점 — nginx, 그리고 "빌드 시점" 환경변수

health-backend(Node 런타임 컨테이너)와 달리 health-web은 `vite build`로 만든 **정적 파일**(HTML/JS/CSS)을 서빙하기만 하면 되므로, 최종 런타임 이미지는 Node가 아니라 **nginx**([`nginx.conf`](../nginx.conf))를 사용한다. `nginx.conf`의 `try_files $uri $uri/ /index.html`은 `/members/:memberId` 같은 react-router-dom 클라이언트 라우트를 새로고침해도 404가 나지 않도록 하는 SPA fallback이다.

**가장 중요한 차이점**: `VITE_API_BASE_URL`, `VITE_WS_URL`은 Vite의 특성상 컨테이너 실행 시점(runtime)이 아니라 **`vite build` 실행 시점(build-time)**에 `import.meta.env`를 통해 정적 번들(JS 파일)에 그대로 굳어 들어간다. 그래서:

- health-backend처럼 `docker-compose.yml`의 `environment:`로 넘기는 방식은 **동작하지 않는다** (nginx는 그 값을 쓸 일도 없고, 이미 빌드된 JS는 컨테이너를 재시작해도 값이 안 바뀐다).
- 대신 `Dockerfile`의 `ARG`로 받아서, `RUN npm run build`를 실행하기 **전에** `ENV`로 주입한다.
- `docker-compose.yml`에서는 `build.args:`로 전달한다 (`environment:`가 아님).

## 3. 네임스페이스: FRONTEND_PORT

배포 서버 한 대를 모든 학생이 공유하므로, **학생마다 고유하게 배정된 `FRONTEND_PORT`(GitHub Variable)를 네임스페이스로 사용**해 아래 리소스들이 서로 겹치지 않게 한다.

| 리소스 | 값 | 비고 |
| --- | --- | --- |
| 서버 소스 디렉터리 | `~/deploy/health-web-${FRONTEND_PORT}/` | 그 아래 `health-web/`, `shared/` 두 폴더가 나란히 위치 |
| Docker Compose 프로젝트명 | `health-web-${FRONTEND_PORT}` | `docker-compose.yml`의 최상위 `name:` |
| Docker 이미지명 | `health-web-${FRONTEND_PORT}:latest` | |
| 컨테이너명 | `health-web-${FRONTEND_PORT}` | |
| 호스트:컨테이너 포트 | `${FRONTEND_PORT}:80` | 컨테이너 내부는 nginx 기본 포트(80)로 고정, 호스트 쪽만 학생별로 다름 |

> Compose 최상위 `name:` 필드는 Docker Compose v2.20+ 필요. 서버의 Compose 버전이 낮다면(`docker compose version`으로 확인) `docker-compose.yml`의 `name:` 줄을 지우고, 모든 `docker compose` 명령 뒤에 `-p health-web-${FRONTEND_PORT}`를 붙이면 동일하게 동작한다.

## 4. 환경변수 매핑 (GitHub Variable → 빌드에 쓰이는 값)

health-web은 health-backend와 배포 서버(SSH 접속 정보)를 공유하므로, `SERVER_HOST`/`SERVER_PORT`(Variable), `SERVER_USER`/`SSH_KEY`(Secret)는 **새로 등록할 필요 없이 기존 것을 그대로 재사용**한다. 이 앱만의 고유한 값은 아래 2개뿐이다.

| GitHub 이름 | 종류 | 용도 | 비고 |
| --- | --- | --- | --- |
| `FRONTEND_PORT` | Variable | 호스트 publish 포트 + 네임스페이스 | 예: `22018` |
| `VITE_API_BASE_URL` | Variable | REST API 베이스 URL | 예: `https://be018.ys.iranglab.com` (health-backend 도메인) |

### GitHub Variable에 없는 값 → 배포 스크립트에서 파생

`VITE_WS_URL`은 별도의 GitHub Variable로 등록하지 않는다. health-backend의 REST와 WebSocket(`/health`)이 같은 호스트·포트에서 서빙되므로, `deploy-web.yml`의 배포 스크립트가 `VITE_API_BASE_URL`의 스킴만 `http→ws`, `https→wss`로 바꿔 그 자리에서 계산한다:

```bash
export VITE_WS_URL=$(echo "$VITE_API_BASE_URL" | sed -e 's#^https://#wss://#' -e 's#^http://#ws://#')
```

값이 매번 고정이 아니라 학생별 `VITE_API_BASE_URL`에 따라 달라져야 하므로, health-backend의 "GitHub에 없는 값은 고정값을 docker-compose.yml에 박아둔다" 방식 대신 이렇게 배포 스크립트에서 동적으로 파생시킨다.

## 5. 배포 흐름

1. **GitHub Actions 트리거**: `main` 브랜치에 `health-web/**` 또는 `shared/**` 변경이 push되거나, 수동 실행(`workflow_dispatch`).
2. **rsync 업로드**: `health-web/`와 `shared/`를 각각 서버의 `~/deploy/health-web-${FRONTEND_PORT}/health-web/`, `~/deploy/health-web-${FRONTEND_PORT}/shared/`로 업로드 (`--delete`로 서버 쪽 잔여 파일 정리).
3. **SSH 원격 실행**: 서버에 접속해 `VITE_WS_URL`을 파생시킨 뒤 `health-web/` 디렉터리에서 `docker compose up -d --build` 실행. **`.env` 파일은 서버에 생성되지 않는다.**
4. `docker image prune -f`로 이전 빌드가 남긴 dangling 이미지 정리.

## 6. 파일별 설명

### `Dockerfile`

3-스테이지 빌드:

1. `deps` — `health-web/package.json`만으로 `npm ci` (devDependencies 포함, `tsc -b && vite build`에 필요).
2. `build` — `ARG VITE_API_BASE_URL`/`VITE_WS_URL`을 받아 `ENV`로 주입한 뒤, `health-web/`과 `shared/`를 함께 COPY하고 `npm run build`. 정적 파일이 `health-web/dist/`에 생성된다.
3. 최종 런타임 — `nginx:1.27-alpine` 위에 `nginx.conf`와 `dist/`만 복사. `EXPOSE 80`.

빌드는 반드시 monorepo 루트를 context로 해야 한다:

```bash
# 로컬 테스트 (monorepo 루트에서 실행)
docker build -f health-web/Dockerfile \
  --build-arg VITE_API_BASE_URL=https://be018.ys.iranglab.com \
  --build-arg VITE_WS_URL=wss://be018.ys.iranglab.com \
  -t health-web-test .
```

### `nginx.conf`

정적 파일 서빙 + SPA fallback(`try_files ... /index.html`) + `/assets/` 장기 캐싱 + gzip 압축.

### `docker-compose.yml`

- `health-web/` 안에 위치하므로 `build.context: ..`가 monorepo 루트를 가리킨다.
- `VITE_API_BASE_URL`/`VITE_WS_URL`은 `environment:`가 아니라 `build.args:`로 전달한다 (2장 참고).
- 모든 필수 변수는 `${VAR:?...}` 문법으로 선언되어, 셸에 값이 없으면 명확한 에러와 함께 즉시 실패한다.
- 로그/데이터 볼륨은 없다 (정적 파일 서버라 상태를 갖지 않음).

로컬/서버에서 수동으로 띄워볼 때는 필요한 환경변수를 셸에 export한 뒤 실행한다:

```bash
cd health-web
export FRONTEND_PORT=22018
export VITE_API_BASE_URL=https://be018.ys.iranglab.com
export VITE_WS_URL=wss://be018.ys.iranglab.com
docker compose up -d --build
```

### `.github/workflows/deploy-web.yml`

- Job 레벨 `env:`에 GitHub Variables를 **GitHub 이름 그대로** 담아둔다 (이 값들이 `docker-compose.yml`의 `${VAR}` 치환 소스가 된다).
- rsync는 원격지에 없는 상위 디렉터리를 자동으로 만들어주지 않으므로, 업로드 전에 `appleboy/ssh-action`으로 `mkdir -p ~/deploy/health-web-$FRONTEND_PORT/{health-web,shared}`를 먼저 실행해 디렉터리를 만들어둔다.
- `burnett01/rsync-deployments`로 `health-web/`, `shared/`를 각각 서버에 업로드.
- `appleboy/ssh-action`의 `envs:`로 필요한 환경변수 이름만 넘겨 원격 셸에 안전하게 주입한 뒤, `VITE_WS_URL`을 파생시키고 `docker compose up -d --build`를 실행.

### `.dockerignore` (monorepo 루트)

health-backend와 **공유**한다. Build context가 monorepo 루트 전체가 되므로, `health-mobile`/`health-ai`/`demo` 등 이 배포와 무관한 디렉터리와 `node_modules`/`dist`/`.git`/`.env*`를 제외해 빌드 컨텍스트 전송 시간을 줄인다.

## 7. 서버 사전 준비

health-backend와 같은 서버(`SERVER_HOST`)를 공유하므로 SSH 키·Docker 설치 등은 이미 되어 있다고 가정한다. 추가로 필요한 것은:

- `FRONTEND_PORT`로 배정된 포트가 서버 방화벽에서 열려 있어야 함.
- 리버스 프록시(예: nginx/Caddy)가 학생별 프론트엔드 도메인(`fe018.ys.iranglab.com` 등)을 `FRONTEND_PORT`로 라우팅하도록 이미 구성되어 있어야 함 (이 repo 밖의 인프라 설정).

## 8. 트러블슈팅

| 증상 | 원인 | 조치 |
| --- | --- | --- |
| 로그인 후 API 호출이 잘못된 주소로 감 / CORS 에러 | `VITE_API_BASE_URL`을 빌드 후에 바꿈 (런타임 환경변수로 착각) | 값을 바꾸려면 **재빌드**해야 한다 (`docker compose up -d --build`). 컨테이너 재시작만으로는 반영 안 됨 |
| `/members/123`을 새로고침하면 404 | nginx가 `try_files ... /index.html` fallback 없이 정적 파일로만 매칭 시도 | `nginx.conf`가 이미지에 제대로 COPY됐는지, `location /` 블록이 맞는지 확인 |
| `docker compose up`이 `variable is required` 에러로 즉시 실패 | 필요한 환경변수가 셸/SSH 세션에 export되지 않음 | GitHub Variables 등록 여부(`FRONTEND_PORT`, `VITE_API_BASE_URL`) 및 workflow `env:`/`envs:` 목록 확인 |
| `docker build`에서 `Cannot find module '../../shared/types'` 류 에러 | build context가 monorepo 루트가 아니거나, 서버에 `shared/`가 업로드되지 않음 | `docker-compose.yml`의 `build.context`가 `..`인지, 서버 `~/deploy/health-web-${FRONTEND_PORT}/` 아래 `shared/`가 있는지 확인 |
