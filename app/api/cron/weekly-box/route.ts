import { NextRequest, NextResponse } from 'next/server';
import { getWeeklyBox, getStockStatus } from '@/lib/weekly-box';
import { sendWeeklyBoxAlert } from '@/lib/kakao';
import { sendFriendTalk, FriendTalkMessage, personalizeContent } from '@/lib/solapi';

// Vercel Cron: 매주 월요일 09:00 KST (일요일 24:00 UTC)
// GET /api/cron/weekly-box
export async function GET(req: NextRequest) {
  // Vercel Cron 인증
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await getWeeklyBox();
    if (!data.items.length) {
      return NextResponse.json({ message: '주간박스 비어있음 — 알림 생략' });
    }

    // 1. 관리자 알림
    await sendWeeklyBoxAlert(
      data.items.map(item => ({
        name: item.name,
        price: item.price,
        deadline: data.deadline,
        orderUrl: item.orderUrl,
      }))
    ).catch(e => console.error('관리자 알림 실패:', e));

    // 2. 구독자 친구톡
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

    let broadcastResult = null;
    const webhookUrl = process.env.SHEETS_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const res = await fetch(`${webhookUrl}?action=readProfiles`, { cache: 'no-store' });
        const profilesData = await res.json();
        const profiles = profilesData.profiles ?? [];

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
      } catch (e) {
        console.error('친구톡 발송 오류:', e);
      }
    }

    return NextResponse.json({
      message: '주간박스 알림 완료',
      itemCount: data.items.length,
      broadcast: broadcastResult,
    });
  } catch (error) {
    console.error('Cron 주간박스 오류:', error);
    return NextResponse.json({ error: '처리 실패' }, { status: 500 });
  }
}
