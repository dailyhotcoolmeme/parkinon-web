import { Document, Page, View, Text, StyleSheet, Font, Svg, Rect, Image, Text as SvgText } from '@react-pdf/renderer';
import dayjs from 'dayjs';
import type { ScoreCounts, MedChange } from '../lib/queries';
import { isEnLang } from '../i18n/currentLang';

/**
 * @react-pdf/renderer는 pdf(<RecordsPdf/>).toBlob()으로 메인 ReactDOM 트리 밖에서
 * 별도 렌더러로 그려지므로 React Context(useT)에 접근할 수 없다. 대신 다른 순수 함수들
 * (lib/queries.ts 등)과 동일하게 currentLang 전역 읽기(isEnLang)로 로케일을 판정한다.
 */
function pdfT(ko: string, en: string): string {
  return isEnLang() ? en : ko;
}

/** 동적 간격(track_interval) 1개의 PDF 메타: 차트 캡처 키 + 제목 + 점수 카운트 합산 */
export type PdfIntervalSpec = { key: string; title: string; counts: ScoreCounts };
/** 동적 복용 슬롯 1개의 PDF 메타: 차트 캡처 키 + 제목 */
export type PdfMedSlotSpec = { key: string; title: string };

// 5점 색 팔레트 — 화면(BarTrendChart)과 동일 (범례/ON·OFF 비율바에서만 사용)
const SCORE_COLORS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '#A23C4C',
  2: '#E76A6A',
  3: '#9E9E9E',
  4: '#C8E6C9',
  5: '#4CAF50',
};


// 한글 폰트 등록 — 자가호스팅 (same-origin, CORS 이슈 없음)
Font.register({
  family: 'Pretendard',
  fonts: [
    { src: '/fonts/Pretendard-Regular-v2.ttf', fontWeight: 400 },
    { src: '/fonts/Pretendard-Bold-v2.ttf', fontWeight: 700 },
  ],
});

const FONT = 'Pretendard';

Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontFamily: FONT,
    fontSize: 10,
    color: '#1F2937',
  },
  coverPage: {
    paddingTop: 80,
    paddingBottom: 60,
    paddingHorizontal: 60,
    fontFamily: FONT,
    color: '#1F2937',
  },
  coverBrandBar: {
    height: 8,
    backgroundColor: '#4CAF50',
    marginBottom: 32,
  },
  coverTitle: {
    fontSize: 36,
    fontWeight: 700,
    color: '#4CAF50',
    marginBottom: 8,
  },
  coverSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 48,
  },
  coverRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  coverLabel: {
    width: 90,
    fontSize: 12,
    color: '#6B7280',
  },
  coverValue: {
    fontSize: 14,
    fontWeight: 700,
    color: '#111827',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    // 한 줄 유지 → 컨테이너 폭이 범례 내용 폭(마지막 글자 끝)과 정확히 일치하도록.
    flexWrap: 'nowrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    marginRight: 6,
  },
  legendText: {
    fontSize: 10,
    color: '#374151',
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 12,
  },
  chartCard: {
    border: '1pt solid #E5E7EB',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 8,
    color: '#9CA3AF',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  miniCard: {
    width: '48%',
    border: '1pt solid #E5E7EB',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  miniTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 4,
  },
  miniMeta: {
    fontSize: 8,
    color: '#6B7280',
    marginBottom: 6,
  },
  // ── 요약 페이지 ──
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  avgPill: {
    width: '23.5%',
    border: '1pt solid #E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  avgLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 6,
    textAlign: 'center',
  },
  avgValue: {
    fontSize: 18,
    fontWeight: 700,
    color: '#111827',
  },
  // ── 슬롯 ON/OFF 요약 (화면 RatioStrip 과 동일 문구) ──
  onoffRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  onoffCol: {
    marginRight: 24,
  },
  onoffBig: {
    fontSize: 12,
    fontWeight: 700,
  },
  onoffSub: {
    fontSize: 9,
    color: '#888888',
    marginTop: 2,
  },
  ratioBarPctRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 2,
  },
});

