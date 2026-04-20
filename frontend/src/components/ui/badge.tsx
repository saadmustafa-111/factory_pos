import { cn } from '../../lib/utils';

export function Badge({
  value,
}: {
  value: 'paid' | 'partial' | 'pending' | 'overdue' | 'due_soon' | string;
}) {
  return (
    <span
      className={cn(
        'rounded px-2 py-1 text-xs font-semibold',
        value === 'paid' && 'bg-[#16A34A]/10 text-[#16A34A]',
        value === 'partial' && 'bg-[#D97706]/10 text-[#D97706]',
        value === 'pending' && 'bg-[#DC2626]/10 text-[#DC2626]',
        value === 'overdue' && 'bg-[#DC2626]/10 text-[#DC2626]',
        value === 'due_soon' && 'bg-orange-100 text-orange-700',
      )}
    >
      {value}
    </span>
  );
}
