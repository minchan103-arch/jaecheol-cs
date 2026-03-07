import Anthropic from '@anthropic-ai/sdk';
import { CS_SYSTEM_PROMPT } from './cs-prompt';
import { getWeeklyBox, getStockStatus } from './weekly-box';
import { buildProfilePrompt } from './profile-prompt';
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

const FRUIT_KEYWORDS = ['과일', '제철', '뭐 들어', '입고', '이번 주', '이번주', '박스', '뭐 있', '어떤 과일', '레드향', '한라봉', '천혜향', '딸기', '사과', '귤', '감귤', '예약', '주문'];

function matchesFruitQuery(message: string): boolean {
  return FRUIT_KEYWORDS.some(kw => message.includes(kw));
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

export interface ProfileContext {
  profile: ProfileRow | null;
  isFirstMessage: boolean;
}

export interface ChatResultWithProfile extends ChatResult {
  extractedProfile?: Record<string, string>;
}

export async function getChatResponse(
  message: string,
  history: ChatMessage[] = [],
  profileContext?: ProfileContext
): Promise<ChatResultWithProfile> {
  let systemPrompt = CS_SYSTEM_PROMPT;

  if (matchesFruitQuery(message)) {
    const weeklyContext = await buildWeeklyBoxContext();
    systemPrompt += weeklyContext;
  }

  // 프로필 컨텍스트 주입
  if (profileContext) {
    systemPrompt += buildProfilePrompt(profileContext.profile, profileContext.isFirstMessage);
  }

  const messages = [
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user' as const, content: message },
  ];

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
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
    const reply = text.slice('ESCALATE:'.length).trim();
    return { reply, escalate: true, escalateReason: '에스컬레이션 필요', extractedProfile };
  }

  return { reply: text, escalate: false, escalateReason: '', extractedProfile };
}
