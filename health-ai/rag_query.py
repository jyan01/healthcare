#!/usr/bin/env python
# coding: utf-8

# In[1]:


# ============================================================
# 설정 함수
# ============================================================
import os


def get_config() -> dict:
    """
    RAG 파이프라인 전체에서 사용하는 설정값을 반환합니다.
    DB 접속정보는 배포 시 학생별로 달라지므로 환경변수를 우선 사용하고,
    로컬에서 환경변수 없이 실행할 때를 위해 기존 값을 기본값으로 둡니다.
    """
    return {
        "db_host":        os.getenv("DB_HOST", "classdb.iranglab.com"),
        "db_port":        int(os.getenv("DB_PORT", "5432")),
        "db_name":        os.getenv("DB_NAME", "db18"),
        "db_user":        os.getenv("DB_USER", "user18"),
        "db_password":    os.getenv("DB_PASSWORD", "user1899!"),
        "ollama_base_url": os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        "llm_model":      os.getenv("LLM_MODEL", "qwen2.5:3b"),
        "embed_model":    os.getenv("EMBED_MODEL", "bge-m3"),
        "embedding_dim":  int(os.getenv("EMBEDDING_DIM", "1024")),
        "chunk_size":     int(os.getenv("CHUNK_SIZE", "800")),
        "chunk_overlap":  int(os.getenv("CHUNK_OVERLAP", "120")),
    }

# ============================================================
# DB 연결 함수
# ============================================================
from sqlalchemy import create_engine, text


def get_db_engine(config: dict):
    """
    설정에서 SQLAlchemy 엔진을 생성하고 연결을 검증한 뒤 반환합니다.
    연결 실패 시 예외를 발생시킵니다.
    """
    url = (
        f"postgresql+psycopg://{config['db_user']}:{config['db_password']}"
        f"@{config['db_host']}:{config['db_port']}/{config['db_name']}"
    )
    engine = create_engine(url, pool_pre_ping=True, pool_recycle=1800)
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    print(f"PostgreSQL 연결 성공: {config['db_host']}:{config['db_port']}/{config['db_name']}")
    return engine


# ============================================================
# 테스트
# ============================================================
if __name__ == "__main__":
    config = get_config()
    engine = get_db_engine(config)


# In[3]:


from sqlalchemy import text
from langchain_ollama import OllamaEmbeddings


