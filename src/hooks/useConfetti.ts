import { useContext } from 'react';
import { ConfettiContext, ConfettiContextType } from '../components/ConfettiProvider';

export const useConfetti = (): ConfettiContextType => {
  const context = useContext(ConfettiContext);
  if (context === undefined) {
    console.warn('useConfetti must be used within a ConfettiProvider. Falling back to no-op.');
    return { fire: () => {} };
  }
  return context;
};
