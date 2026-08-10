import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from './lib/supabase';
import { RangeProvider } from './context/RangeContext';
import { LocaleProvider, useT } from './i18n';
import Layout from './components/Layout';
import FullscreenBoot from './components/FullscreenBoot';
import Landing from './pages/Landing';
import TokenExchange from './pages/TokenExchange';
import Records from './pages/Records';
import MedicationDetail from './pages/MedicationDetail';
import SymptomDetail from './pages/SymptomDetail';
import MoodDetail from './pages/MoodDetail';
import SleepConstipation from './pages/SleepConstipation';
import OnOffDetail from './pages/OnOffDetail';
import ExerciseDetail from './pages/ExerciseDetail';
import FamilyView from './pages/FamilyView';
import ExportPdf from './pages/ExportPdf';
import Admin from './pages/Admin';

function RequireAuth({ children }: { children: ReactNode }) {
  const nav = useNavigate();
  const { t } = useT();
  const [state, setState] = useState<'loading' | 'ok' | 'no'>('loading');
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) setState('ok');
      else { setState('no'); nav('/', { replace: true }); }
    })();
  }, [nav]);
  if (state === 'loading') return <FullscreenBoot message={t('common.checking')} />;
  if (state === 'no') return null;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter basename="/app">
      <LocaleProvider>
      <RangeProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/r/:token" element={<TokenExchange />} />
          {/* /terms, /privacy, /terms/en, /privacy/en are static files under public/ —
              Cloudflare Pages serves those directly and these routes are never reached.
              (No SPA route needed; see public/terms/, public/privacy/.) */}
          <Route path="/admin" element={<Admin />} />
          <Route element={<RequireAuth><Layout /></RequireAuth>}>
            <Route path="/records" element={<Records />} />
            <Route path="/records/medication" element={<MedicationDetail />} />
            <Route path="/records/symptom" element={<SymptomDetail />} />
            <Route path="/records/mood" element={<MoodDetail />} />
            <Route path="/records/sleep-constipation" element={<SleepConstipation />} />
            <Route path="/records/on-off" element={<OnOffDetail />} />
            <Route path="/records/exercise" element={<ExerciseDetail />} />
            <Route path="/records/family/:userId" element={<FamilyView />} />
            <Route path="/records/export" element={<ExportPdf />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </RangeProvider>
      </LocaleProvider>
    </BrowserRouter>
  );
}
