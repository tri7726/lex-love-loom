export const tangoGradients: Record<string, string> = {
  N5: 'from-sakura-light via-sakura to-sakura-dark',
  N4: 'from-indigo-jp-light via-indigo-jp to-indigo-jp-dark',
  N3: 'from-matcha-light via-matcha to-matcha-dark',
  N2: 'from-crimson-light via-crimson to-crimson-dark',
  N1: 'from-sumi-light via-sumi to-sumi-dark',
};

export const tangoAccents: Record<string, { ring: string; badge: string; text: string }> = {
  N5: { ring: 'ring-sakura-light/40', badge: 'bg-sakura-light/20 text-sakura-dark', text: 'text-sakura' },
  N4: { ring: 'ring-indigo-jp-light/40', badge: 'bg-indigo-jp-light/20 text-indigo-jp-dark', text: 'text-indigo-jp' },
  N3: { ring: 'ring-matcha-light/40', badge: 'bg-matcha-light/20 text-matcha-dark', text: 'text-matcha' },
  N2: { ring: 'ring-crimson-light/40', badge: 'bg-crimson-light/20 text-crimson-dark', text: 'text-crimson' },
  N1: { ring: 'ring-sumi-light/40', badge: 'bg-sumi-light/20 text-sumi-dark', text: 'text-sumi' },
};

export const minaGradients: Record<string, string> = {
  N5: 'from-sakura-light via-sakura to-sakura-dark',
  N4: 'from-indigo-jp-light via-indigo-jp to-indigo-jp-dark',
};

export const minaAccents: Record<string, { ring: string; badge: string; text: string }> = {
  N5: { ring: 'ring-sakura-light/40', badge: 'bg-sakura-light/20 text-sakura-dark', text: 'text-sakura' },
  N4: { ring: 'ring-indigo-jp-light/40', badge: 'bg-indigo-jp-light/20 text-indigo-jp-dark', text: 'text-indigo-jp' },
};

export const getLevelGradient = (seriesId: string, level: string) =>
  seriesId === 'mina'
    ? (minaGradients[level] ?? minaGradients.N5)
    : (tangoGradients[level] ?? tangoGradients.N5);

export const getLevelAccent = (seriesId: string, level: string) =>
  seriesId === 'mina'
    ? (minaAccents[level] ?? minaAccents.N5)
    : (tangoAccents[level] ?? tangoAccents.N5);
