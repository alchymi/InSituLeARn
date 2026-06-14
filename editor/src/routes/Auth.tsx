import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../stores/auth';
import { Button, Input, Label, FieldError, Logo } from '../ui';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, '8 caractères minimum'),
});

const registerSchema = loginSchema.extend({
  name: z.string().min(1, 'Champ requis').max(80, 'Trop long'),
});

type LoginInput = z.infer<typeof loginSchema>;
type RegisterInput = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const navigate = useNavigate();
  const { login, register: registerUser } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const isRegister = mode === 'register';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RegisterInput>({
    resolver: zodResolver(isRegister ? registerSchema : loginSchema),
    defaultValues: { email: '', password: '', name: '' },
  });

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    try {
      if (isRegister) {
        await registerUser(values.email, values.password, values.name);
      } else {
        await login(values.email, values.password);
      }
      navigate('/', { replace: true });
    } catch (err) {
      const msg = (err as { message?: string })?.message || 'Échec de l\'authentification';
      setServerError(msg);
    }
  }

  function switchMode(next: 'login' | 'register') {
    setMode(next);
    reset();
    setServerError(null);
  }

  return (
    <div className="min-h-full grid place-items-center p-8" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(59,130,246,0.10), transparent 50%), #09090B' }}>
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-2.5 mb-10">
          <Logo size={36} />
          <span className="font-semibold text-[15px]">InSitu AR</span>
        </div>

        <h1 className="heading-tighter text-[32px] font-semibold leading-tight">
          {isRegister ? 'Crée ton compte éditeur' : 'Connecte-toi pour créer une quête'}
        </h1>
        <p className="mt-3 text-zinc-400 text-[14px]">
          {isRegister ? 'Déjà un compte ? ' : 'Première fois ici ? '}
          <button
            type="button"
            onClick={() => switchMode(isRegister ? 'login' : 'register')}
            className="text-blue-400 hover:text-blue-300 underline-offset-4 hover:underline"
          >
            {isRegister ? 'Se connecter' : 'Créer un compte'}
          </button>.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
          {isRegister && (
            <div>
              <Label htmlFor="name">Nom affiché</Label>
              <Input id="name" {...register('name')} invalid={!!errors.name} placeholder="Jimmy" />
              <FieldError>{errors.name?.message}</FieldError>
            </div>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} invalid={!!errors.email} placeholder="hello@example.com" autoComplete="email" />
            <FieldError>{errors.email?.message}</FieldError>
          </div>

          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" {...register('password')} invalid={!!errors.password} placeholder="••••••••" autoComplete={isRegister ? 'new-password' : 'current-password'} />
            <FieldError>{errors.password?.message}</FieldError>
          </div>

          {serverError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/[0.06] px-3 py-2 text-[12px] text-red-300">
              {serverError}
            </div>
          )}

          <Button type="submit" loading={isSubmitting} size="lg" className="w-full mt-2">
            {isRegister ? 'Créer le compte' : 'Se connecter'}
          </Button>
        </form>

        <p className="mt-6 text-center text-[11px] text-zinc-500">
          POC v0.1 · self-register libre · PocketBase 0.22.21
        </p>
      </div>
    </div>
  );
}
