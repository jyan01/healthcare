# health-backend Dockerfile
#
# 주의: 이 프로젝트(tsconfig.json rootDir: "..")는 빌드 시 monorepo 루트의
# `shared/` 디렉터리를 함께 컴파일한다 (health-backend/src/shared.ts → ../../shared/types).
# 따라서 이 이미지는 반드시 **monorepo 루트를 build context로** 빌드해야 한다.
#
#   docker build -f health-backend/Dockerfile -t <image> .   (repo root에서 실행)
#
# docker-compose.yml에서는 build.context: .. 로 이미 이렇게 구성되어 있다.

# syntax=docker/dockerfile:1

########## 1) deps: 전체(dev 포함) 의존성 설치 — nest build에 필요 ##########
FROM node:20-alpine AS deps
WORKDIR /workspace/health-backend
COPY health-backend/package.json health-backend/package-lock.json ./
RUN npm ci

########## 2) build: shared/ + src/ 컴파일 ##########
FROM node:20-alpine AS build
WORKDIR /workspace
COPY --from=deps /workspace/health-backend/node_modules ./health-backend/node_modules
COPY health-backend ./health-backend
COPY shared ./shared
WORKDIR /workspace/health-backend
RUN npm run build
# 산출물: health-backend/dist/health-backend/src/main.js, health-backend/dist/shared/*.js

########## 3) prod-deps: 런타임에 필요한 의존성만 재설치 ##########
FROM node:20-alpine AS prod-deps
WORKDIR /workspace/health-backend
COPY health-backend/package.json health-backend/package-lock.json ./
RUN npm ci --omit=dev

########## 4) runtime ##########
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=prod-deps /workspace/health-backend/node_modules ./node_modules
COPY --from=build /workspace/health-backend/dist ./dist
COPY health-backend/package.json ./package.json

# 실제 리스닝 포트는 기동 시 PORT 환경변수(학생별 BACKEND_PORT)로 주입된다.
# EXPOSE는 문서 목적이며 실제 publish는 docker-compose.yml의 ports에서 처리한다.
EXPOSE 3000

CMD ["node", "dist/health-backend/src/main.js"]
