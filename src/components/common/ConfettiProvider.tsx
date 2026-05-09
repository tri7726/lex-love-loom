import React, { createContext, useContext, useCallback } from 'react';
import confetti from 'canvas-confetti';

type ConfettiType = 'success' | 'sakura' | 'school' | 'pride';

export interface ConfettiContextType {
  fire: (type?: ConfettiType) => void;
}

export const ConfettiContext = createContext<ConfettiContextType | undefined>(undefined);

export const ConfettiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const fire = useCallback((type: ConfettiType = 'success') => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    if (type === 'sakura') {
      const sakuraConfetti = () => {
        confetti({
          particleCount: 2,
          angle: randomInRange(60, 120),
          spread: randomInRange(50, 70),
          origin: { y: 0 },
          colors: ['#ffb7c5', '#ff99aa', '#ffffff'],
          shapes: ['circle'],
          gravity: 0.8,
          scalar: randomInRange(0.4, 1),
          drift: randomInRange(-0.5, 0.5),
        });

        if (Date.now() < animationEnd) {
          requestAnimationFrame(sakuraConfetti);
        }
      };
      sakuraConfetti();
    } else if (type === 'success') {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f43f5e', '#fb7185', '#fda4af', '#ffffff'],
      });
    } else if (type === 'school') {
       // Graduation/Achievement style
       const count = 200;
       const defaults = { origin: { y: 0.7 } };

       function fireEffect(particleRatio: number, opts: confetti.Options) {
         confetti({
           ...defaults,
           ...opts,
           particleCount: Math.floor(count * particleRatio)
         });
       }

       fireEffect(0.25, { spread: 26, startVelocity: 55 });
       fireEffect(0.2, { spread: 60 });
       fireEffect(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
       fireEffect(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
       fireEffect(0.1, { spread: 120, startVelocity: 45 });
    }
  }, []);

  return (
    <ConfettiContext.Provider value={{ fire }}>
      {children}
    </ConfettiContext.Provider>
  );
};
