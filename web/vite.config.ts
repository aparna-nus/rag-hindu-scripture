import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // FOR LOCAL DEVELOPMENT CHANGE TO: base: '/'
  base: '/rag-hindu-scripture/', // for GitHub Pages deployment


  //server: { // local dev only
  //  open: true
  //}
})
