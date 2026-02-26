import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ui/ErrorBoundary';
import NotFound from './components/ui/NotFound';
import Spinner from './components/ui/Spinner';
import VisitorFooter from './components/ui/VisitorFooter';
import { ThemeProvider } from './context/ThemeContext';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MonitorDetail = lazy(() => import('./pages/MonitorDetail'));
const AddMonitor = lazy(() => import('./pages/AddMonitor'));
const EditMonitor = lazy(() => import('./pages/EditMonitor'));
const Settings = lazy(() => import('./pages/Settings'));
const StatusPage = lazy(() => import('./pages/StatusPage'));
const Heartbeats = lazy(() => import('./pages/Heartbeats'));
const ApiKeys = lazy(() => import('./pages/ApiKeys'));
const Teams = lazy(() => import('./pages/Teams'));
const TurkeyDashboard = lazy(() => import('./pages/TurkeyDashboard'));
const BlogList = lazy(() => import('./pages/BlogList'));
const BlogPostPage = lazy(() => import('./pages/BlogPost'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#09090b]">
      <Spinner size="md" />
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? <Navigate to="/dashboard" /> : <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/status/:slug" element={<StatusPage />} />
            <Route path="/turkiye" element={<TurkeyDashboard />} />
            <Route path="/turkey" element={<Navigate to="/turkiye" replace />} />
            <Route path="/blog" element={<BlogList />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/monitors/new" element={<AddMonitor />} />
              <Route path="/monitors/:id" element={<MonitorDetail />} />
              <Route path="/monitors/:id/edit" element={<EditMonitor />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/heartbeats" element={<Heartbeats />} />
              <Route path="/api-keys" element={<ApiKeys />} />
              <Route path="/teams" element={<Teams />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          <VisitorFooter />
        </Suspense>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
