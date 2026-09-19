import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages: این پروژه به صورت استاتیک روی
// https://bizcompani.github.io/biz/ سرو می‌شود.
// پس base باید نام ریپو باشد تا assetها درست لود شوند.
export default defineConfig({
  plugins: [react()],
  base: '/biz/',
  build: {
    // جداسازی vendorها: کش بهتر + پارس موازی + unused-js کمتر در لود اول
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) return 'motion';
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('react-router')) return 'router';
            if (id.includes('react')) return 'react-vendor';
            return 'vendor';
          }
        },
      },
    },
  },
})
