import { useContext } from 'react';
import { ConfettiContext, ConfettiContextType } from '../components/ConfettiProvider';

export const useConfetti = (): ConfettiContextType => {
  const context = useContext(ConfettiContext);
  if (context === undefined) {
    throw new Error('useConfetti must be used within a ConfettiProvider');
  }
  return context;
};
