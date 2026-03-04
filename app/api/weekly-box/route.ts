import { NextResponse } from 'next/server';
import { getWeeklyBox } from '@/lib/weekly-box';

export async function GET() {
  try {
    const data = await getWeeklyBox();
    return NextResponse.json(data);
  } catch (error) {
    console.error('주간박스 조회 오류:', error);
    return NextResponse.json(
      { error: '주간박스 데이터를 불러올 수 없습니다.' },
      { status: 500 }
    );
  }
}
