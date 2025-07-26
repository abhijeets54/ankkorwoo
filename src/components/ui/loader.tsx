import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

const Loader = ({ size = 'md', color = '#2c2c27', className = '' }: LoaderProps) => {
  // Size mappings
  const sizeMap = {
    sm: {
      container: 'w-6 h-6',
      dot: 'w-1 h-1',
    },
    md: {
      container: 'w-10 h-10',
      dot: 'w-1.5 h-1.5',
    },
    lg: {
      container: 'w-16 h-16',
      dot: 'w-2 h-2',
    },
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`relative ${sizeMap[size].container}`}>
        {/* Dots */}
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 ${sizeMap[size].dot} rounded-full`}
          style={{ backgroundColor: color, animation: 'loaderDot1 1.5s infinite' }}
        ></div>
        <div
          className={`absolute top-1/2 right-0 -translate-y-1/2 ${sizeMap[size].dot} rounded-full`}
          style={{ backgroundColor: color, animation: 'loaderDot2 1.5s infinite' }}
        ></div>
        <div
          className={`absolute bottom-0 left-1/2 -translate-x-1/2 ${sizeMap[size].dot} rounded-full`}
          style={{ backgroundColor: color, animation: 'loaderDot3 1.5s infinite' }}
        ></div>
        <div
          className={`absolute top-1/2 left-0 -translate-y-1/2 ${sizeMap[size].dot} rounded-full`}
          style={{ backgroundColor: color, animation: 'loaderDot4 1.5s infinite' }}
        ></div>
        
        {/* Rotating circle */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: `2px solid ${color}`,
            borderTopColor: 'transparent',
            animation: 'loaderRotate 1s linear infinite',
          }}
        ></div>
      </div>

      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes loaderRotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        @keyframes loaderDot1 {
          0%, 100% {
            opacity: 0.2;
          }
          25% {
            opacity: 1;
          }
        }
        
        @keyframes loaderDot2 {
          0%, 100% {
            opacity: 0.2;
          }
          50% {
            opacity: 1;
          }
        }
        
        @keyframes loaderDot3 {
          0%, 100% {
            opacity: 0.2;
          }
          75% {
            opacity: 1;
          }
        }
        
        @keyframes loaderDot4 {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.2;
          }
        }
      `}</style>
    </div>
  );
};

export default Loader; 