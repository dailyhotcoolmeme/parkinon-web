import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DayPicker } from 'react-day-picker';
import { ko, enUS } from 'react-day-picker/locale';
import 'react-day-picker/dist/style.css';
import dayjs from 'dayjs';
import { useRange } from '../context/RangeContext';
import { defaultRange } from '../lib/dateRange';
import { useT } from '../i18n';

const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];
const DOW_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function formatWithDow(d: string, isEn: boolean): string {
  const dt = dayjs(d);
  return isEn ? `${d} (${DOW_EN[dt.day()]})` : `${d}(${DOW_KO[dt.day()]})`;
}

const PRESETS_ROW1: { key: string; days: number }[] = [
  { key: 'week', days: 7 },
  { key: 'month', days: 30 },
  { key: 'months3', days: 90 },
];
const PRESETS_ROW2: { key: string; days: number }[] = [
  { key: 'months6', days: 180 },
  { key: 'months12', days: 365 },
];

type Avg = { label: string; value: string };

export default function RangePicker({
  title,
  downloadHref,
  averages,
  dateLabel,
}: {
  title?: string;
  downloadHref?: string;
  averages?: Avg[];
  dateLabel?: string;
}) {
  const { t, lang } = useT();
  const isEn = lang === 'en';
  const PRESET_LABELS: Record<string, string> = {
    week: t('rangePicker.presetWeek'),
    month: t('rangePicker.presetMonth'),
    months3: t('rangePicker.preset3Months'),
    months6: t('rangePicker.preset6Months'),
    months12: t('rangePicker.preset12Months'),
  };
  const {
    range, setRange, setBrushIndex,
    brushSync, setBrushSync,
    showTrendline, setShowTrendline,
  } = useRange();
  const [showPicker, setShowPicker] = useState(false);
  const [activeDays, setActiveDays] = useState<number | 'custom'>(30);
  const [draftFrom, setDraftFrom] = useState<Date | undefined>(new Date(range.from));
  const [draftTo, setDraftTo] = useState<Date | undefined>(new Date(range.to));

  const apply = () => {
    const f = draftFrom ?? draftTo;
    const t = draftTo ?? draftFrom;
    if (f && t) {
      // 시작이 종료보다 늦으면 swap
      const [a, b] = dayjs(f).isAfter(dayjs(t)) ? [t, f] : [f, t];
      const fromStr = dayjs(a).format('YYYY-MM-DD');
      const toStr = dayjs(b).format('YYYY-MM-DD');
      setRange({ from: fromStr, to: toStr });
      setActiveDays('custom');
      setBrushIndex({});
      setShowPicker(false);
    }
  };

  return (
    <div className="range-section">
      {/* 기간 칩 — 2줄 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '8px 0 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {PRESETS_ROW1.map((p) => (
            <button
              key={p.days}
              className={`tab ${activeDays === p.days ? 'active' : ''}`}
              onClick={() => {
                const r = defaultRange(p.days);
                setRange(r);
                setBrushIndex({});
                setActiveDays(p.days);
                setShowPicker(false);
                setDraftFrom(new Date(r.from));
                setDraftTo(new Date(r.to));
              }}
            >{PRESET_LABELS[p.key]}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {PRESETS_ROW2.map((p) => (
            <button
              key={p.days}
              className={`tab ${activeDays === p.days ? 'active' : ''}`}
              onClick={() => {
                const r = defaultRange(p.days);
                setRange(r);
                setBrushIndex({});
                setActiveDays(p.days);
                setShowPicker(false);
                setDraftFrom(new Date(r.from));
                setDraftTo(new Date(r.to));
              }}
            >{PRESET_LABELS[p.key]}</button>
          ))}
          <button
            className={`tab ${activeDays === 'custom' ? 'active' : ''}`}
            onClick={() => {
              setActiveDays('custom');
              setShowPicker((v) => {
                const next = !v;
                if (next) { setDraftFrom(undefined); setDraftTo(undefined); }
                return next;
              });
            }}
          >{t('rangePicker.custom')}</button>
        </div>
      </div>

      {/* 기간 표시 — 칩 아래, 가운데 정렬 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, fontSize: 15 }}>
        <span style={{ color: 'var(--text-sub)' }}>{t('rangePicker.period')}</span>
        <span style={{ color: '#4CAF50', fontWeight: 600 }}>{dateLabel ?? `${formatWithDow(range.from, isEn)} ~ ${formatWithDow(range.to, isEn)}`}</span>
      </div>

      {showPicker && (
        <div className="card" style={{ marginTop: 12, marginBottom: 0, background: '#fafafa' }}>
          <DayPicker
            mode="range"
            locale={isEn ? enUS : ko}
            formatters={isEn ? undefined : {
              formatCaption: (date) => `${date.getFullYear()}년 ${date.getMonth() + 1}월`,
              formatWeekdayName: (date) => ['일','월','화','수','목','금','토'][date.getDay()],
            }}
            selected={draftFrom || draftTo ? { from: draftFrom, to: draftTo } : undefined}
            onSelect={(r: any) => { setDraftFrom(r?.from); setDraftTo(r?.to ?? r?.from); }}
            numberOfMonths={1}
            defaultMonth={draftFrom ?? new Date(range.from)}
          />
          <div style={{ marginTop: 8, fontSize: 13, color: '#666', textAlign: 'center' }}>
            {draftFrom && draftTo
              ? `${dayjs(draftFrom).format('YYYY-MM-DD')} ~ ${dayjs(draftTo).format('YYYY-MM-DD')}`
              : draftFrom
                ? t('rangePicker.pickEndDate', { date: dayjs(draftFrom).format('YYYY-MM-DD') })
                : t('rangePicker.pickBothDates')}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={apply} style={{ minHeight: 40, padding: '0 18px', fontSize: 15, borderRadius: 8 }}>{t('rangePicker.apply')}</button>
            <button className="ghost" onClick={() => setShowPicker(false)} style={{ minHeight: 40, padding: '0 18px', fontSize: 15, borderRadius: 8 }}>{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {/* 요약 — 제목은 박스 바깥 */}
      {averages && averages.length > 0 && (
        <>
          <div className="section-title">{t('rangePicker.summary')}</div>
          <div className="card summary-card">
            <div className="avg-grid">
              {averages.map((a) => (
                <div key={a.label} className="avg-pill">
                  <div className="avg-label">{a.label}</div>
                  <div className="avg-value">{a.value}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
          <input type="checkbox" checked={brushSync} onChange={(e) => setBrushSync(e.target.checked)} style={{ width: 20, height: 20, accentColor: '#4CAF50' }} />
          {t('rangePicker.syncCharts')}
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
          <input type="checkbox" checked={showTrendline} onChange={(e) => setShowTrendline(e.target.checked)} style={{ width: 20, height: 20, accentColor: '#4CAF50' }} />
          {t('rangePicker.showTrendline')}
        </label>
      </div>

      {/* title/downloadHref는 사용처에서 헤더로 옮겨감 — 잔존 시 대비 */}
      {title && downloadHref && (
        <div style={{ display: 'none' }}>
          <Link to={downloadHref}>{title}</Link>
        </div>
      )}
    </div>
  );
}
