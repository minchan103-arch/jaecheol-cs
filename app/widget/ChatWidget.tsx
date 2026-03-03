'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  escalated?: boolean;
}

const KAKAO_URL = process.env.NEXT_PUBLIC_KAKAO_CHANNEL_URL ?? 'https://pf.kakao.com/_PmNqX/chat';

export default function ChatWidget({ platform, panelMode = false }: { platform: string; panelMode?: boolean }) {
  const [isOpen, setIsOpen] = useState(panelMode);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '안녕하세요 조카님 🍊\n제철삼촌입니다! 무엇이든 편하게 물어보세요.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  function handleClose() {
    setIsOpen(false);
    if (panelMode) window.parent.postMessage('close-chat', '*');
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, platform, sessionId, history }),
      });
      const data = await res.json();
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.reply, escalated: data.escalated },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요 🙏' },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">

      {/* ── 채팅 패널 ── */}
      {isOpen && (
        <div className="
          pointer-events-auto
          absolute
          inset-0 sm:inset-auto
          sm:bottom-[88px] sm:right-4
          sm:w-[360px] sm:max-w-[calc(100vw-32px)]
          sm:h-[500px] sm:max-h-[calc(100vh-120px)]
          sm:rounded-2xl
          bg-white shadow-2xl
          flex flex-col overflow-hidden
        ">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 bg-orange-500 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-lg">
                🍊
              </div>
              <div>
                <div className="font-bold text-sm leading-tight">제철삼촌 고객센터</div>
                <div className="text-xs opacity-80">평일 10:00 ~ 19:00</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* 상담사 연결 버튼 — 항상 표시 */}
              <a
                href={KAKAO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold no-underline"
                style={{ background: '#FEE500', color: '#191919' }}
              >
                💬 상담사 연결
              </a>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-orange-600 transition-colors text-white text-lg"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-orange-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-sm mr-2 mt-1 shrink-0">
                    🍊
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-orange-500 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                  {msg.escalated && (
                    <div className="mt-3">
                      <a
                        href={KAKAO_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl text-sm font-bold no-underline"
                        style={{ background: '#FEE500', color: '#191919' }}
                      >
                        💬 카카오 채널로 상담하기
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-sm mr-2 mt-1 shrink-0">
                  🍊
                </div>
                <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center">
                    {[0, 150, 300].map(delay => (
                      <div
                        key={delay}
                        className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* 입력 영역 */}
          <div className="px-3 py-3 bg-white border-t border-gray-100 shrink-0">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="문의 내용을 입력하세요..."
                className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="w-11 h-11 rounded-full bg-orange-500 text-white flex items-center justify-center text-lg disabled:opacity-40 hover:bg-orange-600 transition-colors shrink-0"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FAB — panelMode 또는 모바일 열린 상태에서 숨김 ── */}
      {!panelMode && (
        <button
          onClick={() => setIsOpen(prev => !prev)}
          className={`
            pointer-events-auto
            absolute bottom-5 right-5
            w-14 h-14 rounded-full
            bg-orange-500 hover:bg-orange-600
            text-2xl shadow-lg
            items-center justify-center
            transition-all duration-200
            active:scale-95
            ${isOpen ? 'hidden sm:flex' : 'flex'}
          `}
          aria-label={isOpen ? '챗봇 닫기' : '제철삼촌 고객센터 열기'}
        >
          🍊
        </button>
      )}

    </div>
  );
}
