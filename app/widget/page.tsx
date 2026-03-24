import ChatWidget from './ChatWidget';

// ?platform=naver | mall | infocrm | kakao
// ?mode=panel → FAB 숨기고 패널만 표시 (아임웹 iframe 삽입용)
// ?name=수연조카님 → 로그인 회원 호칭
export default async function WidgetPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; mode?: string; name?: string }>;
}) {
  const { platform = 'mall', mode, name } = await searchParams;
  return <ChatWidget platform={platform} panelMode={mode === 'panel'} memberName={name} />;
}
