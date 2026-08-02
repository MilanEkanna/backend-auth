# Test script for the authentication system
$base = 'http://localhost:8000/api/auth'

Write-Host '=== TEST 1: Register ===' -ForegroundColor Cyan
$registerBody = @{
  name     = 'Test User'
  email    = 'test@example.com'
  password = 'secret123'
} | ConvertTo-Json
$registerResp = Invoke-RestMethod -Uri "$base/register" -Method Post -ContentType 'application/json' -Body $registerBody
$registerResp | ConvertTo-Json -Depth 5
$accessToken = $registerResp.data.accessToken
$refreshToken = $registerResp.data.refreshToken
Write-Host "Access Token: $($accessToken.Substring(0, 30))..." -ForegroundColor Green
Write-Host "Refresh Token: $($refreshToken.Substring(0, 30))..." -ForegroundColor Green

Write-Host "`n=== TEST 2: Register duplicate email (should fail) ===" -ForegroundColor Cyan
try {
  Invoke-RestMethod -Uri "$base/register" -Method Post -ContentType 'application/json' -Body $registerBody | ConvertTo-Json -Depth 5
} catch {
  Write-Host "Expected error: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
}

Write-Host "`n=== TEST 3: Login === " -ForegroundColor Cyan
$loginBody = @{
  email    = 'test@example.com'
  password = 'secret123'
} | ConvertTo-Json
$loginResp = Invoke-RestMethod -Uri "$base/login" -Method Post -ContentType 'application/json' -Body $loginBody
$loginResp | ConvertTo-Json -Depth 5
$accessToken = $loginResp.data.accessToken
$refreshToken = $loginResp.data.refreshToken   # RT1

Write-Host "`n=== TEST 4: Login wrong password (should fail) ===" -ForegroundColor Cyan
$badLoginBody = @{
  email    = 'test@example.com'
  password = 'wrongpassword'
} | ConvertTo-Json
try {
  Invoke-RestMethod -Uri "$base/login" -Method Post -ContentType 'application/json' -Body $badLoginBody | ConvertTo-Json -Depth 5
} catch {
  Write-Host "Expected error: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
}

Write-Host "`n=== TEST 5: Protected route /me with access token ===" -ForegroundColor Cyan
$headers = @{ Authorization = "Bearer $accessToken" }
$meResp = Invoke-RestMethod -Uri "$base/me" -Method Get -Headers $headers
$meResp | ConvertTo-Json -Depth 5

Write-Host "`n=== TEST 6: Protected route /me without token (should fail) ===" -ForegroundColor Cyan
try {
  Invoke-RestMethod -Uri "$base/me" -Method Get | ConvertTo-Json -Depth 5
} catch {
  Write-Host "Expected error: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
}

Write-Host "`n=== TEST 7: Rotate RT1 -> RT2 (rotation works) ===" -ForegroundColor Cyan
$rt1 = $refreshToken
$refreshBody = @{ refreshToken = $rt1 } | ConvertTo-Json
$refreshResp = Invoke-RestMethod -Uri "$base/refresh" -Method Post -ContentType 'application/json' -Body $refreshBody
$refreshResp | ConvertTo-Json -Depth 5
$rt2 = $refreshResp.data.refreshToken
$newAccessToken = $refreshResp.data.accessToken
Write-Host "RT1 is now stale. Got RT2." -ForegroundColor Green

Write-Host "`n=== TEST 8: Rotate RT2 -> RT3 (chain still works, family not revoked) ===" -ForegroundColor Cyan
$refreshBody2 = @{ refreshToken = $rt2 } | ConvertTo-Json
$refreshResp2 = Invoke-RestMethod -Uri "$base/refresh" -Method Post -ContentType 'application/json' -Body $refreshBody2
$refreshResp2 | ConvertTo-Json -Depth 5
$rt3 = $refreshResp2.data.refreshToken
$newAccessToken2 = $refreshResp2.data.accessToken
Write-Host "RT2 is now stale. Got RT3." -ForegroundColor Green

Write-Host "`n=== TEST 9: Reuse stale RT1 (REUSE DETECTED -> family revoked) ===" -ForegroundColor Cyan
$reuseBody = @{ refreshToken = $rt1 } | ConvertTo-Json
try {
  Invoke-RestMethod -Uri "$base/refresh" -Method Post -ContentType 'application/json' -Body $reuseBody | ConvertTo-Json -Depth 5
} catch {
  Write-Host "Expected error: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
  Write-Host 'Reuse detected! The entire token family was revoked.' -ForegroundColor Green
}

Write-Host "`n=== TEST 10: RT3 now fails (family was revoked after reuse detection) ===" -ForegroundColor Cyan
$reuseBody2 = @{ refreshToken = $rt3 } | ConvertTo-Json
try {
  Invoke-RestMethod -Uri "$base/refresh" -Method Post -ContentType 'application/json' -Body $reuseBody2 | ConvertTo-Json -Depth 5
} catch {
  Write-Host "Expected error: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
  Write-Host 'Correct! RT3 belongs to the revoked family.' -ForegroundColor Green
}

Write-Host "`n=== TEST 11: Logout with a fresh token ===" -ForegroundColor Cyan
# Login again to get a fresh token for logout test
$loginResp2 = Invoke-RestMethod -Uri "$base/login" -Method Post -ContentType 'application/json' -Body $loginBody
$freshRT = $loginResp2.data.refreshToken
$logoutBody = @{ refreshToken = $freshRT } | ConvertTo-Json
$logoutResp = Invoke-RestMethod -Uri "$base/logout" -Method Post -ContentType 'application/json' -Body $logoutBody
$logoutResp | ConvertTo-Json -Depth 5

Write-Host "`n=== TEST 12: Use logged-out refresh token (should fail) ===" -ForegroundColor Cyan
try {
  Invoke-RestMethod -Uri "$base/refresh" -Method Post -ContentType 'application/json' -Body $logoutBody | ConvertTo-Json -Depth 5
} catch {
  Write-Host "Expected error: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
}

Write-Host "`n=== ALL TESTS COMPLETE ===" -ForegroundColor Green

