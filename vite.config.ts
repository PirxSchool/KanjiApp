import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Na GitHub Pages aplikacja stoi pod /KanjiApp/ (nazwa repozytorium).
// Lokalnie (npm run dev / preview) base zostaje "/".
// Zmieniłeś nazwę repo? Podmień "KanjiApp" poniżej.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/KanjiApp/' : '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
});
