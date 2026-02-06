import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  isLoading?: boolean;
  glow?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading = false, 
  glow = false,
  className = '',
  ...props 
}) => {
  const baseStyles = "relative inline-flex items-center justify-center px-6 py-3 text-sm font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg overflow-hidden group";
  
  const variants = {
    primary: "bg-white text-black hover:bg-gray-100 border border-transparent",
    secondary: "bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-md",
    ghost: "bg-transparent text-gray-400 hover:text-white hover:bg-white/5",
    danger: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20",
  };

  const glowStyles = glow ? "shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:shadow-[0_0_30px_rgba(0,240,255,0.5)] border-cyan-500/30" : "";

  // Special Cyberpunk override for primary with glow
  const finalVariantClass = (variant === 'primary' && glow) 
    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-none" 
    : variants[variant];

  return (
    <button 
      className={`${baseStyles} ${finalVariantClass} ${glowStyles} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : null}
      
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
      
      {/* Shine effect on hover */}
      {variant !== 'ghost' && (
        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent z-0" />
      )}
    </button>
  );
};