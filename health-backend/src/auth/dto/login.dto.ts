import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin', description: '회원 ID' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'admin001123!', description: '비밀번호' })
  @IsString()
  @MinLength(1)
  passwd: string;
}
