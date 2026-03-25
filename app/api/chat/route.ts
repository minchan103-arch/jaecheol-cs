import { NextRequest, NextResponse } from 'next/server';
import { getChatResponse, ChatMessage } from '@/lib/claude';
import { appendConversation, initSheet } from '@/lib/sheets';
import { sendKakaoEscalationAlert } from '@/lib/kakao';
import { findProfile, saveProfile, updateProfile } from '@/lib/profile';
import { notifyChat } from '@/lib/ntfy';
import { sendEscalation, getPendingReply } from '@/lib/hub-api';

// --- IP 기반 Rate Limiter (슬라이딩 윈도우) ---
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1분
const RATE_LIMIT_MAX_REQUESTS = 20;     // 윈도우당 최대 요청 수
const RATE_LIMIT_MAX_IPS = 10_000;      // 메모리 누수 방지: 최대 IP 추적 수

const ipRequestMap = new Map<string, number[]>();

// 2분마다 오래된 항목 정리 (메모리 누수 방지 — 공격적 클린업)
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
}, 2 * 60 * 1000);

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

  // 메모리 보호: 추적 IP 수가 한계를 넘으면 가장 오래된 항목부터 제거
  if (!ipRequestMap.has(ip) && ipRequestMap.size >= RATE_LIMIT_MAX_IPS) {
    const oldestKey = ipRequestMap.keys().next().value;
    if (oldestKey) ipRequestMap.delete(oldestKey);
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

    // 입력 길이 제한 (2000자): 과도한 토큰 소비 및 프롬프트 인젝션 방지
    if (message.length > 2000) {
      return NextResponse.json(
        { error: '메시지가 너무 깁니다. 2000자 이내로 입력해주세요.' },
        { status: 400 }
      );
    }

    // 1. 프로필 조회
    const profile = await findProfile({ sessionId }).catch(() => null);
    const isFirstMessage = history.length === 0;

    // 2. 대기 중인 관리자 답변 확인
    const pendingReply = await getPendingReply(sessionId);

    // 3. Claude로 답변 생성 (프로필 컨텍스트 포함)
    const { reply, escalate, extractedProfile } = await getChatResponse(
      message, history, { profile, isFirstMessage }
    );

    // 관리자 답변이 있으면 앞에 추가
    const finalReply = pendingReply
      ? `💬 삼촌이 직접 답변드려요!\n\n${pendingReply}\n\n---\n\n${reply}`
      : reply;

    // 3. 추출된 프로필 데이터 저장
    if (extractedProfile && Object.keys(extractedProfile).length > 0) {
      try {
        if (profile) {
          await updateProfile(profile.profileId, { ...extractedProfile, sessionIds: sessionId });
        } else {
          await saveProfile({
            channel: platform,
            sessionIds: sessionId,
            collectionMethod: 'chatbot',
            ...extractedProfile,
          });
        }
      } catch (e) {
        console.error('프로필 저장 오류:', e);
      }
    }

    // 4. escalate 시 카카오톡 나에게 보내기 알림 + Hub 인박스 전송
    let kakaoSent = false;
    if (escalate) {
      const [sent] = await Promise.all([
        sendKakaoEscalationAlert({ platform, sessionId, message }).catch(() => false),
        sendEscalation({
          platform,
          customer_id: sessionId,
          customer_name: profile?.nickname || '',
          message,
          bot_reply: reply,
          escalate_reason: '에스컬레이션',
        }).catch(e => console.error('Hub 에스컬레이션 오류:', e)),
      ]);
      kakaoSent = sent as boolean;
    }

    // 5. ntfy 알림 — 에스컬레이션 시에만 (자동처리는 알림 불필요)
    if (escalate) {
      notifyChat({ platform, message, escalated: true }).catch(() => {});
    }

    // 6. Google Sheets 기록 (await로 완료 보장, 실패해도 응답은 정상 반환)
    try {
      await initSheet();
      await appendConversation({
        platform,
        sessionId,
        message,
        reply: finalReply,
        status: escalate ? '카카오전달' : '자동처리완료',
        kakaoSent,
      });
    } catch (e) {
      console.error('Sheets 기록 오류:', e);
    }

    return NextResponse.json({ reply: finalReply, escalated: escalate, sessionId });

  } catch (error) {
    console.error('채팅 API 오류:', error);
    return NextResponse.json(
      { reply: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요 🙏', escalated: false },
      { status: 500 }
    );
  }
}
