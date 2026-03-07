// 조카 프로필 관리 — Google Sheets 웹훅 방식

export interface ProfileRow {
  profileId: string;
  createdAt: string;
  updatedAt: string;
  channel: string;
  kakaoId: string;
  phone: string;
  nickname: string;
  occupation: string;
  ageRange: string;
  purpose: string;
  taste: string;
  notification: string;
  quizResult: string;
  collectionMethod: string;
  sessionIds: string;
  memo: string;
}

function getWebhookUrl() {
  const url = process.env.SHEETS_WEBHOOK_URL;
  if (!url) throw new Error('SHEETS_WEBHOOK_URL 환경변수가 설정되지 않았습니다.');
  return url;
}

export async function findProfile(params: {
  kakaoId?: string;
  phone?: string;
  sessionId?: string;
}): Promise<ProfileRow | null> {
  const url = getWebhookUrl();
  const query = new URLSearchParams({ action: 'findProfile' });
  if (params.kakaoId) query.set('kakaoId', params.kakaoId);
  if (params.phone) query.set('phone', params.phone);
  if (params.sessionId) query.set('sessionId', params.sessionId);

  const res = await fetch(`${url}?${query}`, { cache: 'no-store' });
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.found) return null;
  return data.profile as ProfileRow;
}

export async function saveProfile(data: {
  channel: string;
  kakaoId?: string;
  phone?: string;
  nickname?: string;
  occupation?: string;
  ageRange?: string;
  purpose?: string;
  taste?: string;
  notification?: string;
  quizResult?: string;
  collectionMethod: string;
  sessionIds?: string;
}): Promise<{ profileId: string }> {
  const url = getWebhookUrl();
  const payload = JSON.stringify(data);
  const saveUrl = `${url}?action=appendProfile&data=${encodeURIComponent(payload)}`;

  const res = await fetch(saveUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`프로필 저장 실패: ${res.status}`);

  const result = await res.json();
  return { profileId: result.profileId };
}

export async function updateProfile(
  profileId: string,
  data: Partial<Omit<ProfileRow, 'profileId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const url = getWebhookUrl();
  const payload = JSON.stringify(data);
  const updateUrl = `${url}?action=updateProfile&profileId=${encodeURIComponent(profileId)}&data=${encodeURIComponent(payload)}`;

  const res = await fetch(updateUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`프로필 업데이트 실패: ${res.status}`);
}
