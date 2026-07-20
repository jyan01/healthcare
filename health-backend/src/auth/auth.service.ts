import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import type { Response } from 'express';
import { MemberService } from '../member/member.service';
import { JwtPayload } from '../shared';
import { parseDurationMs, setRefreshTokenCookie } from './refresh-token-cookie.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly memberService: MemberService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(id: string, passwd: string, res: Response) {
    const member = await this.memberService.findById(id);
    if (!member)
      throw new UnauthorizedException('ID 또는 비밀번호가 올바르지 않습니다.');

    const matched = await bcrypt.compare(passwd, member.password);
    if (!matched)
      throw new UnauthorizedException('ID 또는 비밀번호가 올바르지 않습니다.');

    const payload: JwtPayload = {
      userId: member.memberId,
      name: member.memberName,
      apiKey: member.apiKey,
    };

    const refreshExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '14d';

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- env var (e.g. "14d") vs jsonwebtoken's branded duration string type
      expiresIn: refreshExpiresIn as any,
    });

    setRefreshTokenCookie(res, refreshToken, parseDurationMs(refreshExpiresIn));

    return {
      accessToken,
      member: {
        memberId: member.memberId,
        name: member.memberName,
        gender: member.gender,
        birthDate: member.birthDate,
        memberType: member.memberType,
        diseases: await this.memberService.findDiseases(member.memberId),
      },
    };
  }

  refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException(
        'RefreshToken이 유효하지 않거나 만료되었습니다.',
      );
    }

    const accessToken = this.jwtService.sign({
      userId: payload.userId,
      name: payload.name,
      apiKey: payload.apiKey,
    });
    return { accessToken };
  }
}
