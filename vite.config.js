import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// En GitHub Pages el sitio se sirve bajo /bvs-dashboard/.
// En Vercel (u otros) se sirve en la raíz. Se controla con la env GH_PAGES.
const base = process.env.GH_PAGES ? '/bvs-dashboard/' : '/'

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  }
})
