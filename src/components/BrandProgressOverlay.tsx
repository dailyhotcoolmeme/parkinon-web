import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';

/**
 * 브랜드 진행 오버레이 (패턴3) — 차단 풀스크린.
 * PDF "만들기" 등 비차단 멀티스텝 작업에 재사용.
 *
 * - position:fixed inset:0, 딤 rgba(17,17,17,0.32), backdrop fade 200ms, 클릭 차단.
 * - 흰 카드(w 320, radius 20, padding 28) + 파킨온 심볼 펄스.
 * - 3단계 스텝 인디케이터 (완료/진행/대기 닷 + 연결선).
 * - 불확정 바(green 헤드 왕복).
 * - 경과 10초↑ 보조 문구.
 * - 완료 시 체크서클 pop → 0.8s 후 fade-out.
 */

export type ProgressStep = {
  key: string;
  label: string;
};

export default function BrandProgressOverlay({
  open,
  steps,
  /** 0-based 현재 진행 스텝 인덱스 (이전 인덱스는 완료, 이후는 대기) */
  activeIndex,
  /** 모든 단계 완료 → 체크서클 + 완료 타이틀 */
  done,
  title,
  doneTitle,
  /** 완료 fade-out 종료 콜백 (오버레이 닫기) */
  onDoneFinished,
}: {
  open: boolean;
  steps: ProgressStep[];
  activeIndex: number;
  done: boolean;
  title: string;
  doneTitle: string;
  onDoneFinished?: () => void;
}) {
  const { t } = useT();
  const [mounted, setMounted] = useState(open);
  const [fading, setFading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number>(0);

  // 마운트/언마운트 (fade-in 위해 약간 지연 처리)
  useEffect(() => {
    if (open) {
      setMounted(true);
      setFading(false);
    }
  }, [open]);

  // 경과시간 타이머
  useEffect(() => {
    if (!open || done) return;
    startedAt.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [open, done]);

  // 완료 → 0.8s 노출 후 fade-out → onDoneFinished
  useEffect(() => {
    if (!done || !mounted) return;
    const hold = setTimeout(() => setFading(true), 800);
    const close = setTimeout(() => {
      setMounted(false);
      setFading(false);
      onDoneFinished?.();
    }, 800 + 200);
    return () => {
      clearTimeout(hold);
      clearTimeout(close);
    };
  }, [done, mounted, onDoneFinished]);

  if (!mounted) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-label={done ? doneTitle : title}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(17,17,17,0.32)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        zIndex: 10000,
        opacity: fading ? 0 : 1,
        animation: fading ? undefined : 'pn-backdrop .2s cubic-bezier(0.4,0,0.2,1)',
        transition: 'opacity .2s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <div
        style={{
          width: 320,
          maxWidth: '100%',
          background: '#fff',
          borderRadius: 20,
          padding: 28,
          boxShadow: '0 8px 24px rgba(17,17,17,0.10)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* 심볼 펄스 / 완료 체크서클 */}
        {done ? (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#4CAF50',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pn-pop .22s cubic-bezier(0.4,0,0.2,1)',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        ) : (
          <img
            src="/parkinon-symbol-green.png"
            alt=""
            aria-hidden
            style={{
              width: 48,
              height: 48,
              animation: 'pn-spin 0.9s linear infinite',
            }}
          />
        )}

        {/* 타이틀 */}
        <div style={{ fontSize: 17, fontWeight: 600, color: '#111', textAlign: 'center' }}>
          {done ? doneTitle : title}
        </div>

        {!done && (
          <>
            {/* 3단계 스텝 인디케이터 */}
            <StepIndicator steps={steps} activeIndex={activeIndex} />

            {/* 불확정 바 */}
            <div
              style={{
                position: 'relative',
                width: 220,
                maxWidth: '100%',
                height: 4,
                borderRadius: 999,
                background: '#E8F5E9',
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  width: '40%',
                  borderRadius: 999,
                  background: '#4CAF50',
                  animation: 'pn-bar 1.2s cubic-bezier(0.4,0,0.2,1) infinite alternate',
                }}
              />
            </div>

            {/* 경과 10초↑ 보조 문구 */}
            {elapsed >= 10 && (
              <div style={{ fontSize: 13, fontWeight: 400, color: '#9CA3AF', textAlign: 'center' }}>
                {t('brandProgress.almostDone', { elapsed })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StepIndicator({ steps, activeIndex }: { steps: ProgressStep[]; activeIndex: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
      {steps.map((s, i) => {
        const state: 'done' | 'active' | 'wait' =
          i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'wait';
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: i === steps.length - 1 ? '0 0 auto' : '1 1 0' }}>
            <Dot state={state} />
            {i < steps.length - 1 && <Connector filled={i < activeIndex} />}
          </div>
        );
      })}
    </div>
  );
}

function Dot({ state }: { state: 'done' | 'active' | 'wait' }) {
  if (state === 'done') {
    return (
      <span
        style={{
          width: 18,
          height: 18,
          flexShrink: 0,
          borderRadius: '50%',
          background: '#4CAF50',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
    );
  }
  if (state === 'active') {
    return (
      <span
        style={{
          width: 18,
          height: 18,
          flexShrink: 0,
          borderRadius: '50%',
          border: '2px solid #4CAF50',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#4CAF50',
            animation: 'pn-spin 0.9s linear infinite',
          }}
        />
      </span>
    );
  }
  return (
    <span
      style={{
        width: 18,
        height: 18,
        flexShrink: 0,
        borderRadius: '50%',
        background: '#E5E7EB',
      }}
    />
  );
}

function Connector({ filled }: { filled: boolean }) {
  return (
    <span
      style={{
        flex: '1 1 0',
        height: 2,
        margin: '0 4px',
        borderRadius: 999,
        background: '#E5E7EB',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          width: filled ? '100%' : '0%',
          background: '#4CAF50',
          transition: 'width .3s cubic-bezier(0.4,0,0.2,1)',
        }}
      />
    </span>
  );
}
