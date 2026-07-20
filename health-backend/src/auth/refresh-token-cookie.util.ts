import { Response } from 'express';

export const REFRESH_TOKEN_COOKIE = 'refreshToken';

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
