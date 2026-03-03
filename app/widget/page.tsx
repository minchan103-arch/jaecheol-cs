import ChatWidget from './ChatWidget';

// ?platform=naver | mall | infocrm | kakao
export default async function WidgetPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string }>;
}) {
  const { platform = 'mall' } = await searchParams;
  return <ChatWidget platform={platform} />;
}
