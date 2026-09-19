import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages: این پروژه به صورت استاتیک روی
// https://<username>.github.io/biz/ سرو می‌شود.
// پس base باید نام ریپو باشد تا assetها درست لود شوند.
export default defineConfig({
  plugins: [react()],
  base: '/biz/',
})
