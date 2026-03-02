'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '안녕하세요 조카님! 🍊\n제철삼촌입니다. 무엇을 도와드릴까요?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
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
    <div className="flex flex-col bg-white max-w-lg mx-auto shadow-lg" style={{height:'100dvh',maxHeight:'-webkit-fill-available'}}>
      {/* 헤더 */}
      <div className="bg-yellow-400 px-4 py-3 flex items-center gap-3">
        <span className="text-3xl">🍊</span>
        <div>
          <p className="font-bold text-gray-800 text-sm">제철삼촌 고객센터</p>
          <p className="text-xs text-gray-700">운영시간 10:00 - 19:00</p>
        </div>
      </div>

      {/* 메시지 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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

      {/* 입력창 */}
      <div className="p-3 border-t bg-white flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          onFocus={() => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 300)}
          placeholder="메시지를 입력하세요..."
          className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-yellow-400"
        />
        <button
          onClick={send}
          disabled={loading}
          className="bg-yellow-400 text-gray-800 px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-40"
        >
          전송
        </button>
      </div>
    </div>
  );
}
