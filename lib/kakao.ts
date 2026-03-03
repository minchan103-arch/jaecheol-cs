// 카카오 "나에게 보내기" API를 사용한 알림 전송
// Refresh Token으로 Access Token을 매번 갱신 → 장기 운영 가능

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = process.env.KAKAO_REFRESH_TOKEN;
  const clientId = process.env.KAKAO_REST_API_KEY;

  if (!refreshToken || !clientId) return null;

  const res = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    console.error('카카오 토큰 갱신 실패:', await res.text());
    return null;
  }

  const data = await res.json();
  return data.access_token ?? null;
}

export async function sendKakaoEscalationAlert(inquiry: {
  platform: string;
  sessionId: string;
  message: string;
}): Promise<boolean> {
  const accessToken = await refreshAccessToken();
  if (!accessToken) {
    console.warn('카카오톡 미설정: KAKAO_REST_API_KEY / KAKAO_REFRESH_TOKEN 확인 필요');
    return false;
  }

  const platformLabel: Record<string, string> = {
    naver: '네이버 스마트스토어',
    mall: '자사몰',
    infocrm: '인포크',
  };
  const platformName = platformLabel[inquiry.platform] ?? inquiry.platform;

  const text = [
    '🔔 [미답변 문의 알림]',
    '',
    `📍 플랫폼: ${platformName}`,
    `🗂 세션ID: ${inquiry.sessionId.slice(0, 8)}...`,
    '',
    '💬 고객 문의:',
    inquiry.message,
    '',
    '👉 대시보드에서 확인 후 직접 답변해 주세요.',
  ].join('\n');

  const res = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      template_object: JSON.stringify({
        object_type: 'text',
        text,
        link: {
          web_url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
          mobile_web_url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        },
      }),
    }),
  });

  if (!res.ok) {
    console.error('카카오 메시지 전송 실패:', await res.text());
    return false;
  }

  return true;
}
