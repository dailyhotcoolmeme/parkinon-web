import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // 정식 오픈 때 콘텐츠 사이트(site/, Astro)가 루트를 맡고 이 앱은 /app/ 로 옮긴다
  // (website-plan.md "parkinon.com/app/… → 기존 기록보기"). /api/* 는 절대경로라 영향 없음.
  base: '/app/',
  plugins: [react()],
})
