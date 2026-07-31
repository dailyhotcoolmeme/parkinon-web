# parkinon.com 웹사이트

## ⚠️ 이 폴더로 세션을 열면 맥락이 반쯤 빠진다

파킨온의 **메모리와 프로젝트 지침(`CLAUDE.md`)은 앱 저장소에만** 붙어 있다.

```
/Users/ourmine/dev/parkinon-app
```

이 폴더(`parkinon-web`)로 열면 국가·수익화 구분, 알림 시스템 규칙, 녹음 6개월 삭제
기한 같은 것이 하나도 로드되지 않는다. **웹 작업이라도 앱 폴더에서 여는 편이 낫다.**
지난 세션도 `parkinon-app` 에서 열고 이 저장소를 읽고 커밋까지 다 했다.

이미 이 폴더로 열었다면, 아래 두 개를 먼저 읽어라.

1. `/Users/ourmine/dev/parkinon-app/CLAUDE.md` — 프로젝트 전체 규칙
2. `docs/website-plan.md` — 웹사이트 계획 (맨 위 "새 세션은 여기서부터")

---

## 이 저장소는 무엇인가

Vite + React 19 SPA 를 Cloudflare Pages 로 배포한다.

| 경로 | 내용 |
|---|---|
| `/` | 6자리 코드 입력 (앱 → PC 기록보기 진입점) |
| `/records/*` | 기록 보기 |
| `/admin` | 관리자 |
| `/about` `/terms` `/privacy` `/delete-account` | 정적 HTML · 4개 언어(ko·en·fr·ja) |
| `/api/*` | Cloudflare Pages Functions |

**앞으로 할 일은 이 사이트를 SEO 콘텐츠 사이트로 키우는 것이다.** 계획은
`docs/website-plan.md` 에 있고, 아직 설계 단계라 코드는 시작하지 않았다.

⚠️ **앱 기준을 웹에 가져다 붙이지 말 것.**
- 웹은 회원가입이 없어 **유럽 대리인이 필요 없다.** 앱은 건강정보를 매일 수집해 기준이 다르다.
- 웹은 **한국에도 광고를 넣는다.** 앱은 한국에 광고가 없다.

이 둘을 섞어서 같은 질문에 답이 계속 바뀐 적이 있다(2026-08-01, 오너가 크게 지적).
