import { NextRequest, NextResponse } from 'next/server';
import { sendFriendTalk, personalizeContent, FriendTalkMessage } from '@/lib/solapi';

// 전체 프로필 조회
async function getAllProfiles() {
  const url = process.env.SHEETS_WEBHOOK_URL;
  if (!url) throw new Error('SHEETS_WEBHOOK_URL 미설정');
  const res = await fetch(`${url}?action=readProfiles`, { cache: 'no-store' });
  if (!res.ok) throw new Error('프로필 조회 실패');
  const data = await res.json();
  return data.profiles ?? [];
}

// POST /api/broadcast
// Body: { content, buttonTitle?, buttonUrl?, segment?: { purpose?, taste? } }
// Header: x-admin-secret
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('x-admin-secret');
  if (!process.env.BROADCAST_ADMIN_SECRET || authHeader !== process.env.BROADCAST_ADMIN_SECRET) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { content, buttonTitle, buttonUrl, segment } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: '메시지 내용이 필요합니다.' }, { status: 400 });
    }

    // 1. 프로필 전체 조회
    const profiles = await getAllProfiles();

    // 2. 전화번호 있고 알림 거부 안 한 조카님 필터
    let targets = profiles.filter((p: Record<string, string>) => {
      if (!p.phone) return false;
      if (p.notification === '괜찮아요' || p.notification === '거부') return false;
      return true;
    });

    // 3. 세그먼트 필터
    if (segment) {
      if (segment.purpose) {
        targets = targets.filter((p: Record<string, string>) =>
          p.purpose?.includes(segment.purpose)
        );
      }
      if (segment.taste) {
        targets = targets.filter((p: Record<string, string>) =>
          p.taste?.includes(segment.taste)
        );
      }
    }

    if (targets.length === 0) {
      return NextResponse.json({
        error: '발송 대상이 없습니다.',
        totalProfiles: profiles.length,
      }, { status: 400 });
    }

    // 4. 메시지 생성 (닉네임 개인화)
    const messages: FriendTalkMessage[] = targets.map((p: Record<string, string>) => ({
      to: p.phone,
      content: personalizeContent(content, { nickname: p.nickname }),
      buttonTitle,
      buttonUrl,
    }));

    // 5. Solapi 발송
    const result = await sendFriendTalk(messages);

    return NextResponse.json({
      ...result,
      totalTargets: targets.length,
      totalProfiles: profiles.length,
    });
  } catch (error) {
    console.error('브로드캐스트 오류:', error);
    return NextResponse.json({ error: '발송 실패' }, { status: 500 });
  }
}
