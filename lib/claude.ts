import Anthropic from '@anthropic-ai/sdk';
import { CS_SYSTEM_PROMPT } from './cs-prompt';
import { getWeeklyBox, getStockStatus } from './weekly-box';
import { buildProfilePrompt } from './profile-prompt';
import { getCustomerContext, formatContextForPrompt, getLearnedContext, sendPatternFeedback } from './hub-api';
import type { ProfileRow } from './profile';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  reply: string;
  escalate: boolean;
  escalateReason: string;
}

const FRUIT_KEYWORDS = ['과일', '제철', '뭐 들어', '입고', '이번 주', '이번주', '박스', '뭐 있', '어떤 과일', '레드향', '한라봉', '천혜향', '딸기', '사과', '귤', '감귤', '예약', '주문', '참외', '수박', '복숭아', '포도', '감', '배', '토마토', '추천', '상품', '뭐 팔', '뭐 파', '뭘 팔', '뭘 파', '어떤 상품', '메뉴'];

const ORDER_KEYWORDS = ['주문', '배송', '송장', '택배', '언제 와', '언제 오', '도착', '출발', '발송', '어디까지', '추적', '운송장', '내 주문', '주문 확인', '배송 조회', '몇 시', '받을 수', '안 왔', '안왔'];

function matchesFruitQuery(message: string): boolean {
  return FRUIT_KEYWORDS.some(kw => message.includes(kw));
}

function matchesOrderQuery(message: string): boolean {
  // 주문 키워드 매칭 OR 전화번호만 보낸 경우 (주문 조회 의도)
  if (ORDER_KEYWORDS.some(kw => message.includes(kw))) return true;
  // 전화번호만 보낸 메시지 → 주문 조회 의도로 간주
  const trimmed = message.replace(/[-\s]/g, '');
  if (/^01[0-9]\d{7,8}$/.test(trimmed)) return true;
  return false;
}

/** 메시지에서 전화번호 패턴 추출 */
function extractPhone(message: string, history: ChatMessage[]): string | null {
  const allText = [...history.map(h => h.content), message].join(' ');
  // 010-1234-5678 또는 01012345678 패턴
  const match = allText.match(/01[0-9][-\s]?\d{3,4}[-\s]?\d{4}/);
  return match ? match[0].replace(/[-\s]/g, '') : null;
}

/** 메시지에서 이름 추출 */
function extractName(message: string): string | null {
  const patterns = [
    /(?:이름|성함)(?:은|이|는)?\s*([가-힣]{2,4})/,
    /([가-힣]{2,4})(?:입니다|이요|이에요|인데요)/,
    /([가-힣]{2,4})(?:으로|로)\s*(?:시켰|주문|보냈|했)/,   // "안미연으로 시켰어"
    /([가-힣]{2,4})\s*(?:이름으로|명의로)/,                  // "안미연 이름으로"
  ];
  for (const p of patterns) {
    const m = message.match(p);
    if (m) return m[1];
  }
  return null;
}

async function buildWeeklyBoxContext(): Promise<string> {
  try {
    const data = await getWeeklyBox();
    if (!data.items.length) {
      return '\n\n[이번 주 박스 정보]\n현재 이번 주 박스를 준비 중입니다. 아직 입고 과일이 확정되지 않았어요.';
    }

    const lines = data.items.map(item => {
      const status = getStockStatus(item);
      const badge = status === 'soldout' ? '(마감)' : status === 'closing' ? '(마감임박🔥)' : '';
      return `- ${item.name} | 산지: ${item.origin} | ${item.price} ${badge}${item.orderUrl ? ` | 주문: ${item.orderUrl}` : ''}`;
    });

    return `\n\n[이번 주 박스 정보 - 실시간 데이터]
마감일: ${data.deadline}
${lines.join('\n')}

위 정보를 활용해서 자연스럽게 답변해. 마감 임박 과일은 서두르라고 알려주고, 마감된 과일은 다음 주를 안내해. 주문 링크도 함께 알려줘.`;
  } catch {
    return '';
  }
}

async function buildOrderContext(message: string, history: ChatMessage[], profile: ProfileRow | null): Promise<string> {
  // 프로필에서 전화번호 가져오기
  const phone = profile?.phone || extractPhone(message, history);
  const name = extractName(message) || profile?.nickname || null;

  if (!phone && !name) {
    return '\n\n[주문 조회 요청 감지 — 고객 식별 불가]\n고객의 전화번호를 물어봐서 주문을 조회해줘. "조카님, 주문 확인해드릴게요! 주문하실 때 입력하신 전화번호 알려주시겠어요? 😊"';
  }

  try {
    const ctx = await getCustomerContext(phone || undefined, name || undefined);
    if (!ctx || !ctx.found) {
      return `\n\n[주문 조회 결과 — 데이터 없음]\n${phone ? `전화번호 ${phone}` : `이름 ${name}`}(으)로 주문 내역을 찾을 수 없음. "조카님, 해당 ${phone ? '번호' : '이름'}로 주문 내역을 찾지 못했어요 😅 혹시 다른 번호로 주문하셨나요?" 라고 안내해.`;
    }
    return formatContextForPrompt(ctx);
  } catch {
    return `\n\n[주문 조회 시스템 일시 오류]\n주문 조회를 시도했지만 시스템이 일시적으로 응답하지 않음. "조카님, 지금 주문 조회 시스템이 잠깐 느려서 확인이 안 되고 있어요 😅 잠시 후 다시 시도해주시거나, 삼촌이 직접 확인해드릴게요!" 라고 안내해.`;
  }
}

