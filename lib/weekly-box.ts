// 주간박스 미리보기 데이터 조회
// Google Apps Script Webhook 방식 (lib/sheets.ts와 동일 구조)

export interface WeeklyBoxItem {
  name: string;
  origin: string;
  price: string;
  imageUrl: string;
  stock: number;
  totalStock: number;
  deadline: string;
  orderUrl: string;
}

export interface WeeklyBoxData {
  items: WeeklyBoxItem[];
  deadline: string;
}

export type StockStatus = 'available' | 'closing' | 'soldout';

export function getStockStatus(item: WeeklyBoxItem): StockStatus {
  if (item.stock <= 0) return 'soldout';
  if (item.totalStock > 0 && item.stock / item.totalStock <= 0.3) return 'closing';
  return 'available';
}

function getWebhookUrl() {
  const url = process.env.SHEETS_WEBHOOK_URL;
  if (!url) throw new Error('SHEETS_WEBHOOK_URL 환경변수가 설정되지 않았습니다.');
  return url;
}

export async function getWeeklyBox(): Promise<WeeklyBoxData> {
  const url = getWebhookUrl();
  const res = await fetch(`${url}?action=readWeeklyBox`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`주간박스 조회 실패: ${res.status}`);
  const data = await res.json();
  return {
    items: (data.items ?? []) as WeeklyBoxItem[],
    deadline: data.deadline ?? '',
  };
}
