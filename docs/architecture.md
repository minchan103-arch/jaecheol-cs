# 시스템 아키텍처

---

## 전체 구조

```
사용자
  │
  ├─── 웹사이트 (/chat) ──────────────── Next.js 프론트
  │         │                                  │
  │         └── POST /api/chat ──────── Next.js API Route
  │                   │                        │
  │                   └── Anthropic SDK ─── Claude API
  │                             │
  │                             └── Google Sheets (로깅, 선택)
  │
  └─── 카카오톡 ──────────────────────── 카카오 i 오픈빌더
            │
            └── POST /api/kakao ──────── Next.js API Route
                      │
                      └── Anthropic SDK ─── Claude API
```

---

## API 엔드포인트

### `POST /api/chat` — 웹 채팅
```typescript
// Request
{ message: string, history: { role: 'user'|'assistant', content: string }[] }

// Response
{ reply: string, escalated: boolean }
```

**에스컬레이션 흐름:**
1. Claude가 `ESCALATE:안녕하세요 조카님...` 형식으로 응답
2. API에서 감지 → `escalated: true` 반환
3. 프론트에서 카카오톡 상담사 연결 버튼 표시

### `POST /api/kakao` — 카카오톡 챗봇
```typescript
// Request (카카오 i 오픈빌더 형식)
{ userRequest: { utterance: string }, ... }

// Response (카카오 simpleText 형식)
{
  version: "2.0",
  template: { outputs: [{ simpleText: { text: string } }] }
}
```

---

## 데이터 흐름

### 웹 채팅 대화 기록
- **저장 위치**: 브라우저 React state (새로고침 시 초기화)
- **로깅**: Google Sheets webhook (선택적, `SHEETS_WEBHOOK_URL` 환경변수)
- **영구 저장**: 미구현 (DB 없음)

### 카카오톡 챗봇
- **대화 기록**: 카카오 i 오픈빌더에서 관리
- **API로 전달**: 단건 메시지만 전달 (이전 대화 기록 없음)

---

## Claude 프롬프트 구조

```
[시스템 프롬프트] lib/cs-prompt.ts
  ├── 브랜드 정보
  ├── 배송 정책
  ├── 손상 대응 정책
  ├── 말투 규칙
  ├── 자동 처리 케이스 목록
  ├── 에스컬레이션 케이스 목록
  └── 응답 형식 (ESCALATE: 접두사 규칙)
```

---

## 환경 변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `ANTHROPIC_API_KEY` | ✅ | Claude API 인증 |
| `SHEETS_WEBHOOK_URL` | ❌ | Google Sheets 로깅 webhook URL |

---

## 미구현 / 개선 포인트

- **대화 기록 영구 저장**: DB(Supabase 등) 연동 시 CS 데이터 분석 가능
- **카카오 에스컬레이션 버튼**: `quickReplies`에 상담사 연결 버튼 추가 가능
- **레이트 리밋**: API 남용 방지 미구현
- **인증**: 채팅 API 공개 상태 (악용 가능성 있음)
