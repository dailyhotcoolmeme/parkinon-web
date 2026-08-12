# 영어판 문체·용어 기준 (2026-08-12 확정)

오너 지시로 임의 판단 대신 **영어권 파킨슨 단체 3곳을 실제 조사**해 정한 기준이다.
조사 대상: Parkinson's Foundation(미국) · Michael J. Fox Foundation(미국) · Parkinson's UK(영국).

## 결론: 미국 관행을 따른다

배포 국가가 미국·캐나다·호주·뉴질랜드라 영국은 대상이 아니다. 미국 두 곳(PF·MJFF)이
일치하는 쪽을 기준으로 삼되, 영국과 갈리는 지점은 아래에 표시해 뒀다.

| 항목 | 채택 | 근거 |
|---|---|---|
| 독자 호칭 | **"you" 직접 호칭** | PF·MJFF 둘 다 직접 호칭. (Parkinson's UK 만 3인칭) |
| 환자 지칭 | **people with Parkinson's** | 3곳 전부 동일. person-first |
| **금지어** | ~~patient~~ ~~sufferer~~ ~~victim~~ ~~suffers from~~ | 3곳 어디에도 없음 |
| 보호자 | **care partner** | PF 공식 용어("For Care Partners"). ⚠️ 영국은 "carer", 미국은 caregiver 보다 care partner |
| 의료진 | **your care team** | PF 표현 그대로 |
| 병명 | **Parkinson's** 우세, 공식·첫 언급만 **Parkinson's disease**, 약어 **PD** 는 최소 | 3곳 공통 패턴 |
| 문장 길이 | 13~29단어, 짧고 평이하게 | PF 실측 |
| 소제목 | 질문형·서술형 혼용 가능 | 3곳 다 혼용 |

### 참고: 영국이 "disease"를 빼는 이유
Parkinson's UK 는 "We don't use the word 'disease' because some people with Parkinson's have
told us it sounds negative" 라고 명시한다. 우리는 미국 관행상 첫 언급에 `Parkinson's disease`
를 쓰되, 본문에서는 `Parkinson's` 로 가는 게 두 관행 모두와 충돌하지 않는다.

## 한국어판 구조를 옮길 때

- `환자분께` → **If you have Parkinson's** (또는 문맥에 맞게 "you" 로 자연스럽게 녹인다)
- `보호자분께` → **If you're a care partner**
- 두 표현을 "To the patient / To the caregiver" 로 직역하지 말 것 — 위 금지어에 걸린다.

## 자가 점검 명령

```
cd site/src/content/articles/en
grep -roi "patient\|sufferer\|victim\|caregiver\|suffers from" .   # 0 이어야 한다
```

---

## 하단 앱 소개 블록(AppPromo) — 글마다 다른 화면이 나가야 한다

**모든 글이 같은 화면을 쓰면 안 된다**(오너 지적 2026-08-12). 글 frontmatter 의
`appFeature:` 값이 어떤 앱 스크린샷을 보여줄지 정한다. 값이 없으면 전부 기본 화면
(01_medications)으로 폴백돼서 페이지들이 똑같아 보인다.

### 영어판에서 쓸 수 있는 실제 화면은 6장뿐이다
미국 App Store 에 게재된 것을 가져온 것이라 한국어판(9장)과 1:1 대응이 안 된다.
아래는 **화면을 직접 열어보고** 정한 매핑이다(`src/components/article/AppPromo.astro`).

| `appFeature` | 실제 나가는 화면 | 화면 내용 |
|---|---|---|
| (없음) | `01_medications` | 약복용 홈 — Record medication, 오늘의 복용 |
| `effectTracking` | `02_tracking` | Record body & mood, 영상 기록 |
| `exercise` | `03_exercise` | 운동 기록 |
| `reminder` | `04_reminders` | 복용 알림·알림음·약효추적 시각 설정 |
| `medRegistration` | `05_add_medication` | 처방전 촬영·약 직접 입력 |
| `record` / `family` / `familyDiary` | `06_premium` | 내정보 — Family Diary · View my records · Medical visits |
| `community` | (대응 화면 없음 → 기본) | 영어 커뮤니티 화면을 캡처하면 채울 것 |

### 새 글을 번역할 때
1. 한국어 원문에 `appFeature:` 가 있으면 **그대로 가져온다.**
2. 없으면 **글 내용에 맞는 값을 새로 지정한다.** 예:
   - 병원·치과 방문, 진료 기록 이야기 → `record` (06 에 "Medical visits" 가 보인다)
   - 증상 기록·기분·수면 이야기 → `effectTracking`
   - 운동 이야기 → `exercise`
   - 복약 시간·알림 이야기 → `reminder`
   - 약 등록·처방전 이야기 → `medRegistration`
   - 가족·보호자 이야기 → `family`
3. **억지로 붙이지 말 것.** 질환 개요·유전·용어집처럼 특정 기능과 무관한 글은
   기본 화면(지정 안 함)이 오히려 맞다. 안 맞는 화면을 붙이는 게 똑같은 화면보다 나쁘다.
