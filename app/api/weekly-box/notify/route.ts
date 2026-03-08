import { NextRequest, NextResponse } from 'next/server';
import { getWeeklyBox, getStockStatus } from '@/lib/weekly-box';
import { sendWeeklyBoxAlert } from '@/lib/kakao';
import { sendFriendTalk, FriendTalkMessage, personalizeContent } from '@/lib/solapi';

// 전체 프로필 조회 (친구톡 발송용)
async function getAllProfiles() {
  const url = process.env.SHEETS_WEBHOOK_URL;
  if (!url) return [];
  try {
    const res = await fetch(`${url}?action=readProfiles`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.profiles ?? [];
  } catch {
    return [];
  }
}

// POST /api/weekly-box/notify?broadcast=true
export async function POST(req: NextRequest) {
  try {
    const data = await getWeeklyBox();

    if (!data.items.length) {
      return NextResponse.json({ error: '주간박스에 표시할 과일이 없습니다.' }, { status: 400 });
    }

    // 1. 관리자 본인에게 알림 (기존 동작)
    const adminSent = await sendWeeklyBoxAlert(
      data.items.map(item => ({
        name: item.name,
        price: item.price,
        deadline: data.deadline,
        orderUrl: item.orderUrl,
      }))
    );

    // 2. broadcast=true 시 구독자에게 친구톡 발송
    const { searchParams } = new URL(req.url);
    const doBroadcast = searchParams.get('broadcast') === 'true';
    let broadcastResult = null;

    if (doBroadcast) {
      const closingItems = data.items.filter(i => getStockStatus(i) === 'closing');
      const itemLines = data.items
        .filter(i => getStockStatus(i) !== 'soldout')
        .map(i => {
          const badge = getStockStatus(i) === 'closing' ? ' (마감임박!)' : '';
          return `${i.name} — ${i.price}${badge}`;
        })
        .join('\n');

      let template = `[제철삼촌 이번 주 박스]\n\n${itemLines}\n\n`;
      if (closingItems.length > 0) {
        template += `${closingItems.map(i => i.name).join(', ')} 서두르세요!\n`;
      }
      template += `마감: ${data.deadline}`;

      const profiles = await getAllProfiles();
      const targets = profiles.filter((p: Record<string, string>) =>
        p.phone && p.notification !== '괜찮아요' && p.notification !== '거부'
      );

      if (targets.length > 0) {
        const orderUrl = data.items[0]?.orderUrl || 'https://jaecheol.com/all';
        const messages: FriendTalkMessage[] = targets.map((p: Record<string, string>) => ({
          to: p.phone,
          content: personalizeContent(template, { nickname: p.nickname }),
          buttonTitle: '예약하러 가기',
          buttonUrl: orderUrl,
        }));
        broadcastResult = await sendFriendTalk(messages);
      }
    }

    return NextResponse.json({
      adminSent,
      itemCount: data.items.length,
      broadcast: broadcastResult,
    });
  } catch (error) {
    console.error('주간박스 알림 오류:', error);
    return NextResponse.json({ error: '알림 발송 실패' }, { status: 500 });
  }
}
