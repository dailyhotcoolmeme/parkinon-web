import { useEffect, useMemo, useState } from 'react';
import { useRange } from '../context/RangeContext';
import { usePatientId } from '../lib/usePatientId';
import {
  fetchMedicationAdherenceDynamic,
  fetchMedicationAdherenceBySlot,
  fetchMedicationChanges,
  type DailyPoint,
  type MedChange,
  type SlotAdherence,
} from '../lib/queries';
import { eachDay } from '../lib/dateRange';
import BarTrendChart from '../components/BarTrendChart';
import RangePicker from '../components/RangePicker';
import { useT } from '../i18n';

function avgPct(arr: DailyPoint[]): number | null {
  const vals = arr.map((p) => p.value).filter((v): v is number => v != null);
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export default function MedicationDetail() {
  const { t } = useT();
  const { range } = useRange();
  const { patientId } = usePatientId();
  const [rows, setRows] = useState<any[]>([]);
  const [bySlot, setBySlot] = useState<SlotAdherence>({ slots: [], bySlot: {} });
  const [changes, setChanges] = useState<MedChange[]>([]);

  useEffect(() => {
    (async () => {
      if (!patientId) return;
      const [adh, mbs, ch] = await Promise.all([
        fetchMedicationAdherenceDynamic(patientId, range.from, range.to),
        fetchMedicationAdherenceBySlot(patientId, range.from, range.to),
        fetchMedicationChanges(patientId, range.from, range.to),
      ]);
      const days = eachDay(range.from, range.to);
      setRows(days.map((d, i) => ({ date: d, adherence: adh[i]?.value ?? null })));
      setBySlot(mbs);
      setChanges(ch);
    })();
  }, [patientId, range.from, range.to]);

  // 복용 시점(활성 dose_slot)별 평균 복용률 — 커스텀 슬롯 포함, time 오름차순
  const averages = useMemo(() => {
    const fmt = (v: number | null) => (v == null ? '-' : `${v}%`);
    return bySlot.slots.map((s) => ({
      label: t('records.slotAdherenceRate', { slot: s.label }),
      value: fmt(avgPct(bySlot.bySlot[s.key] ?? [])),
    }));
  }, [bySlot, t]);

  return (
    <div className="page-foot">
      <RangePicker title={t('medicationDetail.pageTitle')} averages={averages} />

      <div className="section-title">{t('medicationDetail.overallRate')}</div>
      <div className="card">
        <BarTrendChart
          mode="single"
          data={rows}
          series={{ key: 'adherence', name: t('records.adherenceRate'), color: '#4CAF50' }}
          yDomain={[0, 100]}
          yTicks={[0, 25, 50, 75, 100]}
          yUnit="%"
          refLines={changes}
        />
      </div>

      {bySlot.slots.map((s) => (
        <div key={s.key}>
          <div className="section-title">{t('records.medicationRateForSlot', { slot: s.label })}</div>
          <div className="card">
            <BarTrendChart
              mode="single"
              data={(bySlot.bySlot[s.key] ?? []).map((p) => ({ date: p.date, adherence: p.value }))}
              series={{ key: 'adherence', name: t('records.slotAdherenceRate', { slot: s.label }), color: '#C8E6C9' }}
              height={140}
              yDomain={[0, 100]}
              yTicks={[0, 25, 50, 75, 100]}
              yUnit="%"
            />
          </div>
        </div>
      ))}

      {changes.length > 0 && (
        <>
          <div className="section-title">{t('medicationDetail.changeHistory')}</div>
          <div className="card">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[...changes].sort((a, b) => a.date.localeCompare(b.date)).map((c, i) => (
                <li key={i} style={{ padding: '6px 0', fontSize: 16 }}>
                  {c.date} : {c.label}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
