import * as React from 'react';
import { cn } from '../../lib/utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary' | 'destructive';
};

export function Button({ className, variant = 'default', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'default' && 'bg-[#2563EB] text-white hover:bg-blue-700',
        variant === 'secondary' && 'bg-slate-200 text-slate-700 hover:bg-slate-300',
        variant === 'destructive' && 'bg-[#DC2626] text-white hover:bg-red-700',
        className,
      )}
      {...props}
    />
  );
}
