export function isPageHidden() {
  return document.visibilityState === 'hidden';
}

export function syncPageHiddenClass() {
  document.documentElement.classList.toggle('is-page-hidden', isPageHidden());
}

export function installPageVisibilitySync() {
  if (window.__NYMO_PAGE_VISIBILITY_SYNC) return;
  window.__NYMO_PAGE_VISIBILITY_SYNC = true;
  syncPageHiddenClass();
  document.addEventListener('visibilitychange', () => {
    syncPageHiddenClass();
    window.dispatchEvent(new CustomEvent('nymo:visibility', {
      detail: { hidden: isPageHidden() }
    }));
  });
}
