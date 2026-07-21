import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiAgentService } from './ai-agent.service';

@Module({
  // LLM 응답은 수 초~수십 초가 걸릴 수 있어 기본 타임아웃보다 여유를 둔다.
  imports: [HttpModule.register({ timeout: 30_000 })],
  providers: [AiAgentService],
  exports: [AiAgentService],
})
export class AiAgentModule {}
