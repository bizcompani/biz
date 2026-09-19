import { lazy, Suspense } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
// پنل‌ها lazy تا باندل اولیه سبک شود و لگ اول‌لود کم شود
const ClientPanel = lazy(() => import("./pages/ClientPanel"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
import type { JSX } from "react";

function Guard({ children }: { children: JSX.Element }) {
  const { loading, userId, role } = useAuth();
  if (loading) return <div className="center-wrap"><div className="card">در حال بارگذاری…</div></div>;
  if (!userId) return <Navigate to="/" replace />;
  if (role === "admin") return <Navigate to="/admin" replace />;
  return children;
}

// مسیر /admin جدا برای دولوپر: اگر ادمین لاگین است پنل، وگرنه فرم ایمیل+پسورد
function AdminGate() {
  const { loading, role } = useAuth();
  if (loading) return <div className="center-wrap"><div className="card">در حال بارگذاری…</div></div>;
  if (role === "admin") return <AdminPanel />;
  return <AdminLogin />;
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Layout>
          <Suspense fallback={<div className="center-wrap"><div className="card">در حال بارگذاری…</div></div>}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/panel" element={<Guard><ClientPanel /></Guard>} />
            <Route path="/admin" element={<AdminGate />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </Layout>
      </HashRouter>
    </AuthProvider>
  );
}
