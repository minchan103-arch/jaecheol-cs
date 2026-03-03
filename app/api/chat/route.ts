import { NextRequest, NextResponse } from 'next/server';
import { getChatResponse, ChatMessage } from '@/lib/claude';
import { appendConversation, initSheet } from '@/lib/sheets';
import { sendKakaoEscalationAlert } from '@/lib/kakao';

export async function POST(req: NextRequest) {
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
