// نرمالایز و اعتبارسنجی شماره تلفن ایرانی + نگاشت به ایمیل داخلی سوپابیس.
// ایده امن: Supabase Auth ایمیل/پسورد می‌خواهد، ما تلفن را به ایمیل صناعی تبدیل می‌کنیم.
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function normalizePhone(input: string): string {
  let s = (input || "").trim();
  let out = "";
  for (const ch of s) {
    const fa = FA_DIGITS.indexOf(ch);
    if (fa >= 0) { out += String(fa); continue; }
    const ar = AR_DIGITS.indexOf(ch);
    if (ar >= 0) { out += String(ar); continue; }
    out += ch;
  }
  // حذف فاصله، خط‌تیره و +98
  out = out.replace(/[\s-]/g, "");
  if (out.startsWith("+98")) out = "0" + out.slice(3);
  if (out.startsWith("98") && out.length === 12) out = "0" + out.slice(2);
  return out;
}

export function isValidIranMobile(phone: string): boolean {
  return /^09\d{9}$/.test(phone);
}

/** تلفن → ایمیل داخلی برای Supabase Auth (هرگز به کاربر نشان نده) */
export function phoneToEmail(phone: string): string {
  return `${normalizePhone(phone)}@biz.local`;
}

export function isValidNationalCode(code: string): boolean {
  const s = normalizePhone(code);
  if (!/^\d{10}$/.test(s)) return false;
  if (/^(\d)\1{9}$/.test(s)) return false;
  const check = Number(s[9]);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(s[i]) * (10 - i);
  const r = sum % 11;
  return (r < 2 && check === r) || (r >= 2 && check === 11 - r);
}
