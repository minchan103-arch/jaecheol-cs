import { NextRequest, NextResponse } from 'next/server';
import { getChatResponse, ChatMessage } from '@/lib/claude';
import { appendConversation, initSheet } from '@/lib/sheets';
import { sendKakaoEscalationAlert } from '@/lib/kakao';

// --- IP 기반 Rate Limiter (슬라이딩 윈도우) ---
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1분
const RATE_LIMIT_MAX_REQUESTS = 20;     // 윈도우당 최대 요청 수

const ipRequestMap = new Map<string, number[]>();

// 5분마다 오래된 항목 정리 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of ipRequestMap.entries()) {
    const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (valid.length === 0) {
      ipRequestMap.delete(ip);
    } else {
      ipRequestMap.set(ip, valid);
    }
  }
}, 5 * 60 * 1000);

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = ipRequestMap.get(ip) || [];

  // 윈도우 밖의 오래된 타임스탬프 제거
  const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (valid.length >= RATE_LIMIT_MAX_REQUESTS) {
    ipRequestMap.set(ip, valid);
    return true;
  }

  valid.push(now);
  ipRequestMap.set(ip, valid);
  return false;
}
// --- Rate Limiter 끝 ---

export async function POST(req: NextRequest) {
  // Rate limit 체크
  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp)) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 1분 후 다시 시도해 주세요.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const {
      message,
      platform = '자사몰',
      sessionId = crypto.randomUUID(),
      history = [] as ChatMessage[],
    } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: '메시지를 입력해주세요.' }, { status: 400 });
    }

    // 1. Claude로 답변 생성
    const { reply, escalate } = await getChatResponse(message, history);

    // 2. escalate 시 카카오톡 나에게 보내기 알림
    let kakaoSent = false;
    if (escalate) {
      kakaoSent = await sendKakaoEscalationAlert({ platform, sessionId, message })
        .catch(() => false);
    }

    // 3. Google Sheets 기록 (await로 완료 보장, 실패해도 응답은 정상 반환)
    try {
      await initSheet();
      await appendConversation({
        platform,
        sessionId,
        message,
        reply,
        status: escalate ? '카카오전달' : '자동처리완료',
        kakaoSent,
      });
    } catch (e) {
      console.error('Sheets 기록 오류:', e);
    }

    return NextResponse.json({ reply, escalated: escalate, sessionId });

  } catch (error) {
    console.error('채팅 API 오류:', error);
    return NextResponse.json(
      { reply: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요 🙏', escalated: false },
      { status: 500 }
    );
  }
}
