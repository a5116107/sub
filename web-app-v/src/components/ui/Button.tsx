import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  glow?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  glow = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = `
    relative inline-flex items-center justify-center
    font-semibold transition-all duration-200
    active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
    rounded-lg overflow-hidden group
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]
  `;

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variantStyles = {
    primary: `
      bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]
      text-white dark:text-black
      shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-lg)]
      hover:brightness-105
    `,
    secondary: `
      bg-[var(--bg-card-alpha)] text-[var(--text-primary)]
      border border-[var(--border-color)]
      shadow-[var(--shadow-sm)]
      hover:bg-[var(--bg-card)] hover:border-[var(--accent-primary)] hover:shadow-[var(--shadow-md)]
      backdrop-blur-md
    `,
    ghost: `
      bg-transparent text-[var(--text-secondary)]
      hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)]
    `,
    danger: `
      bg-red-500/10 text-red-600 dark:text-red-400
      border border-red-500/25
      hover:bg-red-500/15
    `,
    outline: `
      bg-transparent text-[var(--text-primary)]
      border border-[var(--border-color)]
      hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-soft)]
    `,
  };

  const glowStyles = glow
    ? 'ring-1 ring-[var(--accent-soft)] shadow-[var(--shadow-lg)] hover:shadow-[var(--shadow-xl)]'
    : '';

  return (
    <button
      className={`
        ${baseStyles}
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${glowStyles}
        ${className}
      `}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : leftIcon ? (
        <span className="mr-2">{leftIcon}</span>
      ) : null}

      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>

      {rightIcon && !isLoading && <span className="ml-2">{rightIcon}</span>}

      {/* Shine effect on hover */}
      {variant !== 'ghost' && (
        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent z-0" />
      )}
    </button>
  );
};

export default Button;
