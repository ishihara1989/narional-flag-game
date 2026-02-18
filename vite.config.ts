import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const repository = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base =
  process.env.GITHUB_ACTIONS === 'true' && repository
    ? repository.endsWith('.github.io')
      ? '/'
      : `/${repository}/`
    : '/'

export default defineConfig({
  plugins: [react()],
  base,
})
