import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pb, pbFileUrl } from '../lib/pb';
import type { ArContentRecord, ArContentType, TargetRecord } from '../types';
import { Badge, Button, Card, EmptyState, Input, Label, Select, Spinner, Textarea } from '../ui';
import { QuillEditor } from '../ui/QuillEditor';
import { VisualEditor } from '../ar/VisualEditor';

export default function TargetPage() {
  const { id: questId, targetId } = useParams<{ id: string; targetId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'visual'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: target, isLoading: tLoading } = useQuery({
    queryKey: ['target', targetId],
    queryFn: async () => pb.collection('targets').getOne<TargetRecord>(targetId!),
    enabled: !!targetId,
  });

  const { data: contents, isLoading: cLoading } = useQuery({
    queryKey: ['contents', targetId],
    queryFn: async () => {
      const res = await pb.collection('ar_contents').getList<ArContentRecord>(1, 200, {
        filter: `target = "${targetId}"`,
        sort: 'order,created',
      });
      return res.items;
    },
    enabled: !!targetId,
  });

  const updateTarget = useMutation({
    mutationFn: async (patch: Partial<TargetRecord>) => pb.collection('targets').update<TargetRecord>(targetId!, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['target', targetId] }),
  });

  const deleteTarget = useMutation({
    mutationFn: async () => pb.collection('targets').delete(targetId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['targets', questId] });
      navigate(`/quests/${questId}`);
    },
  });

  if (tLoading || !target) {
    return (
      <div className="p-8 flex items-center gap-2 text-zinc-500 text-[13px]">
        <Spinner className="w-4 h-4" /> Chargement…
      </div>
    );
  }

  const sourceUrl = target.sourceImage ? pbFileUrl(target, target.sourceImage) : '';

  return (
    <div>
      <div className="border-b border-white/[0.06] px-8 h-14 flex items-center gap-4">
        <Link to={`/quests/${questId}`} className="text-[12px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          Retour à la quête
        </Link>
        <div className="h-4 w-px bg-white/10" />
        <h1 className="text-[14px] font-semibold heading-tight truncate">{target.name}</h1>
        <Badge color={target.isActive ? 'emerald' : 'zinc'}>
          {target.isActive ? 'active' : 'inactive'}
        </Badge>
      </div>

      <div className="p-8 max-w-6xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
          <div>
            <div className="aspect-square rounded-2xl overflow-hidden border border-white/[0.08] bg-zinc-900">
              {sourceUrl && <img src={sourceUrl} alt={target.name} className="w-full h-full object-cover" />}
            </div>
            <p className="mt-2 text-[11px] text-zinc-500 font-mono break-all">{target.compiledTarget}</p>
          </div>

          <Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Nom</Label>
                <Input
                  defaultValue={target.name}
                  onBlur={(e) => { if (e.target.value !== target.name) updateTarget.mutate({ name: e.target.value }); }}
                />
              </div>
              <div>
                <Label>Ordre dans la quête</Label>
                <Input
                  type="number"
                  defaultValue={target.order ?? 0}
                  onBlur={(e) => { const v = parseInt(e.target.value, 10) || 0; if (v !== (target.order ?? 0)) updateTarget.mutate({ order: v }); }}
                />
              </div>
              <div>
                <Label>Largeur physique (cm)</Label>
                <Input
                  type="number"
                  step="0.5"
                  defaultValue={target.physicalWidthCm ?? ''}
                  placeholder="ex: 21"
                  onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) updateTarget.mutate({ physicalWidthCm: v }); }}
                />
              </div>
              <div>
                <Label>État</Label>
                <Select
                  defaultValue={target.isActive ? 'true' : 'false'}
                  onChange={(e) => updateTarget.mutate({ isActive: e.target.value === 'true' })}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  defaultValue={target.description || ''}
                  rows={2}
                  placeholder="Note interne (non visible côté apprenant)"
                  onBlur={(e) => { if (e.target.value !== (target.description || '')) updateTarget.mutate({ description: e.target.value }); }}
                />
              </div>
            </div>
          </Card>
        </div>

        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-[18px] font-semibold heading-tight">Contenus AR</h2>
              <span className="text-[12px] text-zinc-500">{contents?.length ?? 0}</span>
            </div>
            <ViewToggle view={view} setView={setView} />
          </div>

          {view === 'list' && (
            <>
              <AddContentForm questId={questId!} targetId={targetId!} />

              {cLoading && (
                <div className="mt-4 flex items-center gap-2 text-zinc-500 text-[13px]">
                  <Spinner className="w-4 h-4" /> Chargement…
                </div>
              )}
              {contents && contents.length === 0 && (
                <div className="mt-4">
                  <EmptyState
                    title="Pas encore de contenu"
                    hint="Ajoute un panneau de texte ou une carte info pour commencer."
                  />
                </div>
              )}
              {contents && contents.length > 0 && (
                <div className="mt-4 space-y-2">
                  {contents.map((c) =>
                    editingId === c.id
                      ? <EditContentForm
                          key={c.id}
                          content={c}
                          onClose={() => setEditingId(null)}
                        />
                      : <ContentRow
                          key={c.id}
                          content={c}
                          onEdit={() => setEditingId(c.id)}
                        />
                  )}
                </div>
              )}
            </>
          )}

          {view === 'visual' && contents && contents.length === 0 && (
            <div className="mt-4">
              <EmptyState
                title="Pas encore de contenu à positionner"
                hint="Bascule en vue Liste pour en ajouter un."
              />
            </div>
          )}

          {view === 'visual' && contents && contents.length > 0 && (
            <VisualEditor
              target={target}
              contents={contents}
              onContentChanged={() => queryClient.invalidateQueries({ queryKey: ['contents', targetId] })}
            />
          )}
        </section>

        <Card className="border-red-500/20 bg-red-500/[0.03]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[13px] font-semibold text-zinc-200">Supprimer cette cible</p>
              <p className="text-[12px] text-zinc-500 mt-0.5">Les contenus liés seront aussi supprimés.</p>
            </div>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm(`Supprimer la cible "${target.name}" ? Cette action est irréversible.`)) deleteTarget.mutate();
              }}
              loading={deleteTarget.isPending}
            >
              Supprimer
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ViewToggle({ view, setView }: { view: 'list' | 'visual'; setView: (v: 'list' | 'visual') => void }) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-0.5 flex gap-0.5">
      <button
        onClick={() => setView('list')}
        className={`h-7 px-3 rounded-md text-[12px] font-medium transition-colors ${view === 'list' ? 'bg-white/[0.10] text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
      >
        Liste
      </button>
      <button
        onClick={() => setView('visual')}
        className={`h-7 px-3 rounded-md text-[12px] font-medium transition-colors ${view === 'visual' ? 'bg-white/[0.10] text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
      >
        Visuel
      </button>
    </div>
  );
}

