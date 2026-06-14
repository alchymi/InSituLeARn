import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type LabelHTMLAttributes, type HTMLAttributes, type PropsWithChildren } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-blue-500 hover:bg-blue-600 text-white shadow-cta',
  secondary:
    'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-100 border border-white/10 hover:border-white/15',
  ghost:
    'bg-transparent hover:bg-white/[0.06] text-zinc-300 hover:text-zinc-100',
  danger:
    'bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-[12px] rounded-md',
  md: 'h-10 px-4 text-[13px] rounded-lg',
  lg: 'h-11 px-5 text-[14px] rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className = '', children, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-medium transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {loading && <Spinner className="w-3.5 h-3.5" />}
      {children}
    </button>
  )
);
Button.displayName = 'Button';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', invalid, ...rest }, ref) => (
    <input
      ref={ref}
      className={`w-full h-10 px-3 rounded-lg bg-[#0E0E11] border text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors ${
        invalid
          ? 'border-red-500/50 focus:border-red-500/70'
          : 'border-white/10 focus:border-blue-500/60'
      } ${className}`}
      {...rest}
    />
  )
);
Input.displayName = 'Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', invalid, rows = 3, ...rest }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={`w-full px-3 py-2 rounded-lg bg-[#0E0E11] border text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none transition-colors ${
        invalid ? 'border-red-500/50' : 'border-white/10 focus:border-blue-500/60'
      } ${className}`}
      {...rest}
    />
  )
);
Textarea.displayName = 'Textarea';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', children, ...rest }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={`w-full h-10 pl-3 pr-9 rounded-lg bg-[#0E0E11] border border-white/10 text-[13px] text-zinc-100 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60 ${className}`}
        {...rest}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 24 24"
        className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  )
);
Select.displayName = 'Select';

export function Label({ className = '', children, ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={`block text-[12px] font-medium text-zinc-400 mb-1.5 ${className}`} {...rest}>
      {children}
    </label>
  );
}

export function FieldError({ children }: PropsWithChildren) {
  if (!children) return null;
  return <p className="mt-1.5 text-[11px] text-red-400">{children}</p>;
}

export function Card({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl bg-[#0E0E11] border border-white/[0.08] p-5 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

type BadgeColor = 'emerald' | 'amber' | 'red' | 'blue' | 'zinc';

const badgeColors: Record<BadgeColor, string> = {
  emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  red: 'bg-red-500/15 text-red-400 border-red-500/30',
  blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  zinc: 'bg-white/[0.06] text-zinc-400 border-white/10',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: BadgeColor;
}

export function Badge({ color = 'zinc', className = '', children, ...rest }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-[10px] font-medium uppercase tracking-wider border ${badgeColors[color]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}

interface SpinnerProps extends HTMLAttributes<SVGElement> {}

export function Spinner({ className = '' }: SpinnerProps) {
  return (
    <svg viewBox="0 0 24 24" className={`animate-spin ${className}`} fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <div
      className="rounded-[8px] bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        className="text-white"
        style={{ width: size * 0.55, height: size * 0.55 }}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-4">
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5 text-zinc-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
      <p className="text-[15px] font-medium text-zinc-200">{title}</p>
      {hint && <p className="mt-1 text-[13px] text-zinc-500 max-w-sm">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
