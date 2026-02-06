import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'outline';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  glow = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'rounded-xl transition-all duration-200';

  const variantStyles = {
    default: 'bg-[#121215] border border-[#2A2A30]',
    glass: 'glass-panel',
    outline: 'bg-transparent border border-[#2A2A30]',
  };

  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const glowStyles = glow
    ? 'shadow-[0_0_30px_rgba(0,240,255,0.1)] hover:shadow-[0_0_40px_rgba(0,240,255,0.15)]'
    : '';

  return (
    <div
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${glowStyles}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`mb-4 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <h3 className={`text-lg font-semibold text-white ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <p className={`text-sm text-gray-400 mt-1 ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={className} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`mt-4 pt-4 border-t border-[#2A2A30] ${className}`} {...props}>
    {children}
  </div>
);

export default Card;
