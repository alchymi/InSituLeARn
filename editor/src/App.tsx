import { useEffect } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './stores/auth';
import { AppShell } from './ui/AppShell';
import AuthPage from './routes/Auth';
import Dashboard from './routes/Dashboard';
import ExperiencePage from './routes/Experience';
import TargetPage from './routes/Target';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Protected({ children }: { children: JSX.Element }) {
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnly({ children }: { children: JSX.Element }) {
  const user = useAuth((s) => s.user);
  const ready = useAuth((s) => s.ready);
  if (!ready) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const hydrate = useAuth((s) => s.hydrate);
  useEffect(() => { hydrate(); }, [hydrate]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicOnly><AuthPage /></PublicOnly>} />

          <Route element={<Protected><AppShell><Outlet /></AppShell></Protected>}>
            <Route index element={<Dashboard />} />
            <Route path="quests/:id" element={<ExperiencePage />} />
            <Route path="quests/:id/targets/:targetId" element={<TargetPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
