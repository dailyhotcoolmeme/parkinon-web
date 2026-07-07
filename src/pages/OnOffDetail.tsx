import { useEffect, useMemo, useState } from 'react';
import { useRange } from '../context/RangeContext';
import { usePatientId } from '../lib/usePatientId';
import { fetchOnOff } from '../lib/queries';
import { eachDay } from '../lib/dateRange';
import BarTrendChart from '../components/BarTrendChart';
import RangePicker from '../components/RangePicker';
import { useT } from '../i18n';

export default function OnOffDetail() {
  const { t } = useT();
  const { range } = useRange();
  const { patientId } = usePatientId();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      if (!patientId) return;
      const oo = await fetchOnOff(patientId, range.from, range.to);
      const days = eachDay(range.from, range.to);
      setRows(days.map((d, i) => ({ date: d, onoff: oo[i]?.value ?? null })));
    })();
  }, [patientId, range.from, range.to]);

  const averages = useMemo(() => {
    const vals = rows.map((r) => r.onoff).filter((v) => v != null) as number[];
    const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    return [{ label: t('onOffDetail.avgOnRate'), value: `${avg}%` }];
  }, [rows, t]);

  return (
    <div className="page-foot">
      <h1>{t('onOffDetail.pageTitle')}</h1>
      <div className="card" style={{ background: '#f1f8e9', borderColor: '#c5e1a5' }}>
        <strong>{t('onOffDetail.whatIsThisTitle')}</strong>
        <div style={{ marginTop: 6, fontSize: 16 }}>
          {t('onOffDetail.whatIsThisDescPre')} <b>{t('onOffDetail.whatIsThisDescBold')}</b>{t('onOffDetail.whatIsThisDescPost')}
        </div>
      </div>
      <RangePicker averages={averages} />
      <div className="section-title">{t('onOffDetail.sectionTitle')}</div>
      <div className="card">
        <BarTrendChart
          mode="single"
          data={rows}
          series={{ key: 'onoff', name: t('onOffDetail.onRate'), color: '#4CAF50' }}
          yDomain={[0, 100]}
          yUnit="%"
        />
        <p className="muted" style={{ marginTop: 8 }}>{t('onOffDetail.footnote')}</p>
      </div>
    </div>
  );
}
