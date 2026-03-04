# sync-docs.ps1
# jaecheol-cs 프로젝트 문서 자동 동기화 스크립트
# Task Scheduler에 등록해서 매일 정해진 시간에 실행하세요.
#
# 사용법:
#   .\scripts\sync-docs.ps1              # 일반 실행
#   .\scripts\sync-docs.ps1 -Setup       # Task Scheduler에 등록
#   .\scripts\sync-docs.ps1 -Remove      # Task Scheduler에서 제거

param(
    [switch]$Setup,
    [switch]$Remove,
    [string]$Time = "09:00"   # 매일 실행 시간 (기본: 오전 9시)
)

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$TaskName = "jaecheol-cs-sync-docs"

# ── Task Scheduler 등록 ──────────────────────────────────────────────────────
if ($Setup) {
    $ScriptPath = Join-Path $ProjectRoot "scripts\sync-docs.ps1"
    $Action = New-ScheduledTaskAction `
        -Execute "powershell.exe" `
        -Argument "-NonInteractive -ExecutionPolicy Bypass -File `"$ScriptPath`""
    $Trigger = New-ScheduledTaskTrigger -Daily -At $Time
    $Settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $Action `
        -Trigger $Trigger `
        -Settings $Settings `
        -Description "jaecheol-cs 프로젝트 문서 자동 동기화 (매일 $Time)" `
        -RunLevel Highest `
        -Force | Out-Null

    Write-Host "[OK] Task Scheduler 등록 완료: 매일 $Time 에 자동 실행됩니다." -ForegroundColor Green
    Write-Host "     작업 이름: $TaskName"
    exit 0
}

# ── Task Scheduler 제거 ──────────────────────────────────────────────────────
if ($Remove) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "[OK] Task Scheduler 등록 해제 완료." -ForegroundColor Yellow
    exit 0
}

# ── 동기화 실행 ──────────────────────────────────────────────────────────────
$Now = Get-Date -Format "yyyy-MM-dd HH:mm"
$NowDate = Get-Date -Format "yyyy-MM-dd"
Write-Host "[$Now] jaecheol-cs 문서 동기화 시작..." -ForegroundColor Cyan

# 1. 최근 수정된 파일 목록 (node_modules, .next 제외)
$RecentFiles = Get-ChildItem -Path $ProjectRoot -Recurse -File |
    Where-Object {
        $_.FullName -notmatch "node_modules" -and
        $_.FullName -notmatch "\.next" -and
        $_.FullName -notmatch "\.git"
    } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 10

# 2. 소스 파일 수 집계
$TsxCount = (Get-ChildItem -Path $ProjectRoot -Recurse -Filter "*.tsx" |
    Where-Object { $_.FullName -notmatch "node_modules" }).Count
$TsCount = (Get-ChildItem -Path $ProjectRoot -Recurse -Filter "*.ts" |
    Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "\.d\.ts" }).Count

# 3. progress.md 의 AUTO-SYNC 섹션 업데이트
$ProgressFile = Join-Path $ProjectRoot "docs\progress.md"
if (Test-Path $ProgressFile) {
    $Content = Get-Content $ProgressFile -Raw -Encoding UTF8

    $RecentList = ($RecentFiles | ForEach-Object {
        $RelPath = $_.FullName.Replace($ProjectRoot + "\", "").Replace("\", "/")
        $Modified = $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm")
        "- ``$RelPath`` — $Modified"
    }) -join "`n"

    $NewBlock = @"
<!-- AUTO-SYNC-START -->
*마지막 자동 동기화: $Now*

**소스 파일 현황:** TSX $TsxCount 개 / TS $TsCount 개

**최근 수정 파일 (상위 10개):**
$RecentList
<!-- AUTO-SYNC-END -->
"@

    # AUTO-SYNC 블록 교체
    $Updated = $Content -replace '(?s)<!-- AUTO-SYNC-START -->.*?<!-- AUTO-SYNC-END -->', $NewBlock
    [System.IO.File]::WriteAllText($ProgressFile, $Updated, [System.Text.Encoding]::UTF8)
    Write-Host "  [OK] docs/progress.md 업데이트" -ForegroundColor Green
}

# 4. CLAUDE.md 의 마지막 업데이트 날짜 갱신
$ClaudeFile = Join-Path $ProjectRoot "CLAUDE.md"
if (Test-Path $ClaudeFile) {
    $ClaudeContent = Get-Content $ClaudeFile -Raw -Encoding UTF8
    $ClaudeUpdated = $ClaudeContent -replace '\*마지막 업데이트: \d{4}-\d{2}-\d{2}\*', "*마지막 업데이트: $NowDate*"
    [System.IO.File]::WriteAllText($ClaudeFile, $ClaudeUpdated, [System.Text.Encoding]::UTF8)
    Write-Host "  [OK] CLAUDE.md 날짜 갱신" -ForegroundColor Green
}

Write-Host "[$Now] 동기화 완료!" -ForegroundColor Cyan
