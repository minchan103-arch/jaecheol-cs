// Google Apps Script Webhook 방식
// googleapis 패키지, 서비스 계정, Cloud Console 전부 필요 없음
// google-apps-script/Code.gs 파일을 스프레드시트에 붙여넣고 웹앱으로 배포 후
// SHEETS_WEBHOOK_URL에 URL을 입력하면 됩니다.

export interface ConversationRow {
  num: string;
  timestamp: string;
  platform: string;
  sessionId: string;
  message: string;
  reply: string;
  status: string;
  kakaoSent: boolean;
  memo: string;
}

function getWebhookUrl() {
  const url = process.env.SHEETS_WEBHOOK_URL;
  if (!url) throw new Error('SHEETS_WEBHOOK_URL 환경변수가 설정되지 않았습니다.');
  return url;
}

export async function initSheet() {
  return; // no-op
}

export async function appendConversation(data: {
  platform: string;
  sessionId: string;
  message: string;
  reply: string;
  status: '자동처리완료' | '카카오전달' | '처리완료';
  kakaoSent: boolean;
}) {
  const url = getWebhookUrl();
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  const payload = JSON.stringify({
    timestamp: now,
    platform: data.platform,
    sessionId: data.sessionId,
    message: data.message,
    reply: data.reply,
    status: data.status,
    kakaoSent: data.kakaoSent ? 'Y' : 'N',
  });

  // POST redirect 이슈 우회: GET 요청으로 데이터 전송
  // Apps Script는 POST를 실행 전에 리다이렉트해서 doPost가 호출되지 않음
  const appendUrl = `${url}?action=append&data=${encodeURIComponent(payload)}`;
  const res = await fetch(appendUrl, { cache: 'no-store' });

  if (!res.ok) {
    throw new Error(`Sheets 기록 실패: ${res.status}`);
  }
}

export async function getConversations(): Promise<ConversationRow[]> {
  const url = getWebhookUrl();

  const res = await fetch(`${url}?action=read`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Sheets 조회 실패: ${res.status}`);
  }

  const data = await res.json();
  return (data.rows ?? []) as ConversationRow[];
}
