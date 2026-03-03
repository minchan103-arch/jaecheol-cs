import Anthropic from '@anthropic-ai/sdk';
import { CS_SYSTEM_PROMPT } from './cs-prompt';

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

export async function getChatResponse(
  message: string,
  history: ChatMessage[] = []
): Promise<ChatResult> {
  const messages = [
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user' as const, content: message },
  ];

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: CS_SYSTEM_PROMPT,
    messages,
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text.trim() : '';

  // cs-prompt.ts 형식에 맞춰 ESCALATE: 접두사로 에스컬레이션 판단
  if (text.startsWith('ESCALATE:')) {
    const reply = text.slice('ESCALATE:'.length).trim();
    return { reply, escalate: true, escalateReason: '에스컬레이션 필요' };
  }

  return { reply: text, escalate: false, escalateReason: '' };
}