export interface ProfileContext {
  profile: ProfileRow | null;
  isFirstMessage: boolean;
}

export interface ChatResultWithProfile extends ChatResult {
  extractedProfile?: Record<string, string>;
  usedPatternIds?: number[];
}

export async function getChatResponse(
  message: string,
  history: ChatMessage[] = [],
  profileContext?: ProfileContext,
  options?: { maxTokens?: number; skipContext?: boolean; platform?: string }
): Promise<ChatResultWithProfile> {
  let systemPrompt = CS_SYSTEM_PROMPT;

  // 플랫폼별 에스컬레이션 안내 분기
  if (options?.platform === '카카오채널') {
    systemPrompt += `\n\n[현재 플랫폼: 카카오 채널]
고객이 이미 카카오 채널에서 대화 중이므로, 카카오 링크(https://pf.kakao.com/...)를 절대 보내지 마.
에스컬레이션 시: "조카님, 삼촌이 직접 확인해서 답변드릴게요! 😊 잠시만 기다려주시면 삼촌이 직접 연락드리겠습니다 🙏"
카카오 링크 안내 금지. "기다려달라"는 말만 해.`;
  }

  let usedPatternIds: number[] = [];

  if (!options?.skipContext) {
    // 컨텍스트 조회를 병렬로 실행 (타임아웃 절약)
    const contextPromises: Promise<void>[] = [];

    // 과일/상품 관련 → 주간박스 컨텍스트
    if (matchesFruitQuery(message)) {
      contextPromises.push(
        buildWeeklyBoxContext().then(ctx => { systemPrompt += ctx; })
      );
    }

    // 주문/배송 관련 → 주문 데이터 컨텍스트
    if (matchesOrderQuery(message)) {
      contextPromises.push(
        buildOrderContext(message, history, profileContext?.profile || null)
          .then(ctx => { systemPrompt += ctx; })
      );
    }

    // 학습 패턴 조회 (Phase 2+)
    contextPromises.push(
      getLearnedContext(message).then(learned => {
        if (learned && learned.patterns.length > 0) {
          const patternLines = learned.patterns.map(
            p => `- Q: "${p.question}" → A: "${p.answer}" (신뢰도: ${p.confidence})`
          );
          systemPrompt += `\n\n[학습된 CS 패턴 — 참고하되, 상황에 맞게 자연스럽게 변형해서 답변]\n${patternLines.join('\n')}`;
          usedPatternIds = learned.patterns.map(p => p.id);
        }
      }).catch(() => { /* 학습 패턴 조회 실패 — 무시 */ })
    );

    await Promise.all(contextPromises);
  }

  // 프로필 컨텍스트 주입
  if (profileContext) {
    systemPrompt += buildProfilePrompt(profileContext.profile, profileContext.isFirstMessage);
  }

  // 최근 15개 메시지만 전송: 토큰 비용 절감 + Claude 컨텍스트 윈도우 보호.
  const MAX_HISTORY = 15;
  const trimmedHistory = history.length > MAX_HISTORY
    ? history.slice(-MAX_HISTORY)
    : history;

  const messages = [
    ...trimmedHistory.map(h => ({ role: h.role, content: h.content })),
    { role: 'user' as const, content: message },
  ];

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: options?.maxTokens || 1024,
    system: systemPrompt,
    messages,
  });

  let text =
    response.content[0].type === 'text' ? response.content[0].text.trim() : '';

  // PROFILE_DATA 태그 추출 (조카님에게 보이지 않는 시스템 태그)
  let extractedProfile: Record<string, string> | undefined;
  const profileMatch = text.match(/\nPROFILE_DATA:(\{.*\})\s*$/);
  if (profileMatch) {
    try {
      extractedProfile = JSON.parse(profileMatch[1]);
      text = text.replace(/\nPROFILE_DATA:\{.*\}\s*$/, '').trim();
    } catch { /* 파싱 실패 무시 */ }
  }

  // cs-prompt.ts 형식에 맞춰 ESCALATE: 접두사로 에스컬레이션 판단
  if (text.startsWith('ESCALATE:')) {
    // Claude가 멘트를 자의적으로 바꾸지 못하게 고정 응답 사용
    const fixedReply = '삼촌에게 연결되었습니다! 😊 문의사항을 말씀해주시면 삼촌이 직접 답변드릴게요 🙏';
    return { reply: fixedReply, escalate: true, escalateReason: '에스컬레이션 필요', extractedProfile, usedPatternIds };
  }

  return { reply: text, escalate: false, escalateReason: '', extractedProfile, usedPatternIds };
}
