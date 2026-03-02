(function () {
  var QUIZ_URL = 'https://jaecheol-am8im97ap-tom-452b758d.vercel.app/quiz';

  var style = document.createElement('style');
  style.textContent = [
    '#jc-quiz-btn{position:fixed;bottom:24px;right:24px;z-index:9998;background:#FACC15;border:none;border-radius:999px;padding:12px 18px;font-size:13px;font-weight:700;color:#1f2937;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.18);display:flex;align-items:center;gap:6px;transition:transform .15s,box-shadow .15s;}',
    '#jc-quiz-btn:hover{transform:scale(1.05);box-shadow:0 6px 20px rgba(0,0,0,.22);}',
    '#jc-quiz-overlay{display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);justify-content:center;align-items:flex-end;}',
    '#jc-quiz-overlay.open{display:flex;}',
    '#jc-quiz-sheet{background:#fff;border-radius:20px 20px 0 0;width:100%;max-width:480px;height:90dvh;overflow:hidden;display:flex;flex-direction:column;animation:jc-slide-up .3s ease;}',
    '@keyframes jc-slide-up{from{transform:translateY(100%)}to{transform:translateY(0)}}',
    '#jc-quiz-header{display:flex;justify-content:space-between;align-items:center;padding:14px 16px 10px;border-bottom:1px solid #f3f4f6;}',
    '#jc-quiz-header span{font-size:13px;font-weight:700;color:#374151;}',
    '#jc-quiz-close{background:none;border:none;font-size:20px;cursor:pointer;color:#9ca3af;line-height:1;padding:2px;}',
    '#jc-quiz-frame{flex:1;border:none;width:100%;}',
  ].join('');
  document.head.appendChild(style);

  var btn = document.createElement('button');
  btn.id = 'jc-quiz-btn';
  btn.innerHTML = '🍊 나에게 맞는 과일은?';
  document.body.appendChild(btn);

  var overlay = document.createElement('div');
  overlay.id = 'jc-quiz-overlay';
  overlay.innerHTML = [
    '<div id="jc-quiz-sheet">',
    '  <div id="jc-quiz-header">',
    '    <span>🍊 제철과일 추천 테스트</span>',
    '    <button id="jc-quiz-close">✕</button>',
    '  </div>',
    '  <iframe id="jc-quiz-frame" src="" allow="clipboard-write"></iframe>',
    '</div>',
  ].join('');
  document.body.appendChild(overlay);

  var frame = document.getElementById('jc-quiz-frame');
  var loaded = false;

  btn.addEventListener('click', function () {
    if (!loaded) { frame.src = QUIZ_URL; loaded = true; }
    overlay.classList.add('open');
  });

  document.getElementById('jc-quiz-close').addEventListener('click', function () {
    overlay.classList.remove('open');
  });

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) overlay.classList.remove('open');
  });
})();
