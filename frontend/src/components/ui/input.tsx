import * as React from 'react';
import { cn } from '../../lib/utils';

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'h-11 w-full rounded-lg border-2 border-industrial-300 bg-white px-4 text-sm font-medium outline-none transition-all duration-200 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 placeholder:text-industrial-400',
        props.className,
      )}
    />
  );
}
