import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pb, pbFileUrl } from '../lib/pb';
import { compileMergedMindTargets, compileMindTarget, fetchImage, loadImage, readFileAsDataUrl } from '../lib/compile';
import { getConfig } from '../lib/config';
import type { ExperienceRecord, ExperienceStatus, TargetRecord } from '../types';
import { Badge, Button, Card, EmptyState, Input, Label, Select, Spinner } from '../ui';

export default function ExperiencePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: quest, isLoading: qLoading, error: qError } = useQuery({
    queryKey: ['experience', id],
    queryFn: async () => pb.collection('experiences').getOne<ExperienceRecord>(id!),
    enabled: !!id,
  });

  const { data: targets, isLoading: tLoading } = useQuery({
    queryKey: ['targets', id],
    queryFn: async () => {
      const res = await pb.collection('targets').getList<TargetRecord>(1, 200, {
        filter: `experience = "${id}"`,
        sort: 'order,created',
      });
      return res.items;
    },
    enabled: !!id,
  });

  const updateQuest = useMutation({
    mutationFn: async (patch: Partial<ExperienceRecord> | FormData) =>
      pb.collection('experiences').update<ExperienceRecord>(id!, patch as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experience', id] });
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
    },
  });

  const [publishProgress, setPublishProgress] = useState<{ label: string; pct: number } | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const publishMutation = useMutation({
    mutationFn: async () => {
      const list = targets ?? [];
      if (list.length === 0) throw new Error('Ajoute au moins une cible avant de publier');

      setPublishProgress({ label: 'Téléchargement des images cibles…', pct: 5 });
      const images: HTMLImageElement[] = [];
      for (let i = 0; i < list.length; i++) {
        const t = list[i];
        const url = pbFileUrl(t, t.sourceImage);
        images.push(await fetchImage(url));
        setPublishProgress({ label: 'Téléchargement…', pct: 5 + ((i + 1) / list.length) * 15 });
      }

      setPublishProgress({ label: `Compilation MindAR · ${list.length} cible${list.length > 1 ? 's' : ''}…`, pct: 22 });
      const merged = await compileMergedMindTargets(images, (p) => {
        // Compilation goes from ~22 to ~92
        setPublishProgress({ label: 'Compilation MindAR…', pct: 22 + (p / 100) * 70 });
      });

      setPublishProgress({ label: 'Publication…', pct: 95 });
      const form = new FormData();
      form.append('compiledTargets', merged, 'experience.mind');
      form.append('status', 'published');
      form.append('isPublic', 'true');
      form.append('publishedAt', new Date().toISOString());
      return pb.collection('experiences').update<ExperienceRecord>(id!, form);
    },
    onSuccess: () => {
      setPublishProgress(null);
      setPublishError(null);
      queryClient.invalidateQueries({ queryKey: ['experience', id] });
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
    },
    onError: (err) => {
      setPublishProgress(null);
      setPublishError((err as Error)?.message || 'Échec de la publication');
    },
  });

  const deleteQuest = useMutation({
    mutationFn: async () => pb.collection('experiences').delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      navigate('/');
    },
  });

  if (qLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-zinc-500 text-[13px]">
        <Spinner className="w-4 h-4" /> Chargement…
      </div>
    );
  }
  if (qError || !quest) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-500/30 bg-red-500/[0.06] p-4 text-[13px] text-red-300">
          Quête introuvable.
        </div>
        <Link to="/" className="mt-4 inline-block text-blue-400 text-[13px]">← Mes quêtes</Link>
      </div>
    );
  }

  const isPublished = quest.status === 'published';
  const publicUrl = `${getConfig('PUBLIC_APP_URL', '')}/e/${quest.slug}`;
  const statusColor = quest.status === 'published' ? 'emerald' : quest.status === 'archived' ? 'zinc' : 'amber';

  function togglePublish() {
    if (isPublished) {
      updateQuest.mutate({ status: 'draft', isPublic: false });
    } else {
      publishMutation.mutate();
    }
  }

  return (
    <div>
      {/* Sub-header */}
      <div className="border-b border-white/[0.06] px-8 h-14 flex items-center gap-4">
        <Link to="/" className="text-[12px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Mes quêtes
        </Link>
        <div className="h-4 w-px bg-white/10" />
        <h1 className="text-[14px] font-semibold heading-tight truncate">{quest.title}</h1>
        <Badge color={statusColor}>
          <span className="w-1 h-1 rounded-full bg-current" />
          {quest.status}
        </Badge>

        <div className="ml-auto flex items-center gap-2">
          {isPublished && (
            <button
              onClick={() => navigator.clipboard?.writeText(publicUrl)}
              className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-[12px] text-zinc-200 hover:bg-white/[0.08] flex items-center gap-1.5"
              title="Copier le lien public"
            >
              <CopyIcon />
              Copier le lien
            </button>
          )}
          <Button
            variant={isPublished ? 'secondary' : 'primary'}
            onClick={togglePublish}
            loading={updateQuest.isPending || publishMutation.isPending}
            disabled={!isPublished && (targets?.length ?? 0) === 0}
          >
            {isPublished ? 'Dépublier' : 'Publier'}
          </Button>
        </div>
      </div>

      {(publishProgress || publishError) && (
        <div className="border-b border-white/[0.06] px-8 py-3 bg-blue-500/[0.04]">
          {publishProgress && (
            <div>
              <div className="flex items-center justify-between text-[12px] text-zinc-300">
                <span>{publishProgress.label}</span>
                <span className="font-mono text-zinc-500">{Math.round(publishProgress.pct)}%</span>
              </div>
              <div className="mt-2 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${publishProgress.pct}%` }} />
              </div>
            </div>
          )}
          {publishError && (
            <p className="text-[12px] text-red-300">{publishError}</p>
          )}
        </div>
      )}

      <div className="p-8 max-w-6xl space-y-6">
        {/* Quest meta */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Titre</Label>
              <Input
                defaultValue={quest.title}
                onBlur={(e) => { if (e.target.value !== quest.title) updateQuest.mutate({ title: e.target.value }); }}
              />
            </div>
            <div>
              <Label>Slug · URL publique</Label>
              <div className="flex items-center gap-2">
                <Input
                  defaultValue={quest.slug}
                  onBlur={(e) => { if (e.target.value !== quest.slug) updateQuest.mutate({ slug: e.target.value }); }}
                  className="font-mono"
                />
              </div>
              {isPublished && (
                <p className="mt-1.5 text-[11px] text-zinc-500 font-mono break-all">{publicUrl}</p>
              )}
            </div>
            <div>
              <Label>Mode parcours</Label>
              <Select
                defaultValue={quest.navigationMode}
                onChange={(e) => updateQuest.mutate({ navigationMode: e.target.value as ExperienceRecord['navigationMode'] })}
              >
                <option value="free">Libre — scan dans n'importe quel ordre</option>
                <option value="sequential">Séquentiel — ordre imposé</option>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                defaultValue={quest.description || ''}
                placeholder="Décris brièvement la quête"
                onBlur={(e) => { if (e.target.value !== (quest.description || '')) updateQuest.mutate({ description: e.target.value }); }}
              />
            </div>
          </div>
        </Card>

        {/* Targets */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-[18px] font-semibold heading-tight">Cibles</h2>
              <span className="text-[12px] text-zinc-500">{targets?.length ?? 0}</span>
            </div>
          </div>

          <AddTargetForm questId={quest.id} />

          {tLoading && (
            <div className="mt-4 flex items-center gap-2 text-zinc-500 text-[13px]">
              <Spinner className="w-4 h-4" /> Chargement…
            </div>
          )}

          {targets && targets.length === 0 && (
            <div className="mt-4">
              <EmptyState
                title="Pas encore de cible"
                hint="Ajoute une première image cible — elle sera compilée en .mind dans ton navigateur."
              />
            </div>
          )}

          {targets && targets.length > 0 && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {targets.map((t) => (
                <TargetCard key={t.id} target={t} questId={quest.id} />
              ))}
            </div>
          )}
        </section>

        {/* Danger zone */}
        <Card className="border-red-500/20 bg-red-500/[0.03]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[13px] font-semibold text-zinc-200">Supprimer cette quête</p>
              <p className="text-[12px] text-zinc-500 mt-0.5">Les cibles et contenus liés seront aussi supprimés.</p>
            </div>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm(`Supprimer "${quest.title}" ? Cette action est irréversible.`)) deleteQuest.mutate();
              }}
              loading={deleteQuest.isPending}
            >
              Supprimer
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function TargetCard({ target, questId }: { target: TargetRecord; questId: string }) {
  const thumb = target.sourceImage ? pbFileUrl(target, target.sourceImage, { thumb: '200x200' }) : '';
  return (
    <Link
      to={`/quests/${questId}/targets/${target.id}`}
      className="rounded-2xl bg-[#0E0E11] border border-white/[0.08] overflow-hidden hover:border-white/15 transition-colors block"
    >
      <div className="aspect-[16/10] relative bg-zinc-900">
        {thumb && <img src={thumb} alt={target.name} className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute top-2 right-2">
          <Badge color={target.isActive ? 'emerald' : 'zinc'}>
            {target.isActive ? 'active' : 'inactive'}
          </Badge>
        </div>
      </div>
      <div className="p-3">
        <p className="text-[13px] font-medium truncate">{target.name}</p>
        <p className="text-[11px] text-zinc-500 mt-0.5">ordre #{target.order ?? 0}</p>
      </div>
    </Link>
  );
}

function AddTargetForm({ questId }: { questId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ label: string; pct: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setName('');
    setFile(null);
    setPreview(null);
    setProgress(null);
    setError(null);
    setDragOver(false);
  }

  async function acceptFile(f: File) {
    if (!f.type.startsWith('image/')) {
      setError('Le fichier doit être une image (PNG, JPG, WebP).');
      return;
    }
    setError(null);
    setFile(f);
    setName((n) => n || f.name.replace(/\.[^.]+$/, ''));
    const url = await readFileAsDataUrl(f);
    setPreview(url);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) await acceptFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !name) return;
    setError(null);
    setProgress({ label: 'Lecture de l\'image…', pct: 5 });

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const img = await loadImage(dataUrl);

      setProgress({ label: 'Compilation MindAR — peut prendre 10–60 s', pct: 10 });
      const mindBlob = await compileMindTarget(img, (p) => {
        setProgress({ label: 'Compilation MindAR…', pct: Math.max(10, p) });
      });

      setProgress({ label: 'Envoi vers PocketBase…', pct: 95 });

      const form = new FormData();
      form.append('experience', questId);
      form.append('name', name);
      form.append('sourceImage', file);
      form.append('compiledTarget', mindBlob, 'target.mind');
      form.append('order', '0');
      form.append('isActive', 'true');
      await pb.collection('targets').create(form);

      setProgress(null);
      reset();
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['targets', questId] });
    } catch (err) {
      setProgress(null);
      setError((err as Error)?.message || 'Échec de la compilation ou de l\'envoi');
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-dashed border-white/15 px-4 py-5 hover:bg-white/[0.03] hover:border-white/25 transition-colors flex items-center justify-center gap-2.5 text-[13px] text-zinc-300"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Ajouter une cible
      </button>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-start">
          {/* Dropzone */}
          <label
            className="block cursor-pointer"
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOver(false);
              const f = e.dataTransfer?.files?.[0];
              if (f) acceptFile(f);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleFileChange}
            />
            <div
              className={`aspect-square rounded-xl border-2 border-dashed transition-colors flex items-center justify-center overflow-hidden ${
                dragOver
                  ? 'border-blue-500 bg-blue-500/[0.08]'
                  : 'border-white/15 hover:border-blue-500/60 hover:bg-blue-500/[0.04]'
              }`}
            >
              {preview ? (
                <img src={preview} alt="" className="w-full h-full object-cover pointer-events-none" />
              ) : (
                <div className="text-center px-4 pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/10 mx-auto flex items-center justify-center mb-2">↑</div>
                  <p className="text-[12px] font-medium">Glisse ou clique</p>
                  <p className="text-[10px] text-zinc-500 mt-1">PNG · JPG · WebP</p>
                </div>
              )}
            </div>
          </label>

          <div className="space-y-3">
            <div>
              <Label htmlFor="targetName">Nom de la cible</Label>
              <Input
                id="targetName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Armoire électrique"
                required
              />
            </div>
            <p className="text-[12px] text-zinc-500 leading-relaxed">
              L'image est compilée en <code className="font-mono text-[11px] bg-[#0E0E11] px-1 py-0.5 rounded border border-white/10">.mind</code> dans ton navigateur, puis envoyée à PocketBase avec l'image source.
              Privilégie une image très détaillée (poster, photo riche en textures) — les aplats lisses se trackent mal.
            </p>
          </div>
        </div>

        {progress && (
          <div className="rounded-lg bg-[#0E0E11] border border-white/10 p-3">
            <div className="flex items-center justify-between text-[12px] text-zinc-300">
              <span>{progress.label}</span>
              <span className="font-mono text-zinc-500">{Math.round(progress.pct)}%</span>
            </div>
            <div className="mt-2 h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress.pct}%` }} />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/[0.06] px-3 py-2 text-[12px] text-red-300">{error}</div>
        )}

        <div className="flex items-center gap-2 justify-end">
          <Button type="button" variant="ghost" onClick={() => { setOpen(false); reset(); }}>Annuler</Button>
          <Button type="submit" loading={!!progress} disabled={!file || !name}>Compiler & ajouter</Button>
        </div>
      </form>
    </Card>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
