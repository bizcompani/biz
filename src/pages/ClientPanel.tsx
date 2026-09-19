import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { normalizePhone, isValidIranMobile } from "../lib/phone";

const SUCCESS_MSG = "اطلاعات پس از بررسی توسط ادمین به شما اطلاع‌رسانی می‌شود.";

export default function ClientPanel() {
  const { userId, phone } = useAuth();
  const [hasPending, setHasPending] = useState<boolean | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // فرم حذف حساب
  const [nationalCode, setNationalCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [address, setAddress] = useState("");
  const [mobile, setMobile] = useState(phone ?? "");
  const [busy, setBusy] = useState(false);

  async function loadPending() {
    if (!userId) return;
    const { data } = await supabase.from("submissions").select("id").eq("user_id", userId).maybeSingle();
    setHasPending(!!data);
  }

  useEffect(() => {
    setMobile(phone ?? "");
    loadPending();
    if (!userId) return;
    // لایو: اگر درخواست من حذف شد → یا رد شده‌ام (پروفایل هست) یا تأیید و اکانتم حذف شده
    const ch = supabase
      .channel(`my-request-${userId}`)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "submissions" }, async () => {
        const { data: prof } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
        if (!prof) {
          // تأیید شده و اکانت حذف شده → سشن بی‌اعتبار
          await supabase.auth.signOut();
          window.location.hash = "#/";
          window.location.reload();
        } else {
          setHasPending(false);
          setInfo("درخواست قبلی شما رد شد. در صورت نیاز می‌توانید دوباره ثبت کنید.");
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, phone]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setInfo(null);
    const nc = normalizePhone(nationalCode);
    const mob = normalizePhone(mobile || phone || "");
    // بدون راستی‌آزمایی کد ملی و بدون کپچا؛ تطبیق با اسناد کتبی بر عهده ادمین است
    if (!/^\d{10}$/.test(nc)) { setErr("کد ملی باید ۱۰ رقم باشد."); return; }
    if (!fullName.trim() || fullName.trim().length < 3) { setErr("نام کامل را وارد کنید."); return; }
    if (!isValidIranMobile(mob)) { setErr("شماره تلفن معتبر نیست."); return; }
    if (!fatherName.trim()) { setErr("نام پدر را وارد کنید."); return; }
    if (!address.trim() || address.trim().length < 5) { setErr("آدرس منزل را کامل وارد کنید."); return; }
    if (!userId) { setErr("نشست منقضی شده، دوباره وارد شوید."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("submissions").insert({
        user_id: userId,
        national_code: nc,
        full_name: fullName.trim(),
        phone: mob,
        father_name: fatherName.trim(),
        address: address.trim(),
      });
      if (error) {
        if (error.code === "23505") setErr("شما یک درخواست در انتظار بررسی دارید.");
        else setErr("ثبت ناموفق بود. دوباره تلاش کنید.");
        return;
      }
      setHasPending(true);
      setShowModal(false);
      setInfo(SUCCESS_MSG);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-wrap" style={{ display: "block" }}>
      <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <span className="live-dot"><i />پنل کاربری • لایو</span>
        <h2 style={{ margin: "10px 0" }}>حذف حساب کاربری</h2>
        {info && <div className="ok">{info}</div>}
        {err && !showModal && <div className="error">{err}</div>}

        {hasPending === null && <p style={{ color: "var(--muted)" }}>در حال بررسی وضعیت…</p>}

        {hasPending === true && (
          <div className="ok" style={{ fontSize: 15, lineHeight: 2 }}>
            {SUCCESS_MSG}
            <br />
            <small style={{ color: "var(--muted)" }}>وضعیت: در انتظار بررسی توسط ادمین</small>
          </div>
        )}

        {hasPending === false && (
          <>
            <p style={{ color: "var(--muted)", lineHeight: 2 }}>
              با تکمیل فرم زیر، درخواست حذف حساب شما برای ادمین ارسال می‌شود.
              پس از تأیید ادمین، حساب کاربری (نام کاربری و رمز) و اطلاعات ارسالی شما
              <b> کاملاً از دیتابیس حذف </b> می‌شود و دیگر امکان ورود نخواهید داشت.
            </p>
            <button className="btn btn-danger" onClick={() => { setShowModal(true); setErr(null); }}>
              حذف حساب کاربری
            </button>
          </>
        )}
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !busy && setShowModal(false)}
          >
            <motion.form
              className="card modal" onSubmit={submit} onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.94, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
            >
              <h3 style={{ marginTop: 0 }}>فرم درخواست حذف حساب</h3>
              {err && <div className="error">{err}</div>}
              <div className="field"><label>کد ملی</label>
                <input inputMode="numeric" placeholder="0012345679" value={nationalCode} onChange={(e) => setNationalCode(e.target.value)} /></div>
              <div className="field"><label>نام کامل</label>
                <input placeholder="نام و نام خانوادگی" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
              <div className="field"><label>شماره تلفن</label>
                <input inputMode="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} /></div>
              <div className="field"><label>نام پدر</label>
                <input placeholder="نام پدر" value={fatherName} onChange={(e) => setFatherName(e.target.value)} /></div>
              <div className="field"><label>آدرس منزل</label>
                <textarea placeholder="آدرس کامل منزل" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" className="btn btn-danger" disabled={busy} style={{ flex: 1 }}>
                  {busy ? "در حال ارسال…" : "ارسال درخواست حذف"}
                </button>
                <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setShowModal(false)}>انصراف</button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
