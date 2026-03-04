import { NextResponse } from 'next/server';
import { getWeeklyBox } from '@/lib/weekly-box';
import { sendWeeklyBoxAlert } from '@/lib/kakao';

// POST /api/weekly-box/notify → 카카오 입고 알림 발송
export async function POST() {
  try {
    const data = await getWeeklyBox();

    if (!data.items.length) {
      return NextResponse.json({ error: '주간박스에 표시할 과일이 없습니다.' }, { status: 400 });
    }

    const sent = await sendWeeklyBoxAlert(
      data.items.map(item => ({
        name: item.name,
        price: item.price,
        deadline: data.deadline,
        orderUrl: item.orderUrl,
      }))
    );

    return NextResponse.json({ sent, itemCount: data.items.length });
  } catch (error) {
    console.error('주간박스 알림 오류:', error);
    return NextResponse.json({ error: '알림 발송 실패' }, { status: 500 });
  }
}