const SCORE_LABEL_KO: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '매우나쁨',
  2: '나쁨',
  3: '보통',
  4: '좋음',
  5: '매우좋음',
};
const SCORE_LABEL_EN: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Very bad',
  2: 'Not great',
  3: 'Okay',
  4: 'Good',
  5: 'Very good',
};
const SCORE_LABEL: Record<1 | 2 | 3 | 4 | 5, string> = new Proxy({} as Record<1 | 2 | 3 | 4 | 5, string>, {
  get: (_target, key) => (isEnLang() ? SCORE_LABEL_EN : SCORE_LABEL_KO)[Number(key) as 1 | 2 | 3 | 4 | 5],
});

/**
 * 사용자가 PDF에 포함할 섹션 선택 키.
 * 표지는 항상 포함되므로 선택 대상이 아니다.
 */
export type PdfSectionKey =
  | 'medication'
  | 'body'      // 몸 상태 3슬롯 그룹 (각 슬롯에 ON/OFF 요약 동봉 — 화면과 동일)
  | 'mood'      // 기분 3슬롯 그룹 (각 슬롯에 ON/OFF 요약 동봉 — 화면과 동일)
  | 'measurement' // 디지털 바이오마커 (탭핑·반응속도) — §5.2·§6
  | 'sleep'
  | 'constipation'
  | 'exercise';

export const PDF_SECTION_ORDER: PdfSectionKey[] = [
  'medication', 'body', 'mood', 'measurement', 'sleep', 'constipation', 'exercise',
];

const PDF_SECTION_LABELS_KO: Record<PdfSectionKey, string> = {
  medication: '약 복용률 (%)',
  body: '몸 상태 — 복용 직후 / 30분 후 / 2시간 후 (ON/OFF 요약 포함)',
  mood: '기분 — 복용 직후 / 30분 후 / 2시간 후 (ON/OFF 요약 포함)',
  measurement: '컨디션 측정 (손가락·반응속도)',
  sleep: '취침 상태',
  constipation: '변비',
  exercise: '운동',
};
const PDF_SECTION_LABELS_EN: Record<PdfSectionKey, string> = {
  medication: 'Medication Rate (%)',
  body: 'Body State — right after / 30 min / 2 hr after taking (incl. ON/OFF summary)',
  mood: 'Mood — right after / 30 min / 2 hr after taking (incl. ON/OFF summary)',
  measurement: 'Condition Measurement (tapping, reaction speed)',
  sleep: 'Sleep',
  constipation: 'Constipation',
  exercise: 'Exercise',
};
/** ExportPdf.tsx 체크리스트에서 PDF_SECTION_LABELS[k] 형태로 매번 최신 로케일 값을 읽도록 함수로 노출. */
export const PDF_SECTION_LABELS: Record<PdfSectionKey, string> = new Proxy({} as Record<PdfSectionKey, string>, {
  get: (_target, key) => (isEnLang() ? PDF_SECTION_LABELS_EN : PDF_SECTION_LABELS_KO)[key as PdfSectionKey],
});

/**
 * 측정 섹션에 필요한 데이터 — 30일 윈도우.
 * 모두 0건이면 페이지 전체 skip, 한쪽만 있으면 그 카드만 노출.
 * (평균값은 RecordsPdf 내부에서 차트 데이터 non-null 평균으로 직접 계산 — baseline_stats 무관)
 */
export type MeasurementSectionData = {
  tap?: {
    data: { date: string; value: number | null }[];
  };
  reaction?: {
    data: { date: string; value: number | null }[];
  };
};

