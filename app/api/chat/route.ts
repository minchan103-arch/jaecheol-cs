import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { CS_SYSTEM_PROMPT } from '@/lib/cs-prompt';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function logToSheets(userMessage: string, botReply: string, escalated: boolean) {
  const webhookUrl = process.env.SHEETS_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage, botReply, escalated }),
    });
  } catch {
    // 로깅 실패는 무시
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json();

    const messages = [
      ...history,
      { role: 'user' as const, content: message },
    ];

    const result = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: CS_SYSTEM_PROMPT,
      messages,
    });

    const text = result.content[0].type === 'text' ? result.content[0].text : '';
    const isEscalate = text.startsWith('ESCALATE:');
    const reply = isEscalate ? text.replace('ESCALATE:', '').trim() : text;

    logToSheets(message, reply, isEscalate); // fire-and-forget

    if (isEscalate) {
      console.log(`[에스컬레이션 필요] 웹사이트 채팅 - 메시지: "${message}"`);
    }

    return NextResponse.json({ reply, escalated: isEscalate });

  } catch (error) {
    console.error('채팅 API 오류:', error);
    return NextResponse.json(
      { reply: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요 🙏', escalated: false },
      { status: 500 }
    );
  }
}
