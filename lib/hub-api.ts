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
    buyer_name: string;
    buyer_phone: string;
    receiver_name: string;
    receiver_phone: string;
    match_type: 'buyer' | 'receiver' | 'both' | 'unknown';
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
      signal: AbortSignal.timeout(3000), // 3초 타임아웃
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
    lines.push(`고객: ${ctx.customer.name} | 누적 ${ctx.customer.total_spent.toLocaleString()}원`);
  }

  // 주문을 본인배송 vs 선물(대리주문)으로 분리
  // match_type이 없으면 (Hub 구버전) 전체 주문으로 표시
  const hasMatchType = ctx.orders.some(o => o.match_type);
  const selfOrders = hasMatchType ? ctx.orders.filter(o => o.match_type === 'receiver' || o.match_type === 'both') : [];
  const giftOrders = hasMatchType ? ctx.orders.filter(o => o.match_type === 'buyer') : [];
  const fallbackOrders = hasMatchType
    ? ctx.orders.filter(o => !o.match_type || o.match_type === 'unknown')
    : ctx.orders;

  if (selfOrders.length > 0) {
    lines.push(`\n★ 본인 수령 주문 (${selfOrders.length}건):`);
    for (const o of selfOrders) {
      const date = o.ordered_at ? o.ordered_at.slice(0, 10) : '날짜미상';
      lines.push(`- ${date} | ${o.product_name} | ${o.amount.toLocaleString()}원 | 상태: ${o.status} | 수취인: ${o.receiver_name}`);
    }
  }

  if (giftOrders.length > 0) {
    lines.push(`\n☆ 선물/대리 주문 (${giftOrders.length}건) — 이 고객이 구매했지만 다른 사람이 받는 주문:`);
    for (const o of giftOrders) {
      const date = o.ordered_at ? o.ordered_at.slice(0, 10) : '날짜미상';
      lines.push(`- ${date} | ${o.product_name} | ${o.amount.toLocaleString()}원 | 상태: ${o.status} | 수취인: ${o.receiver_name}`);
    }
  }

  if (fallbackOrders.length > 0) {
    lines.push(`\n최근 주문 (${fallbackOrders.length}건):`);
    for (const o of fallbackOrders) {
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

  lines.push('\n[응답 규칙 — 반드시 따를 것]');
  lines.push('- 위 주문 데이터가 있으면 → 무조건 주문/배송 현황을 바로 안내해. 추가 질문하지 마.');
  lines.push('- 고객이 전화번호만 보냈어도 → 주문 조회 의도이므로 바로 결과를 보여줘.');
  lines.push('- 고객이 "내 주문", "배송 언제" 등 본인 배송을 물으면 → ★본인 수령 주문 기준으로 답변');
  lines.push('- 고객이 선물/다른 사람 배송을 물으면 → ☆선물 주문 기준으로 답변');
  lines.push('- 대화 맥락을 보고 어떤 주문에 대한 질문인지 판단해서 답변해');
  lines.push('- 건수를 말할 때: 본인 수령과 선물 주문을 합산하지 말고 구분해서 안내해');
  lines.push('- 데이터에 없는 내용은 추측하지 말고 삼촌이 직접 확인해준다고 안내해');

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
 * 고객에게 전달 대기 중인 관리자 답변 확인 (읽기만, 소비 안 함)
 */
export interface PendingReplyResult {
  reply: string;
  convId: number;
}

export async function getPendingReply(customerId: string): Promise<PendingReplyResult | null> {
  try {
    const resp = await fetch(
      `${HUB_URL}/api/chatbot/pending-reply?customer_id=${encodeURIComponent(customerId)}`,
      { signal: AbortSignal.timeout(2000) },
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.has_reply ? { reply: data.reply, convId: data.conv_id } : null;
  } catch {
    return null;
  }
}

/**
 * 관리자 답변 전달 완료 확인 (소비 처리)
 */
export async function ackPendingReply(customerId: string): Promise<void> {
  try {
    await fetch(
      `${HUB_URL}/api/chatbot/pending-reply?customer_id=${encodeURIComponent(customerId)}&ack=true`,
      { signal: AbortSignal.timeout(2000) },
    );
  } catch {
    // 소비 실패해도 다음번에 다시 전달되므로 무시
  }
}


/**
 * 상담원 모드 확인: 에스컬레이션된 고객이면 상담원 모드로 처리
 * - active=true → 상담원 모드 (AI 응답 안 함)
 * - has_reply=true → 관리자 답변 전달
 */
export interface AdminSessionResult {
  active: boolean;
  has_reply?: boolean;
  reply?: string;
  conv_id?: number;
}

export async function checkAdminSession(
  customerId: string,
  message: string,
): Promise<AdminSessionResult> {
  try {
    const params = new URLSearchParams({ customer_id: customerId, message });
    const resp = await fetch(`${HUB_URL}/api/chatbot/admin-session?${params}`, {
      method: 'POST',
      signal: AbortSignal.timeout(2000),
    });
    if (!resp.ok) return { active: false };
    return await resp.json();
  } catch {
    return { active: false };
  }
}

/**
 * 상담원 모드 종료 → 봇 모드로 전환
 */
export async function endAdminSession(convId: number): Promise<void> {
  try {
    await fetch(`${HUB_URL}/api/chatbot/conversations/${convId}/end-admin`, {
      method: 'POST',
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // fire-and-forget
  }
}
