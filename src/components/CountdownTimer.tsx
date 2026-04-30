'use client';

import { useEffect, useState } from 'react';

function diff(target: number) {
  const ms = Math.max(0, target - Date.now());
  const total = Math.floor(ms / 1000);
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
    done: ms === 0,
  };
}

export default function CountdownTimer({ target, label }: { target: string; label?: string }) {
  const targetMs = new Date(target).getTime();
  const [time, setTime] = useState(diff(targetMs));

  useEffect(() => {
    if (Number.isNaN(targetMs)) return;
    const id = setInterval(() => setTime(diff(targetMs)), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  if (Number.isNaN(targetMs) || time.done) return null;

  const cell = (n: number, l: string) => (
    <div className="flex flex-col items-center bg-white/5 border border-white/10 rounded-xl px-3 py-2 min-w-[64px]">
      <span className="text-2xl md:text-3xl font-bold text-white tabular-nums">
        {String(n).padStart(2, '0')}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-gray-400 mt-0.5">{l}</span>
    </div>
  );

  return (
    <div className="inline-flex flex-col items-center gap-3">
      {label && <span className="text-sm text-gray-300">{label}</span>}
      <div className="flex gap-2">
        {cell(time.d, 'days')}
        {cell(time.h, 'hours')}
        {cell(time.m, 'min')}
        {cell(time.s, 'sec')}
      </div>
    </div>
  );
}