export type RecordsPdfProps = {
  name: string;
  from: string;
  to: string;
  generatedAt: string;
  /** 동적 몸 상태 간격 페이지들 (track_interval 별, time/분 오름차순) */
  bodyIntervals: PdfIntervalSpec[];
  /** 동적 기분 상태 간격 페이지들 */
  moodIntervals: PdfIntervalSpec[];
  /** 동적 복용 슬롯 페이지들 (활성 dose_slot 별, 커스텀 포함) */
  medSlots: PdfMedSlotSpec[];
  medChanges: MedChange[];
  /**
   * 화면과 동일한 Recharts 차트를 오프스크린에서 캡처한 PNG dataURL 맵.
   * 키: 'medication' | 'bodyImmediate' | ... | 'sleep' | 'constipation' | 'exercise'
   */
  chartImages: Record<string, string>;
  /**
   * 포함할 섹션 집합. 미지정 시 전체 포함(하위호환).
   */
  selected?: Set<PdfSectionKey>;
  /**
   * 화면 "요약" (RangePicker averages, Records.tsx) 과 동일한 라벨/값 11개.
   */
  averages?: { label: string; value: string }[];
  /** 변비 평균 주기(일). 화면 ConstipationLegend 와 동일 값. */
  constipationAvgCycle?: number | null;
  /**
   * 디지털 바이오마커 측정 섹션 데이터.
   * 미지정 또는 tap·reaction 모두 데이터 0건이면 measurement 섹션 자체를 skip.
   */
  measurement?: MeasurementSectionData;
};

function ScoreLegend() {
  return (
    <View style={styles.legendRow}>
      {([1, 2, 3, 4, 5] as const).map((s, idx) => (
        <View
          key={s}
          style={idx === 4 ? [styles.legendItem, { marginRight: 0 }] : styles.legendItem}
        >
          <View style={[styles.legendSwatch, { backgroundColor: SCORE_COLORS[s] }]} />
          <Text style={styles.legendText}>{`${s} ${SCORE_LABEL[s]}`}</Text>
        </View>
      ))}
    </View>
  );
}

function Footer({ name, range }: { name: string; range: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>{`${pdfT('파킨온', 'ParkinON')} · ${name || '-'} · ${range}`}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
    </View>
  );
}

