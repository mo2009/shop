'use client';

import { FiStar } from 'react-icons/fi';

export default function StarRating({
  value,
  size = 14,
  count,
}: {
  value: number;
  size?: number;
  count?: number;
}) {
  const v = Math.max(0, Math.min(5, value || 0));
  return (
    <div className="inline-flex items-center gap-1" aria-label={`Rating ${v.toFixed(1)} out of 5`}>
      <div className="relative inline-flex">
        <div className="flex text-gray-500">
          {[0, 1, 2, 3, 4].map(i => (
            <FiStar key={i} size={size} />
          ))}
        </div>
        <div
          className="absolute top-0 left-0 overflow-hidden flex text-yellow-400"
          style={{ width: `${(v / 5) * 100}%` }}
        >
          {[0, 1, 2, 3, 4].map(i => (
            <FiStar key={i} size={size} fill="currentColor" />
          ))}
        </div>
      </div>
      {typeof count === 'number' && (
        <span className="text-gray-400 text-xs ml-1">({count})</span>
      )}
    </div>
  );
}
