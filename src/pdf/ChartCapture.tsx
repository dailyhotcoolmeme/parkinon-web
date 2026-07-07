import { useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import { PdfPrintChart, type PdfChartSpec } from './PdfPrintChart';
import { PdfMeasurementChart, type PdfMeasurementChartSpec } from './PdfMeasurementChart';

/**
 * 캡처 spec union — 기존 PdfChartSpec(약/몸/기분/수면/변비/운동) + 측정 spec(탭핑/반응속도).
 * key 또는 명시적 kind 필드로 구분.
 */
export type AnyCaptureSpec =
  | ({ kind?: 'standard' } & PdfChartSpec)
  | ({ kind: 'measurement' } & PdfMeasurementChartSpec);

/**
 * 오프스크린 차트 캡처 오케스트레이터.
 *
 * - specs 배열의 차트들을 화면 밖(visibility hidden, 음수 위치)에 일괄 마운트
 * - document.fonts.ready + 2x requestAnimationFrame + 짧은 지연으로
 *   Recharts 레이아웃/한글 폰트 안정화를 보장한 뒤
 * - html-to-image 의 toPng(pixelRatio 2.5)로 각 노드를 고해상도 PNG dataURL 화
 * - { [key]: dataUrl } 맵을 onReady 로 전달
 *
 * 캡처가 끝나면 onReady 한 번만 호출(중복 방지). specs 가 비면 빈 맵으로 즉시 완료.
 */
export function ChartCapture({
  specs,
  onReady,
}: {
  specs: AnyCaptureSpec[];
  onReady: (images: Record<string, string>) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    if (specs.length === 0) {
      doneRef.current = true;
      onReady({});
      return;
    }

    let cancelled = false;

    const raf = () => new Promise<void>((res) => requestAnimationFrame(() => res()));

    (async () => {
      try {
        if (document.fonts?.ready) {
          await document.fonts.ready;
        }
        // Recharts 초기 레이아웃/리사이즈 안정화 대기
        await raf();
        await raf();
        await new Promise((res) => setTimeout(res, 250));
        await raf();
        if (cancelled) return;

        const root = rootRef.current;
        if (!root) return;

        const images: Record<string, string> = {};
        for (const spec of specs) {
          const node = root.querySelector<HTMLElement>(`[data-chart-key="${spec.key}"]`);
          if (!node) continue;
          // 일부 환경에서 첫 캡처가 비는 경우가 있어 2회 시도
          let url = await toPng(node, {
            pixelRatio: 2.5,
            backgroundColor: '#ffffff',
            cacheBust: true,
          });
          url = await toPng(node, {
            pixelRatio: 2.5,
            backgroundColor: '#ffffff',
            cacheBust: true,
          });
          if (cancelled) return;
          images[spec.key] = url;
        }

        if (cancelled) return;
        doneRef.current = true;
        onReady(images);
      } catch (e) {
        console.error('[ChartCapture] capture failed', e);
        if (!cancelled) {
          doneRef.current = true;
          onReady({});
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // specs 는 generate 트리거 시 새 배열로 1회 주입됨
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specs]);

  return (
    <div
      ref={rootRef}
      aria-hidden
      style={{
        position: 'fixed',
        left: -100000,
        top: 0,
        width: 1100,
        opacity: 0,
        pointerEvents: 'none',
        zIndex: -1,
      }}
    >
      {specs.map((spec) => (
        <div key={spec.key} data-chart-key={spec.key} style={{ background: '#fff' }}>
          {spec.kind === 'measurement' ? (
            <PdfMeasurementChart spec={spec as PdfMeasurementChartSpec} />
          ) : (
            <PdfPrintChart spec={spec as PdfChartSpec} />
          )}
        </div>
      ))}
    </div>
  );
}
