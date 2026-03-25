import { NextRequest, NextResponse } from 'next/server';
import { getChatResponse } from '@/lib/claude';
import { appendConversation, initSheet } from '@/lib/sheets';
import { sendKakaoEscalationAlert } from '@/lib/kakao';
import { notifyChat } from '@/lib/ntfy';
import { sendEscalation, getPendingReply, logConversation, sendPatternFeedback } from '@/lib/hub-api';

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

    // 1. 대기 답변 확인 + Claude 호출 동시 시작 (프로필 조회 생략 → 1~2초 절약)
    const [pendingReply, chatResult] = await Promise.all([
      getPendingReply(kakaoId).catch(() => null),
      getChatResponse(userMessage, [], undefined, { maxTokens: 512, platform: '카카오채널' }),
    ]);

    // 2. 관리자 답변이 있으면 우선 전달
    if (pendingReply) {
      return NextResponse.json(makeResponse(`💬 삼촌이 직접 답변드려요!\n\n${pendingReply}`));
    }

    const { reply, escalate, usedPatternIds } = chatResult;

    // 3. 후처리 fire-and-forget
    (async () => {
      try {
        if (escalate) {
          Promise.all([
            sendKakaoEscalationAlert({ platform: '카카오채널', sessionId: kakaoId, message: userMessage }).catch(() => {}),
            sendEscalation({
              platform: '카카오채널', customer_id: kakaoId,
              customer_name: `카카오 ${kakaoId.slice(0, 8)}`, message: userMessage,
              bot_reply: reply, escalate_reason: '에스컬레이션',
            }).catch(() => {}),
          ]).catch(() => {});
        }
        // ntfy 알림은 에스컬레이션 시에만 (자동처리는 알림 불필요)
        if (escalate) {
          notifyChat({ platform: '카카오채널', message: userMessage, escalated: true }).catch(() => {});
        }
        await initSheet();
        await appendConversation({
          platform: '카카오채널', sessionId: kakaoId,
          message: userMessage, reply,
          status: escalate ? '카카오전달' : '자동처리완료', kakaoSent: escalate,
        });
        // Hub 학습 로그 + 패턴 피드백
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
    })();

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
