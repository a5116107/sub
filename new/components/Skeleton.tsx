import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', width, height }) => {
  return (
    <div 
      className={`
        relative overflow-hidden bg-white/5 rounded-md
        before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer 
        before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent
        ${className}
      `}
      style={{ 
        width: width, 
        height: height 
      }}
    />
  );
};