import { Injectable } from '@nestjs/common';
import { AiAgentService } from '../ai-agent/ai-agent.service';

@Injectable()
export class ChatService {
  constructor(private readonly aiAgentService: AiAgentService) {}

  /** health-ai(AI Agent API)로 질의를 그대로 프록시한다 */
  async ask(message: string): Promise<{ reply: string }> {
    const reply = await this.aiAgentService.ask(message);
    return { reply };
  }
}
