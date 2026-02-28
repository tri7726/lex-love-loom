export const tangoGradients: Record<string, string> = {
  N5: 'from-rose-400 via-pink-400 to-rose-500',
  N4: 'from-rose-500 via-pink-500 to-rose-600',
  N3: 'from-pink-400 via-rose-400 to-pink-500',
  N2: 'from-rose-500 via-red-400 to-pink-500',
  N1: 'from-pink-500 via-rose-500 to-red-500',
};

export const tangoAccents: Record<string, { ring: string; badge: string; text: string }> = {
  N5: { ring: 'ring-rose-300/40', badge: 'bg-rose-100 text-rose-700', text: 'text-rose-600' },
  N4: { ring: 'ring-pink-300/40', badge: 'bg-pink-100 text-pink-700', text: 'text-pink-600' },
  N3: { ring: 'ring-rose-300/40', badge: 'bg-rose-50 text-rose-600', text: 'text-rose-500' },
  N2: { ring: 'ring-rose-400/30', badge: 'bg-rose-100 text-rose-700', text: 'text-rose-600' },
  N1: { ring: 'ring-pink-400/30', badge: 'bg-pink-100 text-pink-700', text: 'text-pink-600' },
};

export const minaGradients: Record<string, string> = {
  N5: 'from-sky-400 via-blue-400 to-sky-500',
  N4: 'from-blue-500 via-indigo-400 to-blue-600',
};

export const minaAccents: Record<string, { ring: string; badge: string; text: string }> = {
  N5: { ring: 'ring-sky-300/40', badge: 'bg-sky-100 text-sky-700', text: 'text-sky-600' },
  N4: { ring: 'ring-blue-300/40', badge: 'bg-blue-100 text-blue-700', text: 'text-blue-600' },
};

export const getLevelGradient = (seriesId: string, level: string) =>
  seriesId === 'mina'
    ? (minaGradients[level] ?? 'from-sky-400 to-blue-500')
    : (tangoGradients[level] ?? tangoGradients.N5);

export const getLevelAccent = (seriesId: string, level: string) =>
  seriesId === 'mina'
    ? (minaAccents[level] ?? minaAccents.N5)
    : (tangoAccents[level] ?? tangoAccents.N5);
