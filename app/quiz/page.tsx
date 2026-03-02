'use client';

import { useState } from 'react';

type Fruit = '레드향' | '한라봉' | '천혜향';

interface Option {
  text: string;
  emoji: string;
  scores: Partial<Record<Fruit, number>>;
}

interface Question {
  question: string;
  options: Option[];
}

const QUESTIONS: Question[] = [
  {
    question: '어떤 맛이 더 끌리세요?',
    options: [
      { text: '달콤달콤한 게 최고', emoji: '🍯', scores: { 레드향: 3 } },
      { text: '새콤달콤 균형이 좋아', emoji: '🍋', scores: { 천혜향: 3 } },
      { text: '향이 진하고 과일다운 맛', emoji: '🌺', scores: { 한라봉: 3 } },
    ],
  },
  {
    question: '과일을 주로 어떻게 드세요?',
    options: [
      { text: '혼자 간식으로 먹어요', emoji: '🙋', scores: { 천혜향: 2, 레드향: 1 } },
      { text: '온 가족이 함께 먹어요', emoji: '🏠', scores: { 레드향: 3 } },
      { text: '소중한 분께 선물해요', emoji: '🎁', scores: { 한라봉: 3 } },
    ],
  },
  {
    question: '좋아하는 식감은 어떤 건가요?',
    options: [
      { text: '즙이 풍부하고 촉촉한 것', emoji: '💧', scores: { 천혜향: 2, 레드향: 1 } },
      { text: '과육이 탱탱하고 단단한 것', emoji: '💪', scores: { 한라봉: 3 } },
      { text: '시원하고 청량한 느낌', emoji: '🧊', scores: { 레드향: 3 } },
    ],
  },
  {
    question: '과일 향은 어느 정도가 좋아요?',
    options: [
      { text: '은은하게 향긋한 게 좋아', emoji: '🌸', scores: { 레드향: 3 } },
      { text: '상큼하게 톡 올라오는 향', emoji: '✨', scores: { 천혜향: 3 } },
      { text: '진하고 강한 향이 좋아', emoji: '🌿', scores: { 한라봉: 3 } },
    ],
  },
  {
    question: '주로 언제 과일을 즐기시나요?',
    options: [
      { text: '아침에 간단하게', emoji: '🌅', scores: { 천혜향: 2, 레드향: 1 } },
      { text: '식후 디저트로', emoji: '🍽️', scores: { 레드향: 2, 천혜향: 1 } },
      { text: '특별한 날 테이블에', emoji: '🎊', scores: { 한라봉: 3 } },
    ],
  },
];

const RESULTS: Record<Fruit, { emoji: string; subtitle: string; features: string[]; buyUrl: string; buyLabel: string }> = {
  레드향: {
    emoji: '🍊',
    subtitle: '달콤하고 향긋한 레드향이 딱이에요!',
    features: [
      '한라봉 × 천혜향의 교배종으로 두 과일의 장점만 모았어요',
      '껍질이 얇고 즙이 풍부해서 먹기 편해요',
      '당도가 높아 남녀노소 모두 좋아하는 스테디셀러예요',
    ],
    buyUrl: 'https://jaecheol.com',
    buyLabel: '레드향 구매하기',
  },
  한라봉: {
    emoji: '🍊',
    subtitle: '향 진하고 과즙 탱탱한 한라봉이 딱이에요!',
    features: [
      '울퉁불퉁한 모양이 특징인 프리미엄 감귤이에요',
      '향이 진하고 과육이 탱탱해서 씹는 맛이 있어요',
      '선물용으로 가장 인기 있는 제품이에요',
    ],
    buyUrl: 'https://jaecheol.com',
    buyLabel: '한라봉 구매하기',
  },
  천혜향: {
    emoji: '🍊',
    subtitle: '새콤달콤 즙 풍부한 천혜향이 딱이에요!',
    features: [
      '껍질이 얇고 즙이 넘쳐흘러 먹을 때 시원해요',
      '새콤달콤한 맛의 균형이 완벽해요',
      '상큼한 향이 기분을 좋게 해줘요',
    ],
    buyUrl: 'https://jaecheol.com',
    buyLabel: '천혜향 구매하기',
  },
};

