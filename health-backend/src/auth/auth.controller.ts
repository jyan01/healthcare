import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: '회원 로그인',
    description:
      'ID/Password 인증 후 AccessToken, RefreshToken, 회원정보를 발급한다.',
  })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.id, dto.passwd);
  }

  @ApiOperation({
    summary: 'AccessToken 재발급',
    description: 'RefreshToken으로 만료된 AccessToken을 재발급한다.',
  })
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }
}
