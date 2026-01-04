// Tauri doesn't have a Node.js server to do proper SSR
// so we use adapter-static with a fallback to index.html to put the site in SPA mode
// See: https://svelte.dev/docs/kit/single-page-apps
// See: https://v2.tauri.app/start/frontend/sveltekit/ for more info
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  compilerOptions: {
    // Disable specific a11y warnings that are intentional UX decisions
    warningFilter: (warning) => {
      // Autofocus is intentional for modal/drawer/inline edit UX
      if (warning.code === 'a11y_autofocus') return false;
      // Click events on divs are for stop propagation in modals/overlays
      if (warning.code === 'a11y_click_events_have_key_events') return false;
      if (warning.code === 'a11y_no_static_element_interactions') return false;
      return true;
    },
  },
  kit: {
    adapter: adapter({
      fallback: 'index.html',
    }),
  },
};

export default config;
