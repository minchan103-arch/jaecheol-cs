import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { CS_SYSTEM_PROMPT } from '@/lib/cs-prompt';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userMessage = body.userRequest?.utterance || '';

    if (!userMessage) {
      return NextResponse.json(makeResponse('안녕하세요! 제철삼촌입니다 🍊\n무엇이든 편하게 물어보세요!'));
    }

    const result = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: CS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = result.content[0].type === 'text' ? result.content[0].text : '';

    if (text.startsWith('ESCALATE:')) {
      const customerMsg = text.replace('ESCALATE:', '').trim();
      console.log(`[에스컬레이션 필요] 고객 메시지: "${userMessage}"`);
      return NextResponse.json(makeResponse(customerMsg));
    }

    return NextResponse.json(makeResponse(text));

  } catch (error) {
    console.error('카카오 webhook 오류:', error);
    return NextResponse.json(
      makeResponse('일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요 🙏')
    );
  }
}

function makeResponse(text: string) {
  return {
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text } }],
    },
  };
}
