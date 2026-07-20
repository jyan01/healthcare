# health-web Dockerfile
#
# 주의: 이 프로젝트(tsconfig.app.json include: "../shared/**/*.ts")는 빌드 시 monorepo 루트의
# `shared/` 디렉터리를 함께 컴파일한다 (health-web/src/shared.ts → ../../shared/types, ../../shared/utils).
# 따라서 이 이미지는 반드시 **monorepo 루트를 build context로** 빌드해야 한다.
#
#   docker build -f health-web/Dockerfile \
#     --build-arg VITE_API_BASE_URL=https://be018.ys.iranglab.com \
#     --build-arg VITE_WS_URL=wss://be018.ys.iranglab.com \
#     -t health-web-test .   (repo root에서 실행)
#
# docker-compose.yml에서는 build.context: .. 와 build.args로 이미 이렇게 구성되어 있다.
#
# 중요: VITE_API_BASE_URL / VITE_WS_URL은 Vite 특성상 런타임이 아니라 **빌드 시점**에
# 정적 번들(import.meta.env)에 그대로 굳어 들어간다. 그래서 컨테이너 실행 시
# environment:로 넘기는 게 의미가 없고, 반드시 build ARG로 받아 `npm run build`
# 실행 전에 주입해야 한다 (docs/DEPLOY.md 3장 참고).

# syntax=docker/dockerfile:1

########## 1) deps: 의존성 설치 (devDependencies 포함 — tsc/vite build에 필요) ##########
FROM node:20-alpine AS deps
WORKDIR /workspace/health-web
COPY health-web/package.json health-web/package-lock.json ./
RUN npm ci

########## 2) build: shared/ + src/ 컴파일 후 정적 파일 생성 ##########
FROM node:20-alpine AS build
ARG VITE_API_BASE_URL
ARG VITE_WS_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_WS_URL=${VITE_WS_URL}
WORKDIR /workspace
COPY --from=deps /workspace/health-web/node_modules ./health-web/node_modules
COPY health-web ./health-web
COPY shared ./shared
WORKDIR /workspace/health-web
RUN npm run build
# 산출물: health-web/dist/ (정적 HTML/JS/CSS)

########## 3) runtime: nginx로 정적 파일 서빙 ##########
FROM nginx:1.27-alpine
COPY health-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/health-web/dist /usr/share/nginx/html

# 실제 publish 포트는 docker-compose.yml의 ports(학생별 FRONTEND_PORT)에서 결정된다.
EXPOSE 80
