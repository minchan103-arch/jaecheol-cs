'use client';

import { useEffect, useState } from 'react';

export default function KakaoAuthPage() {
  const [code, setCode] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const REST_API_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY ?? '';
  const REDIRECT_URI = typeof window !== 'undefined'
    ? `${window.location.origin}/kakao-auth`
    : '';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get('code');
    if (c) setCode(c);
  }, []);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    fetch(`/api/kakao-token?code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`)
      .then(r => r.json())
      .then(data => {
        setResult(JSON.stringify(data, null, 2));
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [code]);

  const startAuth = () => {
    const url = `https://kauth.kakao.com/oauth/authorize?client_id=${REST_API_KEY}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=talk_message`;
    window.location.href = url;
  };

  return (
    <div style={{ fontFamily: 'monospace', padding: 40, maxWidth: 600 }}>
      <h2 style={{ color: '#FF4910' }}>카카오 Refresh Token 발급기</h2>
      <p style={{ color: '#666', fontSize: 14 }}>한 번만 실행하면 됩니다. 발급된 토큰을 .env.local에 넣으세요.</p>
      <hr />

      {!code && !result && (
        <button
          onClick={startAuth}
          style={{
            marginTop: 24,
            padding: '14px 28px',
            background: '#FEE500',
            color: '#000',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          카카오 로그인으로 토큰 발급받기
        </button>
      )}

      {loading && <p style={{ marginTop: 24 }}>토큰 교환 중...</p>}

      {error && (
        <div style={{ marginTop: 24, color: 'red' }}>
          <strong>오류:</strong> {error}
        </div>
      )}

      {result && (() => {
        let parsed: Record<string, string> = {};
        try { parsed = JSON.parse(result); } catch {}
        const refreshToken = parsed.refresh_token;
        return (
          <div style={{ marginTop: 24 }}>
            {refreshToken ? (
              <>
                <p style={{ color: 'green', fontWeight: 'bold' }}>✅ 발급 성공!</p>
                <p style={{ marginTop: 8 }}>.env.local에 아래 값을 넣으세요:</p>
                <pre style={{
                  background: '#f4f4f4',
                  padding: 16,
                  borderRadius: 8,
                  wordBreak: 'break-all',
                  fontSize: 13,
                }}>
                  KAKAO_REFRESH_TOKEN={refreshToken}
                </pre>
              </>
            ) : (
              <>
                <p style={{ color: 'red' }}>토큰 발급 실패. 전체 응답:</p>
                <pre style={{ background: '#fff0f0', padding: 16, borderRadius: 8, fontSize: 13 }}>{result}</pre>
                <p style={{ fontSize: 13, color: '#666' }}>
                  실패 원인: 카카오 개발자 콘솔에서 Redirect URI 등록이 필요합니다.<br />
                  카카오 로그인 → 일반 → Redirect URI에 아래 주소 추가:<br />
                  <strong>{REDIRECT_URI}</strong>
                </p>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}
