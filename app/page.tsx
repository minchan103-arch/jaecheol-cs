'use client';

import { useState, useEffect, useCallback } from 'react';

interface Row {
  num: string;
  timestamp: string;
  platform: string;
  sessionId: string;
  message: string;
  reply: string;
  status: string;
  kakaoSent: boolean;
  memo: string;
}

const PLATFORM_LABEL: Record<string, string> = {
  naver: '네이버',
  mall: '자사몰',
  infocrm: '인포크',
  카카오채널: '카카오',
};

const PLATFORM_COLOR: Record<string, string> = {
  naver: 'bg-green-100 text-green-700',
  mall: 'bg-blue-100 text-blue-700',
  infocrm: 'bg-purple-100 text-purple-700',
  카카오채널: 'bg-yellow-100 text-yellow-700',
};

const STATUS_COLOR: Record<string, string> = {
  자동처리완료: 'bg-emerald-100 text-emerald-700',
  카카오전달: 'bg-orange-100 text-orange-700',
  처리완료: 'bg-gray-100 text-gray-600',
};

export default function Dashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('전체');
  const [filterStatus, setFilterStatus] = useState('전체');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/sheets');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRows((data.rows as Row[]).reverse()); // 최신순
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const filtered = rows.filter(r => {
    const p = filterPlatform === '전체' || r.platform === filterPlatform || PLATFORM_LABEL[r.platform] === filterPlatform;
    const s = filterStatus === '전체' || r.status === filterStatus;
    return p && s;
  });

  const total = rows.length;
  const auto = rows.filter(r => r.status === '자동처리완료').length;
  const escalated = rows.filter(r => r.status === '카카오전달').length;
  const done = rows.filter(r => r.status === '처리완료').length;

  const widgetLinks = [
    { label: '네이버 위젯', param: 'naver', color: 'text-green-600 border-green-300' },
    { label: '자사몰 위젯', param: 'mall', color: 'text-blue-600 border-blue-300' },
    { label: '인포크 위젯', param: 'infocrm', color: 'text-purple-600 border-purple-300' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🍊</span>
          <div>
            <h1 className="text-lg font-bold text-gray-800">제철삼촌 CS 대시보드</h1>
            <p className="text-xs text-gray-400">자동챗봇 문의 통합 관리</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {widgetLinks.map(w => (
            <a
              key={w.param}
              href={`/widget?platform=${w.param}`}
              target="_blank"
              className={`text-xs border rounded px-2 py-1 ${w.color} hover:bg-gray-50`}
            >
              {w.label} ↗
            </a>
          ))}
          <button
            onClick={fetchRows}
            className="text-xs bg-orange-500 text-white rounded px-3 py-1.5 hover:bg-orange-600"
          >
            새로고침
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* 통계 카드 */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: '총 문의', value: total, color: 'text-gray-700', bg: 'bg-white' },
            { label: '자동처리', value: auto, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: '카카오 전달', value: escalated, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: '처리완료', value: done, color: 'text-gray-500', bg: 'bg-gray-100' },
          ].map(stat => (
            <div key={stat.label} className={`${stat.bg} rounded-xl p-4 border border-gray-100`}>
              <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* 위젯 임베드 코드 */}
        <details className="bg-white border rounded-xl">
          <summary className="px-5 py-3 text-sm font-medium text-gray-600 cursor-pointer select-none">
            📋 위젯 임베드 코드 보기
          </summary>
          <div className="px-5 pb-4 space-y-3 text-xs">
            {widgetLinks.map(w => (
              <div key={w.param}>
                <p className="text-gray-500 mb-1 font-medium">{w.label} (iframe)</p>
                <code className="block bg-gray-50 p-2 rounded text-gray-600 break-all">
                  {`<iframe src="${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/widget?platform=${w.param}" width="380" height="600" frameborder="0"></iframe>`}
                </code>
              </div>
            ))}
          </div>
        </details>

        {/* 필터 */}
        <div className="flex gap-3 flex-wrap">
          {['전체', '네이버', '자사몰', '인포크', '카카오'].map(p => (
            <button
              key={p}
              onClick={() => setFilterPlatform(p === '전체' ? '전체' : p)}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                filterPlatform === p ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
              }`}
            >
              {p}
            </button>
          ))}
          <div className="w-px bg-gray-200" />
          {['전체', '자동처리완료', '카카오전달', '처리완료'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                filterStatus === s ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-xl border overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-400">불러오는 중...</div>
          ) : error ? (
            <div className="py-16 text-center">
              <p className="text-red-500 text-sm">{error}</p>
              <p className="text-gray-400 text-xs mt-2">.env.local에 Google Sheets 설정을 확인하세요.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">문의 내역이 없습니다.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs text-gray-500">
                  <th className="px-4 py-3 text-left w-8">#</th>
                  <th className="px-4 py-3 text-left">시간</th>
                  <th className="px-4 py-3 text-left">플랫폼</th>
                  <th className="px-4 py-3 text-left">고객 문의</th>
                  <th className="px-4 py-3 text-left">챗봇 답변</th>
                  <th className="px-4 py-3 text-left">상태</th>
                  <th className="px-4 py-3 text-center">카카오</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <>
                    <tr
                      key={i}
                      onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                      className="border-b hover:bg-orange-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-400">{row.num}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{row.timestamp}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLATFORM_COLOR[row.platform] ?? 'bg-gray-100 text-gray-600'}`}>
                          {PLATFORM_LABEL[row.platform] ?? row.platform}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-gray-700">{row.message}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-gray-500">{row.reply}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[row.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">{row.kakaoSent ? '✅' : '—'}</td>
                    </tr>
                    {expandedRow === i && (
                      <tr key={`exp-${i}`} className="bg-orange-50">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-gray-400 mb-1 font-medium">고객 문의 전문</p>
                              <p className="text-gray-700 bg-white rounded p-3 border whitespace-pre-wrap">{row.message}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-1 font-medium">챗봇 답변 전문</p>
                              <p className="text-gray-700 bg-white rounded p-3 border whitespace-pre-wrap">{row.reply}</p>
                            </div>
                            {row.memo && (
                              <div className="col-span-2">
                                <p className="text-xs text-gray-400 mb-1 font-medium">담당자 메모 (시트에서 직접 수정)</p>
                                <p className="text-gray-600 bg-yellow-50 rounded p-3 border border-yellow-200">{row.memo}</p>
                              </div>
                            )}
                            <div className="col-span-2 text-xs text-gray-400">
                              세션ID: {row.sessionId}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
