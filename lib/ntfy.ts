const NTFY_TOPIC = process.env.NTFY_TOPIC || 'jaecheol-kitchen-2026';
const NTFY_PARTNER_TOPIC = process.env.NTFY_PARTNER_TOPIC || '';

interface NotifyChatParams {
  platform: string;
  message: string;
  escalated: boolean;
}

async function sendToTopic(topic: string, payload: Record<string, unknown>): Promise<void> {
  if (!topic) return;
  try {
    await fetch('https://ntfy.sh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, topic }),
    });
  } catch {
    // 파트너 토픽 실패해도 무시
  }
}

export async function notifyChat({ platform, message, escalated }: NotifyChatParams): Promise<void> {
  const tag = escalated ? '🚨 에스컬레이션' : '💬 새 문의';
  const preview = message.length > 80 ? message.slice(0, 80) + '…' : message;

  const payload = {
    title: `${tag} [${platform}]`,
    message: preview,
    priority: escalated ? 4 : 3,
    tags: escalated ? ['rotating_light', 'speech_balloon'] : ['speech_balloon'],
  };

  await Promise.all([
    sendToTopic(NTFY_TOPIC, payload),
    sendToTopic(NTFY_PARTNER_TOPIC, payload),
  ]);
}
