'use client';

import { useState, useEffect, useCallback } from 'react';

interface WeeklyBoxItem {
  name: string;
  origin: string;
  price: string;
  imageUrl: string;
  stock: number;
  totalStock: number;
  deadline: string;
  orderUrl: string;
}

interface WeeklyBoxData {
  items: WeeklyBoxItem[];
  deadline: string;
}

type StockStatus = 'available' | 'closing' | 'soldout';

function getStockStatus(item: WeeklyBoxItem): StockStatus {
  if (item.stock <= 0) return 'soldout';
  if (item.totalStock > 0 && item.stock / item.totalStock <= 0.3) return 'closing';
  return 'available';
}

function formatDeadline(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function WeeklyBoxPage() {
  const [data, setData] = useState<WeeklyBoxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/weekly-box');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json as WeeklyBoxData);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto">
        {/* 헤더 */}
        <div style={{ background: '#ff4910' }} className="px-4 py-5 text-center">
          <h1 className="text-xl font-black text-white">
            이번 주 제철삼촌 박스 🍊
          </h1>
          {data?.deadline && (
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
              매주 월요일 업데이트 | 이번 주 마감: {formatDeadline(data.deadline)}
            </p>
          )}
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="py-20 text-center text-gray-400">불러오는 중...</div>
        )}

        {/* 에러 */}
        {error && (
          <div className="py-20 text-center">
            <p className="text-red-500 text-sm">{error}</p>
            <p className="text-gray-400 text-xs mt-2">
              데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.
            </p>
            <button
              onClick={fetchData}
              className="mt-4 text-xs text-white px-4 py-2 rounded-full"
              style={{ background: '#ff4910' }}
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && !error && data && data.items.length === 0 && (
          <div className="py-20 text-center">
            <span className="text-5xl block mb-4">📦</span>
            <p className="text-gray-500 text-sm font-medium">이번 주 박스를 준비 중이에요!</p>
            <p className="text-gray-400 text-xs mt-1">매주 월요일에 업데이트됩니다</p>
          </div>
        )}

        {/* 과일 카드 */}
        {!loading && !error && data && data.items.length > 0 && (
          <div className="px-4 py-5 space-y-4">
            {data.items.map((item, i) => {
              const status = getStockStatus(item);
              const isSoldout = status === 'soldout';

              return (
                <div
                  key={i}
                  className={`bg-white rounded-2xl border overflow-hidden shadow-sm ${
                    isSoldout ? 'opacity-60' : ''
                  }`}
                >
                  {/* 이미지 */}
                  <div className="relative w-full h-48 bg-gray-100 flex items-center justify-center">
                    {imgErrors.has(i) ? (
                      <span className="text-6xl">🍊</span>
                    ) : (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={() => {
                          setImgErrors(prev => new Set(prev).add(i));
                        }}
                      />
                    )}

                    {status === 'closing' && (
                      <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                        마감 임박 🔥
                      </span>
                    )}
                    {status === 'soldout' && (
                      <span className="absolute top-3 right-3 bg-gray-700 text-white text-xs font-bold px-3 py-1 rounded-full">
                        이번 주 마감
                      </span>
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="p-4">
                    <h3 className="text-lg font-black text-gray-800">{item.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">산지: {item.origin}</p>
                    <p className="text-sm font-bold mt-2" style={{ color: '#ff4910' }}>
                      {item.price}
                      {!isSoldout && (
                        <span className="text-xs font-normal text-gray-400 ml-1">이번 주 특가 ✨</span>
                      )}
                    </p>

                    {isSoldout ? (
                      <button
                        disabled
                        className="w-full mt-3 py-3 rounded-full text-sm font-bold bg-gray-200 text-gray-400 cursor-not-allowed"
                      >
                        이번 주 마감되었어요
                      </button>
                    ) : (
                      <a
                        href={item.orderUrl || 'https://jaecheol.com/all'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full mt-3 py-3 rounded-full text-sm font-bold text-white text-center"
                        style={{ background: '#ff4910' }}
                      >
                        지금 예약하기 →
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 하단 링크 */}
        {!loading && !error && (
          <div className="px-4 pb-8 pt-2 space-y-3">
            <a
              href="/quiz"
              className="block w-full py-3 rounded-full text-sm font-bold text-center border-2"
              style={{ borderColor: '#ff4910', color: '#ff4910' }}
            >
              🍊 취향 추천 받기 →
            </a>
            <a
              href="/chat"
              className="block w-full py-3 rounded-full text-sm font-bold text-center bg-gray-100 text-gray-600"
            >
              💬 챗봇에게 물어보기 →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
