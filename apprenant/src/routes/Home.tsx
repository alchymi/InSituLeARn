import { getConfig } from '../lib/config';

export default function Home() {
  const adminUrl = getConfig('ADMIN_APP_URL', '');

  return (
    <div className="min-h-full text-zinc-100" style={{ background: 'radial-gradient(900px 600px at 12% -10%, rgba(59,130,246,0.10), transparent 60%), radial-gradient(700px 500px at 110% 10%, rgba(168,85,247,0.06), transparent 60%), #050507' }}>

      {/* Top bar */}
      <header className="border-b border-white/[0.06] sticky top-0 z-50 backdrop-blur-xl bg-[#050507]/80">
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="font-semibold text-[14px]">InSitu AR</span>
          </div>
          {adminUrl && (
            <a
              href={adminUrl}
              className="text-[12px] text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Espace éditeur →
            </a>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-[1100px] mx-auto px-6 pt-20 pb-24">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 h-7 px-3 rounded-full bg-white/[0.04] border border-white/10 text-[11px] font-medium text-zinc-300 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            WebAR · sans installation
          </span>
          <h1 className="heading-tighter mt-6 text-5xl md:text-6xl font-semibold leading-[1.05]">
            La formation en situation,<br />
            <span className="text-zinc-400">posée dans le réel.</span>
          </h1>
          <p className="mt-6 text-zinc-400 leading-relaxed text-[16px] max-w-xl">
            Pose des images cibles dans un lieu physique. Édite leur contenu en quelques clics.
            Partage un lien. N'importe qui scanne avec son téléphone — la pédagogie apparaît
            ancrée à l'objet, à la machine ou au panneau, en réalité augmentée.
          </p>
          <div className="mt-9 flex items-center gap-3 flex-wrap">
            {adminUrl ? (
              <a
                href={adminUrl}
                className="inline-flex items-center gap-2 h-12 px-6 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-medium text-[14px] shadow-cta transition-colors"
              >
                Commencer à créer une quête
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
              </a>
            ) : (
              <span className="text-[12px] text-zinc-500 italic">Lien éditeur non configuré (ADMIN_APP_URL)</span>
            )}
            <span className="text-[12px] text-zinc-500">
              Ou ouvre un lien <code className="font-mono text-zinc-300 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/10">/e/&lt;slug&gt;</code> reçu d'un éditeur.
            </span>
          </div>
        </div>

        {/* Mock preview */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-3">
          <PreviewCard
            title="Place les cibles"
            hint="Affiche, machine, panneau — n'importe quelle image détaillée."
            tone="blue"
            icon={
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            }
          />
          <PreviewCard
            title="Édite le contenu"
            hint="Texte, carte info riche, modèle 3D, embed, image — positionné en 3D."
            tone="emerald"
            icon={
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            }
          />
          <PreviewCard
            title="Partage le lien"
            hint="WebAR sur Android Chrome et iOS Safari. Aucune installation requise."
            tone="violet"
            icon={
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            }
          />
        </div>
      </section>

      {/* Features */}
      <section className="max-w-[1100px] mx-auto px-6 py-20 border-t border-white/[0.06]">
        <h2 className="heading-tight text-3xl font-semibold">Ce que tu peux faire</h2>
        <p className="mt-3 text-zinc-400 text-[15px] max-w-xl">
          Une plateforme légère, open source, pensée pour l'in situ learning.
          Tout reste chez toi — self-hosting, pas de SaaS propriétaire.
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <FeatureCard
            title="Quêtes à débloquer"
            body="Chaque cible débloque du contenu. La progression se conserve dans le navigateur. Une photo souvenir est capturée à chaque découverte."
          />
          <FeatureCard
            title="Édition WYSIWYG en 3D"
            body="Glisse, tourne, redimensionne les contenus sur un canvas Three.js. L'apprenant verra exactement la même chose, ancré sur ton image cible."
          />
          <FeatureCard
            title="Contenus riches"
            body="Texte, cartes mises en forme (Quill), images, modèles 3D GLB, embeds iframe externes — au choix par target."
          />
          <FeatureCard
            title="Multi-éditeur"
            body="Inscription libre. Chaque éditeur gère ses propres quêtes. Compatible Authentik si tu veux brancher du SSO plus tard."
          />
          <FeatureCard
            title="Self-hosted"
            body="PocketBase, Three.js, MindAR. Docker. Aucun lock-in sur un service tiers. Tes données restent à demeure."
          />
          <FeatureCard
            title="Compatible mobile réel"
            body="Tracking image MindAR. Aucune installation, aucune app à publier — juste un lien et une caméra."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06]">
        <div className="max-w-[1100px] mx-auto px-6 py-8 flex items-center justify-between flex-wrap gap-3 text-[12px] text-zinc-500">
          <span>InSitu AR · plateforme WebAR pédagogique self-hosted</span>
          {adminUrl && (
            <a href={adminUrl} className="hover:text-zinc-300">Espace éditeur</a>
          )}
        </div>
      </footer>
    </div>
  );
}

function Logo({ size = 28 }: { size?: number }) {
  return (
    <div
      className="rounded-[8px] bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        className="text-white"
        style={{ width: size * 0.55, height: size * 0.55 }}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    </div>
  );
}

function PreviewCard({
  title, hint, icon, tone,
}: { title: string; hint: string; icon: React.ReactNode; tone: 'blue' | 'emerald' | 'violet' }) {
  const tones = {
    blue: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
    emerald: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    violet: 'bg-violet-500/15 border-violet-500/30 text-violet-400',
  };
  return (
    <div className="rounded-2xl bg-[#0E0E11] border border-white/[0.08] p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${tones[tone]}`}>
        {icon}
      </div>
      <h3 className="mt-4 text-[15px] font-semibold heading-tight">{title}</h3>
      <p className="mt-1.5 text-[12px] text-zinc-500 leading-relaxed">{hint}</p>
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-[#0E0E11] border border-white/[0.08] p-5 hover:border-white/15 transition-colors">
      <h3 className="text-[14px] font-semibold heading-tight">{title}</h3>
      <p className="mt-2 text-[13px] text-zinc-400 leading-relaxed">{body}</p>
    </div>
  );
}
