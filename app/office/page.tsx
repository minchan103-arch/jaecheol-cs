'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface ChannelInfo {
  channel: string;
  label: string;
  today_orders: number;
  today_revenue: number;
  pending_orders: number;
  connected: boolean;
}

interface RecentOrder {
  order_id: string;
  channel: string;
  customer_name: string;
  total_amount: number;
  status: { value: string; label: string };
  ordered_at: string;
}

interface InventoryItem {
  name: string;
  origin: string;
  price: string;
  stock: number;
  totalStock: number;
  stockStatus: 'available' | 'closing' | 'soldout';
  stockPercent: number;
  orderUrl: string;
}

interface OfficeData {
  cs: {
    total: number;
    todayTotal: number;
    autoResolved: number;
    escalated: number;
    done: number;
    todayAutoResolved: number;
    todayEscalated: number;
    recentEscalations: { timestamp: string; message: string; platform: string }[];
  } | null;
  inventory: {
    totalProducts: number;
    available: number;
    closing: number;
    soldout: number;
    items: InventoryItem[];
  } | null;
  inventoryDeadline: string | null;
  orders: {
    date: string;
    channels: ChannelInfo[];
    total_orders: number;
    total_revenue: number;
    total_customers: number;
    recent_orders: RecentOrder[];
  } | null;
  channels: Record<string, { connected: boolean; label: string; hint: string }> | null;
  fetchedAt: string;
}

type Tab = 'overview' | 'orders' | 'inventory' | 'cs';

const TAB_LIST: { key: Tab; label: string; emoji: string }[] = [
  { key: 'overview', label: '전체', emoji: '📊' },
  { key: 'orders', label: '주문', emoji: '📦' },
  { key: 'inventory', label: '재고', emoji: '🍊' },
  { key: 'cs', label: 'CS', emoji: '💬' },
];

const STOCK_COLOR = {
  available: 'bg-emerald-500',
  closing: 'bg-orange-500',
  soldout: 'bg-gray-400',
};

const STOCK_LABEL = {
  available: '판매중',
  closing: '마감임박',
  soldout: '마감',
};

const STOCK_BADGE = {
  available: 'bg-emerald-100 text-emerald-700',
  closing: 'bg-orange-100 text-orange-700',
  soldout: 'bg-gray-100 text-gray-500',
};

function formatKRW(amount: number) {
  if (amount >= 10000) return `${Math.round(amount / 10000)}만원`;
  return `${amount.toLocaleString()}원`;
}