# ============================================================
# Retriever 함수 (질문, 임베딩객체, DB객체, 임베딩차원, 검색결과수, 미리보기 글자수, 검색과정 출력여부
# ============================================================
def search_similar_documents(
    question: str,
    engine,
    top_k: int = 3,
    preview_chars: int = 700,
    verbose: bool = True,
    user_name: str | None = None,
):
    """
    질문을 임베딩한 뒤 pgvector에서 유사 문서를 검색한다.

    Parameters
    ----------
    question : str
        사용자 질문
    engine :
        SQLAlchemy engine
    top_k : int
        검색 결과 개수
    preview_chars : int
        출력 시 content 미리보기 글자 수
    verbose : bool
        True면 검색 과정과 결과를 출력
    user_name : str | None
        지정하면 파일명(source)에 해당 이름이 포함된 문서로만 검색 범위를 좁힌다.
        (없으면 전체 문서 대상 검색 — 특정인 대상이 아닌 공용 참고문서 질문에 사용)

    Returns
    -------
    list[dict]
        검색 결과 목록
    """
    config = get_config();
    # ============================================================
    # Ollama Embedding 모델 준비
    # ============================================================
    # bge-m3 모델을 사용해 질문을 벡터로 변환한다.
    # bge-m3는 일반적으로 1024차원 벡터를 생성한다.
    # ============================================================
    embeddings = OllamaEmbeddings(
        model=config["embed_model"],
        base_url=config["ollama_base_url"]
    )
    # bge-m3 임베딩 모델의 벡터차원은 1024
    embedding_dim = config["embedding_dim"]
    # ============================================================
    # 1. 질문 임베딩
    # ============================================================

    question_vector = embeddings.embed_query(question)

    if verbose:
        print("질문:", question)
        print("임베딩 차원:", len(question_vector))
        print("앞쪽 5개 값:", question_vector[:5])

    if len(question_vector) != embedding_dim:
        raise ValueError(
            f"임베딩 차원 불일치: question={len(question_vector)}, expected={embedding_dim}"
        )

    if verbose:
        print("임베딩 차원 정상")

    # ============================================================
    # 2. Python list 벡터를 pgvector 문자열로 변환
    # ============================================================

    question_vector_text = "[" + ",".join(map(str, question_vector)) + "]"

    if verbose:
        print(question_vector_text[:100] + " ...")

    # ============================================================
    # 3. pgvector 유사 문서 검색
    # ============================================================

    search_sql = """
    SELECT
        id,
        source,
        source_type,
        page_no,
        chunk_index,
        content,
        metadata,
        embedding <=> CAST(:query_vector AS vector) AS distance,
        1 - (embedding <=> CAST(:query_vector AS vector)) AS similarity
    FROM rag_documents
    WHERE (:user_name = '' OR source ILIKE '%' || :user_name || '%')
    ORDER BY embedding <=> CAST(:query_vector AS vector)
    LIMIT :top_k;
    """

    with engine.connect() as conn:
        result = conn.execute(
            text(search_sql),
            {
                "query_vector": question_vector_text,
                "top_k": top_k,
                "user_name": user_name or "",
            },
        )

        rows = result.fetchall()

    # ============================================================
    # 4. 결과를 dict 형태로 변환
    # ============================================================

    search_results = []

    for row in rows:
        item = {
            "id": row.id,
            "source": row.source,
            "source_type": row.source_type,
            "page_no": row.page_no,
            "chunk_index": row.chunk_index,
            "content": row.content,
            "metadata": row.metadata,
            "distance": float(row.distance),
            "similarity": float(row.similarity),
        }

        search_results.append(item)


    # ============================================================
    # 6. 결과 출력
    # ============================================================

    if verbose:
        print("검색 결과 수:", len(search_results))

        for item in search_results:
            print("=" * 100)
            print("id:", item["id"])
            print("source:", item["source"])
            print("page_no:", item["page_no"])
            print("chunk_index:", item["chunk_index"])
            print("distance:", item["distance"])
            print("similarity:", item["similarity"])
            print("content:")
            print(item["content"][:preview_chars])

    return search_results

if __name__ == "__main__":
    # ============================================================
    # 질의 및 검색결과 확인
    # ============================================================
    question = "김민준의 건강정보는?"

    search_results = search_similar_documents(
        question=question,
        engine=engine,
        top_k=3,
    )



# In[4]:


# ============================================================
# RAG 검색 결과를 LLM Context 문자열로 변환
# ============================================================
def build_context(search_results, 
                  max_chars_per_doc: int | None = None,
                  verbose: bool = True,
                  ) -> str:
    """
    pgvector 검색 결과를 LLM 프롬프트에 넣기 좋은 context 문자열로 변환한다.
    """

    context_blocks = []

    for i, item in enumerate(search_results):
        content = item["content"]

        if max_chars_per_doc is not None:
            content = content[:max_chars_per_doc]

        block = f"""[문서 {i + 1}]
                source: {item["source"]}
                page: {item["page_no"]}
                chunk_index: {item["chunk_index"]}
                similarity: {item["similarity"]:.4f}
                content:
                {content}"""

        context_blocks.append(block)
    if verbose is True:
        print("\n\n".join(context_blocks))

    return "\n\n".join(context_blocks)

if __name__ == "__main__":
    #검색결과에서 필요한 정보만 다시 재구성해서 Context로 구성
    context = build_context(
            search_results=search_results,
            max_chars_per_doc=None,
            verbose=True,
        )


# In[9]:


# ============================================================
# RAG 질문 답변 함수
# ============================================================

from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate

