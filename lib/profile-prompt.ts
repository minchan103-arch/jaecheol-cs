import type { ProfileRow } from './profile';

export function buildProfilePrompt(
  profile: ProfileRow | null,
  isFirstMessage: boolean
): string {
  if (profile) {
    const parts = ['[조카님 프로필 정보]'];
    if (profile.occupation) parts.push(`- 직업: ${profile.occupation}`);
    if (profile.ageRange) parts.push(`- 연령대: ${profile.ageRange}`);
    if (profile.purpose) parts.push(`- 구매목적: ${profile.purpose}`);
    if (profile.taste) parts.push(`- 맛취향: ${profile.taste}`);
    if (profile.notification) parts.push(`- 알림선호: ${profile.notification}`);
    if (profile.quizResult) parts.push(`- 과일 추천 결과: ${profile.quizResult}`);

    parts.push('');
    parts.push('위 정보를 참고해서 맞춤형으로 답변해.');
    parts.push('- 구매목적이 "선물용"이면 포장/가격대를 강조해.');
    parts.push('- 맛취향에 맞는 과일을 우선 추천해.');
    parts.push('- 연령대와 직업에 맞게 톤을 미세 조정해 (20대는 좀 더 캐주얼, 50대+는 좀 더 정중).');
    parts.push('- 프로필 정보를 직접 언급하지 말고 자연스럽게 활용해.');

    return '\n\n' + parts.join('\n');
  }

  if (isFirstMessage) {
    return `

[프로필 수집 가이드]
이 조카님의 프로필 정보가 아직 없어.
첫 대화에서 자연스럽게 환영하면서, 대화 흐름에 맞을 때 아래 정보를 슬쩍 물어봐:
1. "혹시 조카님은 평소에 어떤 과일을 좋아하세요?" (맛취향 파악)
2. "본인이 드실 건가요, 선물용이신가요?" (구매목적)

한 번에 다 물어보지 말고, 대화 흐름에 자연스럽게 1~2개만 물어봐.
절대 설문조사처럼 느끼게 하지 마.
질문할 때는 "삼촌이 조카님한테 맞는 과일을 더 잘 골라드리려고 여쭤보는 거예요 😊" 같은 이유를 붙여.

조카님이 답한 내용에서 프로필 정보를 추출했다면, 답변의 맨 마지막 줄에 다음 형식으로 남겨:
PROFILE_DATA:{"taste":"달달한","purpose":"가족용"}
(이 줄은 조카님에게 보이지 않고 시스템에서만 사용됨)
가능한 키: occupation(주부/직장인/학생/자영업), ageRange(20대/30대/40대/50대+), purpose(본인용/선물용/가족용), taste(달달한/새콤한/건강한/프리미엄)
`;
  }

  return '';
}