export default function OfficePage() {
  const [data, setData] = useState<OfficeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('overview');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/office');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b px-4 md:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏢</span>
          <div>
            <h1 className="text-lg font-bold text-gray-800">제철삼촌 내부 관리</h1>
            <p className="text-xs text-gray-400">주문 / 재고 / CS 통합 운영</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-xs border rounded px-2 py-1 text-orange-600 border-orange-300 hover:bg-orange-50"
          >
            CS 대시보드
          </Link>
          <a
            href="/weekly-box"
            target="_blank"
            className="text-xs border rounded px-2 py-1 text-green-600 border-green-300 hover:bg-green-50"
          >
            주간박스
          </a>
          <button
            onClick={fetchData}
            className="text-xs bg-orange-500 text-white rounded px-3 py-1.5 hover:bg-orange-600"
          >
            새로고침
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* 탭 */}
        <div className="flex gap-2">
          {TAB_LIST.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-sm px-4 py-2 rounded-full border transition-colors ${
                tab === t.key
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="py-20 text-center text-gray-400">데이터 로드 중...</div>
        )}
        {error && (
          <div className="py-20 text-center text-red-400">{error}</div>
        )}

        {data && !loading && (
          <>
            {/* 전체 탭 */}
            {tab === 'overview' && <OverviewTab data={data} />}
            {tab === 'orders' && <OrdersTab data={data} />}
            {tab === 'inventory' && <InventoryTab data={data} />}
            {tab === 'cs' && <CSTab data={data} />}
          </>
        )}

        {/* 최종 갱신 시각 */}
        {data?.fetchedAt && (
          <p className="text-xs text-gray-300 text-right">
            마지막 갱신: {new Date(data.fetchedAt).toLocaleString('ko-KR')}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── 전체 탭 ─────────────────────────────────────── */

function OverviewTab({ data }: { data: OfficeData }) {
  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="오늘 주문"
          value={data.orders?.total_orders ?? '-'}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <StatCard
          label="오늘 매출"
          value={data.orders ? formatKRW(data.orders.total_revenue) : '-'}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <StatCard
          label="오늘 CS"
          value={data.cs?.todayTotal ?? '-'}
          color="text-orange-600"
          bg="bg-orange-50"
        />
        <StatCard
          label="재고 상품"
          value={data.inventory?.totalProducts ?? '-'}
          color="text-purple-600"
          bg="bg-purple-50"
        />
      </div>

      {/* 채널 상태 */}
      {data.channels && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">채널 연결 상태</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(data.channels).map(([key, ch]) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                <span className={`w-2.5 h-2.5 rounded-full ${ch.connected ? 'bg-emerald-500' : 'bg-red-400'}`} />
                <span className="text-gray-700">{ch.label}</span>
                <span className="text-xs text-gray-400 ml-auto">
                  {ch.connected ? '연결됨' : '미연결'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 최근 주문 */}
      {data.orders?.recent_orders && data.orders.recent_orders.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-5 py-3 border-b">
            <h2 className="text-sm font-semibold text-gray-700">최근 주문</h2>
          </div>
          <RecentOrdersTable orders={data.orders.recent_orders} />
        </div>
      )}

      {/* 에스컬레이션 */}
      {data.cs?.recentEscalations && data.cs.recentEscalations.length > 0 && (
        <div className="bg-orange-50 rounded-xl border border-orange-200 p-5">
          <h2 className="text-sm font-semibold text-orange-700 mb-3">
            미처리 CS ({data.cs.escalated}건)
          </h2>
          <div className="space-y-2">
            {data.cs.recentEscalations.map((e, i) => (
              <div key={i} className="text-sm bg-white rounded-lg p-3 border border-orange-100">
                <span className="text-xs text-gray-400">{e.timestamp} · {e.platform}</span>
                <p className="text-gray-700 mt-1 line-clamp-2">{e.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!data.orders && !data.channels && (
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 text-sm text-yellow-700">
          주문/채널 데이터를 불러올 수 없습니다. jaecheol-hub 연결을 확인하세요.
        </div>
      )}
    </div>
  );
}

/* ─── 주문 탭 ─────────────────────────────────────── */

function OrdersTab({ data }: { data: OfficeData }) {
  if (!data.orders) {
    return (
      <div className="py-16 text-center text-gray-400">
        주문 데이터를 불러올 수 없습니다.
        <br />
        <span className="text-xs">jaecheol-hub 연결 상태를 확인하세요.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 채널별 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.orders.channels.map(ch => (
          <div key={ch.channel} className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">{ch.label}</h3>
              <span className={`w-2 h-2 rounded-full ${ch.connected ? 'bg-emerald-500' : 'bg-red-400'}`} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-700">{ch.today_orders}</p>
                <p className="text-xs text-gray-400">주문</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{formatKRW(ch.today_revenue)}</p>
                <p className="text-xs text-gray-400">매출</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{ch.pending_orders}</p>
                <p className="text-xs text-gray-400">미처리</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 최근 주문 */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-3 border-b">
          <h2 className="text-sm font-semibold text-gray-700">최근 주문</h2>
        </div>
        <RecentOrdersTable orders={data.orders.recent_orders} />
      </div>
    </div>
  );
}

/* ─── 재고 탭 ─────────────────────────────────────── */

function InventoryTab({ data }: { data: OfficeData }) {
  if (!data.inventory) {
    return (
      <div className="py-16 text-center text-gray-400">재고 데이터를 불러올 수 없습니다.</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 요약 */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="판매중" value={data.inventory.available} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard label="마감임박" value={data.inventory.closing} color="text-orange-600" bg="bg-orange-50" />
        <StatCard label="마감" value={data.inventory.soldout} color="text-gray-500" bg="bg-gray-100" />
      </div>

      {data.inventoryDeadline && (
        <p className="text-xs text-gray-400">마감일: {data.inventoryDeadline}</p>
      )}

      {/* 상품 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.inventory.items.map((item, i) => (
          <div key={i} className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">{item.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STOCK_BADGE[item.stockStatus]}`}>
                {STOCK_LABEL[item.stockStatus]}
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-2">{item.origin} · {item.price}</p>

            {/* 재고 바 */}
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
              <div
                className={`h-full rounded-full transition-all ${STOCK_COLOR[item.stockStatus]}`}
                style={{ width: `${item.stockPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>{item.stock} / {item.totalStock}</span>
              <span>{item.stockPercent}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── CS 탭 ───────────────────────────────────────── */

function CSTab({ data }: { data: OfficeData }) {
  if (!data.cs) {
    return (
      <div className="py-16 text-center text-gray-400">CS 데이터를 불러올 수 없습니다.</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="오늘 문의" value={data.cs.todayTotal} color="text-gray-700" bg="bg-white" />
        <StatCard label="자동처리" value={data.cs.todayAutoResolved} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard label="카카오전달" value={data.cs.todayEscalated} color="text-orange-600" bg="bg-orange-50" />
        <StatCard label="전체 누적" value={data.cs.total} color="text-gray-500" bg="bg-gray-100" />
      </div>

      {/* 미처리 에스컬레이션 */}
      {data.cs.recentEscalations.length > 0 ? (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-5 py-3 border-b">
            <h2 className="text-sm font-semibold text-orange-600">
              미처리 에스컬레이션 ({data.cs.escalated}건)
            </h2>
          </div>
          <div className="divide-y">
            {data.cs.recentEscalations.map((e, i) => (
              <div key={i} className="px-5 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-400">{e.timestamp}</span>
                  <span className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">{e.platform}</span>
                </div>
                <p className="text-sm text-gray-700">{e.message}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-5 text-center">
          <p className="text-emerald-600 text-sm">미처리 에스컬레이션 없음</p>
        </div>
      )}

      <Link
        href="/"
        className="block text-center text-sm text-orange-500 hover:text-orange-600 underline"
      >
        CS 대시보드에서 상세 내역 확인 &rarr;
      </Link>
    </div>
  );
}

/* ─── 공통 컴포넌트 ───────────────────────────────── */

function StatCard({
  label, value, color, bg,
}: {
  label: string; value: string | number; color: string; bg: string;
}) {
  return (
    <div className={`${bg} rounded-xl p-4 border border-gray-100`}>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function RecentOrdersTable({ orders }: { orders: RecentOrder[] }) {
  if (!orders.length) {
    return <div className="py-8 text-center text-gray-400 text-sm">주문 없음</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs">
          <tr>
            <th className="px-5 py-2 text-left">주문번호</th>
            <th className="px-3 py-2 text-left">채널</th>
            <th className="px-3 py-2 text-left">고객</th>
            <th className="px-3 py-2 text-right">금액</th>
            <th className="px-3 py-2 text-left">상태</th>
            <th className="px-5 py-2 text-left">시각</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {orders.map((o, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-5 py-2.5 text-gray-700 font-mono text-xs">{o.order_id}</td>
              <td className="px-3 py-2.5 text-gray-600">{o.channel}</td>
              <td className="px-3 py-2.5 text-gray-600">{o.customer_name}</td>
              <td className="px-3 py-2.5 text-right text-gray-700">{o.total_amount?.toLocaleString()}원</td>
              <td className="px-3 py-2.5">
                <span className="text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5">
                  {o.status?.label || o.status?.value}
                </span>
              </td>
              <td className="px-5 py-2.5 text-gray-400 text-xs">{o.ordered_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
