'use client';

import { useState } from 'react';

type FruitKey = '레드향' | '한라봉' | '천혜향' | '사과' | '배' | '키위' | '토마토' | '참외';

interface Option {
  emoji: string;
  text: string;
  scores: Partial<Record<FruitKey, number>>;
}

interface Question {
  question: string;
  options: Option[];
}

const FRUITS: Record<FruitKey, {
  emoji: string;
  img: string;
  sub: string;
  features: string[];
  url: string;
}> = {
  레드향: {
    emoji: '🍊',
    img: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab12?w=600&h=400&fit=crop&auto=format',
    sub: '조카님은 레드향 타입! 삼촌이 딱 보면 알아요 🍊',
    features: ['삼촌이 새벽에 직접 고른 당도 높은 레드향이에요', '한라봉×천혜향 교배종이라 두 과일의 장점을 다 가졌어요', '껍질 얇고 즙 풍부해서 먹기 편하고 달달해요'],
    url: 'https://jaecheol.com/all',
  },
  한라봉: {
    emoji: '🍊',
    img: 'https://images.unsplash.com/photo-1547514701-42782101795e?w=600&h=400&fit=crop&auto=format',
    sub: '조카님 취향엔 한라봉이 딱이에요! 삼촌 보장 🙏',
    features: ['울퉁불퉁한 모양이지만 그 안에 진한 향이 꽉 찼어요', '과육이 탱탱해서 씹을수록 맛이 나는 프리미엄 감귤이에요', '선물하면 진짜 좋아해요. 삼촌도 매년 선물로 제일 많이 팔아요'],
    url: 'https://jaecheol.com/all',
  },
  천혜향: {
    emoji: '🍊',
    img: 'https://images.unsplash.com/photo-1580052614034-c55d20bfee3b?w=600&h=400&fit=crop&auto=format',
    sub: '조카님한테 천혜향이 딱이에요! 삼촌 픽 🍊',
    features: ['껍질 너무 얇아서 까기만 하면 즙이 터져요', '새콤달콤한 맛 균형이 감귤 중에 최고라고 삼촌은 생각해요', '향도 상큼해서 먹고 나서 기분이 좋아져요'],
    url: 'https://jaecheol.com/all',
  },
  사과: {
    emoji: '🍎',
    img: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=600&h=400&fit=crop&auto=format',
    sub: '조카님은 사과 타입! 삼촌이 아침부터 골라뒀어요 🍎',
    features: ['비파괴 당도 측정으로 달달한 것만 삼촌이 직접 골랐어요', '아삭하고 과즙이 풍부해서 먹을 때마다 기분 좋아요', '냉장고에 차갑게 두면 더 달고 맛있어요'],
    url: 'https://jaecheol.com/all',
  },
  배: {
    emoji: '🍐',
    img: 'https://images.unsplash.com/photo-1514756331096-242fdeb70d4a?w=600&h=400&fit=crop&auto=format',
    sub: '조카님한텐 배가 딱이에요! 삼촌이 눈으로 골랐어요 🍐',
    features: ['과즙이 넘쳐서 한 조각 먹으면 목이 시원해지는 느낌이에요', '큼직하고 윤기 나는 배 중에서 삼촌이 손선별했어요', '선물하면 고급스러워서 받는 분이 진짜 좋아해요'],
    url: 'https://jaecheol.com/all',
  },
  키위: {
    emoji: '🥝',
    img: 'https://images.unsplash.com/photo-1618897996318-5a901fa6ca71?w=600&h=400&fit=crop&auto=format',
    sub: '조카님한테 키위가 딱이에요! 영양은 삼촌이 책임져요 💚',
    features: ['비타민C가 레몬의 2배! 삼촌도 매일 하나씩 먹어요', '새콤달콤해서 아침에 먹으면 하루가 상쾌하게 시작돼요', '껍질째 쪼개서 스푼으로 떠먹으면 더 맛있어요'],
    url: 'https://jaecheol.com/all',
  },
  토마토: {
    emoji: '🍅',
    img: 'https://lh3.googleusercontent.com/d/1Rz-6g4bIZ1HojLC0AKjaeXQTUD0Quhc9',
    sub: '조카님은 대저짭짤이 타입! 삼촌이 부산까지 가서 골라왔어요 ❤️',
    features: ['짭짤하고 달콤한 맛이 동시에 나는 대저만의 특별한 토마토예요', '부산 대저동에서만 자라는 토종 품종, 삼촌도 매년 제철 되면 꼭 챙겨요', '껍질 얇고 과즙 많아서 한 입 베어물면 입 안에서 터져요'],
    url: 'https://jaecheol.com/all',
  },
  참외: {
    emoji: '🍈',
    img: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=600&h=400&fit=crop&auto=format',
    sub: '조카님은 참외 타입! 한국 과일의 정수예요 🍈',
    features: ['한국에서만 먹을 수 있는 제철 여름 과일이에요', '달달한 향이 방에 가득 퍼질 만큼 향기로워요', '삼촌이 줄기 색깔로 익은 것만 골라서 더 달아요'],
    url: 'https://jaecheol.com/all',
  },
};

