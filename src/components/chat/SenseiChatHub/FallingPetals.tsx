import React from 'react';

const FallingPetals: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div className="absolute inset-0 opacity-20">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-petal-fall"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-${Math.random() * 20}%`,
              animationDelay: `${Math.random() * 15}s`,
              animationDuration: `${10 + Math.random() * 10}s`,
            }}
          >
            <div 
              className="w-3 h-3 bg-sakura-light rounded-full opacity-60 blur-[1px]" 
              style={{
                transform: `rotate(${Math.random() * 360}deg) scale(${0.5 + Math.random()})`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default FallingPetals;
