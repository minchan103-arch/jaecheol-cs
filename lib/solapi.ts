// Solapi 친구톡 (FriendTalk) 발송
// coupang-auto/core/notifications/kakao.py HMAC 패턴 포트

import crypto from 'crypto';

const SOLAPI_BASE = 'https://api.solapi.com';

function getAuthHeader(): Record<string, string> {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  if (!apiKey || !apiSecret) throw new Error('SOLAPI_API_KEY / SOLAPI_API_SECRET 미설정');

  const date = Date.now().toString();
  const salt = crypto.randomUUID().replace(/-/g, '');
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(date + salt)
    .digest('hex');

  return {
    Authorization: `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`,
    'Content-Type': 'application/json',
  };
}

export interface FriendTalkMessage {
  to: string;           // 수신자 전화번호
  content: string;      // 메시지 본문
  buttonTitle?: string;  // 버튼 이름
  buttonUrl?: string;    // 버튼 링크
}

export interface BroadcastResult {
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}

export function personalizeContent(template: string, profile: { nickname?: string }): string {
  return template.replace(/{nickname}/g, profile.nickname || '조카님');
}

export async function sendFriendTalk(messages: FriendTalkMessage[]): Promise<BroadcastResult> {
  const pfId = process.env.SOLAPI_PF_ID;
  const senderKey = process.env.SOLAPI_SENDER_KEY;
  const senderPhone = process.env.SOLAPI_SENDER_PHONE;

  if (!pfId || !senderKey || !senderPhone) {
    return {
      success: false, sent: 0, failed: messages.length,
      errors: ['SOLAPI_PF_ID / SOLAPI_SENDER_KEY / SOLAPI_SENDER_PHONE 미설정'],
    };
  }

  if (messages.length === 0) {
    return { success: true, sent: 0, failed: 0, errors: [] };
  }

  const payload = {
    messages: messages.map(msg => ({
      to: msg.to,
      from: senderPhone,
      kakaoOptions: {
        pfId,
        variables: {},
        buttons: msg.buttonTitle && msg.buttonUrl
          ? [{
            buttonType: 'WL',
            buttonName: msg.buttonTitle,
            linkMo: msg.buttonUrl,
            linkPc: msg.buttonUrl,
          }]
          : undefined,
      },
      text: msg.content,
      type: 'FTM',
    })),
  };

  try {
    const res = await fetch(`${SOLAPI_BASE}/messages/v4/send-many`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('친구톡 발송 실패:', errText);
      return { success: false, sent: 0, failed: messages.length, errors: [errText] };
    }

    const result = await res.json();
    return {
      success: true,
      sent: result.successCount ?? messages.length,
      failed: result.failedCount ?? 0,
      errors: [],
    };
  } catch (error) {
    console.error('친구톡 발송 오류:', error);
    return { success: false, sent: 0, failed: messages.length, errors: [String(error)] };
  }
}
