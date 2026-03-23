const NTFY_TOPIC = process.env.NTFY_TOPIC || 'jaecheol-kitchen-2026';

interface NotifyChatParams {
  platform: string;
  message: string;
  escalated: boolean;
}

export async function notifyChat({ platform, message, escalated }: NotifyChatParams): Promise<void> {
  if (!NTFY_TOPIC) return;

  const tag = escalated ? '🚨 에스컬레이션' : '💬 새 문의';
  const preview = message.length > 80 ? message.slice(0, 80) + '…' : message;

  await fetch('https://ntfy.sh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: NTFY_TOPIC,
      title: `${tag} [${platform}]`,
      message: preview,
      priority: escalated ? 4 : 3,
      tags: escalated ? ['rotating_light', 'speech_balloon'] : ['speech_balloon'],
    }),
  });
}
