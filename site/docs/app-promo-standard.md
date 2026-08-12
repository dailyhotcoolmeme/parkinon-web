# 글 하단 "앱 추천" — 언어별 기준

오너 지시(2026-08-12): **모든 글이 같은 앱 화면을 보여주면 안 된다.** 글 성격에 맞춰
배치하되, **언어마다 실제로 존재하는 앱 화면이 다르므로** 그 범위 안에서 정한다.

정본은 코드다 — `src/lib/appShots.ts`. 이 문서는 그 근거와 운영 방법을 적는다.

---

## 언어별로 쓸 수 있는 화면

| | 화면 수 | 출처 | 비고 |
|---|---|---|---|
| 한국어 | 9종 | 기존 웹 자산 | 모든 기능에 전용 화면이 있다 |
| 영어 | 6종 | **미국 App Store 게재분** | `06_premium` 은 결제 화면이 아니라 '내정보' 탭 |
| 일본어 | 5종 | **일본 App Store 게재분** | `JA_04_overseas` 는 이름과 달리 '알림' 설정 화면 |
| 프랑스어 | 5종 | **캐나다 App Store 게재분(퀘벡용)** | `FR_04_overseas` 도 '알림(Rappels)' 화면 |

스토어 게재분은 로그인 없이 아래로 확인·재취득할 수 있다.

⚠️ **`lang` 파라미터를 반드시 붙일 것.** 안 붙이면 그 스토어의 *기본 언어* 세트만 나온다.
실제로 이것 때문에 "프랑스어 화면은 없다"고 잘못 판단한 적이 있다 — 캐나다 스토어를
`lang` 없이 조회해 영어 세트만 보고 내린 결론이었다(오너 지적 2026-08-12).

```
# 언어별 스크린샷 파일명 확인
for L in "us:en_us" "jp:ja_jp" "ca:fr_ca"; do
  C=${L%%:*}; LANG=${L##*:}
  curl -s "https://itunes.apple.com/lookup?id=6773573590&country=$C&lang=$LANG" \
    | python3 -c "import sys,json,re; r=json.load(sys.stdin)['results'][0]; \
      [print(re.search(r'/([^/]+\.png)/',u).group(1)) for u in r['screenshotUrls']]"
done
```
가져올 때 **iOS 상태바를 잘라내고 360px 폭으로 맞춘다**(한국어 자산과 같은 규격).
영어는 194px, 일본어·프랑스어는 199px 이었다(기기가 달라 값이 다르다 — 실측할 것).

## 기능 → 화면 매핑

| `appFeature` | 한국어 | 영어 | 일본어 | 프랑스어 |
|---|---|---|---|---|
| (없음/기본) | 약복용 홈 | 01_medications | JA_01_home | FR_01_home |
| `effectTracking` | 전용 | 02_tracking | JA_02_bodystate | FR_02_bodystate |
| `exercise` | 전용 | 03_exercise | JA_03_exercise | FR_03_exercise |
| `reminder` | 전용 | 04_reminders | JA_04_overseas | FR_04_overseas |
| `medRegistration` | 전용 | 05_add_medication | (없음→기본) | (없음→기본) |
| `record` · `family` · `familyDiary` | 각각 전용 | 06_premium(내정보) | JA_05_myinfo | FR_05_myinfo |
| `community` | 전용 | **금지** | **금지** | **금지** |

### ⚠️ `community` 는 해외판에서 절대 쓰지 않는다
해외용 앱에는 커뮤니티(정보·나눔) 탭이 **아예 없다**
(`parkinon-app/src/navigation/MainNavigator.tsx:56-58` 에서 다른 탭으로 교체).
이미지가 없는 게 아니라 기능이 없는 것이라, 그대로 두면 **없는 기능을 광고**하게 된다.
`appShots.ts` 의 `unavailable` 이 이미지와 문구를 통째로 막으므로, 실수로 값을 넣어도
영어·일본어·프랑스어 페이지에는 기본 홍보가 나간다(dev 에서 실제로 막히는 것 확인함).

### 4개 언어 모두 전용 화면이 있다
프랑스어는 **캐나다 스토어(퀘벡용)** 에 게재돼 있다. 프랑스 본토는 배포국이 아니다.
`Journal familial`·`Voir mon suivi`·`Rendez-vous médicaux` 가 보이는 실제 프랑스어 화면이다.

---

## 소식 글은 자동으로 지정된다

파킨온 소식이 이틀에 한 번꼴로 올라오므로 손으로 넣다 보면 빠뜨린다. 발행 흐름에 넣을 것:

```
npm run set-app-feature --prefix site           # 비어 있는 소식 글에 채워 넣는다
npm run set-app-feature --prefix site -- --check  # 고치지 않고 검사만
```

동작 방식과 **일부러 그렇게 만든 제약**:

1. **제목·설명·세 줄 요약만 본다.** 본문까지 훑으면 용어 툴팁(`<Term brief>`)의 무관한
   의학 설명이 걸린다 — 실제로 세포치료 글이 "sleep" 에 걸렸다.
2. **소식 설명문의 상투구를 뺀다.** "환자분·보호자분 관점에서 정리했습니다" 같은 문구가
   모든 소식에 들어가서, 빼지 않으면 전부 `family` 로 잘못 잡힌다.
3. **한국어 "운동" 단독은 키워드로 쓰지 않는다.** 대부분 "운동 증상(motor symptoms)" 이다.
   `유산소`·`걷기`·`운동을`·`운동이` 처럼 신체활동을 가리키는 형태만 쓴다.
4. **애매하면 아무것도 넣지 않는다.** 기본 화면으로 나가는 게 맞는 글이 있다.
   안 맞는 화면을 붙이는 것이 같은 화면보다 나쁘다(오너 기준).
5. 이미 `appFeature` 가 있으면 손대지 않는다.
6. 그 언어에 없는 기능(`community`)은 후보에서 제외한다.

검증해 본 결과: 이미 손으로 정해 둔 두 글의 값을 지우고 돌렸을 때 같은 값
(`exercise`, `effectTracking`)을 스스로 찾아냈고, 주제가 애매한 세포치료 글은
양쪽 언어 모두 건드리지 않았다.