/** 캡처한 차트 이미지를 PDF 카드 안에 그대로 임베드 */
function ChartImage({ src }: { src?: string }) {
  if (!src) {
    return (
      <View style={{ width: '100%', height: 120, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{pdfT('기록이 없습니다', 'No records')}</Text>
      </View>
    );
  }
  // A4 가로 차트 영역에 가득. 캡처 비율(1040x360)에 맞춰 높이 자동.
  return <Image src={src} style={{ width: '100%' }} />;
}

/**
 * 5색 ON/OFF 비율 가로 막대 + 각 구간 항목별 비중 % 라벨.
 * - 색·순서(1→5)는 화면 팔레트(SCORE_COLORS)와 동일.
 * - 각 구간 폭의 중앙에 반올림 정수 % 표기.
 * - 작은 구간(폭 < 22px ≈ 약 11%) 겹침 방지: 막대 안 라벨 생략하고
 *   하단 보조 라벨 행에 "색 n%" 형태로 표기. 0%(해당 점수 없음)는 표기 안 함.
 */
function RatioBar({ counts }: { counts: ScoreCounts }) {
  const total = counts.c1 + counts.c2 + counts.c3 + counts.c4 + counts.c5;
  if (total === 0) {
    return (
      <Svg viewBox="0 0 200 16" style={{ width: '100%', height: 16 }}>
        <Rect x={0} y={0} width={200} height={16} fill="#F3F4F6" />
      </Svg>
    );
  }
  const W = 200;
  const segs: { score: 1 | 2 | 3 | 4 | 5; color: string; x: number; w: number; pct: number }[] = [];
  let x = 0;
  ([1, 2, 3, 4, 5] as const).forEach((s) => {
    const v = counts['c' + s as keyof ScoreCounts] as number;
    if (v <= 0) return;
    const pct = Math.round((v / total) * 100);
    const w = (v / total) * W;
    segs.push({ score: s, color: SCORE_COLORS[s], x, w, pct });
    x += w;
  });
  const MIN_INLINE_W = 22; // 막대 안 % 표기 최소 폭
  const overflow = segs.filter((s) => s.w < MIN_INLINE_W);
  return (
    <View>
      <Svg viewBox="0 0 200 16" style={{ width: '100%', height: 16 }}>
        {segs.map((s, i) => (
          <Rect key={`r${i}`} x={s.x} y={0} width={s.w} height={16} fill={s.color} />
        ))}
        {segs.map((s, i) => {
          if (s.w < MIN_INLINE_W) return null;
          // 연녹색(4점) 위 흰 글씨는 대비 부족 → 4점만 진한 글씨
          const fill = s.score === 4 ? '#1F2937' : '#FFFFFF';
          return (
            <SvgText
              key={`t${i}`}
              x={s.x + s.w / 2}
              y={11}
              style={{ fontSize: 7, fontFamily: FONT }}
              fill={fill}
              textAnchor="middle"
            >
              {`${s.pct}%`}
            </SvgText>
          );
        })}
      </Svg>
      {overflow.length > 0 && (
        <View style={styles.ratioBarPctRow}>
          {overflow.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
              <View style={{ width: 7, height: 7, backgroundColor: s.color, marginRight: 3 }} />
              <Text style={{ fontSize: 7, color: '#374151' }}>{`${s.pct}%`}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * 화면 RatioStrip(src/components/RatioStrip.tsx) 과 동일 문구의 ON/OFF 요약.
 * ON = 4점 이상(c4+c5), OFF = 2점 이하(c1+c2), 전체 기간 합산.
 */
function SlotOnOffSummary({ counts }: { counts: ScoreCounts }) {
  const total = counts.c1 + counts.c2 + counts.c3 + counts.c4 + counts.c5;
  if (total === 0) {
    return <Text style={{ fontSize: 11, color: '#999999', marginBottom: 8 }}>{pdfT('기록 없음', 'No records')}</Text>;
  }
  const onPct = Math.round(((counts.c4 + counts.c5) / total) * 100);
  const offPct = Math.round(((counts.c1 + counts.c2) / total) * 100);
  return (
    <View style={styles.onoffRow}>
      <View style={styles.onoffCol}>
        <Text style={[styles.onoffBig, { color: SCORE_COLORS[5], backgroundColor: '#E8F5E9', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 }]}>{`ON ${onPct}%`}</Text>
        <Text style={styles.onoffSub}>{pdfT('4점 이상 기록 비율', 'Share of records scored 4+')}</Text>
      </View>
      <View style={styles.onoffCol}>
        <Text style={[styles.onoffBig, { color: SCORE_COLORS[1], backgroundColor: '#FBEAEC', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 }]}>{`OFF ${offPct}%`}</Text>
        <Text style={styles.onoffSub}>{pdfT('2점 이하 기록 비율', 'Share of records scored 2 or less')}</Text>
      </View>
      <View style={styles.onoffCol}>
        <Text style={[styles.onoffBig, { color: '#888888' }]}>{pdfT(`총 ${total}건`, `${total} total`)}</Text>
      </View>
    </View>
  );
}

export function RecordsPdf(props: RecordsPdfProps) {
  const {
    name, from, to, generatedAt, bodyIntervals, moodIntervals, medSlots, chartImages, selected,
    averages, constipationAvgCycle, measurement,
  } = props;
  const rangeStr = `${from} ~ ${to}`;
  // selected 미지정 시 전체 포함(하위호환·기존 결과 보장)
  const show = (k: PdfSectionKey) => !selected || selected.has(k);

  // 측정 데이터 존재 여부 — 둘 다 한 건도 없으면 섹션 전체 skip
  const hasTap = !!measurement?.tap?.data?.some((r) => r.value != null);
  const hasReaction = !!measurement?.reaction?.data?.some((r) => r.value != null);
  const hasAnyMeasurement = hasTap || hasReaction;

  return (
    <Document>
      {/* ===== 표지 ===== */}
      <Page size="A4" orientation="landscape" style={styles.coverPage}>
        <View style={styles.coverBrandBar} />
        <Text style={styles.coverTitle}>{pdfT('파킨온', 'ParkinON')}</Text>
        <Text style={styles.coverSubtitle}>{pdfT('기록 리포트 · Records Report', 'Records Report')}</Text>

        <View style={styles.coverRow}>
          <Text style={styles.coverLabel}>{pdfT('이름', 'Name')}</Text>
          <Text style={styles.coverValue}>{name || '-'}</Text>
        </View>
        <View style={styles.coverRow}>
          <Text style={styles.coverLabel}>{pdfT('기간', 'Period')}</Text>
          <Text style={styles.coverValue}>{rangeStr}</Text>
        </View>
        <View style={styles.coverRow}>
          <Text style={styles.coverLabel}>{pdfT('생성일', 'Generated')}</Text>
          <Text style={styles.coverValue}>{generatedAt}</Text>
        </View>

        <Footer name={name} range={rangeStr} />
      </Page>

      {/* ===== 요약 (화면 RangePicker "요약" 과 동일 라벨/값) ===== */}
      {averages && averages.length > 0 && (
        <Page size="A4" orientation="landscape" style={styles.page}>
          <Text style={styles.pageTitle}>{pdfT('요약', 'Summary')}</Text>
          <Text style={styles.pageSubtitle}>{pdfT(`${rangeStr} 기간 전체 요약`, `Overall summary for ${rangeStr}`)}</Text>
          <View style={styles.summaryGrid}>
            {averages.map((a) => (
              <View key={a.label} style={styles.avgPill}>
                <Text style={styles.avgLabel}>{a.label}</Text>
                <Text style={styles.avgValue}>{a.value}</Text>
              </View>
            ))}
          </View>
          <Footer name={name} range={rangeStr} />
        </Page>
      )}

      {/* ===== 약 복용률 (전체 + 복용 시점별 동적 슬롯) ===== */}
      {show('medication') && (
        <ChartPage
          title={pdfT('약 복용률 (%)', 'Medication Rate (%)')}
          subtitle={pdfT('일별 복용률 · 점선 마커는 약 변경 기록', 'Daily adherence rate · dashed markers show medication changes')}
          name={name}
          rangeStr={rangeStr}
        >
          <ChartImage src={chartImages.medication} />
        </ChartPage>
      )}
      {show('medication') && medSlots.map((s) => (
        <ChartPage
          key={s.key}
          title={pdfT(`약 복용률: ${s.title} (%)`, `Medication Rate: ${s.title} (%)`)}
          name={name}
          rangeStr={rangeStr}
        >
          <ChartImage src={chartImages[s.key]} />
        </ChartPage>
      ))}

      {/* ===== 몸 상태 — 동적 track_interval 별 (각 페이지 ON/OFF 요약 + 5색 비중% 바) ===== */}
      {show('body') && bodyIntervals.map((iv) => (
        <SlotPage
          key={iv.key}
          title={iv.title}
          counts={iv.counts}
          chartSrc={chartImages[iv.key]}
          name={name}
          rangeStr={rangeStr}
        />
      ))}

      {/* ===== 기분 상태 — 동적 track_interval 별 ===== */}
      {show('mood') && moodIntervals.map((iv) => (
        <SlotPage
          key={iv.key}
          title={iv.title}
          counts={iv.counts}
          chartSrc={chartImages[iv.key]}
          name={name}
          rangeStr={rangeStr}
        />
      ))}

      {/* ===== 디지털 바이오마커 측정 (탭핑 · 반응속도) — §5.2·§6 ===== */}
      {show('measurement') && hasAnyMeasurement && (
        <MeasurementPage
          measurement={measurement!}
          chartImages={chartImages}
          name={name}
          rangeStr={rangeStr}
          hasTap={hasTap}
          hasReaction={hasReaction}
        />
      )}

      {/* ===== 취침 상태 ===== */}
      {show('sleep') && (
        <ChartPage title={pdfT('취침 상태 (1~5점)', 'Sleep (1-5 pts)')} name={name} rangeStr={rangeStr}>
          <ChartImage src={chartImages.sleep} />
        </ChartPage>
      )}

      {/* ===== 변비 (화면 ConstipationLegend 의 평균 주기 동봉) ===== */}
      {show('constipation') && (
        <Page size="A4" orientation="landscape" style={styles.page}>
          <Text style={styles.pageTitle}>{pdfT('변비 (변 본 날 / 안 본 날)', 'Constipation (bowel movement / none)')}</Text>
          <Text style={styles.pageSubtitle}>{pdfT('2 = 변 본 날, 1 = 안 본 날', '2 = bowel movement, 1 = none')}</Text>
          <View style={styles.onoffRow}>
            <View style={styles.onoffCol}>
              <Text style={[styles.onoffBig, { color: '#4CAF50' }]}>{pdfT('변 본 날', 'Bowel movement')}</Text>
              <Text style={styles.onoffSub}>{pdfT('막대 2점', 'Bar = 2 pts')}</Text>
            </View>
            <View style={styles.onoffCol}>
              <Text style={[styles.onoffBig, { color: '#4CAF50' }]}>{pdfT('안 본 날', 'No bowel movement')}</Text>
              <Text style={styles.onoffSub}>{pdfT('막대 1점', 'Bar = 1 pt')}</Text>
            </View>
            <View style={styles.onoffCol}>
              <Text style={[styles.onoffBig, { color: '#4CAF50' }]}>{pdfT('평균 주기', 'Avg. cycle')}</Text>
              <Text style={styles.onoffSub}>
                {constipationAvgCycle != null ? pdfT(`${constipationAvgCycle.toFixed(1)}일`, `${constipationAvgCycle.toFixed(1)} days`) : '-'}
              </Text>
            </View>
          </View>
          <View style={styles.chartCard}>
            <ChartImage src={chartImages.constipation} />
          </View>
          <Footer name={name} range={rangeStr} />
        </Page>
      )}

      {/* ===== 운동 ===== */}
      {show('exercise') && (
        <ChartPage title={pdfT('운동 (분)', 'Exercise (min)')} name={name} rangeStr={rangeStr}>
          <ChartImage src={chartImages.exercise} />
        </ChartPage>
      )}
    </Document>
  );
}

function ChartPage({
  title, subtitle, name, rangeStr, children,
}: {
  title: string;
  subtitle?: string;
  name: string;
  rangeStr: string;
  children: any;
}) {
  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      <Text style={styles.pageTitle}>{title}</Text>
      {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
      <View style={styles.chartCard}>{children}</View>
      <Footer name={name} range={rangeStr} />
    </Page>
  );
}

/**
 * 몸상태/기분 슬롯 1개 페이지.
 * 화면 Records.tsx 슬롯 카드 구성과 동일 순서:
 *  제목 → RatioStrip(ON/OFF/총건) → (요청2) 5색 비중% 바 + 범례 → 일별 점수 그래프
 */
function SlotPage({
  title, counts, chartSrc, name, rangeStr,
}: {
  title: string;
  counts: ScoreCounts;
  chartSrc?: string;
  name: string;
  rangeStr: string;
}) {
  const total = counts.c1 + counts.c2 + counts.c3 + counts.c4 + counts.c5;
  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      <Text style={styles.pageTitle}>{pdfT(`${title} (1~5점)`, `${title} (1-5 pts)`)}</Text>
      <Text style={styles.pageSubtitle}>{pdfT('화면과 동일한 약효 ON/OFF 요약 + 일별 점수 그래프', 'Same ON/OFF summary and daily score chart as the app')}</Text>
      <SlotOnOffSummary counts={counts} />
      {total > 0 && (
        // 좌측 정렬 + 폭은 범례(한 줄) 내용 폭에 맞춰 shrink.
        // 막대(width:'100%')는 이 래퍼 폭 = 범례 폭에 정확히 맞춰 stretch.
        <View style={{ marginBottom: 8, alignSelf: 'flex-start' }}>
          <RatioBar counts={counts} />
          <ScoreLegend />
        </View>
      )}
      <View style={styles.chartCard}>
        <ChartImage src={chartSrc} />
      </View>
      <Footer name={name} range={rangeStr} />
    </Page>
  );
}

/** 측정 섹션의 캡처 차트 키 — ExportPdf 의 spec.key 와 1:1 매칭 */
export const MEASUREMENT_CHART_KEYS = {
  tap: 'measurement_tap',
  reaction: 'measurement_reaction',
} as const;

/**
 * 디지털 바이오마커 측정 페이지 (탭핑·반응속도).
 * - 화면(SymptomDetail.tsx)의 컨디션 섹션과 동일한 방식:
 *   카드 바깥에 큰 제목 "컨디션 측정: 손가락 두드리기" / "컨디션 측정: 반응속도",
 *   카드 안 상단에 ON 박스 스타일(녹색 칩) 평균 박스, 그 아래에 단일 톤 막대 차트.
 * - 평균값은 차트 데이터(30일 윈도우) non-null 평균을 직접 계산(정수 반올림).
 *   baseline_stats 무관.
 * - 둘 다 데이터 0건이면 페이지 자체 비노출(상위에서 분기), 한쪽만 0건이면 해당 카드 비노출.
 */

/** non-null value 평균(정수 반올림). 데이터 없으면 null — 화면 SymptomDetail.meanValue 와 동일 */
function meanOfData(rows: { value: number | null }[]): number | null {
  const vals = rows
    .map((r) => r.value)
    .filter((v): v is number => v != null && !Number.isNaN(Number(v)));
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/** 반응속도(ms) → "0.32초 (320ms)" — 화면/구 PdfMeasurementChart 와 동일 규칙 */
function formatReactionMs(ms: number): string {
  const rounded = Math.round(ms);
  const seconds = (rounded / 1000).toFixed(2);
  return `${seconds}초 (${rounded}ms)`;
}

/**
 * 화면 RatioStrip ON 박스와 동일한 시각(녹색 칩) 평균 박스.
 * @react-pdf 는 display:inline-block / line-height:'normal' 미지원이므로
 * View(backgroundColor + alignSelf:'flex-start' = inline-block 대용) + Text(스타일)로 근사.
 * 색·padding·borderRadius·fontWeight·fontSize 13 은 화면과 동일하게 맞춘다.
 */
const meanBoxWrap = {
  alignSelf: 'flex-start' as const,
  backgroundColor: '#E8F5E9',
  borderRadius: 6,
  paddingVertical: 2,
  paddingHorizontal: 8,
  marginBottom: 10,
};
const meanBoxText = {
  color: SCORE_COLORS[5],
  fontWeight: 700 as const,
  fontSize: 13,
};

function MeasurementCard({
  outerTitle,
  data,
  isReaction,
  chartSrc,
}: {
  outerTitle: string;
  data: { date: string; value: number | null }[];
  isReaction: boolean;
  chartSrc?: string;
}) {
  const mean = meanOfData(data);
  if (mean == null) return null; // 안전장치 — 호출부에서 0건 분기하나 한 번 더 가드
  const meanText = isReaction
    ? `평균 ${formatReactionMs(mean)}`
    : `평균 ${mean}회`;
  return (
    <View>
      <Text style={[styles.pageTitle, { marginBottom: 6 }]}>{outerTitle}</Text>
      <View style={styles.chartCard}>
        <View style={meanBoxWrap}>
          <Text style={meanBoxText}>{meanText}</Text>
        </View>
        <ChartImage src={chartSrc} />
      </View>
    </View>
  );
}

function MeasurementPage({
  measurement,
  chartImages,
  name,
  rangeStr,
  hasTap,
  hasReaction,
}: {
  measurement: MeasurementSectionData;
  chartImages: Record<string, string>;
  name: string;
  rangeStr: string;
  hasTap: boolean;
  hasReaction: boolean;
}) {
  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      {hasTap && (
        <MeasurementCard
          outerTitle="컨디션 측정: 손가락 두드리기"
          data={measurement.tap!.data}
          isReaction={false}
          chartSrc={chartImages[MEASUREMENT_CHART_KEYS.tap]}
        />
      )}

      {hasReaction && (
        <MeasurementCard
          outerTitle="컨디션 측정: 반응속도"
          data={measurement.reaction!.data}
          isReaction={true}
          chartSrc={chartImages[MEASUREMENT_CHART_KEYS.reaction]}
        />
      )}

      <Footer name={name} range={rangeStr} />
    </Page>
  );
}

export function recordsPdfFileName(name: string) {
  const safe = (name || 'user').replace(/\s+/g, '');
  return `parkinon-records-${dayjs().format('YYYYMMDD')}-${safe}.pdf`;
}