def answer_rag_question(
    question: str,
    engine,
    llm_model: str,
    ollama_base_url: str,
    top_k: int = 3,
    temperature: float = 0.2,
    verbose: bool = True,
    max_chars_per_doc: int | None = None,
):
    """
    질문을 받아서 다음 과정을 한 번에 수행한다.
    temperature 낮음  → 안정적, 보수적, 비슷한 답변
    temperature 높음  → 다양함, 창의적, 매번 달라질 가능성 증가

    1. 질문 내용이 건강 관련 질문인지 확인
    2. 건강 관련 질문인 경우
        2-1. 질문 임베딩
        2-2. pgvector 유사 문서 검색
        2-3. 검색 결과를 LLM context로 변환
        2-4. RAG 프롬프트 구성
    3. 건강 관련 질문이 아닌 경우
        3-1. 일반용 프롬프트 구성
    4. Ollama LLM 호출
    5. 답변 반환
    """

    # ============================================================
    # Ollama LLM 모델 준비
    # ============================================================

    llm = ChatOllama(
        model=llm_model,
        base_url=ollama_base_url,
        temperature=temperature,
    )
    answer_rag_question = 1024
    if verbose:
        print("LLM 모델 준비 완료:", llm_model)

    # ============================================================
    # 1. 질문 내용이 기침 관련 질문인지 확인
    # ============================================================

    cough_keywords = [
        "건강",
        "건강정보",
        "health",
        "검진",
        "건강검진",
        "처방전",
    ]

    question_lower = question.lower()
    #질문에 키워드가 포함되어있으면 True, 없으면 False 반환
    use_rag = any(keyword.lower() in question_lower for keyword in cough_keywords)

    if verbose:
        print("RAG 사용 여부:", use_rag)

    # ============================================================
    # 2. 기침 관련 질문이면 RAG 검색 수행
    # ============================================================

    if use_rag:
        # ============================================================
        # 2-1. 유사 문서 검색
        # ============================================================

        search_results = search_similar_documents(
            question=question,
            engine=engine,
            top_k=top_k,
            verbose=False,
        )

        # ============================================================
        # 2-2. 검색 결과를 LLM Context로 구성
        # ============================================================

        context = build_context(
            search_results=search_results,
            max_chars_per_doc=max_chars_per_doc,
            verbose=False,
        )

        # ============================================================
        # 2-3. RAG Prompt Template 생성
        # ============================================================

        rag_prompt = ChatPromptTemplate.from_template(
            """
            당신은 문서 기반으로 답변하는 RAG AI 어시스턴트입니다.

            반드시 아래 참고문서에 있는 내용만 근거로 답변하세요.
            참고문서에 없는 내용은 추측하지 말고 "문서에서 확인되지 않습니다"라고 답변하세요.
            답변은 한국어로 작성하세요.

            [참고문서]
            {context}

            [사용자 질문]
            {question}

            [답변 작성 규칙]
            1. 참고문서의 content 내용만 근거로 답변하세요.
            2. 의학적 판단이 필요한 내용은 단정하지 말고 문서 기반 설명으로 답하세요.
            3. 가능하면 핵심 내용을 먼저 요약하세요.
            4. 답변에 사용한 근거는 반드시 출처와 함께 표시하세요.
            5. 출처는 아래 형식을 사용하세요.
               - [source: ./docs/rag-sample.pdf, page: 1]
            6. 여러 문서를 참고한 경우 출처를 여러 개 표시하세요.
            7. 참고문서의 source, page 값을 그대로 사용하세요.
            8. 출처를 만들 때 임의의 파일명이나 페이지 번호를 만들지 마세요.
            9. 참고문서에 없는 내용은 반드시 "문서에서 확인되지 않습니다"라고 답변하세요.

            [답변 형식]
            핵심 답변:
            ...

            근거:
            ...

            출처:
            - [source: ..., page: ...]

            [답변]
            """
        )

        chain = rag_prompt | llm

        # ============================================================
        # 2-4. 검색된 문서를 기반으로 LLM 답변 생성
        # ============================================================
        answer_chunks = []

        for chunk in chain.stream(
            {
                "context": context,
                "question": question,
            }
        ):
            if verbose:
                print(chunk.content, end="", flush=True)
            answer_chunks.append(chunk.content)

        answer = "".join(answer_chunks)

        # ============================================================
        # 2-5. 결과 반환
        # ============================================================

        return {
            "mode": "rag",
            "question": question,
            "answer": answer,
            "context": context,
            "search_results": search_results,
        }

    # ============================================================
    # 3. 건강 관련 질문이 아니면 일반 LLM 답변
    # ============================================================
    else:
        # ============================================================
        # 3-1. 일반 Prompt Template 생성
        # ============================================================

        general_prompt = ChatPromptTemplate.from_template(
            """
            당신은 친절한 AI 어시스턴트입니다.
            사용자의 질문에 한국어로 답변하세요.

            [사용자 질문]
            {question}

            [답변]
            """
        )

        chain = general_prompt | llm

        # ============================================================
        # 3-2. 일반 LLM 답변 생성
        # ============================================================
        answer_chunks = []

        for chunk in chain.stream(
            {
                "question": question,
            }
        ):

            if verbose:
                print(chunk.content, end="", flush=True)
            answer_chunks.append(chunk.content)

        answer = "".join(answer_chunks)

        # ============================================================
        # 3-3. 결과 반환
        # ============================================================

        return {
            "mode": "llm",
            "question": question,
            "answer": answer,
            "context": None,
            "search_results": None,
        }


