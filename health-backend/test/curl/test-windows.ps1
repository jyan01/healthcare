# health-backend curl 테스트 스크립트 (Windows PowerShell)
# 사용법: powershell -ExecutionPolicy Bypass -File test/curl/test-windows.ps1
# 서버가 http://localhost:{PORT}(.env 기본 21018)에서 실행 중이어야 한다.
#
# 주의:
# - PowerShell에서 `curl`은 기본적으로 Invoke-WebRequest의 별칭이므로, 실제 curl.exe(Windows 10+ 내장)를 명시적으로 호출한다.
# - PowerShell 5.1에서 curl.exe에 JSON 본문을 직접 문자열로 넘기면 인용부호가 깨지는 문제가 있어,
#   JSON은 임시 파일에 써서 `curl.exe -d @파일` 형태로 전달한다.

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$BaseUrl = if ($env:BASE_URL) { $env:BASE_URL } else { "http://localhost:21018" }
$DoctorId = "admin"
$DoctorPasswd = "admin001123!"
$PatientId = "user_003"
$PatientPasswd = "user_003123!"
$OtherPatientId = "user_004"

$TempDir = Join-Path $env:TEMP "health-backend-curl-test"
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

function Write-JsonBody {
  param([hashtable]$Body, [string]$FileName)
  $path = Join-Path $TempDir $FileName
  ($Body | ConvertTo-Json -Compress) | Set-Content -Path $path -Encoding UTF8 -NoNewline
  return $path
}

Write-Host "=== 1. 의사 로그인 ===" -ForegroundColor Cyan
$loginBodyPath = Write-JsonBody -Body @{ id = $DoctorId; passwd = $DoctorPasswd } -FileName "doctor-login.json"
$doctorLoginJson = curl.exe -s -X POST "$BaseUrl/auth/login" -H "Content-Type: application/json" -d "@$loginBodyPath"
Write-Host $doctorLoginJson
$doctorLogin = $doctorLoginJson | ConvertFrom-Json
$doctorToken = $doctorLogin.accessToken
$doctorRefresh = $doctorLogin.refreshToken

Write-Host "`n=== 2. 환자 로그인 ===" -ForegroundColor Cyan
$patientLoginBodyPath = Write-JsonBody -Body @{ id = $PatientId; passwd = $PatientPasswd } -FileName "patient-login.json"
$patientLoginJson = curl.exe -s -X POST "$BaseUrl/auth/login" -H "Content-Type: application/json" -d "@$patientLoginBodyPath"
Write-Host $patientLoginJson
$patientToken = ($patientLoginJson | ConvertFrom-Json).accessToken

Write-Host "`n=== 3. AccessToken 재발급 ===" -ForegroundColor Cyan
$refreshBodyPath = Write-JsonBody -Body @{ refreshToken = $doctorRefresh } -FileName "refresh.json"
curl.exe -s -X POST "$BaseUrl/auth/refresh" -H "Content-Type: application/json" -d "@$refreshBodyPath"
Write-Host ""

Write-Host "`n=== 4. 회원 목록 조회 (의사) ===" -ForegroundColor Cyan
curl.exe -s "$BaseUrl/members" -H "Authorization: Bearer $doctorToken"
Write-Host ""

Write-Host "`n=== 5. 회원 목록 조회 (환자 - 본인만 반환) ===" -ForegroundColor Cyan
curl.exe -s "$BaseUrl/members" -H "Authorization: Bearer $patientToken"
Write-Host ""

Write-Host "`n=== 6. 회원 상세 조회 (의사 -> 환자) ===" -ForegroundColor Cyan
curl.exe -s "$BaseUrl/members/$PatientId" -H "Authorization: Bearer $doctorToken"
Write-Host ""

Write-Host "`n=== 7. 회원 상세 조회 (환자가 타인 조회 시도, 403 예상) ===" -ForegroundColor Cyan
curl.exe -s -o NUL -w "HTTP %{http_code}`n" "$BaseUrl/members/$OtherPatientId" -H "Authorization: Bearer $patientToken"

Write-Host "`n=== 8. 회원 건강데이터 기간 조회 ===" -ForegroundColor Cyan
curl.exe -s -G "$BaseUrl/members/$PatientId/health-data" --data-urlencode "startAt=2026-07-01T00:00:00+09:00" --data-urlencode "endAt=2026-07-17T00:00:00+09:00" -H "Authorization: Bearer $doctorToken"
Write-Host ""

Write-Host "`n=== 9. 채팅 API (health-ai 서버가 없으면 실패할 수 있음) ===" -ForegroundColor Cyan
$chatBodyPath = Write-JsonBody -Body @{ message = "이 환자의 최근 혈압 추이가 어때?" } -FileName "chat.json"
curl.exe -s -X POST "$BaseUrl/chat" -H "Authorization: Bearer $doctorToken" -H "Content-Type: application/json" -d "@$chatBodyPath"
Write-Host ""

Write-Host "`n=== 10. 인증 없이 보호된 API 호출 (401 예상) ===" -ForegroundColor Cyan
curl.exe -s -o NUL -w "HTTP %{http_code}`n" "$BaseUrl/members"

Remove-Item -Recurse -Force $TempDir -ErrorAction SilentlyContinue

Write-Host "`n완료. 웹훅 발송(POST /webhook/message)은 실제 Slack 채널로 메시지가 전송되므로 이 스크립트에는 포함하지 않았다." -ForegroundColor Yellow
Write-Host "필요 시 직접 실행 (본문은 JSON 파일로 저장 후 curl.exe -d @파일 형태 권장):"
Write-Host "  '{\"message\":\"test\"}' | Set-Content webhook.json -Encoding UTF8"
Write-Host "  curl.exe -X POST `"$BaseUrl/webhook/message`" -H `"Authorization: Bearer $doctorToken`" -H `"Content-Type: application/json`" -d `"@webhook.json`""
