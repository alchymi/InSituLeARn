import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { pb } from '../lib/pb';
import { useAuth } from '../stores/auth';
import type { ExperienceRecord } from '../types';
import { Badge, Button, Card, EmptyState, FieldError, Input, Label, Spinner } from '../ui';

const newQuestSchema = z.object({
  title: z.string().min(1, 'Champ requis').max(200),
});

type NewQuestInput = z.infer<typeof newQuestSchema>;

function randomSlug(len = 8): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let out = '';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export default function Dashboard() {
  const user = useAuth((s) => s.user);
  const [showCreate, setShowCreate] = useState(false);

  const {
    data: quests,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['experiences', user?.id],
    queryFn: async () => {
      const res = await pb.collection('experiences').getList<ExperienceRecord>(1, 50, {
        filter: `createdBy = "${user!.id}"`,
        sort: '-updated',
      });
      return res.items;
    },
    enabled: !!user,
  });

  const counts = quests
    ? {
        all: quests.length,
        draft: quests.filter((q) => q.status === 'draft').length,
        published: quests.filter((q) => q.status === 'published').length,
      }
    : { all: 0, draft: 0, published: 0 };

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="heading-tighter text-[28px] font-semibold">Mes quêtes</h1>
          <p className="text-zinc-400 text-[13px] mt-1">
            {counts.all} quête{counts.all > 1 ? 's' : ''} · {counts.published} publiée{counts.published > 1 ? 's' : ''} · {counts.draft} brouillon{counts.draft > 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowCreate((v) => !v)}>
          <PlusIcon />
          {showCreate ? 'Annuler' : 'Nouvelle quête'}
        </Button>
      </div>

      {showCreate && (
        <div className="mt-6">
          <NewQuestForm onCreated={() => setShowCreate(false)} />
        </div>
      )}

      <div className="mt-8">
        {isLoading && (
          <div className="flex items-center gap-2 text-zinc-500 text-[13px]">
            <Spinner className="w-4 h-4" /> Chargement…
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/[0.06] p-4 text-[13px] text-red-300">
            Impossible de charger tes quêtes : {(error as Error).message}
          </div>
        )}
        {quests && quests.length === 0 && !showCreate && (
          <EmptyState
            title="Aucune quête pour le moment"
            hint="Crée ta première quête et ajoute des cibles à scanner."
            action={
              <Button onClick={() => setShowCreate(true)}>
                <PlusIcon />
                Créer ma première quête
              </Button>
            }
          />
        )}
        {quests && quests.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quests.map((q) => <QuestCard key={q.id} quest={q} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function QuestCard({ quest }: { quest: ExperienceRecord }) {
  const statusColor = quest.status === 'published' ? 'emerald' : quest.status === 'archived' ? 'zinc' : 'amber';
  const updated = new Date(quest.updated).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <Link
      to={`/quests/${quest.id}`}
      className="group rounded-2xl bg-[#0E0E11] border border-white/[0.08] overflow-hidden hover:border-white/15 transition-colors block"
    >
      <div className="aspect-[16/9] relative bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center">
        <div className="absolute top-3 left-3">
          <Badge color={statusColor}>
            <span className="w-1 h-1 rounded-full bg-current" />
            {quest.status}
          </Badge>
        </div>
        <svg viewBox="0 0 24 24" className="w-10 h-10 text-zinc-700" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-[11px] font-mono text-white/40 truncate">/e/{quest.slug}</p>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-[15px] font-semibold heading-tight truncate group-hover:text-blue-300 transition-colors">{quest.title}</h3>
        <p className="text-[12px] text-zinc-500 mt-1">Modifiée {updated}</p>
      </div>
    </Link>
  );
}

function NewQuestForm({ onCreated }: { onCreated: () => void }) {
  const user = useAuth((s) => s.user);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewQuestInput>({
    resolver: zodResolver(newQuestSchema),
    defaultValues: { title: '' },
  });

  const create = useMutation({
    mutationFn: async (values: NewQuestInput) => {
      // Auto-generate slug: title-slugified + 6 random chars for collision safety.
      // Editable later from the quest page if the user wants a vanity slug.
      const base = slugify(values.title);
      const suffix = randomSlug(6);
      const slug = base ? `${base}-${suffix}` : randomSlug(10);

      return pb.collection('experiences').create({
        title: values.title,
        slug,
        status: 'draft',
        navigationMode: 'free',
        isPublic: false,
        createdBy: user!.id,
      });
    },
    onSuccess: (rec) => {
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      onCreated();
      navigate(`/quests/${rec.id}`);
    },
  });

  return (
    <Card>
      <form
        onSubmit={handleSubmit((v) => create.mutate(v))}
        className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end"
      >
        <div>
          <Label htmlFor="title">Titre de la quête</Label>
          <Input
            id="title"
            {...register('title')}
            placeholder="Parcours Sécurité — Atelier 3"
            invalid={!!errors.title}
            autoFocus
          />
          <FieldError>{errors.title?.message}</FieldError>
          <p className="mt-1.5 text-[11px] text-zinc-500">L'URL publique sera générée automatiquement (modifiable ensuite).</p>
        </div>
        <Button type="submit" size="lg" loading={create.isPending}>Créer la quête</Button>

        {create.isError && (
          <div className="md:col-span-2 rounded-lg border border-red-500/30 bg-red-500/[0.06] px-3 py-2 text-[12px] text-red-300">
            {(create.error as Error).message}
          </div>
        )}
      </form>
    </Card>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
