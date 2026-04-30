'use client';

import { useSettings } from '@/context/SettingsContext';
import { DEFAULT_LEGAL, LegalKey } from '@/lib/legal-defaults';

const FIELD_MAP: Record<LegalKey, 'legalPrivacy' | 'legalTerms' | 'legalReturns' | 'legalFaq'> = {
  privacy: 'legalPrivacy',
  terms: 'legalTerms',
  returns: 'legalReturns',
  faq: 'legalFaq',
};

function renderMarkdownLite(input: string) {
  // Very small renderer: lines starting with ## → h2, # → h1, blank line breaks paragraphs.
  const blocks: React.ReactNode[] = [];
  const lines = input.split('\n');
  let buffer: string[] = [];
  const flush = (idx: number) => {
    if (buffer.length === 0) return;
    blocks.push(
      <p key={`p-${idx}`} className="text-gray-300 leading-relaxed mb-4">
        {buffer.join(' ')}
      </p>,
    );
    buffer = [];
  };
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (line.startsWith('## ')) {
      flush(i);
      blocks.push(
        <h2 key={`h2-${i}`} className="text-xl font-semibold text-white mt-8 mb-3">
          {line.slice(3)}
        </h2>,
      );
    } else if (line.startsWith('# ')) {
      flush(i);
      blocks.push(
        <h1 key={`h1-${i}`} className="text-3xl font-bold text-white mb-4">
          {line.slice(2)}
        </h1>,
      );
    } else if (line.startsWith('- ')) {
      flush(i);
      blocks.push(
        <li key={`li-${i}`} className="text-gray-300 leading-relaxed ml-6 list-disc">
          {line.slice(2)}
        </li>,
      );
    } else if (line === '') {
      flush(i);
    } else {
      buffer.push(line);
    }
  });
  flush(lines.length);
  return blocks;
}

export default function LegalRenderer({ kind }: { kind: LegalKey }) {
  const { settings } = useSettings();
  const text = (settings?.[FIELD_MAP[kind]] as string | undefined)?.trim() || DEFAULT_LEGAL[kind];
  return (
    <article className="max-w-3xl mx-auto px-4 py-12 prose-invert">
      {renderMarkdownLite(text)}
    </article>
  );
}
