import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class WebhookMessageDto {
  @ApiProperty({
    example: '[이상감지] user_003 박지훈 - 심박수 132bpm',
    description: 'Slack으로 전송할 메시지 내용',
  })
  @IsString()
  @MinLength(1)
  message: string;
}