export default function QuizPage() {
  const [current, setCurrent] = useState(0);
  const [scores, setScores] = useState<Record<Fruit, number>>({ 레드향: 0, 한라봉: 0, 천혜향: 0 });
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<Fruit | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSelect = (option: Option) => {
    const next = { ...scores };
    for (const [fruit, score] of Object.entries(option.scores) as [Fruit, number][]) {
      next[fruit] = (next[fruit] || 0) + score;
    }
    setScores(next);

    if (current + 1 < QUESTIONS.length) {
      setCurrent(current + 1);
    } else {
      const winner = (Object.entries(next) as [Fruit, number][]).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
      setResult(winner);
      setDone(true);
    }
  };

  const reset = () => {
    setCurrent(0);
    setScores({ 레드향: 0, 한라봉: 0, 천혜향: 0 });
    setDone(false);
    setResult(null);
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const progress = done ? 100 : Math.round((current / QUESTIONS.length) * 100);

  return (
    <div className="flex flex-col min-h-screen bg-white max-w-lg mx-auto shadow-lg">
      {/* 헤더 */}
      <div className="bg-yellow-400 px-4 py-3 flex items-center gap-3">
        <span className="text-3xl">🍊</span>
        <div>
          <p className="font-bold text-gray-800 text-sm">나에게 맞는 제철과일은?</p>
          <p className="text-xs text-gray-700">5가지 질문으로 알아보세요</p>
        </div>
      </div>

      {/* 진행 바 */}
      <div className="h-1.5 bg-gray-100">
        <div
          className="h-full bg-yellow-400 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col p-6 bg-gray-50">
        {!done ? (
          <>
            {/* 진행 표시 */}
            <p className="text-xs text-gray-400 text-center mb-6">
              {current + 1} / {QUESTIONS.length}
            </p>

            {/* 질문 */}
            <h2 className="text-xl font-bold text-gray-800 text-center mb-8 leading-snug">
              {QUESTIONS[current].question}
            </h2>

            {/* 선택지 */}
            <div className="flex flex-col gap-3">
              {QUESTIONS[current].options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(opt)}
                  className="flex items-center gap-4 bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 text-left hover:border-yellow-400 hover:shadow-md active:scale-95 transition-all duration-150"
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-sm font-medium text-gray-700">{opt.text}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          result && (
            <>
              {/* 결과 */}
              <div className="text-center mb-6">
                <div className="text-7xl mb-4">{RESULTS[result].emoji}</div>
                <div className="inline-block bg-yellow-400 text-gray-800 text-xs font-bold px-3 py-1 rounded-full mb-3">
                  추천 과일
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{result}</h2>
                <p className="text-sm text-gray-600">{RESULTS[result].subtitle}</p>
              </div>

              {/* 특징 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
                <p className="text-xs font-bold text-gray-400 mb-3">왜 {result}일까요?</p>
                <ul className="flex flex-col gap-2">
                  {RESULTS[result].features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-yellow-500 mt-0.5">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 버튼들 */}
              <div className="flex flex-col gap-3">
                <a
                  href={RESULTS[result].buyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-yellow-400 text-gray-800 py-3 rounded-full text-sm font-bold text-center hover:bg-yellow-500 transition-colors"
                >
                  🛒 {RESULTS[result].buyLabel}
                </a>
                <button
                  onClick={handleCopy}
                  className="w-full bg-white border-2 border-gray-100 text-gray-700 py-3 rounded-full text-sm font-medium hover:border-yellow-400 transition-colors"
                >
                  {copied ? '✅ 링크가 복사됐어요!' : '🔗 결과 공유하기'}
                </button>
                <button
                  onClick={reset}
                  className="w-full text-gray-400 py-2 text-sm hover:text-gray-600 transition-colors"
                >
                  다시 하기
                </button>
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}
