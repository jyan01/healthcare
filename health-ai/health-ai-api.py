# app.py
# 서버실행방법 터미널에서 아래의 명령을 실행
# python -m uvicorn app:apiApp --host 0.0.0.0 --port 8000 --reload

# 테스트 방법 :터미널에서 아래와 같이 API 호출
"""
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "만성 기침의 유병율은?",
    "top_k": 3,
    "temperature": 0.2
  }'
"""

from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

from rag_query import (
    answer_agent_question,
    get_config,
)


# ============================================================
# FastAPI 앱 생성
# ============================================================

apiApp = FastAPI(
    title="Healthcare RAG API",
    description="Ollama + pgvector 기반 RAG 질문 답변 API",
    version="1.0.0",
)


# ============================================================
# API 요청 모델
# ============================================================

class AskRequest(BaseModel):
    question: str
    top_k: int = 3
    temperature: float = 0.2
    max_chars_per_doc: Optional[int] = None
    use_tools: bool = True


# ============================================================
# API 응답 모델은 우선 dict로 반환
# ============================================================

@apiApp.get("/")
def root():
    return {
        "message": "Healthcare RAG API Server is running"
    }


# ============================================================
# 질문 답변 API
# ============================================================

@apiApp.post("/ask")
def ask(request: AskRequest):
    config = get_config()

    result = answer_agent_question(
        question=request.question,
        ollama_base_url=config["ollama_base_url"],
        top_k=request.top_k,
        temperature=request.temperature,
        max_chars_per_doc=request.max_chars_per_doc,
        verbose=False,
        use_tools=request.use_tools,
    )

    return result["answer"]