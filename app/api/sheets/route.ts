import { NextResponse } from 'next/server';
import { getConversations } from '@/lib/sheets';

export async function GET() {
  try {
    const rows = await getConversations();
    return NextResponse.json({ rows });
  } catch (error) {
    console.error('Sheets 조회 오류:', error);
    return NextResponse.json({ error: '데이터를 불러올 수 없습니다.' }, { status: 500 });
  }
}
