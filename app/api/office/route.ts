import { NextResponse } from 'next/server';
import { getConversations, ConversationRow } from '@/lib/sheets';
import { getWeeklyBox, getStockStatus, WeeklyBoxItem } from '@/lib/weekly-box';

const HUB_URL = process.env.JAECHEOL_HUB_URL || 'https://jaecheol-hub-production.up.railway.app';

function summarizeCS(rows: ConversationRow[]) {
  const now = new Date();
  const todayStr = now.toLocaleDateString('ko-KR');
  const todayRows = rows.filter(r => r.timestamp?.includes(todayStr));

  return {
    total: rows.length,
    todayTotal: todayRows.length,
    autoResolved: rows.filter(r => r.status === '자동처리완료').length,
    escalated: rows.filter(r => r.status === '카카오전달').length,
    done: rows.filter(r => r.status === '처리완료').length,
    todayAutoResolved: todayRows.filter(r => r.status === '자동처리완료').length,
    todayEscalated: todayRows.filter(r => r.status === '카카오전달').length,
    recentEscalations: rows
      .filter(r => r.status === '카카오전달')
      .slice(-5)
      .reverse(),
  };
}

function summarizeInventory(items: WeeklyBoxItem[]) {
  return {
    totalProducts: items.length,
    available: items.filter(i => getStockStatus(i) === 'available').length,
    closing: items.filter(i => getStockStatus(i) === 'closing').length,
    soldout: items.filter(i => getStockStatus(i) === 'soldout').length,
    items: items.map(i => ({
      ...i,
      stockStatus: getStockStatus(i),
      stockPercent: i.totalStock > 0 ? Math.round((i.stock / i.totalStock) * 100) : 100,
    })),
  };
}

export async function GET() {
  try {
    const [csResult, inventoryResult, ordersResult, statusResult] = await Promise.allSettled([
      getConversations(),
      getWeeklyBox(),
      fetch(`${HUB_URL}/api/dashboard/summary`, { cache: 'no-store' }).then(r => {
        if (!r.ok) throw new Error(`hub summary ${r.status}`);
        return r.json();
      }),
      fetch(`${HUB_URL}/api/dashboard/status`, { cache: 'no-store' }).then(r => {
        if (!r.ok) throw new Error(`hub status ${r.status}`);
        return r.json();
      }),
    ]);

    return NextResponse.json({
      cs: csResult.status === 'fulfilled' ? summarizeCS(csResult.value) : null,
      inventory: inventoryResult.status === 'fulfilled'
        ? summarizeInventory(inventoryResult.value.items)
        : null,
      inventoryDeadline: inventoryResult.status === 'fulfilled'
        ? inventoryResult.value.deadline
        : null,
      orders: ordersResult.status === 'fulfilled' ? ordersResult.value : null,
      channels: statusResult.status === 'fulfilled' ? statusResult.value : null,
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: '데이터 로드 실패' },
      { status: 500 },
    );
  }
}
