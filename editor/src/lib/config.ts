/**
 * Runtime > build-time > default config resolution.
 *
 * - Runtime: window.__INSITU_CONFIG__ (set by Docker entrypoint via /env.js in prod)
 * - Build-time: import.meta.env.VITE_<KEY> (from .env files at vite build)
 * - Default: provided fallback
 */
type ConfigKey = 'POCKETBASE_URL' | 'ADMIN_APP_URL' | 'PUBLIC_APP_URL';

declare global {
  interface Window {
    __INSITU_CONFIG__?: Partial<Record<ConfigKey, string>>;
  }
}

export function getConfig(key: ConfigKey, defaultValue = ''): string {
  const runtime = typeof window !== 'undefined' ? window.__INSITU_CONFIG__?.[key] : undefined;
  if (runtime && runtime.length > 0) return runtime;
  const buildTime = (import.meta as { env?: Record<string, string> }).env?.[`VITE_${key}`];
  if (buildTime && buildTime.length > 0) return buildTime;
  return defaultValue;
}
