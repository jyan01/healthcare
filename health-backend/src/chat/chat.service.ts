import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /** health-ai(AI Agent API)로 질의를 그대로 프록시한다 */
  async ask(message: string): Promise<{ reply: string }> {
    const baseUrl = this.configService.get<string>('AI_AGENT_API_URL');
    try {
      const response = await firstValueFrom(
        this.httpService.post<{ reply: string }>(`${baseUrl}/chat`, {
          message,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `AI Agent API 프록시 실패: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
