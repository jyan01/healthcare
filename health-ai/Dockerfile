# health-ai Dockerfile — RAG + Ollama Agent API (FastAPI).
#
# health-ai는 TypeScript용 shared/를 참조하지 않는 순수 Python 서비스이므로
# health-backend/health-web과 달리 monorepo 루트가 아니라 health-ai/ 자체가 build context다.
#
#   docker build -t health-ai-test .   (health-ai/ 안에서 실행)
#
# 실제 리스닝 포트는 기동 시 AI_API_PORT 환경변수(학생별 할당 포트)로 결정된다.
# OLLAMA_BASE_URL은 배포 시 교수님이 공용으로 열어주신 Ollama 서버(https://ai.iranglab.com,
# 기간 한정)를 가리키도록 docker-compose.yml에서 고정값으로 주입한다.

FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "uvicorn health-ai-api:apiApp --host 0.0.0.0 --port ${AI_API_PORT:-8000}"]
