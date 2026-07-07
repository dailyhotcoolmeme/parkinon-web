import { createContext, useContext, useState, type ReactNode } from 'react';
import { defaultRange, type Range } from '../lib/dateRange';

type Ctx = {
  range: Range;
  setRange: (r: Range) => void;
  brushIndex: { startIndex?: number; endIndex?: number };
  setBrushIndex: (b: { startIndex?: number; endIndex?: number }) => void;
  brushSync: boolean;
  setBrushSync: (v: boolean) => void;
  showTrendline: boolean;
  setShowTrendline: (v: boolean) => void;
};

const RangeContext = createContext<Ctx | null>(null);

export function RangeProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<Range>(defaultRange(30));
  const [brushIndex, setBrushIndex] = useState<Ctx['brushIndex']>({});
  const [brushSync, setBrushSync] = useState<boolean>(true);
  const [showTrendline, setShowTrendline] = useState<boolean>(false);
  return (
    <RangeContext.Provider value={{
      range, setRange,
      brushIndex, setBrushIndex,
      brushSync, setBrushSync,
      showTrendline, setShowTrendline,
    }}>
      {children}
    </RangeContext.Provider>
  );
}

export function useRange() {
  const ctx = useContext(RangeContext);
  if (!ctx) throw new Error('useRange must be used inside RangeProvider');
  return ctx;
}
