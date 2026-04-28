import * as React from 'react';
import { cn } from '../../lib/utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg';
};

export function Button({ className, variant = 'default', size = 'md', ...props }: ButtonProps) {
  const sizeClasses = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2',
        sizeClasses[size],
        variant === 'default' && 'industrial-button focus:ring-accent-primary/50',
        variant === 'secondary' && 'industrial-button-secondary focus:ring-industrial-500/50',
        variant === 'destructive' && 'bg-accent-danger text-white hover:bg-accent-danger/90 shadow-industrial focus:ring-accent-danger/50',
        variant === 'outline' && 'border-2 border-industrial-300 bg-transparent text-industrial-700 hover:bg-industrial-50 focus:ring-industrial-500/50',
        className,
      )}
      {...props}
    />
  );
}
