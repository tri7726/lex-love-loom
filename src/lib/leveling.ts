/**
 * RPG style leveling math.
 * Formula: Required XP for Level L = L * (L + 1) * 250
 * Example:
 * Lvl 1: 500 XP
 * Lvl 2: 1500 XP (diff: 1000)
 * Lvl 3: 3000 XP (diff: 1500)
 * Lvl 10: 27500 XP
 */

export interface LevelInfo {
  level: number;
  currentXpInLevel: number;
  xpRequiredForNextLevel: number;
  progressPercentage: number;
  totalXpRequiredForNextLevel: number;
}

export function getLevelInfo(totalXp: number): LevelInfo {
  // Solve for Level: L^2 + L - (XP/250) = 0
  const xp = isNaN(totalXp) || !isFinite(totalXp) ? 0 : Math.max(0, totalXp);
  const currentLevel = Math.floor((-1 + Math.sqrt(1 + (4 * xp) / 250)) / 2);
  
  const xpForCurrentLevel = currentLevel * (currentLevel + 1) * 250;
  const nextLevel = currentLevel + 1;
  const xpForNextLevel = nextLevel * (nextLevel + 1) * 250;
  
  const currentXpInLevel = xp - xpForCurrentLevel;
  const xpRequiredForNextLevel = xpForNextLevel - xpForCurrentLevel;
  
  const progressPercentage = Math.min(100, Math.max(0, (currentXpInLevel / xpRequiredForNextLevel) * 100));

  return {
    level: currentLevel,
    currentXpInLevel,
    xpRequiredForNextLevel,
    progressPercentage,
    totalXpRequiredForNextLevel: xpForNextLevel,
  };
}