# In[64]:


if __name__ == "__main__":
    question = "이서연의 건강정보를 알려줘"
    result = answer_rag_question(
        question=question,
        engine=engine,
        llm_model="qwen2.5:14b",
        ollama_base_url="http://localhost:11434",
        top_k=3,
        temperature=0.2,
        verbose=True,

    )


# In[60]:


# ============================================================
# Tool & Agent 기반 RAG 질문 답변 함수
# ============================================================

from typing import Any

from langchain.agents import create_agent
from langchain.tools import tool
from langchain_ollama import ChatOllama


def answer_agent_question(
    question: str,
    llm_model: str = "qwen2.5:3b",
    ollama_base_url: str = "http://localhost:11434",
    top_k: int = 3,
    temperature: float = 0.2,
    verbose: bool = True,
    max_chars_per_doc: int | None = None,
    num_predict: int = 1024,
) -> dict[str, Any]:
    """
    Tool & Agent 방식으로 질문에 답변한다.

    처리 과정:
    1. Ollama LLM 준비
    2. 문서 검색 Tool 등록
    3. Agent가 질문을 분석
    4. 문서 검색이 필요하면 Agent가 Tool 호출
    5. 검색 결과를 근거로 최종 답변 생성
    6. 일반 질문은 Tool을 호출하지 않고 직접 답변
    """
    #DB 초기화
    config = get_config()
    engine = get_db_engine(config)
    # ------------------------------------------------------------
    # 이번 실행에서 Tool이 검색한 결과를 저장
    # ------------------------------------------------------------
    tool_state = {
        "called": False,
        "search_results": [],
        "context": None,
    }

    # ============================================================
    # 1. 문서 검색 Tool 정의
    # ============================================================
    @tool
    def search_health_documents(query: str, user_name: str) -> str:
        """
        건강검진, 처방전, 건강정보 등 등록된 의료·건강 문서에서
        사용자 질문과 관련된 내용을 검색한다.

        사람 이름으로 요청하는 건강관련질문에만 문서 검색후 답변한다.

        개인의 건강 상태, 검사 결과, 처방 약품, 질병 정보처럼
        문서 확인이 필요한 질문에 사용한다.

        Args:
            query: 문서에서 검색할 자연어 질문
            user_name: 질문에 등장하는 사람의 이름. 반드시 질문 텍스트에서 그대로
                추출해서 전달한다 (예: "박지훈의 건강 상태를 알려줘" → "박지훈").
                등록된 문서는 환자별로 나뉘어 있어, 이름이 정확해야 그 사람의
                문서만 검색된다. 특정 인물을 언급하지 않는 일반 질문이면 빈
                문자열("")을 전달한다.

        Returns:
            검색된 문서 내용과 출처 정보
        """

        if verbose:
            print(f"\n[Tool 호출] search_health_documents")
            print(f"[검색 질문] {query} / [대상 인물] {user_name!r}")

        search_results = search_similar_documents(
            question=query,
            engine=engine,
            top_k=top_k,
            verbose=False,
            user_name=user_name,
        )

        tool_state["called"] = True
        tool_state["search_results"] = search_results

        if not search_results:
            context = "관련 문서를 찾지 못했습니다."
            tool_state["context"] = context
            return context

        context = build_context(
            search_results=search_results,
            max_chars_per_doc=max_chars_per_doc,
            verbose=False,
        )

        tool_state["context"] = context


        if verbose:
            print(f"[검색 결과] {len(search_results)}개")
            print(context)
        else:
            print(f"\n[{len(search_results)}개의 내부 문서 검색을 완료했습니다.]") 

        return context

    # ============================================================
    # 2. Ollama LLM 준비
    # ============================================================
    llm = ChatOllama(
        model=llm_model,
        base_url=ollama_base_url,
        temperature=temperature,
        num_predict=num_predict,
    )

    if verbose:
        print("LLM 모델 준비 완료:", llm_model)

    # ============================================================
    # 3. Agent 시스템 프롬프트
    # ============================================================
    system_prompt = """
당신은 일반 질문과 문서 기반 질문을 모두 처리하는 한국어 AI 어시스턴트입니다.

사용 가능한 도구:
- search_health_documents:
  등록된 건강검진, 처방전, 건강정보 및 의료 관련 문서를 검색합니다.

도구 사용 규칙:
1. 사용자가 건강검진 결과, 처방전, 복용 약품, 검사 수치, 개인 건강 기록,
   등록된 건강 문서의 내용을 묻는 경우 search_health_documents 도구를 사용하세요.
2. 사용자가 "내 문서", "검진 결과", "처방전에 나온", "등록된 자료"처럼
   저장된 문서를 확인해야 하는 질문을 하면 반드시 도구를 사용하세요.
3. 프로그래밍, 일반 상식, 일상 대화처럼 문서 검색이 필요 없는 질문에는
   도구를 사용하지 말고 직접 답변하세요.
4. 단순히 건강이라는 단어가 포함됐다는 이유만으로 도구를 호출하지 마세요.
5. 검색 도구 결과에 없는 내용을 추측하거나 만들어내지 마세요.
6. 검색 결과가 부족하면 "문서에서 확인되지 않습니다"라고 답변하세요.
7. 의료 내용을 확정적인 진단처럼 표현하지 마세요.
8. 답변은 한국어로 작성하세요.

문서 검색 도구를 사용한 경우 답변 형식:

핵심 답변:
문서에서 확인한 핵심 내용을 설명합니다.

근거:
답변의 근거가 되는 문서 내용을 설명합니다.

출처:
- [문서 1]

출처 작성 규칙:
- 도구 결과는 "[문서 1]", "[문서 2]"처럼 번호로 구분되어 있습니다.
- 출처를 표시할 때는 실제로 답변에 사용한 문서의 번호("[문서 N]")만 그대로 옮겨 쓰세요.
- source 파일명이나 page 값을 직접 타이핑해서 옮겨 쓰지 마세요. 한글 파일명을 그대로
  베끼려고 하면 글자가 깨질 수 있으니, 반드시 번호로만 표시하세요.
"""

    # ============================================================
    # 4. Agent 생성
    # ============================================================
    agent = create_agent(
        model=llm,
        tools=[search_health_documents],
        system_prompt=system_prompt,
    )

    # ============================================================
    # 5. Agent 실행
    # ============================================================
    print("\n[에이전트 실행중...]")
    result = agent.invoke(
        {
            "messages": [
                {
                    "role": "user",
                    "content": question,
                }
            ]
        }
    )

    # ============================================================
    # 6. 최종 AI 답변 추출
    # ============================================================
    messages = result.get("messages", [])

    answer = ""

    for message in reversed(messages):
        message_type = getattr(message, "type", None)

        if message_type == "ai":
            content = getattr(message, "content", "")

            if isinstance(content, str):
                answer = content
            else:
                answer = str(content)

            break

    if verbose:
        print("\n\n[최종 답변]")
        print(answer)

    # ============================================================
    # 7. 결과 반환
    # ============================================================
    return {
        "mode": "rag" if tool_state["called"] else "llm",
        "question": question,
        "answer": answer,
        "context": tool_state["context"],
        "search_results": tool_state["search_results"],
        "messages": messages,
    }



# In[62]:


    # ============================================================
    # 질의하기
    # ============================================================
if __name__ == "__main__":
    question = "서예지의 건강검진 결과를 설명해줘"
    result = answer_agent_question(
        question=question,
        llm_model="qwen2.5:3b",
        ollama_base_url="http://localhost:11434",
        top_k=3,
        temperature=0.2,
        verbose=False,
    )
    print(result["answer"])
    print(f"\n{result['messages']}")


# In[ ]: