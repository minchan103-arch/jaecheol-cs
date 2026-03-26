import { NextRequest, NextResponse } from 'next/server';
import { getPendingReply, ackPendingReply } from '@/lib/hub-api';

/**
 * 자사몰 채팅 — 관리자 답변 폴링 엔드포인트
 * 에스컬레이션 후 ChatWidget이 3초마다 호출하여 관리자 답변을 실시간 수신
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ has_reply: false });
  }

  try {
    const pending = await getPendingReply(sessionId);
    if (pending) {
      // 답변 소비 처리 (다음 폴링에서 중복 방지)
      await ackPendingReply(sessionId).catch(() => {});
      return NextResponse.json({ has_reply: true, reply: pending.reply });
    }
    return NextResponse.json({ has_reply: false });
  } catch {
    return NextResponse.json({ has_reply: false });
  }
}
