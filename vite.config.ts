import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Na GitHub Pages aplikacja stoi pod /kanji-app/ (nazwa repozytorium).
// Lokalnie (npm run dev / preview) base zostaje "/".
// Zmieniłeś nazwę repo? Podmień "kanji-app" poniżej.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/kanji-app/' : '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
});
