import dayjs from 'dayjs';

export type Range = { from: string; to: string };

export function defaultRange(days = 30): Range {
  const to = dayjs().endOf('day');
  const from = to.subtract(days - 1, 'day').startOf('day');
  return { from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD') };
}

export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  let d = dayjs(from);
  const end = dayjs(to);
  while (d.isBefore(end) || d.isSame(end, 'day')) {
    out.push(d.format('YYYY-MM-DD'));
    d = d.add(1, 'day');
  }
  return out;
}
