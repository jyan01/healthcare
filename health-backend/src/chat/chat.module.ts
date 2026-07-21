import { Module } from '@nestjs/common';
import { AiAgentModule } from '../ai-agent/ai-agent.module';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';

@Module({
  imports: [AiAgentModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
