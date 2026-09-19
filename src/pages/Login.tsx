import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { normalizePhone, isValidIranMobile } from "../lib/phone";

export default function Login() {
  const { login, siteName } = useAuth();
  const nav = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const p = normalizePhone(phone);
    if (!isValidIranMobile(p)) { setErr("شماره تلفن معتبر نیست. مثال: 09123456789"); return; }
    if (!password) { setErr("رمز عبور را وارد کنید."); return; }
    setBusy(true);
    try {
      // login نقش را برمی‌گرداند و state را هم ست می‌کند؛ هدایت با همان یک منبع
      const role = await login(p, password);
      nav(role === "admin" ? "/admin" : "/panel", { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "نام کاربری یا رمز عبور اشتباه است.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-wrap">
      <div className="login-grid">
        <div className="card hero-copy float-anim anim-in">
          <span className="pill">کارگزاری تبلیغاتی</span>
          <h2>{siteName}</h2>
          <p>
            سامانه اختصاصی مشتریان بیز. ورود فقط با شماره تلفن و رمزی که توسط
            مدیر برای شما تعریف شده است. امکان ثبت‌نام عمومی وجود ندارد.
            پس از ورود، می‌توانید درخواست حذف حساب خود را ثبت کنید.
          </p>
          <p style={{ fontSize: 12 }}>🔒 اتصال امن به Supabase • دسترسی‌ها با RLS محافظت می‌شود • پنل کاملاً لایو</p>
        </div>

        <form className="card anim-in anim-d1" onSubmit={onSubmit}>
          <h3 style={{ marginTop: 0 }}>ورود به حساب</h3>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>نام کاربری = شماره تلفن شما</p>
          {err && <div className="error">{err}</div>}
          <div className="field">
            <label>نام کاربری (شماره تلفن)</label>
            <input inputMode="tel" placeholder="09123456789" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="field">
            <label>رمز عبور</label>
            <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
            {busy ? "در حال ورود…" : "ورود"}
          </button>
          <p style={{ fontSize: 12, color: "var(--muted)" }}>
            رمز را فراموش کرده‌اید؟ با مدیر (دولوپر) تماس بگیرید. <Link to="/" style={{ color: "var(--gold-400)" }}>بیز</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
