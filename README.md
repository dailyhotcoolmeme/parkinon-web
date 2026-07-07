# 파킨온 웹 (parkinon.com)

파킨슨 환자와 보호자를 위한 기록 보기 웹. 파킨온 앱에서 발급한 1회용 매직 링크로 로그인합니다.

## 로컬 실행

```bash
cp .env.example .env  # Supabase URL/Anon Key 채우기
npm install
npm run dev
```

http://localhost:5173 에서 확인. 단, 토큰 교환 실제 테스트는 앱에서 발급한 링크가 필요합니다.

## 빌드 / 배포

```bash
npm run build                                       # dist/ 생성
wrangler pages deploy dist --project-name parkinon-web --branch main
```

Cloudflare Pages 프로젝트: `parkinon-web` (production branch: `main`)
배포 URL: https://parkinon-web.pages.dev
커스텀 도메인: parkinon.com (CF 대시보드에서 연결)

## 환경변수

| Key | 설명 |
|-----|------|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |

Vite는 빌드 타임에 `.env`를 번들에 박아넣으므로 로컬 빌드 시 `.env`가 필요합니다.

## 라우트

| 경로 | 설명 |
|------|------|
| `/` | 랜딩 |
| `/r/:token` | 매직토큰 교환 → `/records` |
| `/records` | 전체 기록 트렌드 (4개 차트) |
| `/records/medication` | 약 복용 상세 + 약 변경 ReferenceLine |
| `/records/symptom` | 몸 상태 (직후/30분/2시간 3라인) |
| `/records/on-off` | 약효 On 비율 |
| `/records/exercise` | 운동 (분) |
| `/records/family/:userId` | 보호자가 환자 기록 열람 |
| `/records/export` | PDF 다운로드 |

## 차트 동기화

모든 차트는 `RangeContext`로 기간(`range`)과 Brush 인덱스(`brushIndex`)를 공유합니다. 한 차트의 Brush 이동이 같은 페이지 안 다른 차트에 반영됩니다.

## 의존성

- React 19 + TypeScript + Vite
- React Router 7
- Recharts (LineChart + Brush + ReferenceLine)
- Supabase JS v2
- jspdf + html2canvas (PDF)
- dayjs
