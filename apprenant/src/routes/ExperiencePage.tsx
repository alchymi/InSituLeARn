import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { pb, pbFileUrl, type ArContentRecord, type ExperienceRecord, type TargetRecord } from '../lib/pb';
import { loadProgress, markDiscovered, resetProgress, targetHues } from '../lib/progress';
import { capturePolaroid, dropPolaroids, loadPolaroid, savePolaroid } from '../lib/polaroid';
import { ArExperience, type DebugSnapshot, type TrackingState } from '../ar/ArExperience';
import { Button, IconButton, Spinner } from '../ui';

type Phase = 'loading' | 'error' | 'landing' | 'starting' | 'ar';

interface LoadedData {
  experience: ExperienceRecord;
  targets: TargetRecord[];
  contents: ArContentRecord[];
}

export default function ExperiencePage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const debugMode = searchParams.get('debug') === '1';
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LoadedData | null>(null);
  const [discovered, setDiscovered] = useState<Set<string>>(new Set());
  const [tracking, setTracking] = useState<{ state: TrackingState; label: string }>({ state: 'idle', label: 'Prêt' });
  const [unlockToast, setUnlockToast] = useState<{ id: string; name: string } | null>(null);
  const [embedModal, setEmbedModal] = useState<{ url: string; title?: string } | null>(null);
  const [debugSnap, setDebugSnap] = useState<DebugSnapshot[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const arRef = useRef<ArExperience | null>(null);

  // Load experience by slug
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    (async () => {
      setPhase('loading');
      setError(null);
      try {
        const exp = await pb.collection('experiences').getFirstListItem<ExperienceRecord>(
          `slug = "${slug}" && status = "published" && isPublic = true`
        );
        const [targetsList, contentsList] = await Promise.all([
          pb.collection('targets').getList<TargetRecord>(1, 200, {
            filter: `experience = "${exp.id}" && isActive = true`,
            sort: 'order,created',
          }),
          pb.collection('ar_contents').getList<ArContentRecord>(1, 500, {
            filter: `experience = "${exp.id}" && isVisible = true`,
            sort: 'order,created',
          }),
        ]);

        if (cancelled) return;
        const loaded = { experience: exp, targets: targetsList.items, contents: contentsList.items };
        setData(loaded);
        setDiscovered(new Set(loadProgress(slug).discovered));
        setPhase('landing');
      } catch (err) {
        if (cancelled) return;
        const status = (err as { status?: number })?.status;
        if (status === 404) {
          setError('Cette quête n\'existe pas ou n\'est pas publique.');
        } else {
          setError((err as Error)?.message || 'Erreur de chargement');
        }
        setPhase('error');
      }
    })();

    return () => { cancelled = true; };
  }, [slug]);

  // Start AR
  async function startAR() {
    if (!data || !containerRef.current || !slug) return;
    const { experience, targets, contents } = data;

    if (!experience.compiledTargets) {
      setError('Cette quête n\'a pas de cibles compilées. L\'éditeur doit re-publier.');
      setPhase('error');
      return;
    }

    setPhase('starting');
    try {
      const compiledUrl = pbFileUrl(experience, experience.compiledTargets);

      const ar = new ArExperience({
        container: containerRef.current,
        compiledTargetSrc: compiledUrl,
        targets,
        contents,
        initialDiscovered: discovered,
        onTrackingState: (state, label) => setTracking({ state, label }),
        onTargetFound: async (target, isFirstTime) => {
          if (isFirstTime) {
            const next = markDiscovered(slug, target.id, targets.length);
            const nextSet = new Set(next.discovered);
            setDiscovered(nextSet);
            setUnlockToast({ id: target.id, name: target.name });
            window.setTimeout(() => setUnlockToast(null), 2500);

            // Capture polaroid souvenir for this target
            if (containerRef.current && arRef.current) {
              const dataUrl = await capturePolaroid(containerRef.current, arRef.current.rendererCanvas);
              if (dataUrl) savePolaroid(slug, target.id, dataUrl);
            }
            // No auto-transition to a "complete" screen — the user can keep scanning.
          }
        },
        onTargetLost: () => { /* no-op for now */ },
        onContentTap: (content) => {
          if (content.type === 'embed' && content.embedUrl) {
            setEmbedModal({ url: content.embedUrl, title: content.title });
          }
        },
        onDebugSnapshot: debugMode ? (snap) => setDebugSnap(snap) : undefined,
      });

      arRef.current = ar;
      await ar.start();
      setPhase('ar');
    } catch (err) {
      console.error(err);
      setError((err as Error)?.message || 'Échec démarrage caméra');
      setPhase('error');
    }
  }

  // Cleanup
  useEffect(() => {
    return () => {
      arRef.current?.stop();
    };
  }, []);

  function backToLanding() {
    arRef.current?.stop();
    arRef.current = null;
    setPhase('landing');
  }

  function handleReset() {
    if (!slug) return;
    if (!confirm('Réinitialiser ta progression pour cette quête ?')) return;
    resetProgress(slug);
    dropPolaroids(slug);
    setDiscovered(new Set());
  }

  // ─── Render by phase ────────────────────────────────────────
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* AR canvas mount point — kept mounted across phases, transparent until AR runs */}
      <div ref={containerRef} className={`ar-container ${phase === 'ar' || phase === 'starting' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />

      {phase === 'loading' && <LoadingView />}
      {phase === 'error' && <ErrorView message={error || ''} />}
      {phase === 'landing' && data && (
        <LandingView
          slug={slug || ''}
          experience={data.experience}
          targets={data.targets}
          discovered={discovered}
          completed={!!loadProgress(slug || '').completedAt}
          onStart={startAR}
          onReset={handleReset}
        />
      )}
      {phase === 'starting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-base z-30">
          <Spinner className="w-8 h-8 text-blue-400" />
          <p className="mt-4 text-[13px] text-zinc-400">Démarrage de la caméra…</p>
        </div>
      )}
      {(phase === 'ar' || phase === 'starting') && data && (
        <ArOverlay
          experience={data.experience}
          targets={data.targets}
          discovered={discovered}
          tracking={tracking}
          unlockToast={unlockToast}
          onBack={backToLanding}
        />
      )}
      {embedModal && (
        <EmbedModal
          url={embedModal.url}
          title={embedModal.title}
          onClose={() => setEmbedModal(null)}
        />
      )}
      {debugMode && (phase === 'ar' || phase === 'starting') && (
        <DebugOverlay snap={debugSnap} />
      )}
      {/* phase 'complete' removed — quest doesn't auto-finish */}
    </div>
  );
}

function DebugOverlay({ snap }: { snap: DebugSnapshot[] }) {
  return (
    <div className="absolute top-20 left-2 right-2 z-50 pointer-events-none">
      <div className="rounded-lg bg-black/85 border border-white/15 backdrop-blur-md p-2 font-mono text-[10px] leading-tight max-h-[40vh] overflow-y-auto pointer-events-auto">
        <div className="text-zinc-400 mb-1 uppercase tracking-wider">debug · {snap.length} target{snap.length > 1 ? 's' : ''}</div>
        {snap.map((s, i) => (
          <div key={i} className={`flex items-center gap-1.5 ${s.tracked ? 'text-emerald-300' : 'text-zinc-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.tracked ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
            <span className="truncate flex-1">{i}·{s.targetName}</span>
            <span>Δ{s.lastUpdatedFramesAgo}f</span>
            <span>{s.attached ? '+' : '-'}</span>
            <span>{s.matrixChanged ? 'M' : '·'}</span>
            <span className="text-zinc-500">{s.pos.map(v => v.toFixed(1)).join(',')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LoadingView ──────────────────────────────────────────────
function LoadingView() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-base z-30">
      <Spinner className="w-7 h-7 text-blue-400" />
      <p className="mt-3 text-[13px] text-zinc-500">Chargement de la quête…</p>
    </div>
  );
}

// ─── ErrorView ────────────────────────────────────────────────
function ErrorView({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-base z-30 p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="mt-4 text-[16px] font-semibold">Quête indisponible</p>
      <p className="mt-2 max-w-sm text-[13px] text-zinc-400">{message}</p>
    </div>
  );
}

// ─── LandingView ──────────────────────────────────────────────
function LandingView({
  slug,
  experience,
  targets,
  discovered,
  completed,
  onStart,
  onReset,
}: {
  slug: string;
  experience: ExperienceRecord;
  targets: TargetRecord[];
  discovered: Set<string>;
  completed: boolean;
  onStart: () => void;
  onReset: () => void;
}) {
  const count = discovered.size;
  const total = targets.length;
  const pct = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="absolute inset-0 z-20 flex flex-col" style={{ background: 'radial-gradient(circle at 50% 25%, rgba(59,130,246,0.20), transparent 55%), radial-gradient(circle at 50% 90%, rgba(16,185,129,0.10), transparent 50%), #09090B' }}>
      <header className="pt-12 px-6 pb-4 flex items-center justify-between" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 48px)' }}>
        <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium px-2.5 h-6 inline-flex items-center rounded-full border border-white/10 bg-white/[0.04]">In Situ AR</span>
        {count > 0 && (
          <button
            onClick={onReset}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 underline-offset-2 hover:underline"
          >
            Réinitialiser
          </button>
        )}
      </header>

      <div className="px-6 flex-1 overflow-y-auto scrollbar-thin pb-32">
        <h1 className="heading-tighter text-[34px] leading-[1.05] font-semibold max-w-md">
          {experience.title}
        </h1>
        {experience.description && (
          <p className="mt-3 text-[14px] text-zinc-400 max-w-md leading-relaxed">{experience.description}</p>
        )}

        <div className="mt-8">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold heading-tight">{count}</span>
              <span className="text-zinc-500 text-2xl font-medium">/ {total}</span>
              <span className="ml-2 text-[11px] text-zinc-500">découvert{count > 1 ? 's' : ''}</span>
            </div>
            {completed && (
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                Complétée
              </span>
            )}
          </div>
          <div className="mt-3 h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {total === 0 && (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
            <p className="text-[13px] text-zinc-400">Cette quête n'a pas encore de cible.</p>
          </div>
        )}

        {total > 0 && (
          <div className="mt-7 grid grid-cols-3 gap-3">
            {targets.map((t) => (
              <Slot key={t.id} target={t} slug={slug} unlocked={discovered.has(t.id)} />
            ))}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 pt-12 z-30 bg-gradient-to-t from-base via-base/95 to-transparent" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)' }}>
        <Button onClick={onStart} className="w-full">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="8" y="8" width="8" height="8" rx="1"/>
          </svg>
          {count > 0 && count < total ? 'Continuer le scan' : count >= total && total > 0 ? 'Rescanner' : 'Scanner'}
        </Button>
      </div>
    </div>
  );
}

