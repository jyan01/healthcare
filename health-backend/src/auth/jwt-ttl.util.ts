const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

/**
 * JWT_EXPIRES_IN / JWT_REFRESH_EXPIRES_IN 형식의 TTL 문자열을 "초" 단위 정수로 변환한다.
 *
 * - 단위 없는 순수 숫자 문자열(예: "3600", GitHub Variable에서 초 단위로 등록된 값)은
 *   그대로 초로 간주한다.
 * - "1d", "14d", "2h" 처럼 단위가 붙은 문자열(로컬 .env 형식)은 해당 단위로 환산한다.
 *
 * jsonwebtoken의 `expiresIn`은 숫자 타입만 "초"로 해석하고, 단위 없는 문자열은
 * ms 라이브러리 규칙에 따라 "밀리초"로 해석해버리므로(예: "3600" → 3.6초), 반드시
 * 숫자로 변환해서 넘겨야 한다.
 */
export function resolveTtlSeconds(raw: string): number {
  const trimmed = raw.trim();

  const bareDigits = /^\d+$/.exec(trimmed);
  if (bareDigits) return Number(bareDigits[0]);

  const withUnit = /^(\d+)([smhd])$/.exec(trimmed);
  if (withUnit) return Number(withUnit[1]) * UNIT_SECONDS[withUnit[2]];

  throw new Error(`알 수 없는 TTL 형식입니다: ${raw}`);
}
