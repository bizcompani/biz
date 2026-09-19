import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

export default function Layout({ children }: { children: ReactNode }) {
  const { siteName, phone, role, logout } = useAuth();
  return (
    <div className="page">
      <div className="container">
        <header className="header">
          <div className="brand">
            <div className="logo-mark">ب</div>
            <div>
              <h1>{siteName}</h1>
              <small>کارگزاری تبلیغاتی</small>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className="live-dot"><i />لایو</span>
            {phone && <small style={{ color: "var(--muted)" }}>{phone} {role === "admin" ? "• ادمین" : ""}</small>}
            {phone && <button className="btn btn-ghost" onClick={logout}>خروج</button>}
          </div>
        </header>
      </div>
      <main className="container" style={{ flex: 1 }}>{children}</main>
      <footer className="footer">© بیز — کارگزاری تبلیغاتی • تمام پیام‌ها محرمانه می‌ماند</footer>
    </div>
  );
}
