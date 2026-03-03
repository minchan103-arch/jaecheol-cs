/**
 * 제철삼촌 QA 에이전트 — 소비자 체크리스트
 *
 * qa.md의 4대 평가 기준을 자동으로 검사한다:
 * 1. 이해 — 처음 보는 사람이 3초 안에 이해할 수 있는가?
 * 2. 조작 — 다음에 뭘 눌러야 할지 바로 보이는가?
 * 3. 속도감 — 로딩이 답답하지 않은가?
 * 4. 신뢰 — 깨진 것 없이 제철삼촌처럼 보이는가?
 *
 * 실행: npx playwright test checklist --project=모바일-세로
 */

import { test, expect, Page } from '@playwright/test'
import path from 'path'

// 테스트할 페이지 목록
const PAGES = [
  { name: '홈', url: '/' },
  { name: '챗봇', url: '/chat' },
  { name: '퀴즈', url: '/quiz' },
  { name: '위젯', url: '/widget?mode=panel' },
]

// 스크린샷 저장 헬퍼
async function capture(page: Page, label: string) {
  const filename = `${label.replace(/\//g, '-')}-${Date.now()}.png`
  await page.screenshot({
    path: path.join('tests/qa/screenshots', filename),
    fullPage: true,
  })
}

// ─────────────────────────────────────────────
// 1. 이해: 처음 보는 사람이 3초 안에 알 수 있는가?
// ─────────────────────────────────────────────
for (const p of PAGES) {
  test(`[이해] ${p.name} — 페이지 제목/설명이 보이는가`, async ({ page }) => {
    await page.goto(p.url)
    await capture(page, `이해-${p.name}`)

    // 에러 텍스트 노출 금지 (영어 에러코드, 500, undefined 등)
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/undefined|NaN|null|Error:|500|404/i)

    // 영어 에러 메시지 노출 금지
    expect(body).not.toMatch(/something went wrong|internal server error/i)
  })
}

// ─────────────────────────────────────────────
// 2. 조작: 버튼이 손가락으로 누르기 충분한가? (44px 이상)
// ─────────────────────────────────────────────
for (const p of PAGES) {
  test(`[조작] ${p.name} — 버튼 터치 영역 44px 이상`, async ({ page }) => {
    await page.goto(p.url)

    // #__next 스코프로 제한해 Next.js 개발 오버레이 버튼 제외
    const buttons = page.locator('#__next button, #__next a[role="button"], #__next [type="submit"]')
    const count = await buttons.count()

    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i)
      if (!(await btn.isVisible())) continue

      const box = await btn.boundingBox()
      if (!box) continue

      // 44px 미만이면 경고 (테스트 실패로 처리)
      expect(
        box.height,
        `버튼 높이 부족: "${await btn.innerText()}" (${Math.round(box.height)}px)`
      ).toBeGreaterThanOrEqual(44)
    }
  })
}

// ─────────────────────────────────────────────
// 3. 속도감: 3초 안에 핵심 콘텐츠가 로드되는가?
// ─────────────────────────────────────────────
for (const p of PAGES) {
  test(`[속도감] ${p.name} — 3초 안에 로드`, async ({ page }) => {
    const start = Date.now()
    await page.goto(p.url, { waitUntil: 'domcontentloaded' })

    // 빈 화면(body에 텍스트 없음) 체크
    await page.waitForFunction(() => {
      const text = document.body.innerText.trim()
      return text.length > 10
    }, { timeout: 3000 })

    const elapsed = Date.now() - start
    await capture(page, `속도감-${p.name}-${elapsed}ms`)

    expect(elapsed, `로드 시간 ${elapsed}ms 초과`).toBeLessThan(3000)
  })
}

// ─────────────────────────────────────────────
// 4. 신뢰: 깨진 이미지, 레이아웃 이상 없는가?
// ─────────────────────────────────────────────
for (const p of PAGES) {
  test(`[신뢰] ${p.name} — 깨진 이미지 없음`, async ({ page }) => {
    await page.goto(p.url)
    await capture(page, `신뢰-${p.name}`)

    // 깨진 이미지 체크
    const brokenImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'))
      return imgs
        .filter(img => !img.complete || img.naturalWidth === 0)
        .map(img => img.src)
    })

    expect(brokenImages, `깨진 이미지: ${brokenImages.join(', ')}`).toHaveLength(0)
  })
}

// ─────────────────────────────────────────────
// 5. 브랜드 컬러: #77C1F6 (아임웹 전용) 사용 금지
// ─────────────────────────────────────────────
for (const p of PAGES) {
  test(`[신뢰] ${p.name} — 금지 컬러(#77C1F6) 미사용`, async ({ page }) => {
    await page.goto(p.url)

    const hasForbiddenColor = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'))
      return all.some(el => {
        const style = window.getComputedStyle(el)
        const bg = style.backgroundColor
        const color = style.color
        // rgb(119, 193, 246) = #77C1F6
        return bg.includes('119, 193, 246') || color.includes('119, 193, 246')
      })
    })

    expect(hasForbiddenColor, '#77C1F6 금지 컬러 사용됨').toBe(false)
  })
}
