# jaecheol-cs — 제철삼촌 고객 서비스 프로젝트

> 이 파일은 Claude Code가 자동으로 읽는 프로젝트 컨텍스트 파일입니다.
> 새 대화를 시작해도 이 파일을 통해 바로 맥락 파악이 가능합니다.

---

## 프로젝트 개요

**제철삼촌** 브랜드의 고객 서비스(CS) 웹앱.
- 웹사이트 AI 채팅 (Claude API 기반)
- 카카오톡 챗봇 webhook
- 과일 취향 추천 퀴즈
를 제공하는 Next.js 앱.

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS v4 |
| AI | Anthropic SDK (`@anthropic-ai/sdk ^0.78`) — claude-sonnet-4-6 |
| 폰트 | Geist Sans / Geist Mono (next/font/google) |
| 배포 | 미정 (Vercel 상정) |

---

## 디렉토리 구조

```
jaecheol-cs/
├── app/
│   ├── globals.css          # Tailwind v4 + CSS 변수 (라이트/다크)
│   ├── layout.tsx           # 루트 레이아웃, 폰트 설정
│   ├── page.tsx             # 홈 (Next.js 기본 템플릿 수준)
│   ├── chat/
│   │   └── page.tsx         # 웹사이트 AI 채팅 UI (카카오톡 스타일)
│   ├── quiz/
│   │   └── page.tsx         # 과일 취향 추천 퀴즈 (5문항, 8종 과일)
│   └── api/
│       ├── chat/route.ts    # 웹 채팅 API (Claude + Google Sheets 로깅)
│       └── kakao/route.ts   # 카카오톡 챗봇 webhook (카카오 i 오픈빌더 형식)
├── lib/
│   └── cs-prompt.ts         # Claude 시스템 프롬프트 (CS 정책 포함)
├── docs/
│   ├── progress.md          # 작업 진행 로그
│   ├── decisions.md         # 주요 의사결정 기록
│   └── architecture.md      # 시스템 구조 상세
├── scripts/
│   └── sync-docs.ps1        # 자동 문서 동기화 스크립트 (Task Scheduler용)
└── CLAUDE.md                # ← 이 파일
```

---

## 핵심 기능 설명

### 1. 웹 AI 채팅 (`/chat`)
- 카카오톡 UI를 모방한 채팅 인터페이스
- 빠른 선택 버튼 (배송 문의, 상품/원산지, 교환/반품, 선물/단체주문, 기타)
- iOS 키보드 대응 (`visualViewport` resize 이벤트)
- 에스컬레이션 감지: Claude가 `ESCALATE:` 접두사로 응답하면 상담사 연결 버튼 표시
- 대화 기록을 Google Sheets에 fire-and-forget 로깅 (`SHEETS_WEBHOOK_URL`)

### 2. 카카오톡 챗봇 (`/api/kakao`)
- 카카오 i 오픈빌더 webhook 형식
- `userRequest.utterance`를 받아 Claude로 처리
- 에스컬레이션은 로그만 남기고 고객 메시지는 정상 전달

### 3. 과일 취향 퀴즈 (`/quiz`)
- 5문항 → 8종 과일 중 1개 추천
- 점수 누적 방식 (각 선택지가 과일별 점수 보유)
- 결과 페이지: 과일 이미지, 추천 이유, 구매 링크, 공유 버튼

---

## CS 정책 요약 (`lib/cs-prompt.ts`)

- 고객 호칭: **조카님** (고객님 금지)
- 손상 대응: 경미(1~2개) → 동봉 / 중간(3개+) → 절반 재발송 / 심각(절반+) → 전량 재발송 or 환불
- 자동 처리: 배송/상품/교환/반품/보관법 등 8개 케이스
- 에스컬레이션: 환불 직접 요청, 강한 불만, 법적 언급 등

---

## 환경 변수

```
ANTHROPIC_API_KEY=        # Claude API 키 (필수)
SHEETS_WEBHOOK_URL=       # Google Sheets 로깅 webhook (선택)
```

---

## 현재 상태

- [x] 웹 채팅 UI 완성
- [x] 카카오톡 챗봇 webhook 완성
- [x] 과일 취향 퀴즈 완성
- [ ] 홈페이지(`page.tsx`) 커스텀 미완성 (Next.js 기본 템플릿)
- [ ] 카카오 채널 URL 실제 값으로 교체 필요 (`KAKAO_URL` in chat/page.tsx)
- [ ] 과일 이미지 파일 추가 필요 (`public/images/*.jpg`)
- [ ] 배포 환경 미정

---

## 작업 지속 방법

```bash
cd "c:\Users\a9m01\OneDrive\Desktop\주방\jaecheol-cs"
npm run dev    # 개발 서버 시작 (localhost:3000)
```

주요 작업 파일:
- CS 정책 수정 → `lib/cs-prompt.ts`
- 채팅 UI 수정 → `app/chat/page.tsx`
- 퀴즈 수정 → `app/quiz/page.tsx`
- API 로직 수정 → `app/api/chat/route.ts`, `app/api/kakao/route.ts`

---

*마지막 업데이트: 2026-03-03*
*자동 동기화: scripts/sync-docs.ps1 (매일 오전 9시)*
