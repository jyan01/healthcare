import { resolveTtlSeconds } from '../../src/auth/jwt-ttl.util';

describe('resolveTtlSeconds', () => {
  it('단위 없는 순수 숫자 문자열은 그대로 초로 해석한다 (GitHub Variable 형식)', () => {
    expect(resolveTtlSeconds('3600')).toBe(3600);
    expect(resolveTtlSeconds('604800')).toBe(604800);
  });

  it('단위가 붙은 문자열은 초로 환산한다 (로컬 .env 형식)', () => {
    expect(resolveTtlSeconds('1d')).toBe(86400);
    expect(resolveTtlSeconds('14d')).toBe(14 * 86400);
    expect(resolveTtlSeconds('2h')).toBe(2 * 3600);
    expect(resolveTtlSeconds('30m')).toBe(30 * 60);
    expect(resolveTtlSeconds('45s')).toBe(45);
  });

  it('알 수 없는 형식이면 에러를 던진다', () => {
    expect(() => resolveTtlSeconds('not-a-duration')).toThrow();
  });
});
