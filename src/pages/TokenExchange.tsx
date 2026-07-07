import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { exchangeWebToken, EXCHANGE_ERROR_KEYS } from '../lib/exchangeWebToken';
import FullscreenBoot from '../components/FullscreenBoot';
import { useT } from '../i18n';

export default function TokenExchange() {
  const { token } = useParams();
  const nav = useNavigate();
  const { t, setLang } = useT();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorKey, setErrorKey] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setStatus('error');
        setErrorKey('tokenExchange.errorNoToken');
        return;
      }
      const result = await exchangeWebToken(token);
      if (cancelled) return;
      if (result.ok) {
        // 계정 확정 언어로 반영(로딩 화면까지는 브라우저 언어 추정값을 썼음) — 다음 페이지(Records 등)부터 정확해짐.
        setLang(result.language);
        nav('/records', { replace: true });
        return;
      }
      setStatus('error');
      setErrorKey(EXCHANGE_ERROR_KEYS[result.code]);
    })();
    return () => { cancelled = true; };
  }, [token, nav, setLang]);

  // 로딩: 앱 "웹으로 보기" 와 연속되는 풀스크린 부트
  if (status === 'loading') {
    return <FullscreenBoot message={t('tokenExchange.loadingMessage')} />;
  }

  // 에러: 동일 그린 풀스크린 + 안내 + 재시도 버튼
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#4CAF50',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, textAlign: 'center', color: '#fff',
    }}>
      <img src="/parkinon-symbol.png" alt={t('common.appName')} style={{ width: 96, height: 96, marginBottom: 24 }} />
      <p style={{ fontSize: 17, whiteSpace: 'pre-line', opacity: 0.92, lineHeight: 1.55, margin: 0, maxWidth: 360 }}>
        {t(errorKey)}
      </p>
      <button
        onClick={() => nav('/')}
        style={{
          marginTop: 28, padding: '14px 28px',
          background: '#fff', color: '#2e7d32',
          border: 'none', borderRadius: 14,
          fontSize: 18, fontWeight: 800,
          cursor: 'pointer',
        }}
      >{t('tokenExchange.goEnterCodeBtn')}</button>
    </div>
  );
}
