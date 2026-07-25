export default function EmptySegment({ message, icon = 'inventory_2' }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <span className="material-symbols-outlined text-6xl text-on-surface-variant">{icon}</span>
      <p className="font-body-lg text-body-lg text-on-surface-variant">{message}</p>
    </div>
  );
}