function Slot({ slug, target, unlocked }: { slug: string; target: TargetRecord; unlocked: boolean }) {
  if (unlocked) {
    const polaroid = loadPolaroid(slug, target.id);
    const thumb = polaroid || (target.sourceImage ? pbFileUrl(target, target.sourceImage, { thumb: '200x200' }) : '');
    return (
      <div className="relative aspect-square rounded-2xl overflow-hidden shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.10),0_1px_2px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.35)] animate-unlock">
        {thumb && <img src={thumb} alt={target.name} className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)' }} />
        <div className="absolute inset-x-0 bottom-0 px-2 py-1.5 bg-gradient-to-t from-black/85 to-transparent">
          <div className="text-[10px] font-medium text-white truncate">{target.name}</div>
        </div>
        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500/95 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-black" fill="none" stroke="currentColor" strokeWidth="3.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        {polaroid && (
          <div className="absolute top-1.5 left-1.5 text-[8px] uppercase tracking-wider text-white/60 font-medium px-1.5 py-0.5 rounded-full bg-black/30 backdrop-blur-sm border border-white/10">
            souvenir
          </div>
        )}
      </div>
    );
  }
  const h = targetHues(target.id);
  return (
    <div
      className="relative aspect-square rounded-2xl slot-locked"
      style={{ ['--h1' as string]: h.h1, ['--h2' as string]: h.h2, ['--h3' as string]: h.h3, ['--rot' as string]: `${h.rot}deg` }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white/15" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
    </div>
  );
}

// ─── ArOverlay ────────────────────────────────────────────────
function ArOverlay({
  experience,
  targets,
  discovered,
  tracking,
  unlockToast,
  onBack,
}: {
  experience: ExperienceRecord;
  targets: TargetRecord[];
  discovered: Set<string>;
  tracking: { state: TrackingState; label: string };
  unlockToast: { id: string; name: string } | null;
  onBack: () => void;
}) {
  const count = discovered.size;
  const total = targets.length;

  const dotClass =
    tracking.state === 'found' ? 'bg-emerald-500 animate-dot-pulse' :
    tracking.state === 'searching' ? 'bg-amber-400' :
    tracking.state === 'lost' ? 'bg-red-400' :
    'bg-zinc-400';

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 px-5 z-30 pointer-events-auto" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 48px)' }}>
        <div className="flex items-center justify-between">
          <IconButton onClick={onBack} aria-label="Retour">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          </IconButton>

          <div className="px-3 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
            <span className="text-[12px] font-medium text-white">{count} / {total}</span>
          </div>

          <IconButton onClick={() => alert('Aide : cadre l\'image cible à 30–80 cm. Éclairage homogène.')} aria-label="Aide">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/></svg>
          </IconButton>
        </div>
      </div>

      {/* Viewfinder when nothing tracked */}
      {tracking.state !== 'found' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vmin] max-w-[280px] aspect-square animate-vf-pulse">
          <span className="vf vf-tl"></span>
          <span className="vf vf-tr"></span>
          <span className="vf vf-bl"></span>
          <span className="vf vf-br"></span>
        </div>
      )}

      {/* Hint */}
      <p className="absolute left-0 right-0 text-center text-white/90 text-[14px] font-medium drop-shadow-[0_1px_8px_rgba(0,0,0,0.7)]"
         style={{ bottom: 'max(env(safe-area-inset-bottom, 0px), 32px)' }}>
        {tracking.label}
      </p>

      {/* Unlock toast */}
      {unlockToast && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 px-4 py-3 rounded-2xl bg-emerald-500/15 backdrop-blur-md border border-emerald-500/30 animate-unlock pointer-events-none">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-medium">Nouveau découvert</p>
              <p className="text-[13px] font-semibold text-white mt-0.5">{unlockToast.name}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EmbedModal ───────────────────────────────────────────────
function EmbedModal({ url, title, onClose }: { url: string; title?: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col">
      <header className="flex items-center gap-3 px-4 h-14 border-b border-white/10 shrink-0" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)' }}>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white active:scale-95"
          aria-label="Fermer"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <h2 className="text-[14px] font-semibold truncate flex-1">{title || 'Contenu interactif'}</h2>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] text-zinc-400 hover:text-zinc-200 underline-offset-4 hover:underline"
        >
          Ouvrir ↗
        </a>
      </header>
      <iframe
        src={url}
        className="flex-1 w-full bg-base"
        title={title || 'Embed'}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; fullscreen"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

