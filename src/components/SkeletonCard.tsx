export default function SkeletonCard() {
  return (
    <div className="bg-dark-700/50 border border-white/10 rounded-2xl overflow-hidden">
      <div className="skeleton h-64 w-full rounded-none" />
      <div className="p-5 space-y-3">
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-4 w-full" />
        <div className="flex items-center justify-between pt-2">
          <div className="skeleton h-6 w-20" />
          <div className="skeleton h-10 w-10 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
