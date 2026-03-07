'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

type Phase = 'intro' | 'demographics' | 'purpose' | 'preference' | 'notification' | 'complete';

interface ProfileData {
  occupation: string;
  ageRange: string;
  purpose: string;
  taste: string;
  notification: string;
  phone: string;
}

const PHASE_ORDER: Phase[] = ['intro', 'demographics', 'purpose', 'preference', 'notification', 'complete'];

function WelcomeContent() {
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || 'mall';

  const [phase, setPhase] = useState<Phase>('intro');
  const [profile, setProfile] = useState<ProfileData>({
    occupation: '', ageRange: '', purpose: '', taste: '', notification: '', phone: '',
  });
  const [phoneInput, setPhoneInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const progress = Math.round((PHASE_ORDER.indexOf(phase) / (PHASE_ORDER.length - 1)) * 100);

  const goNext = useCallback(() => {
    const idx = PHASE_ORDER.indexOf(phase);
    if (idx < PHASE_ORDER.length - 1) {
      setPhase(PHASE_ORDER[idx + 1]);
    }
  }, [phase]);

  // 프로필 저장
  useEffect(() => {
    if (phase !== 'complete' || saved) return;

    const save = async () => {
      setSaving(true);
      try {
        const channelMap: Record<string, string> = { kakao: '카카오채널', naver: '네이버', mall: '자사몰' };
        await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: channelMap[from] || '자사몰',
            occupation: profile.occupation,
            ageRange: profile.ageRange,
            purpose: profile.purpose,
            taste: profile.taste,
            notification: profile.notification,
            phone: profile.phone,
            collectionMethod: 'onboarding',
          }),
        });
        setSaved(true);
      } catch {
        // 저장 실패해도 완료 화면은 보여줌
      }
      setSaving(false);
    };
    save();
  }, [phase, saved, profile, from]);

  return (
    <div className="flex flex-col min-h-screen bg-white max-w-lg mx-auto">
      {/* 헤더 */}
      <div style={{ background: '#ff4910' }} className="px-4 py-3 flex items-center gap-3">
        <span className="text-3xl">🍊</span>
        <div>
          <p className="font-bold text-white text-sm">제철삼촌</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>조카님 맞춤 추천 설정</p>
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div className="h-1.5 bg-gray-100">
        <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: '#ff4910' }} />
      </div>

      {/* 인트로 */}
      {phase === 'intro' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gray-50">
          <span className="inline-block text-xs font-bold text-white px-4 py-1.5 rounded-full mb-5" style={{ background: '#ff4910' }}>
            🍊 제철삼촌 맞춤 추천
          </span>
          <h1 className="text-2xl font-black text-gray-800 leading-snug mb-3">
            삼촌이 조카님한테<br />딱 맞는 과일 소식을<br />전해드리고 싶어요
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-8">
            간단한 질문 4개만 답해주시면<br />조카님 취향에 꼭 맞는 추천을 해드릴게요 😊
          </p>
          <button
            onClick={goNext}
            className="text-white font-black text-base px-12 py-4 rounded-full shadow-lg active:scale-95 transition-transform"
            style={{ background: '#ff4910', touchAction: 'manipulation' }}
          >
            삼촌한테 알려주기 →
          </button>
          <p className="text-xs text-gray-400 mt-3">1분이면 끝나요!</p>
        </div>
      )}

      {/* 직업 + 연령대 */}
      {phase === 'demographics' && (
        <div className="flex-1 flex flex-col p-6 bg-gray-50">
          <p className="text-xs text-gray-400 text-right mb-2">1 / 4</p>
          <h2 className="text-xl font-black text-gray-800 text-center mb-2 leading-snug">
            조카님은 어떤 분이세요?
          </h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            삼촌이 조카님에게 맞는 정보를 더 잘 추천해드릴 수 있어요
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {([
              { emoji: '👩‍🍳', label: '주부', desc: '가족 건강 챙기는 분' },
              { emoji: '💼', label: '직장인', desc: '바쁜 하루 중 힐링' },
              { emoji: '📚', label: '학생', desc: '건강하게 공부하는 분' },
              { emoji: '🏪', label: '자영업', desc: '사업하며 건강 챙기기' },
            ] as const).map((opt) => (
              <button
                key={opt.label}
                onClick={() => setProfile(p => ({ ...p, occupation: opt.label }))}
                className="flex flex-col items-center gap-1.5 bg-white border-2 rounded-2xl p-4 text-center active:scale-95 transition-all"
                style={{
                  borderColor: profile.occupation === opt.label ? '#ff4910' : '#f3f4f6',
                  touchAction: 'manipulation',
                }}
              >
                <span className="text-3xl">{opt.emoji}</span>
                <span className="text-sm font-bold text-gray-800">{opt.label}</span>
                <span className="text-xs text-gray-400">{opt.desc}</span>
              </button>
            ))}
          </div>

          {profile.occupation && (
            <>
              <p className="text-sm font-bold text-gray-600 text-center mb-3">연령대를 알려주세요</p>
              <div className="flex gap-2 justify-center mb-8">
                {(['20대', '30대', '40대', '50대+'] as const).map((age) => (
                  <button
                    key={age}
                    onClick={() => setProfile(p => ({ ...p, ageRange: age }))}
                    className="px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95"
                    style={{
                      background: profile.ageRange === age ? '#ff4910' : '#fff',
                      color: profile.ageRange === age ? '#fff' : '#374151',
                      border: profile.ageRange === age ? '2px solid #ff4910' : '2px solid #e5e7eb',
                      touchAction: 'manipulation',
                    }}
                  >
                    {age}
                  </button>
                ))}
              </div>
            </>
          )}

          {profile.occupation && profile.ageRange && (
            <button
              onClick={goNext}
              className="w-full text-white font-black py-4 rounded-full text-sm active:scale-95 transition-transform"
              style={{ background: '#ff4910', touchAction: 'manipulation' }}
            >
              다음 →
            </button>
          )}
        </div>
      )}

      {/* 구매 목적 */}
      {phase === 'purpose' && (
        <div className="flex-1 flex flex-col p-6 bg-gray-50">
          <p className="text-xs text-gray-400 text-right mb-2">2 / 4</p>
          <h2 className="text-xl font-black text-gray-800 text-center mb-2 leading-snug">
            과일은 주로 어떤 용도로 드세요?
          </h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            삼촌이 용도에 맞게 과일을 골라드릴게요
          </p>

          <div className="flex flex-col gap-3">
            {([
              { emoji: '🙋', label: '본인용', desc: '내가 먹을 맛있는 과일!' },
              { emoji: '🎁', label: '선물용', desc: '소중한 분께 드릴 과일' },
              { emoji: '👨‍👩‍👧', label: '가족용', desc: '온 가족이 함께 먹을 과일' },
            ] as const).map((opt) => (
              <button
                key={opt.label}
                onClick={() => {
                  setProfile(p => ({ ...p, purpose: opt.label }));
                  setTimeout(goNext, 300);
                }}
                className="flex items-center gap-4 bg-white border-2 rounded-2xl p-5 text-left active:scale-95 transition-all"
                style={{
                  borderColor: profile.purpose === opt.label ? '#ff4910' : '#f3f4f6',
                  touchAction: 'manipulation',
                }}
              >
                <span className="text-3xl">{opt.emoji}</span>
                <div>
                  <span className="text-sm font-bold text-gray-800">{opt.label}</span>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 맛 취향 */}
      {phase === 'preference' && (
        <div className="flex-1 flex flex-col p-6 bg-gray-50">
          <p className="text-xs text-gray-400 text-right mb-2">3 / 4</p>
          <h2 className="text-xl font-black text-gray-800 text-center mb-2 leading-snug">
            어떤 과일 스타일이 끌리세요?
          </h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            조카님 취향을 알면 삼촌이 딱 맞는 걸 골라드려요
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {([
              { emoji: '🍯', label: '달달한', desc: '진하고 달콤한 과일' },
              { emoji: '🍋', label: '새콤한', desc: '상큼하고 톡 쏘는 과일' },
              { emoji: '💪', label: '건강한', desc: '영양가 높은 과일' },
              { emoji: '✨', label: '프리미엄', desc: '고급스럽고 특별한 과일' },
            ] as const).map((opt) => (
              <button
                key={opt.label}
                onClick={() => {
                  setProfile(p => ({ ...p, taste: opt.label }));
                  setTimeout(goNext, 300);
                }}
                className="flex flex-col items-center gap-1.5 bg-white border-2 rounded-2xl p-4 text-center active:scale-95 transition-all"
                style={{
                  borderColor: profile.taste === opt.label ? '#ff4910' : '#f3f4f6',
                  touchAction: 'manipulation',
                }}
              >
                <span className="text-3xl">{opt.emoji}</span>
                <span className="text-sm font-bold text-gray-800">{opt.label}</span>
                <span className="text-xs text-gray-400">{opt.desc}</span>
              </button>
            ))}
          </div>

          <a
            href="/quiz"
            className="text-center text-xs text-gray-400 underline"
          >
            더 자세한 취향이 궁금하다면? 과일 성향 테스트 해보기 →
          </a>
        </div>
      )}

      {/* 알림 선호 */}
      {phase === 'notification' && (
        <div className="flex-1 flex flex-col p-6 bg-gray-50">
          <p className="text-xs text-gray-400 text-right mb-2">4 / 4</p>
          <h2 className="text-xl font-black text-gray-800 text-center mb-2 leading-snug">
            새 과일 입고되면<br />알려드릴까요?
          </h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            제철 과일이 들어오면 삼촌이 먼저 알려드릴게요
          </p>

          <div className="flex flex-col gap-3 mb-4">
            {from === 'kakao' && (
              <button
                onClick={() => {
                  setProfile(p => ({ ...p, notification: '카톡알림' }));
                  setTimeout(goNext, 300);
                }}
                className="flex items-center gap-4 bg-white border-2 rounded-2xl p-5 text-left active:scale-95 transition-all"
                style={{
                  borderColor: profile.notification === '카톡알림' ? '#ff4910' : '#f3f4f6',
                  touchAction: 'manipulation',
                }}
              >
                <span className="text-3xl">💬</span>
                <div>
                  <span className="text-sm font-bold text-gray-800">카톡으로 알려주세요!</span>
                  <p className="text-xs text-gray-400 mt-0.5">카카오톡 채널로 소식 전달</p>
                </div>
              </button>
            )}

            <button
              onClick={() => setProfile(p => ({ ...p, notification: '문자' }))}
              className="flex items-center gap-4 bg-white border-2 rounded-2xl p-5 text-left active:scale-95 transition-all"
              style={{
                borderColor: profile.notification === '문자' ? '#ff4910' : '#f3f4f6',
                touchAction: 'manipulation',
              }}
            >
              <span className="text-3xl">📱</span>
              <div>
                <span className="text-sm font-bold text-gray-800">문자로 알려주세요!</span>
                <p className="text-xs text-gray-400 mt-0.5">문자 메시지로 제철 소식 전달</p>
              </div>
            </button>

            <button
              onClick={() => {
                setProfile(p => ({ ...p, notification: '괜찮아요' }));
                setTimeout(goNext, 300);
              }}
              className="flex items-center gap-4 bg-white border-2 rounded-2xl p-5 text-left active:scale-95 transition-all"
              style={{
                borderColor: profile.notification === '괜찮아요' ? '#ff4910' : '#f3f4f6',
                touchAction: 'manipulation',
              }}
            >
              <span className="text-3xl">🙅</span>
              <div>
                <span className="text-sm font-bold text-gray-800">괜찮아요</span>
                <p className="text-xs text-gray-400 mt-0.5">알아서 구경할게요!</p>
              </div>
            </button>
          </div>

          {/* 문자 선택 시 전화번호 입력 */}
          {profile.notification === '문자' && (
            <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 mb-4">
              <label className="text-sm font-bold text-gray-700 mb-2 block">전화번호를 알려주세요</label>
              <input
                type="tel"
                placeholder="010-0000-0000"
                value={phoneInput}
                onChange={(e) => {
                  let v = e.target.value.replace(/[^0-9]/g, '');
                  if (v.length > 3 && v.length <= 7) v = v.slice(0, 3) + '-' + v.slice(3);
                  else if (v.length > 7) v = v.slice(0, 3) + '-' + v.slice(3, 7) + '-' + v.slice(7, 11);
                  setPhoneInput(v);
                }}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-[#ff4910] focus:outline-none transition-colors"
                maxLength={13}
              />
              {phoneInput.replace(/[^0-9]/g, '').length >= 10 && (
                <button
                  onClick={() => {
                    setProfile(p => ({ ...p, phone: phoneInput }));
                    goNext();
                  }}
                  className="w-full mt-3 text-white font-black py-3 rounded-full text-sm active:scale-95 transition-transform"
                  style={{ background: '#ff4910', touchAction: 'manipulation' }}
                >
                  완료 →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 완료 */}
      {phase === 'complete' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gray-50">
          <div className="text-6xl mb-4">🍊</div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">감사합니다 조카님!</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-8">
            {saving ? '삼촌이 메모하고 있어요...' : (
              <>삼촌이 조카님한테 맞는<br />과일 소식만 골라서 전해드릴게요 🙏</>
            )}
          </p>

          {!saving && (
            <div className="flex flex-col gap-3 w-full">
              <a
                href="/weekly-box"
                className="w-full text-white font-black py-4 rounded-full text-sm text-center block"
                style={{ background: '#ff4910' }}
              >
                📦 이번 주 박스 보러가기
              </a>
              <a
                href="/chat"
                className="w-full bg-white border-2 border-gray-100 text-gray-700 py-3 rounded-full text-sm font-semibold text-center block"
              >
                💬 삼촌한테 물어보기
              </a>
              <a
                href="/quiz"
                className="w-full text-gray-400 py-2 text-sm text-center block"
              >
                🧪 과일 취향 테스트 해보기
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-4xl">🍊</span>
      </div>
    }>
      <WelcomeContent />
    </Suspense>
  );
}
