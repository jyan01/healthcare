import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { AskDto } from './dto/ask.dto';

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ApiOperation({
    summary: 'AI Agent 채팅 프록시',
    description: '질의 내용을 AI Agent API(health-ai)로 그대로 프록시한다.',
  })
  @Post()
  ask(@Body() dto: AskDto) {
    return this.chatService.ask(dto.message);
  }
}
