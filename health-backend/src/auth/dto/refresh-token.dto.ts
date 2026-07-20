import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: '로그인 시 발급받은 RefreshToken' })
  @IsString()
  refreshToken: string;
}