function ContentRow({ content, onEdit }: { content: ArContentRecord; onEdit: () => void }) {
  const queryClient = useQueryClient();
  const deleteContent = useMutation({
    mutationFn: async () => pb.collection('ar_contents').delete(content.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contents', content.target] }),
  });

  const typeColor: Record<ArContentType, 'blue' | 'emerald' | 'amber' | 'zinc'> = {
    text: 'blue',
    info: 'blue',
    image: 'emerald',
    model3d: 'amber',
    embed: 'zinc',
  };

  // For info type, strip HTML to show a clean preview
  const preview = content.type === 'info'
    ? (content.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    : content.body;

  return (
    <Card className="!p-4">
      <div className="flex items-center gap-4">
        <Badge color={typeColor[content.type]}>{content.type}</Badge>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium truncate">{content.title || <span className="text-zinc-500">Sans titre</span>}</p>
          {preview && <p className="text-[12px] text-zinc-500 line-clamp-1">{preview}</p>}
        </div>
        <span className="text-[10px] font-mono text-zinc-600">
          [{content.positionX.toFixed(2)}, {content.positionY.toFixed(2)}, {content.positionZ.toFixed(2)}]
        </span>
        <Button variant="ghost" size="sm" onClick={onEdit} aria-label="Modifier">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { if (confirm('Supprimer ce contenu ?')) deleteContent.mutate(); }}
          aria-label="Supprimer"
        >
          ✕
        </Button>
      </div>
    </Card>
  );
}

function EditContentForm({ content, onClose }: { content: ArContentRecord; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(content.title || '');
  const [body, setBody] = useState(content.body || '');
  const [embedUrl, setEmbedUrl] = useState(content.embedUrl || '');
  const [file, setFile] = useState<File | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [isVisible, setIsVisible] = useState(content.isVisible);
  const [order, setOrder] = useState(content.order ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const type = content.type;
  const needsFile = type === 'image' || type === 'model3d';
  const currentFileName =
    type === 'image' ? content.media :
    type === 'model3d' ? content.model3d :
    '';

  const fileAccept: Record<ArContentType, string> = {
    text: '',
    info: '',
    image: 'image/*',
    model3d: '.glb,.gltf,model/gltf-binary,model/gltf+json',
    embed: '',
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('title', title);
      form.append('body', body);
      form.append('embedUrl', embedUrl);
      form.append('isVisible', isVisible ? 'true' : 'false');
      form.append('order', String(order));

      if (type === 'image') {
        if (file) form.append('media', file);
        else if (removeFile) form.append('media', '');
      }
      if (type === 'model3d') {
        if (file) form.append('model3d', file);
        else if (removeFile) form.append('model3d', '');
      }

      await pb.collection('ar_contents').update(content.id, form);
      queryClient.invalidateQueries({ queryKey: ['contents', content.target] });
      onClose();
    } catch (err) {
      setError((err as Error)?.message || 'Échec de la sauvegarde');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-blue-500/30 bg-blue-500/[0.03]">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3">
          <Badge color="blue">Édition · {type}</Badge>
          <span className="text-[11px] text-zinc-500 font-mono">{content.id.slice(0, 12)}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_100px] gap-3">
          <div>
            <Label>Titre</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sans titre" />
          </div>
          <div>
            <Label>Ordre</Label>
            <Input
              type="number"
              value={order}
              onChange={(e) => setOrder(parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div>
            <Label>Visible</Label>
            <Select value={isVisible ? 'true' : 'false'} onChange={(e) => setIsVisible(e.target.value === 'true')}>
              <option value="true">Oui</option>
              <option value="false">Non</option>
            </Select>
          </div>
        </div>

        {type === 'text' && (
          <div>
            <Label>Corps du texte</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Texte simple"
            />
          </div>
        )}

        {type === 'info' && (
          <div>
            <Label>Contenu riche</Label>
            <QuillEditor value={body} onChange={setBody} />
          </div>
        )}

        {type === 'embed' && (
          <div>
            <Label>URL embed</Label>
            <Input
              type="url"
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
        )}

        {needsFile && (
          <div>
            <Label>{type === 'image' ? 'Image' : 'Fichier GLB'} · actuel : <code className="font-mono text-[11px]">{currentFileName || '—'}</code></Label>
            <input
              type="file"
              accept={fileAccept[type]}
              onChange={(e) => { setFile(e.target.files?.[0] || null); if (e.target.files?.[0]) setRemoveFile(false); }}
              className="block w-full text-[12px] text-zinc-400 file:mr-3 file:h-9 file:px-3 file:rounded-md file:border file:border-white/10 file:bg-white/[0.04] file:text-zinc-200 file:text-[12px] file:font-medium file:cursor-pointer hover:file:bg-white/[0.08]"
            />
            {file && <p className="mt-1 text-[11px] text-zinc-500">Nouveau : {file.name} · {(file.size / 1024).toFixed(0)} Ko</p>}
            {!file && currentFileName && (
              <label className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer">
                <input type="checkbox" checked={removeFile} onChange={(e) => setRemoveFile(e.target.checked)} className="accent-red-500" />
                Supprimer le fichier actuel
              </label>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/[0.06] px-3 py-2 text-[12px] text-red-300">{error}</div>
        )}

        <div className="flex items-center gap-2 justify-end pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={submitting}>Enregistrer</Button>
        </div>
      </form>
    </Card>
  );
}

function AddContentForm({ questId, targetId }: { questId: string; targetId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ArContentType>('text');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [embedUrl, setEmbedUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setTitle('');
    setBody('');
    setFile(null);
    setEmbedUrl('');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('experience', questId);
      form.append('target', targetId);
      form.append('type', type);
      if (title) form.append('title', title);
      if (body) form.append('body', body);

      if (type === 'image' && file) form.append('media', file);
      if (type === 'model3d' && file) form.append('model3d', file);
      if (type === 'embed') form.append('embedUrl', embedUrl);

      // Default transform
      ['positionX','positionY','positionZ','rotationX','rotationY','rotationZ'].forEach((k) => form.append(k, '0'));
      ['scaleX','scaleY','scaleZ'].forEach((k) => form.append(k, '1'));
      form.append('order', '0');
      form.append('isVisible', 'true');
      form.append('actionType', 'none');

      await pb.collection('ar_contents').create(form);
      queryClient.invalidateQueries({ queryKey: ['contents', targetId] });
      reset();
      setOpen(false);
    } catch (err) {
      setError((err as Error)?.message || 'Échec de l\'ajout');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-dashed border-white/15 px-4 py-5 hover:bg-white/[0.03] hover:border-white/25 transition-colors flex items-center justify-center gap-2.5 text-[13px] text-zinc-300"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
        Ajouter un contenu
      </button>
    );
  }

  const needsFile = type === 'image' || type === 'model3d';

  const fileAccept: Record<ArContentType, string> = {
    text: '',
    info: '',
    image: 'image/*',
    model3d: '.glb,.gltf,model/gltf-binary,model/gltf+json',
    embed: '',
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
          <div>
            <Label>Type</Label>
            <Select value={type} onChange={(e) => setType(e.target.value as ArContentType)}>
              <option value="text">Texte simple</option>
              <option value="info">Carte info riche</option>
              <option value="image">Image</option>
              <option value="model3d">Modèle 3D (GLB)</option>
              <option value="embed">Embed externe (URL)</option>
            </Select>
          </div>
          <div>
            <Label>Titre (optionnel)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Procédure consignation" />
          </div>
        </div>

        {type === 'text' && (
          <div>
            <Label>Corps du texte (texte brut)</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Avant intervention, vérifier l'absence de tension avec un VAT calibré."
              required
            />
          </div>
        )}

        {type === 'info' && (
          <div>
            <Label>Contenu de la carte info</Label>
            <QuillEditor
              value={body}
              onChange={setBody}
              placeholder="Mets ici titres, listes, gras… le rendu AR sera stylisé."
            />
            <p className="mt-1.5 text-[11px] text-zinc-500">
              Format riche. Rendu en carte AR (canvas → texture) via html2canvas côté apprenant.
            </p>
          </div>
        )}

        {type === 'embed' && (
          <div>
            <Label>URL embed</Label>
            <Input
              type="url"
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              placeholder="https://example.com/contenu-interactif"
              required
            />
          </div>
        )}

        {needsFile && (
          <div>
            <Label>{type === 'image' ? 'Image' : type === 'model3d' ? 'Fichier GLB' : 'Package .h5p'}</Label>
            <input
              type="file"
              accept={fileAccept[type]}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
              className="block w-full text-[12px] text-zinc-400 file:mr-3 file:h-9 file:px-3 file:rounded-md file:border file:border-white/10 file:bg-white/[0.04] file:text-zinc-200 file:text-[12px] file:font-medium file:cursor-pointer hover:file:bg-white/[0.08]"
            />
            {file && <p className="mt-1 text-[11px] text-zinc-500">{file.name} · {(file.size / 1024).toFixed(0)} Ko</p>}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/[0.06] px-3 py-2 text-[12px] text-red-300">{error}</div>
        )}

        <p className="text-[11px] text-zinc-500">
          Position 3D par défaut : (0, 0, 0), échelle 1. Tu pourras les ajuster plus tard (éditeur visuel — Phase 5).
        </p>

        <div className="flex items-center gap-2 justify-end">
          <Button type="button" variant="ghost" onClick={() => { setOpen(false); reset(); }}>Annuler</Button>
          <Button type="submit" loading={submitting}>Ajouter</Button>
        </div>
      </form>
    </Card>
  );
}
