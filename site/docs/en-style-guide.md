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