const QUESTIONS: Question[] = [
  {
    question: '어떤 맛이 가장 끌리세요?',
    options: [
      { emoji: '🍯', text: '진하고 달콤한 맛', scores: { 레드향: 2, 사과: 2, 참외: 2 } },
      { emoji: '🍋', text: '새콤달콤 균형 잡힌 맛', scores: { 천혜향: 2, 키위: 2, 토마토: 1 } },
      { emoji: '🌺', text: '향이 진하고 과일다운 맛', scores: { 한라봉: 3, 사과: 1 } },
      { emoji: '🌊', text: '시원하고 담백한 맛', scores: { 배: 3, 참외: 1 } },
    ],
  },
  {
    question: '좋아하는 식감은 어떤 건가요?',
    options: [
      { emoji: '🥢', text: '아삭아삭 씹히는 것', scores: { 사과: 3, 배: 2, 참외: 2 } },
      { emoji: '💧', text: '즙이 팡팡 터지는 것', scores: { 레드향: 2, 천혜향: 2, 토마토: 2 } },
      { emoji: '🍮', text: '부드럽고 말랑한 것', scores: { 키위: 3, 한라봉: 1 } },
      { emoji: '🧊', text: '탱탱하고 시원한 것', scores: { 배: 2, 참외: 1, 레드향: 1 } },
    ],
  },
  {
    question: '과일을 주로 어떻게 드세요?',
    options: [
      { emoji: '🖐️', text: '그냥 바로 까서 먹어요', scores: { 참외: 2, 레드향: 2, 천혜향: 1, 사과: 1 } },
      { emoji: '🍽️', text: '잘라서 접시에 놓고', scores: { 사과: 2, 배: 2, 한라봉: 1 } },
      { emoji: '🥤', text: '주스나 스무디로', scores: { 키위: 3, 토마토: 2 } },
      { emoji: '🥗', text: '요리나 샐러드에 활용', scores: { 토마토: 3, 키위: 1 } },
    ],
  },
  {
    question: '어떤 목적으로 드세요?',
    options: [
      { emoji: '😋', text: '달달한 간식/후식으로', scores: { 레드향: 2, 사과: 2, 참외: 2 } },
      { emoji: '💪', text: '건강/다이어트를 위해', scores: { 키위: 3, 토마토: 3 } },
      { emoji: '🎁', text: '소중한 분께 선물로', scores: { 한라봉: 3, 배: 3 } },
      { emoji: '👨‍👩‍👧‍👦', text: '온 가족 함께 먹을 것', scores: { 사과: 2, 레드향: 1, 천혜향: 1 } },
    ],
  },
  {
    question: '어떤 느낌의 과일이 좋아요?',
    options: [
      { emoji: '✨', text: '작고 한 입에 쏙', scores: { 레드향: 2, 천혜향: 2, 키위: 1 } },
      { emoji: '❄️', text: '시원하고 청량한 느낌', scores: { 배: 3, 참외: 2 } },
      { emoji: '🌿', text: '향이 진하고 특색 있는', scores: { 한라봉: 3 } },
      { emoji: '🎨', text: '색 예쁘고 건강한 느낌', scores: { 토마토: 3, 키위: 2, 사과: 1 } },
    ],
  },
];

const ALL_FRUITS = Object.keys(FRUITS) as FruitKey[];

function initScores(): Record<FruitKey, number> {
  return Object.fromEntries(ALL_FRUITS.map(k => [k, 0])) as Record<FruitKey, number>;
}

type Phase = 'intro' | 'quiz' | 'result';

