import { useEffect, useState } from 'react';

/**
 * 스켈레톤 로딩.
 * 실제 카드 형태의 회색 블록 + shimmer(좌→우 1.4s 무한).
 * 카드 80ms stagger, 표시 delay 200ms (짧은 페치엔 깜빡임 방지).
 */

/** 회색 블록 한 줄/덩어리 — base #EFEFEF + shimmer 오버레이 */
function Block({
  width,
  height,
  radius = 8,
  delay = 0,
  style,
}: {
  width?: number | string;
  height: number;
  radius?: number;
  delay?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="pn-skel-block"
      style={{
        width: width ?? '100%',
        height,
        borderRadius: radius,
        animationDelay: `${delay}ms`,
        ...style,
      }}
    />
  );
}

/** 기록 카드 한 장 형태 — 제목 줄 + 차트 영역 블록 */
function SkeletonCard({ stagger }: { stagger: number }) {
  return (
    <div
      className="card"
      style={{
        opacity: 0,
        animation: 'pn-skel-in .3s cubic-bezier(0.4,0,0.2,1) forwards',
        animationDelay: `${stagger}ms`,
      }}
    >
      <Block width={140} height={18} radius={6} delay={stagger} />
      <div style={{ height: 14 }} />
      <Block height={140} radius={12} delay={stagger + 80} />
    </div>
  );
}

export default function Skeleton({
  count = 3,
  delay = 200,
}: {
  count?: number;
  delay?: number;
}) {
  const [show, setShow] = useState(delay === 0);
  useEffect(() => {
    if (delay === 0) return;
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  if (!show) return null;

  return (
    <div aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} stagger={i * 80} />
      ))}
    </div>
  );
}
