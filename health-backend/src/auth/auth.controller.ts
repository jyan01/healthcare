import { Body, Controller, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { REFRESH_TOKEN_COOKIE } from './refresh-token-cookie.util';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: '회원 로그인',
    description:
      'ID/Password 인증 후 AccessToken은 응답 바디로, RefreshToken은 httpOnly 쿠키로 발급한다.',
  })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, member } = await this.authService.login(
      dto.id,
      dto.passwd,
      res,
    );
    return { accessToken, member };
  }

  @ApiOperation({
    summary: 'AccessToken 재발급',
    description: 'httpOnly 쿠키로 전달된 RefreshToken으로 AccessToken을 재발급한다.',
  })
  @Post('refresh')
  refresh(@Req() req: Request) {
    const refreshToken = (req.cookies as Record<string, string> | undefined)?.[
      REFRESH_TOKEN_COOKIE
    ];
    if (!refreshToken) {
      throw new UnauthorizedException('RefreshToken 쿠키가 없습니다.');
    }
    return this.authService.refresh(refreshToken);
  }
}
