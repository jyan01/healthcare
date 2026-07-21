import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/**
 * health-ai(AI Agent API, RAG + Ollama)와의 유일한 통신 지점.
 * 채팅 프록시, 이상알림 Slack 메시지 작성, 회원상세 AI 소견 요약이 모두 이 서비스를 공유한다.
 * health-ai는 POST /ask(question, top_k, temperature)만 제공하며 답변 문자열을 그대로 반환한다
 * (health-ai/health-ai-api.py 참고 — RAG Agent가 필요 시 문서를 검색하고, 아니면 바로 답변한다).
 */
@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * useTools=false를 넘기면 health-ai가 문서 검색 Agent/Tool을 거치지 않고
   * LLM에 직접 질문한다. 이미 필요한 데이터를 prompt에 전부 포함시켜
   * 문서 검색이 필요 없는 요청(AI 소견 요약)에 사용 — 매번 Tool 호출 여부가
   * 갈려서 답변 형식이 들쭉날쭉해지는 것을 막는다.
   */
  async ask(
    question: string,
    options?: { useTools?: boolean },
  ): Promise<string> {
    const baseUrl = this.configService.get<string>('AI_AGENT_API_URL');
    try {
      const response = await firstValueFrom(
        this.httpService.post<string>(`${baseUrl}/ask`, {
          question,
          top_k: 3,
          temperature: 0.2,
          use_tools: options?.useTools ?? true,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`AI Agent API 호출 실패: ${(error as Error).message}`);
      throw error;
    }
  }
}
