'use client';

import { FiClock, FiPackage, FiTruck, FiCheckCircle, FiXCircle } from 'react-icons/fi';

type Status = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

const ORDER: Status[] = ['pending', 'processing', 'shipped', 'delivered'];

const ICONS: Record<Status, React.ReactNode> = {
  pending: <FiClock size={18} />,
  processing: <FiPackage size={18} />,
  shipped: <FiTruck size={18} />,
  delivered: <FiCheckCircle size={18} />,
  cancelled: <FiXCircle size={18} />,
};

const LABELS: Record<Status, string> = {
  pending: 'Order placed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function OrderStatusTimeline({ status }: { status: Status }) {
  if (status === 'cancelled') {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 flex items-center gap-3 text-red-400">
        <FiXCircle size={22} />
        <div>
          <p className="font-semibold">Order cancelled</p>
          <p className="text-sm text-red-300/80">This order has been cancelled.</p>
        </div>
      </div>
    );
  }

  const currentIdx = ORDER.indexOf(status);

  return (
    <div className="grid grid-cols-4 gap-2 md:gap-4">
      {ORDER.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s} className="flex flex-col items-center text-center">
            <div className="relative w-full flex items-center justify-center mb-2">
              {i > 0 && (
                <span
                  className={`absolute top-1/2 -translate-y-1/2 right-1/2 w-full h-0.5 ${
                    done || active ? 'bg-primary' : 'bg-white/10'
                  }`}
                />
              )}
              <div
                className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition ${
                  done
                    ? 'bg-primary border-primary text-white'
                    : active
                    ? 'border-primary text-primary bg-primary/15 animate-pulse'
                    : 'border-white/20 text-gray-500 bg-dark-700/40'
                }`}
              >
                {ICONS[s]}
              </div>
            </div>
            <span
              className={`text-xs font-medium ${
                done || active ? 'text-white' : 'text-gray-500'
              }`}
            >
              {LABELS[s]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
