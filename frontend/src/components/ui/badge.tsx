import { cn } from '../../lib/utils';

export function Badge({
  value,
}: {
  value: 'paid' | 'partial' | 'pending' | 'overdue' | 'due_soon' | string;
}) {
  return (
    <span
      className={cn(
        'rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide',
        value === 'paid' && 'bg-green-100 text-green-800 border border-green-200',
        value === 'partial' && 'bg-accent-secondary/10 text-accent-secondary border border-accent-secondary/20',
        value === 'pending' && 'bg-accent-danger/10 text-accent-danger border border-accent-danger/20',
        value === 'overdue' && 'bg-accent-danger/10 text-accent-danger border border-accent-danger/20',
        value === 'due_soon' && 'bg-orange-100 text-orange-800 border border-orange-200',
      )}
    >
      {value}
    </span>
  );
}
