import { useT } from '../i18n';

/**
 * 풀스크린 부트 로딩 (패턴4).
 * 그린 풀스크린 + 흰 로고 + 흰 링 스피너 + 흰 문구.
 * 로그인 확인(App.tsx) / 토큰 교환(TokenExchange.tsx)에서 재사용.
 */
export default function FullscreenBoot({
  message,
  children,
}: {
  message: string;
  children?: React.ReactNode;
}) {
  const { t } = useT();
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#4CAF50',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
        color: '#fff',
        zIndex: 1000,
      }}
    >
      <img
        src="/parkinon-symbol.png"
        alt={t('common.appName')}
        style={{ width: 96, height: 96, marginBottom: 24 }}
      />
      <p
        style={{
          fontSize: 17,
          fontWeight: 400,
          whiteSpace: 'pre-line',
          opacity: 0.92,
          lineHeight: 1.55,
          margin: 0,
          maxWidth: 360,
        }}
      >
        {message}
      </p>

      <div style={{ marginTop: 32 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.28)',
            borderTopColor: '#fff',
            animation: 'pn-spin 0.8s linear infinite',
          }}
        />
      </div>

      {children}
    </div>
  );
}
