import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import ClientPanel from "./pages/ClientPanel";
import AdminPanel from "./pages/AdminPanel";
import type { JSX } from "react";

function Guard({ admin, children }: { admin?: boolean; children: JSX.Element }) {
  const { loading, userId, role } = useAuth();
  if (loading) return <div className="center-wrap"><div className="card">در حال بارگذاری…</div></div>;
  if (!userId) return <Navigate to="/" replace />;
  if (admin && role !== "admin") return <Navigate to="/panel" replace />;
  if (!admin && role === "admin") return <Navigate to="/admin" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/panel" element={<Guard><ClientPanel /></Guard>} />
            <Route path="/admin" element={<Guard admin><AdminPanel /></Guard>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AuthProvider>
  );
}
