import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useT } from '../i18n';

export default function Layout() {
  const nav = useNavigate();
  const { t, lang } = useT();
  const [name, setName] = useState<string>('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const SUPPORT_EMAIL = 'contact@ourmine.co.kr';

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (uid) {
        const { data: row } = await supabase.from('users').select('name').eq('id', uid).maybeSingle();
        if (row?.name) setName(row.name);
      }
    })();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [menuOpen]);

  const logout = async () => {
    if (!window.confirm(t('layout.logoutConfirm'))) return;
    await supabase.auth.signOut({ scope: 'local' });
    nav('/');
  };

  return (
    <div className="layout">
      <header className="app-header">
        <div className="app-header-inner brand-row">
            <div className="brand">
              <div className="brand-symbol-badge">
                <img src="/parkinon-symbol.png" alt="" className="brand-symbol-spin" />
              </div>
              <span>{t('common.appName')}</span>
            </div>
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                title={t('layout.menuBtn')}
                aria-label={t('layout.menuBtn')}
                className="icon-btn"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
              {menuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    minWidth: 220,
                    background: '#fff',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    padding: 12,
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  {name && (
                    <div
                      style={{
                        border: '1.5px solid #C8E6C9',
                        borderRadius: 10,
                        padding: '14px 12px',
                        background: '#F2FAFA',
                        color: '#4CAF50',
                        fontWeight: 600,
                        fontSize: 15,
                        lineHeight: 1.2,
                        textAlign: 'center',
                      }}
                    >
                      {t('layout.userRecordsTitle', { name })}
                    </div>
                  )}
                  <Link
                    to="/records/export"
                    onClick={() => setMenuOpen(false)}
                    className="menu-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      gap: 10,
                      padding: '14px 12px',
                      border: 'none',
                      borderRadius: 8,
                      color: 'var(--accent)',
                      background: 'transparent',
                      fontWeight: 500,
                      fontSize: 15,
                      textDecoration: 'none',
                      textAlign: 'left',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    {t('layout.downloadPdf')}
                  </Link>
                  <button
                    onClick={() => { setMenuOpen(false); logout(); }}
                    className="menu-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      gap: 10,
                      padding: '14px 12px',
                      border: 'none',
                      borderRadius: 8,
                      color: 'var(--danger)',
                      background: 'transparent',
                      fontWeight: 500,
                      fontSize: 15,
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    {t('layout.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="header-divider" />
          <nav className="app-header-inner header-tabs no-scrollbar">
            <NavLink to="/records" end className={({ isActive }) => (isActive ? 'tab-link active' : 'tab-link')}>{t('layout.tabOverview')}</NavLink>
            <NavLink to="/records/medication" className={({ isActive }) => (isActive ? 'tab-link active' : 'tab-link')}>{t('layout.tabMedication')}</NavLink>
            <NavLink to="/records/symptom" className={({ isActive }) => (isActive ? 'tab-link active' : 'tab-link')}>{t('layout.tabBodyState')}</NavLink>
            <NavLink to="/records/mood" className={({ isActive }) => (isActive ? 'tab-link active' : 'tab-link')}>{t('layout.tabMood')}</NavLink>
            <NavLink to="/records/exercise" className={({ isActive }) => (isActive ? 'tab-link active' : 'tab-link')}>{t('layout.tabExercise')}</NavLink>
            <NavLink to="/records/sleep-constipation" className={({ isActive }) => (isActive ? 'tab-link active' : 'tab-link')}>{t('layout.tabSleepConstipation')}</NavLink>
          </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <div className="app-footer-inner">
          <div>© 2026 ParkinON · Ourmine</div>
          <div className="footer-links">
            {/* /terms, /privacy는 public/ 정적 파일 — SPA Link(클라이언트 라우팅)로 가면
                일치하는 라우트가 없어 "*" 와일드카드에 걸려 홈으로 리다이렉트된다.
                일반 <a>로 실제 페이지 이동(서버 요청)을 시켜야 정적 파일이 뜬다.
                영문판은 /terms/en, /privacy/en 정적 파일로 이미 존재(앱 TermsScreen과 동일 소스). */}
            <a href={lang === 'en' ? '/terms/en' : '/terms'}>{t('layout.terms')}</a>
            <span className="footer-sep">·</span>
            <a href={lang === 'en' ? '/privacy/en' : '/privacy'}>{t('layout.privacy')}</a>
            <span className="footer-sep">·</span>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              title={SUPPORT_EMAIL}
              onClick={() => {
                // 메일 앱이 없는 기기에선 mailto가 아무 동작도 안 할 수 있어,
                // 주소를 클립보드에 복사하고 '복사됨' 피드백을 준다(메일 앱 있으면 함께 열림).
                navigator.clipboard?.writeText(SUPPORT_EMAIL)
                  .then(() => { setEmailCopied(true); setTimeout(() => setEmailCopied(false), 1500); })
                  .catch(() => {});
              }}
            >
              {emailCopied ? t('layout.emailCopied') : SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
