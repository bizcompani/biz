import { createClient } from "@supabase/supabase-js";

// مقادیر از .env خوانده می‌شوند و هرگز کلید service_role اینجا قرار نمی‌گیرد.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anon) {
  console.warn("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY تنظیم نشده است. فایل .env را ببینید.");
}

export const supabase = createClient(url ?? "", anon ?? "");

export type Role = "admin" | "client";

export interface Profile {
  id: string;
  phone: string;
  role: Role;
  created_at: string;
}

export interface DeletionRequest {
  id: string;
  user_id: string;
  national_code: string;
  full_name: string;
  phone: string;
  father_name: string;
  address: string;
  status: "pending";
  created_at: string;
}