export default function QuizPage() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [current, setCurrent] = useState(0);
  const [scores, setScores] = useState<Record<FruitKey, number>>(initScores());
  const [winner, setWinner] = useState<FruitKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  const start = () => {
    setScores(initScores());
    setCurrent(0);
    setWinner(null);
    setImgError(false);
    setPhase('quiz');
  };

  const pick = (opt: Option) => {
    const next = { ...scores };
    for (const [k, v] of Object.entries(opt.scores) as [FruitKey, number][]) {
      next[k] += v;
    }
    if (current + 1 < QUESTIONS.length) {
      setScores(next);
      setCurrent(current + 1);
    } else {
      const w = ALL_FRUITS.reduce((a, b) => next[b] > next[a] ? b : a);
      setScores(next);
      setWinner(w);
      setPhase('result');
    }
  };

  const reset = () => {
    setPhase('intro');
    setCopied(false);
  };

  const share = () => {
    if (navigator.share) {
      navigator.share({ title: '제철삼촌 과일 추천 테스트', text: '나에게 딱 맞는 제철과일 찾았어요! 조카님도 해보세요 🍊', url: location.href });
    } else {
      navigator.clipboard?.writeText(location.href).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    }
  };

  const progress = phase === 'intro' ? 0 : phase === 'result' ? 100 : Math.round((current / QUESTIONS.length) * 100);

  return (
    <div className="flex flex-col min-h-screen bg-white max-w-lg mx-auto">

      {/* 헤더 */}
      <div style={{ background: '#ff4910' }} className="px-4 py-3 flex items-center gap-3">
        <span className="text-3xl">🍊</span>
        <div>
          <p className="font-bold text-white text-sm">제철삼촌 과일 취향 테스트</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>삼촌이 딱 맞는 과일 골라드릴게요</p>
        </div>
      </div>

      {/* 진행 바 */}
      <div className="h-1.5 bg-gray-100">
        <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: '#ff4910' }} />
      </div>

      {/* 인트로 */}
      {phase === 'intro' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gray-50">
          <span className="inline-block text-xs font-bold text-white px-4 py-1.5 rounded-full mb-5" style={{ background: '#ff4910' }}>
            🍊 제철삼촌 과일 취향 테스트
          </span>
          <h1 className="text-2xl font-black text-gray-800 leading-snug mb-3">
            삼촌이 조카님 취향에<br />딱 맞는 과일 골라드릴게요
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-8">
            새벽 경매장에서 직접 고른 제철과일 중에<br />조카님한테 딱 맞는 거 골라봐요 😊
          </p>

          {/* 과일 미리보기 */}
          <div className="flex gap-3 overflow-x-auto w-full pb-2 mb-8" style={{ scrollbarWidth: 'none' }}>
            {ALL_FRUITS.map(k => (
              <div key={k} className="flex-none w-24 rounded-2xl overflow-hidden bg-white shadow-md text-center">
                <img src={FRUITS[k].img} alt={k} className="w-24 h-20 object-cover block"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div className="text-xs font-bold text-gray-700 py-2">{k}</div>
              </div>
            ))}
          </div>

          <button
            onClick={start}
            className="text-white font-black text-base px-12 py-4 rounded-full shadow-lg"
            style={{ background: '#ff4910' }}
          >
            삼촌한테 추천받기 →
          </button>
          <p className="text-xs text-gray-400 mt-3">지금 제철인 과일 8가지 중에서 골라드려요 🍓</p>
        </div>
      )}

      {/* 퀴즈 */}
      {phase === 'quiz' && (
        <div className="flex-1 flex flex-col p-6 bg-gray-50">
          <p className="text-xs text-gray-400 text-right mb-2">{current + 1} / {QUESTIONS.length}</p>
          <h2 className="text-xl font-black text-gray-800 text-center mb-8 leading-snug">
            {QUESTIONS[current].question}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {QUESTIONS[current].options.map((opt, i) => (
              <button
                key={i}
                onClick={() => pick(opt)}
                className="flex flex-col items-center gap-2 bg-white border-2 border-gray-100 rounded-2xl p-4 text-center active:scale-95 transition-all"
                style={{ touchAction: 'manipulation' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#ff4910')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
              >
                <span className="text-3xl">{opt.emoji}</span>
                <span className="text-xs font-semibold text-gray-700 leading-snug">{opt.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 결과 */}
      {phase === 'result' && winner && (
        <div className="flex-1 flex flex-col p-6 bg-gray-50">
          {/* 이미지 */}
          <div className="w-full rounded-2xl overflow-hidden mb-5 shadow-lg" style={{height:'320px'}}>
            {!imgError ? (
              <img
                src={FRUITS[winner].img}
                alt={winner}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-7xl" style={{ background: 'linear-gradient(135deg,#fff5f0,#ffd5c0)' }}>
                {FRUITS[winner].emoji}
              </div>
            )}
          </div>

          {/* 배지 + 이름 */}
          <div className="text-center mb-5">
            <span className="inline-block text-xs font-bold text-white px-4 py-1 rounded-full mb-2" style={{ background: '#ff4910' }}>
              🍊 삼촌 추천
            </span>
            <h2 className="text-3xl font-black text-gray-800 mb-1">{winner}</h2>
            <p className="text-sm text-gray-500 leading-relaxed">{FRUITS[winner].sub}</p>
          </div>

          {/* 특징 */}
          <div className="rounded-2xl p-4 mb-5 border" style={{ background: '#fff5f0', borderColor: '#ffd5c0' }}>
            <p className="text-xs font-bold mb-3" style={{ color: '#c2410c' }}>삼촌이 이 과일을 추천한 이유</p>
            <ul className="flex flex-col gap-2">
              {FRUITS[winner].features.map((f, i) => (
                <li key={i} className="flex gap-2 items-start text-sm text-gray-700">
                  <span className="font-black mt-0.5" style={{ color: '#ff4910' }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* 버튼들 */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.open(FRUITS[winner!].url, '_blank')}
              className="w-full text-white font-black py-4 rounded-full text-sm"
              style={{ background: '#ff4910' }}
            >
              🛒 {winner} 구매하러 가기
            </button>
            <button
              onClick={share}
              className="w-full bg-white border-2 border-gray-100 text-gray-700 py-3 rounded-full text-sm font-semibold"
            >
              {copied ? '✅ 링크 복사됐어요!' : '🔗 결과 공유하기'}
            </button>
            <button onClick={reset} className="w-full text-gray-400 py-2 text-sm">
              ↩ 다시 하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
