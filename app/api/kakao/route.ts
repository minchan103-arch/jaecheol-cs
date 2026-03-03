import { NextRequest, NextResponse } from 'next/server';
import { getChatResponse } from '@/lib/claude';
import { appendConversation, initSheet } from '@/lib/sheets';
import { sendKakaoEscalationAlert } from '@/lib/kakao';

// 카카오채널 챗봇 webhook 엔드포인트
// 카카오 비즈니스 채널 → 스킬 서버 → 이 API
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userMessage: string = body.userRequest?.utterance || '';
    const sessionId: string = body.userRequest?.user?.id || crypto.randomUUID();

    if (!userMessage) {
      return NextResponse.json(makeResponse('안녕하세요! 제철삼촌입니다 🍊\n무엇이든 편하게 물어보세요!'));
    }

    // 1. Claude로 답변 생성
    const { reply, escalate } = await getChatResponse(userMessage);

    // 2. escalate 시 카카오톡 나에게 보내기 알림
    if (escalate) {
      await sendKakaoEscalationAlert({ platform: '카카오채널', sessionId, message: userMessage })
        .catch(e => console.error('카카오 알림 오류:', e));
    }

    // 3. Google Sheets 기록 (await로 완료 보장)
    try {
      await initSheet();
      await appendConversation({
        platform: '카카오채널',
        sessionId,
        message: userMessage,
        reply,
        status: escalate ? '카카오전달' : '자동처리완료',
        kakaoSent: escalate,
      });
    } catch (e) {
      console.error('Sheets 기록 오류:', e);
    }

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
