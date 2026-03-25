import { NextRequest, NextResponse } from 'next/server';
import { getChatResponse } from '@/lib/claude';
import { appendConversation, initSheet } from '@/lib/sheets';
import { sendKakaoEscalationAlert } from '@/lib/kakao';
import { findProfile, saveProfile, updateProfile } from '@/lib/profile';
import { notifyChat } from '@/lib/ntfy';
import { sendEscalation, getPendingReply } from '@/lib/hub-api';

// 카카오채널 챗봇 webhook 엔드포인트
// 카카오 스킬 서버 5초 제한 → 모든 비핵심 작업은 fire-and-forget
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

    // 1. 프로필 + 대기 답변 동시 조회 (병렬)
    const [profile, pendingReply] = await Promise.all([
      findProfile({ kakaoId }).catch(() => null),
      getPendingReply(kakaoId).catch(() => null),
    ]);

    // 2. 대기 중인 관리자 답변이 있으면 바로 전달 (Claude 호출 생략 → 초고속)
    if (pendingReply) {
      return NextResponse.json(makeResponse(`💬 삼촌이 직접 답변드려요!\n\n${pendingReply}`));
    }

    // 3. Claude로 답변 생성
    const { reply, escalate, extractedProfile } = await getChatResponse(
      userMessage, [], { profile, isFirstMessage: !profile }
    );

    // 4. 후처리는 전부 fire-and-forget (응답 속도에 영향 없음)
    const afterWork = async () => {
      // 프로필 저장
      if (extractedProfile && Object.keys(extractedProfile).length > 0) {
        try {
          if (profile) {
            await updateProfile(profile.profileId, { ...extractedProfile, kakaoId });
          } else {
            await saveProfile({ channel: '카카오채널', kakaoId, collectionMethod: 'chatbot', ...extractedProfile });
          }
        } catch (e) { console.error('프로필 저장 오류:', e); }
      }

      // 에스컬레이션
      if (escalate) {
        Promise.all([
          sendKakaoEscalationAlert({ platform: '카카오채널', sessionId: kakaoId, message: userMessage }).catch(() => {}),
          sendEscalation({
            platform: '카카오채널', customer_id: kakaoId,
            customer_name: profile?.nickname || '', message: userMessage,
            bot_reply: reply, escalate_reason: '에스컬레이션',
          }).catch(() => {}),
        ]).catch(() => {});
      }

      // ntfy
      if (!profile) {
        notifyChat({ platform: '카카오채널', message: userMessage, escalated: escalate }).catch(() => {});
      }

      // Sheets 기록
      try {
        await initSheet();
        await appendConversation({
          platform: '카카오채널', sessionId: kakaoId,
          message: userMessage, reply,
          status: escalate ? '카카오전달' : '자동처리완료', kakaoSent: escalate,
        });
      } catch (e) { console.error('Sheets 기록 오류:', e); }
    };

    // fire-and-forget: 응답 먼저 보내고 후처리
    afterWork().catch(e => console.error('후처리 오류:', e));

    // 5. 즉시 응답
    if (!profile) {
      return NextResponse.json(makeResponseWithQuickReplies(reply, [
        { label: '🍊 맞춤 추천 받기', message: '맞춤 추천 해주세요' },
        { label: '📦 이번 주 박스', message: '이번 주 뭐 있어요?' },
      ]));
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

function makeResponseWithQuickReplies(
  text: string,
  quickReplies: Array<{ label: string; message: string }>
) {
  return {
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text } }],
      quickReplies: quickReplies.map(qr => ({
        action: 'message',
        label: qr.label,
        messageText: qr.message,
      })),
    },
  };
}
