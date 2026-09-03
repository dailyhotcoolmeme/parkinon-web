# 연구 논문(초록) 번역 규칙 — 절대 어기지 말 것

🚨 이 문서를 읽지 않고 `paper_translations` 테이블에 행을 넣지 마라.
2026-09-03에 이 규칙을 모르고 무관한 논문 29건을 5개 언어에 잘못 채웠다가
오너가 지적해 전부 지운 사고가 있었다. **다시 반복하면 안 된다.**

## 규칙 (오너 확정, 2026-09-03)

**그 언어를 쓰는 나라에서 나온, `pub_year = 2026`인 논문만 그 언어로 번역한다.**

| 언어(locale) | 나라 태그(`paper_countries.country_code`) |
|---|---|
| `ko` | `kr` |
| `ja` | `jp` |
| `fr` | `fr` |
| `pt` | `br` |
| `es` | `mx`·`cl`·`ar`·`co`·`pe` (스페인 `es`는 **제외** — 중남미만) |

**아닌 것 — 절대 하지 마라.**

- ❌ "화면에 뜨는 논문 전체"(전체 탭 15편 + 나라 탭 14개×15편)를 기준으로 삼는 것.
  화면 로직과 번역 범위는 **다른 축**이다. 화면엔 미국·독일 논문도 뜨지만 한국어로
  번역하지 않는다 — 영어 원문 그대로 나오는 게 정상이다.
- ❌ 나라 태그가 없는(`paper_countries`에 행이 없는) 논문을 아무 언어로나 번역하는 것.
  태그가 없으면 **어느 언어로도 번역하지 않는다.**
- ❌ 연도를 2026 밖으로 넓히는 것. 2025년 이하는 태그가 맞아도 번역하지 않는다.
- ❌ 한 논문이 여러 나라에 태그돼 있다고 그 나라 수만큼 언어를 다 채우는 것.
  태그된 나라의 언어만 채운다(예: `fr,de` 태그면 프랑스어만 — 독일어 언어판 자체가 없다).

## 왜 이렇게 하는가 (검증 근거)

2026-09-03에 기존 번역(ko 10편·ja 5편, 그 전 세션이 넣은 것)을 실제 나라 태그와
대조했더니 **예외 없이 100% 일치**했다 — ko 10편 전부 `kr` 태그, ja 5편 전부 `jp` 태그.
이 세션들이 이 규칙을 명시적으로 기록해 두진 않았지만 실제로는 정확히 이 규칙대로
일해 왔다는 뜻이다. 그런데 그 기록이 어디에도 남아 있지 않아서(`website-plan.md`에는
"나라별 번역 콘텐츠(구조는 있음, 내용 작업 전)"라는 한 줄만 있었다) 2026-09-03 세션이
이 규칙을 모른 채 "화면에 뜨는 전체"로 잘못 짐작했다 — 그래서 이 문서를 만든다.

## 지금 남은 것 확인하는 법 (Supabase SQL)

```sql
-- 언어별로 "나라 태그는 맞는데 아직 그 언어로 번역이 없는" 2026년 논문
with rule as (
  select 'ko' locale, array['kr'] countries
  union all select 'ja', array['jp']
  union all select 'fr', array['fr']
  union all select 'pt', array['br']
  union all select 'es', array['mx','cl','ar','co','pe']
)
select r.locale, p.pmid, p.title_en
from rule r
join paper_countries c on c.country_code = any(r.countries)
join research_papers p on p.pmid = c.pmid and p.pub_year = '2026'
where not exists (
  select 1 from paper_translations t where t.pmid = p.pmid and t.locale = r.locale
)
order by r.locale, p.pmid;
```

## 다음에 언어가 늘어나면

새 언어를 추가할 때는 반드시 이 표에 나라 매핑을 먼저 추가하고, 위 SQL의 `rule`
CTE에도 같은 행을 추가한다. 매핑 없이 번역부터 시작하지 마라.
