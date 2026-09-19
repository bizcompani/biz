# بیز | کارگزاری تبلیغاتی

وب‌اپ تک‌صفحه‌ای فارسی (راست‌چین) با لاگین شماره تلفن + رمز، پنل درخواست حذف حساب برای کلاینت و پنل لایو دولوپر (تأیید/رد). بک‌اند و احراز هویت با Supabase.

> ⚠️ فایل‌های حساس (`.env` و هر چیزی شامل `service_role`) در `.gitignore` هستند و **هرگز پوش نمی‌شوند**. فقط `.env.example` کامیت می‌شود.

---

## کارهایی که شما باید انجام دهید (قدم‌به‌قدم)

### ۱) ساخت پروژه Supabase
1. به [supabase.com](https://supabase.com) بروید → New Project.
2. از Project Settings → API این دو را بردارید:
   - `Project URL` → می‌شود `VITE_SUPABASE_URL`
   - `anon public key` → می‌شود `VITE_SUPABASE_ANON_KEY`
   - `service_role key` را **فقط** برای مرحله ۵ نگه دارید (هرگز در فرانت/گیت نگذارید).

### ۲) اجرای دیتابیس (جداول + RLS + Realtime)
1. در داشبورد Supabase بروید: **SQL Editor → New query**.
2. کل محتوای فایل `supabase/migrations/0001_schema.sql` را کپی و **Run** کنید.
3. بررسی: **Table Editor** باید `profiles` و `submissions` و `app_settings` را نشان دهد.
4. لایو: **Database → Replication** → برای هر ۳ جدول تیک `supabase_realtime` (اسکریپت خودش تلاش می‌کند، ولی دستی چک کنید).

### ۳) بستن ثبت‌نام عمومی (خیلی مهم)
- **Authentication → Providers → Email** → گزینه **Allow new users to sign up = OFF**.
- **Authentication → Policies** مطمئن شوید RLS فعال است (اسکریپت فعال می‌کند).

### ۴) ساخت ادمین اولیه (دولوپر) — دستی، فقط یک‌بار
1. **Authentication → Users → Add user → Create new user**:
   - Email: شماره موبایل ادمین با پسوند، مثلاً `09123456789@biz.local`
   - Password: یک رمز قوی → **Auto Confirm User = ON** → Save.
2. `user id` ساخته‌شده را کپی کنید → **SQL Editor**:
   ```sql
   insert into public.profiles(id, phone, role)
   values ('USER-ID-ADMIN', '09123456789', 'admin');
   ```
3. حالا با `09123456789` + همان رمز در سایت لاگین کنید → باید به `/admin` بروید.

### ۵) دیپلوی دو Edge Function امن (ساخت کاربر + تأیید/رد)
> بدون این مرحله، دکمه‌های «افزودن کاربر» و «تأیید/رد» کار نمی‌کنند چون حذف/ساخت `auth.users` فقط با `service_role` ممکن است.

1. نصب CLI (یک‌بار): `npm i -g supabase`
2. لاگین و لینک:
   ```bash
   supabase login
   supabase link --project-ref YOUR-PROJECT-REF
   supabase secrets set SUPABASE_URL=https://YOUR-PROJECT.supabase.co SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=...
   supabase functions deploy create-user
   supabase functions deploy review-request
   ```
   فایل‌ها آماده‌اند: `supabase/functions/create-user/index.ts` و `supabase/functions/review-request/index.ts`.
3. جایگزین بدون CLI: **Edge Functions → New Function** → کد هر فایل را پیaste کنید → Secrets را در **Edge Functions → Secrets** بگذارید.

### ۶) اتصال فرانت به Supabase (لوکال)
```bash
npm install
copy .env.example .env   # ویندوز
# داخل .env مقادیر واقعی VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY را بگذارید
npm run dev
```
مرورگر: `http://localhost:5173` — ادمین لاگین → تب کاربران → یک کلاینت تستی بسازید → با آن شماره در پنجره ناشناس لاگین → دکمه «حذف حساب کاربری» → فرم → بررسی لایو در پنل ادمین.

### ۷) دیپلوی روی GitHub Pages
1. در گیت‌هاب یک ریپو به نام `biz` بسازید (اگر نام دیگری است، در `vite.config.ts` مقدار `base` را به `/REPO-NAME/` تغییر دهید).
2. **Settings → Secrets and variables → Actions → New repository secret**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` (فقط anon، نه service_role!)
3. پوش کنید (`main`):
   ```bash
   git init; git add .; git commit -m "biz initial"; git branch -M main
   git remote add origin https://github.com/USER/biz.git
   git push -u origin main
   ```
4. فایل `.github/workflows/deploy.yml` خودش بیلد و روی GitHub Pages منتشر می‌کند.
5. **Settings → Pages → Source = GitHub Actions**. آدرس نهایی: `https://USER.github.io/biz/#/`.

## فلو نهایی
- کلاینت: لاگین (تلفن+رمز) → کارت حذف حساب → مودال ۵ فیلدی → پیام «اطلاعات پس از بررسی توسط ادمین به شما اطلاع‌رسانی می‌شود.» → وضعیت pending.
- ادمین: تب درخواست‌ها → **تأیید** (حذف درخواست + حذف کامل اکانت) یا **رد** (حذف فقط درخواست). تب کاربران → افزودن کاربر. تب تنظیمات → تغییر نام سایت (لایو).

## ساختار
```
src/{pages/{Login,ClientPanel,AdminPanel},context/AuthContext,lib/{supabase,phone},components/Layout}
supabase/{migrations/0001_schema.sql,functions/{create-user,review-request}/index.ts}
.github/workflows/deploy.yml
```

## امنیت
- ثبت‌نام عمومی OFF؛ ساخت/حذف یوزر فقط via Edge Function با چک `profiles.role='admin'`.
- RLS: کلاینت فقط رکورد خودش؛ ادمین همه + delete؛ هیچ update روی داده حساس.
- بعد از تأیید: `DELETE` واقعی، بدون آرشیو. `service_role` هرگز در فرانت/گیت نیست.
