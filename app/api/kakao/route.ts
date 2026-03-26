import { NextRequest, NextResponse, after } from 'next/server';
import { getChatResponse, ChatMessage } from '@/lib/claude';
import { appendConversation, initSheet } from '@/lib/sheets';
import { sendKakaoEscalationAlert } from '@/lib/kakao';
import { notifyChat } from '@/lib/ntfy';
import { sendEscalation, getPendingReply, ackPendingReply, logConversation, sendPatternFeedback } from '@/lib/hub-api';

// ── 카카오 대화 히스토리 (in-memory, best-effort) ──
// Vercel 서버리스: 같은 인스턴스 내에서만 유지. 콜드스타트 시 초기화됨.
const historyMap = new Map<string, { messages: ChatMessage[]; lastTs: number }>();
const HISTORY_TTL = 10 * 60 * 1000; // 10분
const MAX_HISTORY = 6; // 최근 3턴 (user+assistant 쌍)

function getHistory(kakaoId: string): ChatMessage[] {
  const entry = historyMap.get(kakaoId);
  if (!entry) return [];
  if (Date.now() - entry.lastTs > HISTORY_TTL) {
    historyMap.delete(kakaoId);
    return [];
  }
  return entry.messages;
}

function pushHistory(kakaoId: string, userMsg: string, botReply: string) {
  const entry = historyMap.get(kakaoId) || { messages: [], lastTs: 0 };
  entry.messages.push({ role: 'user', content: userMsg });
  entry.messages.push({ role: 'assistant', content: botReply });
  if (entry.messages.length > MAX_HISTORY) {
    entry.messages = entry.messages.slice(-MAX_HISTORY);
  }
  entry.lastTs = Date.now();
  historyMap.set(kakaoId, entry);

  // 오래된 세션 정리 (100개 초과 시)
  if (historyMap.size > 100) {
    const now = Date.now();
    for (const [k, v] of historyMap) {
      if (now - v.lastTs > HISTORY_TTL) historyMap.delete(k);
    }
  }
}

// 카카오채널 챗봇 webhook 엔드포인트
// 카카오 스킬 서버 5초 제한 → 극한 최적화
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userMessage: string = body.userRequest?.utterance || '';
    const kakaoId: string = body.userRequest?.user?.id || crypto.randomUUID();

    if (!userMessage) {
      return NextResponse.json(makeResponse('안녕하세요! 제철삼촌입니다 🍊\n무엇이든 편하게 물어보세요!'));
    }

    if (userMessage.length > 2000) {
      return NextResponse.json(makeResponse('메시지가 너무 깁니다. 2000자 이내로 입력해주세요.'));
    }

    // 이전 대화 히스토리 가져오기
    const history = getHistory(kakaoId);

    // ── 1. 관리자 답변 대기 중인지 확인 + Claude 동시 호출 ──
    const [pendingReply, chatResult] = await Promise.all([
      getPendingReply(kakaoId).catch(() => null),
      getChatResponse(userMessage, history, undefined, { maxTokens: 512, platform: '카카오채널' }),
    ]);

    // 관리자 답변이 있으면 우선 전달 (봇 응답 대신)
    if (pendingReply) {
      const adminReply = pendingReply.reply;
      pushHistory(kakaoId, userMessage, adminReply);
      after(async () => {
        await ackPendingReply(kakaoId);
        try {
          await initSheet();
          await appendConversation({
            platform: '카카오채널', sessionId: kakaoId,
            message: userMessage, reply: `[관리자 답변] ${adminReply}`,
            status: '처리완료', kakaoSent: false,
          });
        } catch {}
      });
      return NextResponse.json(makeResponse(`💬 삼촌이 직접 답변드려요!\n\n${adminReply}`));
    }

    // ── 2. 봇 모드: Claude 응답 사용 ──
    const { reply, escalate, usedPatternIds } = chatResult;

    // 히스토리에 저장
    pushHistory(kakaoId, userMessage, reply);

    // 3. 에스컬레이션 알림은 응답 전에 발송 (Vercel 종료 방지)
    if (escalate) {
      await Promise.all([
        notifyChat({ platform: '카카오채널', message: userMessage, escalated: true }).catch(e => console.error('ntfy 실패:', e)),
        sendKakaoEscalationAlert({ platform: '카카오채널', sessionId: kakaoId, message: userMessage }).catch(e => console.error('카카오 알림 실패:', e)),
        sendEscalation({
          platform: '카카오채널', customer_id: kakaoId,
          customer_name: `카카오 ${kakaoId.slice(0, 8)}`, message: userMessage,
          bot_reply: reply, escalate_reason: '에스컬레이션',
        }).catch(e => console.error('Hub 에스컬레이션 실패:', e)),
      ]);
    }

    // 4. 비핵심 후처리는 after()로 응답 후 실행 (Vercel이 함수를 살려둠)
    after(async () => {
      try {
        await initSheet();
        await appendConversation({
          platform: '카카오채널', sessionId: kakaoId,
          message: userMessage, reply,
          status: escalate ? '카카오전달' : '자동처리완료', kakaoSent: escalate,
        });
        logConversation({
          platform: '카카오채널', customer_id: kakaoId,
          user_message: userMessage, bot_reply: reply,
          was_escalated: escalate, escalate_reason: escalate ? '에스컬레이션' : '',
        }).catch(() => {});
        if (usedPatternIds && usedPatternIds.length > 0) {
          for (const pid of usedPatternIds) {
            sendPatternFeedback(pid, !escalate).catch(() => {});
          }
        }
      } catch (e) { console.error('후처리 오류:', e); }
    });

    return NextResponse.json(makeResponse(reply));

  } catch (error) {
    console.error('카카오 webhook 오류:', error);
    return NextResponse.json(
      makeResponse('일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요 🙏')
    );
  }
}

function makeResponse(text: string) {
  return {
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text } }],
    },
  };
}
