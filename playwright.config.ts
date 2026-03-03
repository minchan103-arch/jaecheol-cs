import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/qa',
  fullyParallel: false,
  retries: 0,
  workers: 1,

  // 스크린샷 + HTML 리포트
  reporter: [
    ['html', { outputFolder: 'tests/qa/report', open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'on',      // 항상 스크린샷 저장
    video: 'retain-on-failure',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  },

  projects: [
    // QA 에이전트 우선순위 1: 모바일 세로 (제철삼촌 주 타겟)
    {
      name: '모바일-세로',
      use: {
        ...devices['Galaxy S9+'],
        viewport: { width: 390, height: 844 },
      },
    },

    // 우선순위 2: 모바일 가로
    {
      name: '모바일-가로',
      use: {
        ...devices['Galaxy S9+'],
        viewport: { width: 844, height: 390 },
      },
    },

    // 우선순위 3: PC
    {
      name: 'PC',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],

  // 테스트 전 dev 서버 자동 시작
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30000,
  },
})
