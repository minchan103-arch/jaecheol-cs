import { NextRequest, NextResponse } from 'next/server';
import { getConversations, updateRowStatus } from '@/lib/sheets';

export async function GET() {
  try {
    const rows = await getConversations();
    return NextResponse.json({ rows });
  } catch (error) {
    console.error('Sheets 조회 오류:', error);
    return NextResponse.json({ error: '데이터를 불러올 수 없습니다.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { row, status } = await req.json();
    await updateRowStatus(String(row), status);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Sheets 상태 업데이트 오류:', error);
    return NextResponse.json({ error: '상태 업데이트 실패' }, { status: 500 });
  }
}
