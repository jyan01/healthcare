import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../../src/auth/auth.service';
import { MemberService } from '../../src/member/member.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Member } from '../../src/member/entities/member.entity';

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    memberId: 'user_003',
    password: bcrypt.hashSync('user_003123!', 10),
    memberName: '박지훈',
    gender: 'M',
    birthDate: '19810217',
    memberType: 'P',
    apiKey: 'key_003',
    regDate: new Date(),
    modDate: null,
    ...overrides,
  };
}

describe('AuthService', () => {
  let memberService: jest.Mocked<
    Pick<MemberService, 'findById' | 'findDiseases'>
  >;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign' | 'verify'>>;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;
  let authService: AuthService;

  beforeEach(() => {
    memberService = {
      findById: jest.fn(),
      findDiseases: jest.fn().mockResolvedValue([]),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('signed.jwt.token'),
      verify: jest.fn(),
    };
    configService = {
      get: jest.fn().mockImplementation((key: string) => `config:${key}`),
    };

    authService = new AuthService(
      memberService as unknown as MemberService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
  });

  describe('login', () => {
    it('존재하지 않는 회원이면 UnauthorizedException을 던진다', async () => {
      memberService.findById.mockResolvedValue(null);

      await expect(
        authService.login('unknown', 'whatever'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('비밀번호가 일치하지 않으면 UnauthorizedException을 던진다', async () => {
      memberService.findById.mockResolvedValue(buildMember());

      await expect(
        authService.login('user_003', 'wrong-password'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('ID/비밀번호가 일치하면 AccessToken/RefreshToken/회원정보를 반환한다', async () => {
      memberService.findById.mockResolvedValue(buildMember());

      const result = await authService.login('user_003', 'user_003123!');

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.refreshToken).toBe('signed.jwt.token');
      expect(result.member.memberId).toBe('user_003');
      expect(result.member.diseases).toEqual([]);
      // Payload는 userId, name, apiKey만 포함해야 한다
      expect(jwtService.sign).toHaveBeenCalledWith({
        userId: 'user_003',
        name: '박지훈',
        apiKey: 'key_003',
      });
    });
  });

  describe('refresh', () => {
    it('RefreshToken이 유효하면 새 AccessToken을 반환한다', () => {
      jwtService.verify.mockReturnValue({
        userId: 'user_003',
        name: '박지훈',
        apiKey: 'key_003',
      });

      const result = authService.refresh('valid-refresh-token');

      expect(result.accessToken).toBe('signed.jwt.token');
    });

    it('RefreshToken이 유효하지 않으면 UnauthorizedException을 던진다', () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      expect(() => authService.refresh('bad-token')).toThrow(
        UnauthorizedException,
      );
    });
  });
});
