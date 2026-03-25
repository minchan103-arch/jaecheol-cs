/**
 * jaecheol-hub-v2 API 클라이언트
 *
 * 챗봇이 고객 주문/배송 데이터를 실시간 조회할 때 사용.
 * 5초 타임아웃 (카카오 스킬 서버 제한 대응).
 */

const HUB_URL = process.env.JAECHEOL_HUB_URL || 'https://jaecheol-hub-production.up.railway.app';

export interface CustomerContext {
  found: boolean;
  customer: {
    name: string;
    phone: string;
    order_count: number;
    total_spent: number;
    join_type: string;
  } | null;
  orders: Array<{
    order_id: string;
    channel: string;
    product_name: string;
    amount: number;
    status: string;
    ordered_at: string;
    receiver_name: string;
    receiver_phone: string;
  }>;
  shipments: Array<{
    order_id: string;
    prod_name: string;
    prod_option: string;
    quantity: number;
    receiver_name: string;
    invoice_no: string;
    invoice_status: string;
    batch_date: string;
    imweb_status: string;
  }>;
}

export async function getCustomerContext(phone?: string, name?: string): Promise<CustomerContext | null> {
  if (!phone && !name) return null;

  const params = new URLSearchParams();
  if (phone) params.set('phone', phone.replace(/-/g, ''));
  if (name) params.set('name', name);

  try {
    const resp = await fetch(`${HUB_URL}/api/chatbot/customer-context?${params}`, {
      signal: AbortSignal.timeout(1500), // 1.5초 타임아웃 (카카오 5초 제한 대응)
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    console.error('[hub-api] customer-context 조회 실패');
    return null;
  }
}

/**
 * 고객 컨텍스트를 Claude 시스템 프롬프트용 텍스트로 변환
 */
export function formatContextForPrompt(ctx: CustomerContext): string {
  if (!ctx.found) return '';

  const lines: string[] = ['\n\n[실시간 고객 데이터 — 아래 정보로 정확하게 답변할 것]'];

  if (ctx.customer) {
    lines.push(`고객: ${ctx.customer.name} | 총 ${ctx.customer.order_count}회 주문 | 누적 ${ctx.customer.total_spent.toLocaleString()}원`);
  }

  if (ctx.orders.length > 0) {
    lines.push('\n최근 주문:');
    for (const o of ctx.orders) {
      const date = o.ordered_at ? o.ordered_at.slice(0, 10) : '날짜미상';
      lines.push(`- ${date} | ${o.product_name} | ${o.amount.toLocaleString()}원 | 상태: ${o.status} | 수취인: ${o.receiver_name}`);
    }
  }

  if (ctx.shipments.length > 0) {
    lines.push('\n배송 현황:');
    for (const s of ctx.shipments) {
      const statusMap: Record<string, string> = {
        PENDING: '준비중',
        MATCHED: '송장매칭완료',
        REGISTERED: '발송완료',
        FAILED: '등록실패',
      };
      const invoiceInfo = s.invoice_no
        ? `송장: ${s.invoice_no} (한진택배)`
        : '송장 미등록';
      const status = statusMap[s.invoice_status] || s.invoice_status;
      lines.push(`- ${s.prod_name} ${s.prod_option || ''} x${s.quantity} | ${invoiceInfo} | ${status}`);
    }
  }

  lines.push('\n위 데이터를 활용해서 고객 질문에 정확하게 답변해. 데이터에 없는 내용은 추측하지 말고 카카오 안내해.');

  return lines.join('\n');
}


/**
 * 에스컬레이션된 대화를 Hub에 전송
 */
export async function sendEscalation(data: {
  platform: string;
  customer_id: string;
  customer_name: string;
  message: string;
  bot_reply: string;
  escalate_reason: string;
}): Promise<void> {
  try {
    await fetch(`${HUB_URL}/api/chatbot/escalate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    console.error('[hub-api] escalate 전송 실패');
  }
}


/**
 * 대화 로그 전송 (fire-and-forget, 모든 대화 기록)
 */
export async function logConversation(data: {
  platform: string;
  customer_id: string;
  user_message: string;
  bot_reply: string;
  was_escalated: boolean;
  escalate_reason?: string;
}): Promise<void> {
  try {
    await fetch(`${HUB_URL}/api/chatbot/log-conversation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    console.error('[hub-api] log-conversation 전송 실패');
  }
}


/**
 * 학습된 패턴 조회 (프롬프트 주입용)
 */
export interface LearnedPattern {
  id: number;
  question: string;
  answer: string;
  confidence: number;
}

export interface LearnedContext {
  patterns: LearnedPattern[];
  phase: number;
  stats: Record<string, unknown>;
}

export async function getLearnedContext(message: string): Promise<LearnedContext | null> {
  try {
    const resp = await fetch(
      `${HUB_URL}/api/chatbot/learned-context?message=${encodeURIComponent(message)}`,
      { signal: AbortSignal.timeout(1000) }, // 1초 타임아웃 — 응답 속도 보호
    );
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    console.error('[hub-api] learned-context 조회 실패');
    return null;
  }
}


/**
 * 패턴 사용 결과 피드백 (에스컬레이션 안 됐으면 success)
 */
export async function sendPatternFeedback(patternId: number, success: boolean): Promise<void> {
  try {
    await fetch(
      `${HUB_URL}/api/chatbot/learned-context/feedback?pattern_id=${patternId}&success=${success}`,
      { method: 'POST', signal: AbortSignal.timeout(2000) },
    );
  } catch {
    // fire-and-forget
  }
}


/**
 * 고객에게 전달 대기 중인 관리자 답변 확인
 */
export async function getPendingReply(customerId: string): Promise<string | null> {
  try {
    const resp = await fetch(
      `${HUB_URL}/api/chatbot/pending-reply?customer_id=${encodeURIComponent(customerId)}`,
      { signal: AbortSignal.timeout(2000) },
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.has_reply ? data.reply : null;
  } catch {
    return null;
  }
}
