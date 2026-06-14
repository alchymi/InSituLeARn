import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', loading, className = '', children, disabled, ...rest }, ref) => {
    const variants: Record<Variant, string> = {
      primary: 'bg-blue-500 hover:bg-blue-600 text-white shadow-cta',
      secondary: 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-100 border border-white/10',
      ghost: 'bg-transparent hover:bg-white/[0.06] text-zinc-300',
    };
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 h-12 px-6 rounded-2xl font-medium text-[14px] transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${variants[variant]} ${className}`}
        {...rest}
      >
        {loading && <Spinner className="w-4 h-4" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

interface SpinnerProps extends HTMLAttributes<SVGElement> {}

export function Spinner({ className = '' }: SpinnerProps) {
  return (
    <svg viewBox="0 0 24 24" className={`animate-spin ${className}`} fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function IconButton({ children, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white active:scale-95 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
