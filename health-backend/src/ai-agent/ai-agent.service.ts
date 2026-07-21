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

  async ask(question: string): Promise<string> {
    const baseUrl = this.configService.get<string>('AI_AGENT_API_URL');
    try {
      const response = await firstValueFrom(
        this.httpService.post<string>(`${baseUrl}/ask`, {
          question,
          top_k: 3,
          temperature: 0.2,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`AI Agent API 호출 실패: ${(error as Error).message}`);
      throw error;
    }
  }
}
