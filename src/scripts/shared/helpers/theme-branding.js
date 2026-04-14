function getAppBasePath() {
  const envBase = typeof import.meta.env?.BASE_URL === 'string'
    ? String(import.meta.env.BASE_URL || '').trim()
    : '';
  if (envBase) {
    return envBase.endsWith('/') ? envBase : `${envBase}/`;
  }
  return '/';
}

function resolveThemedIconHref(isDark) {
  const base = getAppBasePath();
  const fileName = isDark ? 'favicon-dark.png' : 'favicon-light.png';
  return `${base}pwa/${fileName}?v=1`;
}

function resolveThemeMode() {
  if (document.documentElement.classList.contains('dark-theme')) return 'dark';
  try {
    const savedTheme = localStorage.getItem('orion_theme');
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
  } catch {
    // Ignore storage failures.
  }
  const prefersDark = window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : true;
  return prefersDark ? 'dark' : 'light';
}

function updateHeaderLogos(isDark) {
  const logos = document.querySelectorAll('img[data-brand-logo="true"]');
  logos.forEach((logo) => {
    if (!(logo instanceof HTMLImageElement)) return;
    const nextSrc = isDark ? logo.dataset.logoDarkSrc : logo.dataset.logoLightSrc;
    if (!nextSrc) return;
    if (logo.getAttribute('src') !== nextSrc) {
      logo.setAttribute('src', nextSrc);
    }
  });
}

function updateFaviconLinks(iconHref) {
  const selectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]'
  ];
  selectors.forEach((selector) => {
    const link = document.head.querySelector(selector);
    if (!link) return;
    link.setAttribute('href', iconHref);
    link.setAttribute('data-themed-favicon', 'true');
  });
}

export function applyThemeBranding() {
  if (typeof document === 'undefined') return;
  const mode = resolveThemeMode();
  const isDark = mode === 'dark';
  document.documentElement.setAttribute('data-brand-theme', mode);
  updateHeaderLogos(isDark);
  updateFaviconLinks(resolveThemedIconHref(isDark));
}
