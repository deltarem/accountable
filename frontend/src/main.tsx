import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/500.css';
import '@fontsource/instrument-sans/600.css';
import '@fontsource/instrument-sans/700.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
// tokens.css and global.css load from index.html, so the colours of the saved
// light or dark mode apply before this code runs.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { watchSystemTheme } from './lib/theme';

// With System chosen, the app follows the device's setting while it's open (UI-THEME-01).
watchSystemTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
