import { NextRequest, NextResponse } from 'next/server';
import { findProfile, saveProfile, updateProfile } from '@/lib/profile';

// GET — 프로필 조회 (?kakaoId= OR ?sessionId= OR ?phone=)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const kakaoId = searchParams.get('kakaoId') || undefined;
  const sessionId = searchParams.get('sessionId') || undefined;
  const phone = searchParams.get('phone') || undefined;

  if (!kakaoId && !sessionId && !phone) {
    return NextResponse.json({ error: '검색 조건을 입력해주세요.' }, { status: 400 });
  }

  try {
    const profile = await findProfile({ kakaoId, sessionId, phone });
    if (!profile) {
      return NextResponse.json({ found: false });
    }
    return NextResponse.json({ found: true, profile });
  } catch (error) {
    console.error('프로필 조회 오류:', error);
    return NextResponse.json({ found: false });
  }
}

// POST — 프로필 생성 또는 업데이트
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { kakaoId, phone, sessionId, ...profileData } = body;

    // 기존 프로필 검색 (kakaoId → phone → sessionId 순)
    let existing = null;
    if (kakaoId) existing = await findProfile({ kakaoId }).catch(() => null);
    if (!existing && phone) existing = await findProfile({ phone }).catch(() => null);
    if (!existing && sessionId) existing = await findProfile({ sessionId }).catch(() => null);

    if (existing) {
      // 기존 프로필 업데이트
      await updateProfile(existing.profileId, {
        ...profileData,
        kakaoId,
        phone,
        sessionIds: sessionId || undefined,
      });
      return NextResponse.json({ success: true, profileId: existing.profileId, updated: true });
    }

    // 새 프로필 생성
    const result = await saveProfile({
      ...profileData,
      kakaoId: kakaoId || '',
      phone: phone || '',
      sessionIds: sessionId || '',
      collectionMethod: profileData.collectionMethod || 'onboarding',
    });

    return NextResponse.json({ success: true, profileId: result.profileId, updated: false });
  } catch (error) {
    console.error('프로필 저장 오류:', error);
    return NextResponse.json({ error: '프로필 저장에 실패했습니다.' }, { status: 500 });
  }
}
