import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loading } from '@carbon/react';
import { AppShell } from './layouts/AppShell';
import { DEFAULT_ROUTE } from './constants/navigation';

// Route-level code splitting: each module loads on demand.
const HomePage = lazy(() => import('./pages/HomePage'));
const TodayPage = lazy(() => import('./pages/TodayPage'));
const AskPage = lazy(() => import('./pages/AskPage'));
const LifePage = lazy(() => import('./pages/LifePage'));
const ConnectionsPage = lazy(() => import('./pages/ConnectionsPage'));

function App() {
  return (
    <AppShell>
      <Suspense fallback={<Loading description="Loading the page" withOverlay={false} />}>
        <Routes>
          <Route path="/" element={<Navigate to={DEFAULT_ROUTE} replace />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/ask" element={<AskPage />} />
          <Route path="/life" element={<LifePage />} />
          <Route path="/connections" element={<ConnectionsPage />} />
          <Route path="*" element={<Navigate to={DEFAULT_ROUTE} replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

export default App;
