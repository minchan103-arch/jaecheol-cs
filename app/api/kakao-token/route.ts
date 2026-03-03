import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const redirectUri = req.nextUrl.searchParams.get('redirect_uri');
  const clientId = process.env.KAKAO_REST_API_KEY;

  if (!code || !redirectUri || !clientId) {
    return NextResponse.json({ error: '파라미터 누락' }, { status: 400 });
  }

  const res = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
    }),
  });

  const data = await res.json();
  return NextResponse.json(data);
}
