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
  `;

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variantStyles = {
    primary: `
      bg-gradient-to-r from-[#00F0FF] to-[#0088FF]
      text-black hover:shadow-lg
    `,
    secondary: `
      bg-white/5 text-white
      border border-white/10
      hover:bg-white/10 hover:border-white/20
      backdrop-blur-md
    `,
    ghost: `
      bg-transparent text-gray-400
      hover:text-white hover:bg-white/5
    `,
    danger: `
      bg-red-500/10 text-red-400
      border border-red-500/20
      hover:bg-red-500/20
    `,
    outline: `
      bg-transparent text-white
      border border-[#2A2A30]
      hover:border-[#00F0FF]/50 hover:text-[#00F0FF]
    `,
  };

  const glowStyles = glow
    ? 'shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:shadow-[0_0_30px_rgba(0,240,255,0.5)]'
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
