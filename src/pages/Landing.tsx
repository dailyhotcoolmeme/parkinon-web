import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exchangeWebToken, EXCHANGE_ERROR_KEYS } from '../lib/exchangeWebToken';
import { useT } from '../i18n';

export default function Landing() {
  const nav = useNavigate();
  const { t, setLang } = useT();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef(false);

  const submit = async (value: string) => {
    if (status === 'loading' || submittedRef.current) return;
    if (!/^\d{6}$/.test(value)) {
      setError(t('landing.errorIncomplete'));
      return;
    }
    submittedRef.current = true;
    setStatus('loading');
    setError('');

    const result = await exchangeWebToken(value);

    if (result.ok) {
      setLang(result.language);
      nav('/records', { replace: true });
      return;
    }

    setStatus('idle');
    submittedRef.current = false;
    setError(t(EXCHANGE_ERROR_KEYS[result.code]));
    setCode('');
    inputRef.current?.focus();
  };

  const onChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (error) setError('');
    if (digits.length === 6) {
      // 6자리 채워지면 자동 제출
      submit(digits);
    }
  };

  const disabled = status === 'loading';

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#4CAF50',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, textAlign: 'center', color: '#fff',
      overflowY: 'auto',
    }}>
      <img src={`${import.meta.env.BASE_URL}parkinon-symbol.png`} alt={t('common.appName')} style={{ width: 88, height: 88, marginBottom: 20 }} />

      <p style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.5, margin: 0, maxWidth: 380 }}>
        {t('landing.title')}
      </p>
      <p style={{ fontSize: 15, opacity: 0.9, lineHeight: 1.5, margin: '10px 0 0', maxWidth: 360 }}>
        {t('landing.subtitle')}
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); submit(code); }}
        style={{ marginTop: 28, width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        <input
          ref={inputRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          inputMode="numeric"
          type="text"
          pattern="\d*"
          maxLength={6}
          autoFocus
          autoComplete="one-time-code"
          aria-label={t('landing.a11yCodeInput')}
          placeholder="••••••"
          disabled={disabled}
          style={{
            width: '100%', boxSizing: 'border-box',
            height: 72, padding: '0 16px',
            fontSize: 40, fontWeight: 800,
            letterSpacing: '0.4em', textAlign: 'center',
            color: '#1b5e20', background: '#fff',
            border: error ? '3px solid #ffcdd2' : '3px solid transparent',
            borderRadius: 16, outline: 'none',
            caretColor: '#4CAF50',
          }}
        />

        <button
          type="submit"
          disabled={disabled || code.length !== 6}
          style={{
            marginTop: 16, width: '100%',
            height: 60, minHeight: 60,
            background: code.length === 6 && !disabled ? '#fff' : 'rgba(255,255,255,0.55)',
            color: '#2e7d32',
            border: 'none', borderRadius: 14,
            fontSize: 20, fontWeight: 800,
            cursor: code.length === 6 && !disabled ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
        >
          {disabled ? (
            <>
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                border: '3px solid rgba(46,125,50,0.25)', borderTopColor: '#2e7d32',
                display: 'inline-block', animation: 'spin 0.8s linear infinite',
              }} />
              {t('common.checking')}
            </>
          ) : t('common.confirm')}
        </button>
      </form>

      <div style={{ minHeight: 28, marginTop: 14 }}>
        {error && (
          <p role="alert" style={{
            margin: 0, fontSize: 16, fontWeight: 700, lineHeight: 1.5,
            color: '#fff', background: 'rgba(0,0,0,0.18)',
            padding: '10px 16px', borderRadius: 12, maxWidth: 340,
          }}>
            {error}
          </p>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
