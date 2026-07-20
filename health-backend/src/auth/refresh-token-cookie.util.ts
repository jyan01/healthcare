import { Response } from 'express';

export const REFRESH_TOKEN_COOKIE = 'refreshToken';

const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** "14d", "1h" 같은 JWT_REFRESH_EXPIRES_IN 형식의 문자열을 ms로 변환 */
export function parseDurationMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) return UNIT_MS.d * 14;
  return Number(match[1]) * UNIT_MS[match[2]];
}

export function setRefreshTokenCookie(
  res: Response,
  refreshToken: string,
  maxAgeMs: number,
): void {
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/auth/refresh',
    maxAge: maxAgeMs,
  });
}
