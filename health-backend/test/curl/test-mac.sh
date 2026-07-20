#!/usr/bin/env bash
# health-backend curl 테스트 스크립트 (macOS / Linux, bash)
# 사용법: bash test/curl/test-mac.sh
# 서버가 http://localhost:${PORT}(.env 기본 21018)에서 실행 중이어야 한다.
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:21018}"
DOCTOR_ID="admin"
DOCTOR_PASSWD="admin001123!"
PATIENT_ID="user_003"
PATIENT_PASSWD="user_003123!"
OTHER_PATIENT_ID="user_004"

json_get() {
  # $1: JSON 문자열, $2: 필드명(dot 표기)
  node -e "const d=JSON.parse(process.argv[1]); const path=process.argv[2].split('.'); console.log(path.reduce((o,k)=>o?.[k], d))" "$1" "$2"
}

echo "=== 1. 의사 로그인 ==="
DOCTOR_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"$DOCTOR_ID\",\"passwd\":\"$DOCTOR_PASSWD\"}")
echo "$DOCTOR_LOGIN"
DOCTOR_TOKEN=$(json_get "$DOCTOR_LOGIN" accessToken)
DOCTOR_REFRESH=$(json_get "$DOCTOR_LOGIN" refreshToken)

echo
echo "=== 2. 환자 로그인 ==="
PATIENT_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"$PATIENT_ID\",\"passwd\":\"$PATIENT_PASSWD\"}")
echo "$PATIENT_LOGIN"
PATIENT_TOKEN=$(json_get "$PATIENT_LOGIN" accessToken)

echo
echo "=== 3. AccessToken 재발급 ==="
curl -s -X POST "$BASE_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$DOCTOR_REFRESH\"}"
echo

echo
echo "=== 4. 회원 목록 조회 (의사) ==="
curl -s "$BASE_URL/members" -H "Authorization: Bearer $DOCTOR_TOKEN"
echo

echo
echo "=== 5. 회원 목록 조회 (환자 - 본인만 반환) ==="
curl -s "$BASE_URL/members" -H "Authorization: Bearer $PATIENT_TOKEN"
echo

echo
echo "=== 6. 회원 상세 조회 (의사 -> 환자) ==="
curl -s "$BASE_URL/members/$PATIENT_ID" -H "Authorization: Bearer $DOCTOR_TOKEN"
echo

echo
echo "=== 7. 회원 상세 조회 (환자가 타인 조회 시도, 403 예상) ==="
curl -s -o /dev/null -w "HTTP %{http_code}\n" "$BASE_URL/members/$OTHER_PATIENT_ID" \
  -H "Authorization: Bearer $PATIENT_TOKEN"

echo
echo "=== 8. 회원 건강데이터 기간 조회 ==="
curl -s -G "$BASE_URL/members/$PATIENT_ID/health-data" \
  --data-urlencode "startAt=2026-07-01T00:00:00+09:00" \
  --data-urlencode "endAt=2026-07-17T00:00:00+09:00" \
  -H "Authorization: Bearer $DOCTOR_TOKEN"
echo

echo
echo "=== 9. 채팅 API (health-ai 서버가 없으면 실패할 수 있음) ==="
curl -s -X POST "$BASE_URL/chat" \
  -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"이 환자의 최근 혈압 추이가 어때?"}'
echo

echo
echo "=== 10. 인증 없이 보호된 API 호출 (401 예상) ==="
curl -s -o /dev/null -w "HTTP %{http_code}\n" "$BASE_URL/members"

echo
echo "완료. 웹훅 발송(POST /webhook/message)은 실제 Slack 채널로 메시지가 전송되므로 이 스크립트에는 포함하지 않았다."
echo "필요 시 직접 실행: curl -X POST \"$BASE_URL/webhook/message\" -H \"Authorization: Bearer \$DOCTOR_TOKEN\" -H \"Content-Type: application/json\" -d '{\"message\":\"test\"}'"
