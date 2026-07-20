import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AlertService } from './alert.service';
import { WebhookMessageDto } from './dto/webhook-message.dto';

@ApiTags('webhook')
@ApiBearerAuth()
@Controller('webhook')
@UseGuards(JwtAuthGuard)
export class WebhookController {
  constructor(private readonly alertService: AlertService) {}

  @ApiOperation({
    summary: 'Slack 웹훅 메시지 발송',
    description:
      '전달받은 메시지를 Slack Incoming Webhook으로 발송한다. ⚠️ 실제 Slack 채널로 메시지가 전송된다.',
  })
  @Post('message')
  send(@Body() dto: WebhookMessageDto) {
    return this.alertService.sendSlackMessage(dto.message);
  }
}
