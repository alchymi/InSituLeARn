interface ProgressState {
  discovered: string[]; // target IDs
  completedAt?: string;
}

const KEY_PREFIX = 'insitu:progress:';

export function loadProgress(slug: string): ProgressState {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + slug);
    if (!raw) return { discovered: [] };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.discovered)) return { discovered: [] };
    return parsed as ProgressState;
  } catch {
    return { discovered: [] };
  }
}

export function saveProgress(slug: string, state: ProgressState) {
  try {
    localStorage.setItem(KEY_PREFIX + slug, JSON.stringify(state));
  } catch { /* quota / private mode */ }
}

export function markDiscovered(slug: string, targetId: string, totalTargets: number): ProgressState {
  const current = loadProgress(slug);
  if (current.discovered.includes(targetId)) return current;
  const next: ProgressState = {
    discovered: [...current.discovered, targetId],
    completedAt: current.completedAt,
  };
  if (next.discovered.length >= totalTargets && !next.completedAt) {
    next.completedAt = new Date().toISOString();
  }
  saveProgress(slug, next);
  return next;
}

export function resetProgress(slug: string) {
  try { localStorage.removeItem(KEY_PREFIX + slug); } catch { /* ignore */ }
}

/** Deterministic hue triplet derived from a target id for locked slot pattern. */
export function targetHues(targetId: string): { h1: number; h2: number; h3: number; rot: number } {
  let h = 0;
  for (let i = 0; i < targetId.length; i++) h = (h * 31 + targetId.charCodeAt(i)) >>> 0;
  return {
    h1: h % 360,
    h2: (h * 7) % 360,
    h3: (h * 13) % 360,
    rot: (h * 17) % 360,
  };
}
