/* ── MITTI — ESLint (flat config) ──
 *
 * Next.js 16 removed the `next lint` command and @next/eslint-plugin-next now
 * ships flat config, so ESLint is configured and run directly.
 */
import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

const config = [
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'public/sw.js'],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      /* Assessment images come from Supabase Storage at runtime, so their URLs
         are unknown to the build-time image optimiser. See HistoryView.tsx. */
      '@next/next/no-img-element': 'off',
    },
  },
];

export default config;
