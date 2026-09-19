import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase, type Profile, type Role } from "../lib/supabase";
import { phoneToEmail, normalizePhone } from "../lib/phone";

interface AuthState {
  loading: boolean;
  userId: string | null;
  phone: string | null;
  role: Role | null;
  profile: Profile | null;
  siteName: string;
  login: (phoneRaw: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [siteName, setSiteName] = useState("بیز | کارگزاری تبلیغاتی");

  async function loadSiteName() {
    const { data } = await supabase.from("app_settings").select("site_name").eq("id", 1).maybeSingle();
    if (data?.site_name) {
      setSiteName(data.site_name);
      document.title = data.site_name;
    }
  }

  async function refreshProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUserId(null); setPhone(null); setRole(null); setProfile(null);
      return;
    }
    setUserId(user.id);
    const metaPhone = (user.user_metadata as { phone?: string })?.phone;
    if (metaPhone) setPhone(metaPhone);
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (data) {
      setProfile(data as Profile);
      setRole((data as Profile).role);
      if ((data as Profile).phone) setPhone((data as Profile).phone);
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadSiteName();
      await refreshProfile();
      setLoading(false);
    })();
    // نام سایت لایو برای همه (حتی لاگین نکرده)
    const ch = supabase
      .channel("app-settings-live")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "app_settings" }, (p) => {
        const next = (p.new as { site_name?: string }).site_name;
        if (next) { setSiteName(next); document.title = next; }
      })
      .subscribe();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { refreshProfile(); });
    return () => { supabase.removeChannel(ch); sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(phoneRaw: string, password: string) {
    const phone = normalizePhone(phoneRaw);
    // فقط تلفن + رمز؛ پیام خطای واحد برای جلوگیری از user-enumeration
    const { error } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(phone),
      password,
    });
    if (error) throw new Error("نام کاربری یا رمز عبور اشتباه است.");
    await refreshProfile();
  }

  async function logout() {
    await supabase.auth.signOut();
    setUserId(null); setPhone(null); setRole(null); setProfile(null);
  }

  return (
    <AuthCtx.Provider value={{ loading, userId, phone, role, profile, siteName, login, logout, refreshProfile }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthState {
  const v = useContext(AuthCtx);
  if (!v) throw new Error("useAuth باید داخل AuthProvider باشد");
  return v;
}
