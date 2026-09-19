import { useState } from "react";
import { useAuth } from "../context/AuthContext";

// فرم ورود اختصاصی دولوپر: ایمیل + پسورد (همانی که در Supabase ساخته شده)
export default function AdminLogin() {
  const { loginAdmin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!email.trim() || !password) { setErr("ایمیل و رمز عبور را وارد کنید."); return; }
    setBusy(true);
    try {
      await loginAdmin(email, password);
      // AuthContext نقش را ست می‌کند؛ App خودش پنل را نشان می‌دهد
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ورود ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-wrap">
      <form className="card anim-in" style={{ width: "min(420px, 100%)" }} onSubmit={onSubmit}>
        <span className="pill">دولوپر</span>
        <h2 style={{ margin: "10px 0" }}>ورود ادمین</h2>
        <p style={{ color: "var(--muted)", fontSize: 13 }}>
          ایمیل و رمزی که در Supabase برای ادمین ساخته شده را وارد کنید.
        </p>
        {err && <div className="error">{err}</div>}
        <div className="field">
          <label>ایمیل ادمین</label>
          <input type="email" dir="ltr" placeholder="admin@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>رمز عبور</label>
          <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
          {busy ? "در حال ورود…" : "ورود به پنل دولوپر"}
        </button>
      </form>
    </div>
  );
}
