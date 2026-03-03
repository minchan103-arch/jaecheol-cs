// /widget 전용 레이아웃
// 아임웹 iframe embed 시 배경이 투명하게 보이도록 body를 transparent로 설정
export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        html, body {
          background: transparent !important;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
      `}</style>
      {children}
    </>
  );
}
