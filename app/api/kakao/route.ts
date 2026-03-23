import { NextRequest, NextResponse } from 'next/server';
import { getChatResponse } from '@/lib/claude';
import { appendConversation, initSheet } from '@/lib/sheets';
import { sendKakaoEscalationAlert } from '@/lib/kakao';
import { findProfile, saveProfile, updateProfile } from '@/lib/profile';
import { notifyChat } from '@/lib/ntfy';

// 카카오채널 챗봇 webhook 엔드포인트
// 카카오 비즈니스 채널 → 스킬 서버 → 이 API
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userMessage: string = body.userRequest?.utterance || '';
    const kakaoId: string = body.userRequest?.user?.id || crypto.randomUUID();

    if (!userMessage) {
      return NextResponse.json(makeResponse('안녕하세요! 제철삼촌입니다 🍊\n무엇이든 편하게 물어보세요!'));
    }

    // 입력 길이 제한 (2000자): 과도한 토큰 소비 및 프롬프트 인젝션 방지
    if (userMessage.length > 2000) {
      return NextResponse.json(makeResponse('메시지가 너무 깁니다. 2000자 이내로 입력해주세요.'));
    }

    // 1. 프로필 조회 (카카오ID 기반)
    const profile = await findProfile({ kakaoId }).catch(() => null);

    // 2. Claude로 답변 생성 (프로필 컨텍스트 포함)
    const { reply, escalate, extractedProfile } = await getChatResponse(
      userMessage, [], { profile, isFirstMessage: !profile }
    );

    // 3. 추출된 프로필 데이터 저장
    if (extractedProfile && Object.keys(extractedProfile).length > 0) {
      try {
        if (profile) {
          await updateProfile(profile.profileId, { ...extractedProfile, kakaoId });
        } else {
          await saveProfile({
            channel: '카카오채널',
            kakaoId,
            collectionMethod: 'chatbot',
            ...extractedProfile,
          });
        }
      } catch (e) {
        console.error('프로필 저장 오류:', e);
      }
    }

    // 4. escalate 시 카카오톡 나에게 보내기 알림
    if (escalate) {
      await sendKakaoEscalationAlert({ platform: '카카오채널', sessionId: kakaoId, message: userMessage })
        .catch(e => console.error('카카오 알림 오류:', e));
    }

    // 5. ntfy 알림 (첫 문의 시)
    if (!profile) {
      notifyChat({ platform: '카카오채널', message: userMessage, escalated: escalate }).catch(() => {});
    }

    // 6. Google Sheets 기록 (await로 완료 보장)
    try {
      await initSheet();
      await appendConversation({
        platform: '카카오채널',
        sessionId: kakaoId,
        message: userMessage,
        reply,
        status: escalate ? '카카오전달' : '자동처리완료',
        kakaoSent: escalate,
      });
    } catch (e) {
      console.error('Sheets 기록 오류:', e);
    }

    // 프로필 없는 첫 유저에게는 quickReplies로 맞춤 추천 안내
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
