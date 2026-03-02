'use client';

import { useState, useRef, useEffect } from 'react';

// 카카오톡 채널 개설 후 실제 URL로 교체하세요 (예: https://pf.kakao.com/_xxxxx/chat)
const KAKAO_URL = 'https://pf.kakao.com/_replace';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  escalated?: boolean;
}

const QUICK_REPLIES = [
  { emoji: '🚚', label: '배송 문의' },
  { emoji: '📦', label: '상품/원산지' },
  { emoji: '🔄', label: '교환/반품' },
  { emoji: '🎁', label: '선물/단체주문' },
  { emoji: '💬', label: '기타 문의' },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '안녕하세요 조카님! 🍊\n제철삼촌입니다. 무엇을 도와드릴까요?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 키보드 올라올 때 실제 보이는 영역 높이로 컨테이너 조정 (iOS 대응)
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      if (containerRef.current) {
        containerRef.current.style.height = vv.height + 'px';
      }
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setShowQuickReplies(false);
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text.trim() }]);
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), history }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, escalated: data.escalated }]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '오류가 발생했습니다. 다시 시도해 주세요 🙏' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col bg-white max-w-lg mx-auto shadow-lg" style={{height:'100dvh',maxHeight:'-webkit-fill-available'}}>
      {/* 헤더 */}
      <div className="bg-yellow-400 px-4 py-3 flex items-center gap-3">
        <span className="text-3xl">🍊</span>
        <div className="flex-1">
          <p className="font-bold text-gray-800 text-sm">제철삼촌 고객센터</p>
          <p className="text-xs text-gray-700">운영시간 10:00 - 19:00</p>
        </div>
        <a
          href={KAKAO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 bg-white text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm"
          style={{ touchAction: 'manipulation' }}
        >
          👨 상담사 연결
        </a>
      </div>

      {/* 메시지 */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div key={i}>
              <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <span className="text-xl mr-2 self-end">🍊</span>
                )}
                <div
                  className={`max-w-[78%] px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-yellow-400 text-gray-800 rounded-br-sm'
                      : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>

              {/* 에스컬레이션 시 상담사 연결 버튼 */}
              {msg.escalated && (
                <div className="mt-2 ml-9">
                  <a
                    href={KAKAO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-yellow-400 text-gray-800 text-xs font-bold px-4 py-2 rounded-full shadow-sm active:scale-95 transition-all"
                    style={{ touchAction: 'manipulation' }}
                  >
                    💬 카카오톡 상담사 연결하기
                  </a>
                </div>
              )}

              {/* 첫 인사 아래 빠른 선택 버튼 */}
              {i === 0 && showQuickReplies && (
                <div className="mt-3 ml-9 flex flex-wrap gap-2">
                  {QUICK_REPLIES.map(qr => (
                    <button
                      key={qr.label}
                      onClick={() => sendMessage(`${qr.emoji} ${qr.label}`)}
                      className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm active:scale-95 transition-all"
                      style={{ touchAction: 'manipulation' }}
                    >
                      <span>{qr.emoji}</span>
                      <span>{qr.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <span className="text-xl mr-2">🍊</span>
              <div className="bg-white px-4 py-2 rounded-2xl rounded-bl-sm text-sm text-gray-400 shadow-sm">
                답변 작성 중...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* 입력창 */}
      <div className="p-3 border-t bg-white flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
          onFocus={() => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)}
          placeholder="메시지를 입력하세요..."
          className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-yellow-400"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading}
          className="bg-yellow-400 text-gray-800 px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-40"
        >
          전송
        </button>
      </div>
    </div>
  );
}
