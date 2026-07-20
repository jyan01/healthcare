import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AskDto {
  @ApiProperty({
    example: '이 환자의 최근 혈압 추이가 어때?',
    description: 'AI Agent에게 보낼 질의 내용',
  })
  @IsString()
  @MinLength(1)
  message: string;
}
