/**
 * 제철삼촌 자사몰 라이브 QA — jaecheol.com 모바일 점검
 * 실행: npx playwright test live-site --project=모바일-세로
 */

import { test, expect, Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const LIVE_URL = 'https://jaecheol.com'

async function capture(page: Page, label: string) {
  const dir = 'tests/qa/screenshots/live'
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const filename = `${label}-${Date.now()}.png`
  await page.screenshot({ path: path.join(dir, filename), fullPage: true })
  return path.join(dir, filename)
}

test.use({ baseURL: LIVE_URL })

test('[자사몰] 홈 — 모바일 스크린샷 + 전체 점검', async ({ page }) => {
  await page.goto(LIVE_URL, { waitUntil: 'networkidle', timeout: 15000 })
  await capture(page, '홈-전체')

  // 에러 텍스트 없음
  const body = await page.locator('body').innerText()
  expect(body).not.toMatch(/undefined|NaN|500|404|Error:/i)
  expect(body).not.toMatch(/something went wrong|internal server error/i)
})

test('[자사몰] 버튼 터치 영역 44px 검사', async ({ page }) => {
  await page.goto(LIVE_URL, { waitUntil: 'networkidle', timeout: 15000 })

  const buttons = page.locator('button, a, [role="button"], input[type="submit"]')
  const count = await buttons.count()
  const tooSmall: string[] = []

  for (let i = 0; i < Math.min(count, 30); i++) {
    const btn = buttons.nth(i)
    if (!(await btn.isVisible())) continue
    const box = await btn.boundingBox()
    if (!box) continue
    if (box.height < 44 && box.width < 44) {
      const text = (await btn.innerText().catch(() => '')).trim().slice(0, 30)
      tooSmall.push(`"${text || '(no text)'}" h=${Math.round(box.height)}px w=${Math.round(box.width)}px`)
    }
  }

  if (tooSmall.length > 0) {
    console.log('\n[조작] 44px 미만 요소:')
    tooSmall.forEach(s => console.log(' -', s))
  }

  await capture(page, '버튼점검')
  // 경고만, 테스트는 계속
  console.log(`총 ${tooSmall.length}개 미달`)
})

test('[자사몰] 로드 속도 측정', async ({ page }) => {
  const start = Date.now()
  await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForFunction(() => document.body.innerText.trim().length > 10, { timeout: 10000 })
  const elapsed = Date.now() - start
  console.log(`\n[속도감] 로드 시간: ${elapsed}ms`)
  await capture(page, `속도-${elapsed}ms`)
})

test('[자사몰] 깨진 이미지 검사', async ({ page }) => {
  await page.goto(LIVE_URL, { waitUntil: 'networkidle', timeout: 15000 })

  const brokenImages = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img'))
      .filter(img => !img.complete || img.naturalWidth === 0)
      .map(img => img.src)
  })

  if (brokenImages.length > 0) {
    console.log('\n[신뢰] 깨진 이미지 (아임웹 관리자에서 수동 교체 필요):', brokenImages)
  }
  await capture(page, '이미지점검')
  // Google Drive 이미지는 아임웹 관리자 영역 — 경고만 출력, 테스트는 통과
  console.log(`총 ${brokenImages.length}개 깨진 이미지 발견`)
})

test('[자사몰] 텍스트 빽빽함 — 폰트 크기 점검', async ({ page }) => {
  await page.goto(LIVE_URL, { waitUntil: 'networkidle', timeout: 15000 })

  const smallTexts = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('p, span, a, button, li'))
    return elements
      .filter(el => {
        const style = window.getComputedStyle(el)
        const size = parseFloat(style.fontSize)
        const text = (el as HTMLElement).innerText?.trim()
        return size < 14 && text && text.length > 2
      })
      .slice(0, 10)
      .map(el => {
        const style = window.getComputedStyle(el)
        return `${parseFloat(style.fontSize)}px: "${(el as HTMLElement).innerText?.trim().slice(0, 20)}"`
      })
  })

  if (smallTexts.length > 0) {
    console.log('\n[이해] 14px 미만 텍스트:')
    smallTexts.forEach(s => console.log(' -', s))
  }
  console.log(`총 ${smallTexts.length}개 발견`)
  await capture(page, '폰트점검')
})
