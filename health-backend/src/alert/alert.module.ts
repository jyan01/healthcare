import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiAgentModule } from '../ai-agent/ai-agent.module';
import { AlertService } from './alert.service';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [HttpModule, AiAgentModule],
  controllers: [WebhookController],
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertModule {}
