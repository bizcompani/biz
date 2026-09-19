-- ===== بیز | اسکیما + RLS + Realtime =====
-- اجرا در Supabase Dashboard > SQL Editor (یک‌جا اجرا کنید)

-- 0) افزونه لازم برای uuid
create extension if not exists "pgcrypto";

-- 1) جدول پروفایل‌ها (آینه نقش؛ id برابر auth.users.id)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null,
  role text not null check (role in ('admin','client')),
  created_at timestamptz default now()
);

-- 2) درخواست‌های حذف حساب (اطلاعات حساس کلاینت؛ هر کاربر فقط یک pending)
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  national_code text not null,
  full_name text not null,
  phone text not null,
  father_name text not null,
  address text not null,
  status text not null default 'pending' check (status = 'pending'),
  created_at timestamptz default now(),
  unique(user_id)
);
create index if not exists submissions_user_idx on public.submissions(user_id);

-- 3) تنظیمات سایت (تک رکورد)
create table if not exists public.app_settings (
  id int primary key,
  site_name text not null default 'بیز | کارگزاری تبلیغاتی'
);
insert into public.app_settings(id, site_name)
values (1, 'بیز | کارگزاری تبلیغاتی')
on conflict (id) do nothing;

-- 4) تابع تشخیص ادمین (بدون recursion در RLS)
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- 5) فعال‌سازی RLS
alter table public.profiles enable row level security;
alter table public.submissions enable row level security;
alter table public.app_settings enable row level security;

-- 6) پاک‌سازی پالیسی‌های قبلی (برای اجرای مجدد ایمن)
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_insert_admin" on public.profiles;
drop policy if exists "sub_select_own_or_admin" on public.submissions;
drop policy if exists "sub_insert_own" on public.submissions;
drop policy if exists "sub_delete_admin" on public.submissions;
drop policy if exists "settings_select_all" on public.app_settings;
drop policy if exists "settings_update_admin" on public.app_settings;

-- profiles: خواندن خودش یا ادمین؛ ساخت فقط ادمین (عملاً via service_role)
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profiles_insert_admin" on public.profiles
  for insert with check (public.is_admin());

-- submissions: کلاینت فقط خودش (insert/select)، ادمین همه‌چیز + delete؛ هیچ update مجاز نیست
create policy "sub_select_own_or_admin" on public.submissions
  for select using (auth.uid() = user_id or public.is_admin());
create policy "sub_insert_own" on public.submissions
  for insert with check (auth.uid() = user_id);
create policy "sub_delete_admin" on public.submissions
  for delete using (public.is_admin());

-- settings: خواندن عمومی (برای نمایش نام سایت در صفحه لاگین)، ویرایش فقط ادمین
create policy "settings_select_all" on public.app_settings
  for select using (true);
create policy "settings_update_admin" on public.app_settings
  for update using (public.is_admin()) with check (public.is_admin());

-- 7) فعال‌سازی Realtime (پنل‌ها لایو)
-- در Dashboard هم می‌توانید: Database > Replication > تیک هر ۳ جدول
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'submissions') then
    alter publication supabase_realtime add table public.submissions;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'app_settings') then
    alter publication supabase_realtime add table public.app_settings;
  end if;
end $$;
