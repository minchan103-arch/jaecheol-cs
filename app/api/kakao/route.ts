import { NextRequest, NextResponse, after } from 'next/server';
import { getChatResponse, ChatMessage } from '@/lib/claude';
import { appendConversation, initSheet } from '@/lib/sheets';
import { sendKakaoEscalationAlert } from '@/lib/kakao';
import { notifyChat } from '@/lib/ntfy';
import { sendEscalation, logConversation, sendPatternFeedback, syncMessage, checkAdminSession } from '@/lib/hub-api';

// ── 상담원 모드 로컬 잠금 ──
// 에스컬레이션 발생 시 등록, 관리자가 Hub에서 대화 종료할 때만 해제
// Hub API 실패해도 이 Map이 있으면 봇은 절대 AI 답변 안 함
const escalatedUsers = new Map<string, { ts: number; convId?: number }>();

// ── 카카오 대화 히스토리 (in-memory, best-effort) ──
const historyMap = new Map<string, { messages: ChatMessage[]; lastTs: number }>();
const HISTORY_TTL = 10 * 60 * 1000; // 10분
const MAX_HISTORY = 6; // 최근 3턴

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

  if (historyMap.size > 100) {
    const now = Date.now();
    for (const [k, v] of historyMap) {
      if (now - v.lastTs > HISTORY_TTL) historyMap.delete(k);
    }
  }
}

/** 상담원 모드일 때 고객 메시지를 Hub에 동기화 + 로그 기록 */
function logAgentModeMessage(kakaoId: string, userMessage: string, logReply: string, status: '처리완료' | '상담원대기' | '자동처리완료' | '카카오전달') {
  after(async () => {
    try {
      syncMessage({ customer_id: kakaoId, message: userMessage, bot_reply: '' }).catch(() => {});
      await initSheet();
      await appendConversation({
        platform: '카카오채널', sessionId: kakaoId,
        message: userMessage, reply: logReply,
        status, kakaoSent: false,
      });
    } catch {}
  });
}

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

    // ── 1. 상담원 모드 확인 ──
    // 로컬 잠금 OR Hub 상태 확인 → 둘 중 하나라도 상담원 모드면 AI 절대 안 부름
    const isLocalEscalated = escalatedUsers.has(kakaoId);
    const adminSession = await checkAdminSession(kakaoId, userMessage).catch(() => null);

    // Hub에서 명시적으로 active=false (관리자가 종료) → 로컬 잠금 해제
    if (isLocalEscalated && adminSession !== null && !adminSession.active) {
      escalatedUsers.delete(kakaoId);
      // 봇 모드로 복귀 → 아래 Claude 호출로 진행
    }
    // 상담원 모드 진입 조건: 로컬 잠금 있거나, Hub에서 active
    else if (isLocalEscalated || adminSession?.active) {
      // Hub에 상담원 모드인데 로컬 잠금 없으면 복원 (서버 재시작 대비)
      if (!isLocalEscalated && adminSession?.active) {
        escalatedUsers.set(kakaoId, { ts: Date.now(), convId: adminSession.conv_id });
      }

      // 관리자 답변이 있으면 전달
      if (adminSession?.has_reply && adminSession.reply) {
        const adminReply = adminSession.reply;
        logAgentModeMessage(kakaoId, userMessage, `[관리자 답변] ${adminReply}`, '처리완료');
        return NextResponse.json(makeResponse(`💬 ${adminReply}`));
      }

      // 관리자 답변 없음 → 봇은 침묵, 고객 메시지만 Hub에 동기화
      logAgentModeMessage(kakaoId, userMessage, '[상담원 모드 - 봇 침묵]', '상담원대기');
      // 카카오 웹훅은 응답 필수 → 최소한의 안내만 (AI 답변 아님)
      return NextResponse.json(makeResponse('삼촌이 확인 중이에요! 조금만 기다려주세요 🙏'));
    }

    // ── 2. 봇 모드: Claude 호출 ──
    const history = getHistory(kakaoId);
    const chatResult = await getChatResponse(userMessage, history, undefined, { maxTokens: 512, platform: '카카오채널' });
    const { reply, escalate, usedPatternIds } = chatResult;

    pushHistory(kakaoId, userMessage, reply);

    // 3. 에스컬레이션 → 로컬 잠금 + 알림 발송 + Hub 대화 생성
    if (escalate) {
      // ★ 이 순간부터 이 고객은 상담원 모드. 다음 메시지부터 AI 절대 안 부름.
      escalatedUsers.set(kakaoId, { ts: Date.now() });

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

    // 4. 후처리
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
        syncMessage({ customer_id: kakaoId, message: userMessage, bot_reply: reply }).catch(() => {});
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
