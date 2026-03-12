// Обробники свайпів для мобільних пристроїв

/**
 * Налаштування свайпу для закриття чату
 * @param {ChatApp} app - Інстанс додатку
 */
export function setupMobileSwipeBack(app) {
  const chatContainer = document.getElementById('chatContainer');
  const appRoot = document.querySelector('.bridge-app');
  if (!chatContainer) return;

  let startX = 0;
  let startY = 0;
  let dragging = false;
  let active = false;
  let lastTranslate = 0;
  let swipeProfileSection = false;
  let gestureTarget = null;

  const getMaxReveal = () => window.innerWidth;
  const CLOSE_THRESHOLD_RATIO = 0.35;
  const SNAP_BACK_DURATION_MS = 320;
  const CLOSE_DURATION_MS = 360;

  const onStart = (e) => {
    if (window.innerWidth > 768 || !app.currentChat) return;
    if (e.touches.length !== 1) return;

    const profileSectionActive = typeof app.isContactProfileSectionActive === 'function'
      && app.isContactProfileSectionActive();
    const contactProfileView = document.getElementById('contactProfileView');
    swipeProfileSection = Boolean(profileSectionActive && contactProfileView);
    gestureTarget = swipeProfileSection ? contactProfileView : chatContainer;
    chatContainer.classList.remove('profile-view-peek');
    if (appRoot) {
      appRoot.style.removeProperty('--swipe-peek-header-center');
    }

    if (app.chatEnterAnimation) {
      app.chatEnterAnimation.cancel();
      app.chatEnterAnimation = null;
    }
    chatContainer.classList.remove('chat-entering');
    chatContainer.style.removeProperty('transition');
    chatContainer.style.removeProperty('transform');
    chatContainer.style.removeProperty('opacity');
    if (contactProfileView) {
      contactProfileView.style.removeProperty('transition');
      contactProfileView.style.removeProperty('transform');
    }

    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    dragging = true;
    active = false;
    lastTranslate = 0;
  };

  const onMove = (e) => {
    if (!dragging || window.innerWidth > 768 || !app.currentChat) return;
    if (!gestureTarget) return;
    
    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (!active) {
      if (Math.abs(dx) < 8) return;
      if (Math.abs(dx) < Math.abs(dy)) {
        dragging = false;
        return;
      }
      if (dx < 0) return; // Ignore swipe left
      active = true;
      gestureTarget.style.removeProperty('transition');
      gestureTarget.style.willChange = 'transform';
      if (!swipeProfileSection) {
        chatContainer.classList.add('swiping');
        if (appRoot) appRoot.classList.add('swipe-peek');
      } else {
        chatContainer.classList.add('profile-view-peek');
      }
    }

    const maxReveal = getMaxReveal();
    const distance = Math.min(Math.max(0, dx), maxReveal);
    lastTranslate = distance;
    if (!swipeProfileSection && appRoot) {
      appRoot.style.setProperty('--swipe-peek-header-center', `${distance / 2}px`);
    }

    gestureTarget.style.transform = `translate3d(${distance}px, 0, 0)`;
    if (active) e.preventDefault();
  };

  const onEnd = () => {
    if (!dragging) return;
    dragging = false;

    if (!active) return;

    if (!swipeProfileSection) {
      chatContainer.classList.remove('swiping');
    }
    const shouldClose = lastTranslate >= window.innerWidth * CLOSE_THRESHOLD_RATIO;
    const targetX = shouldClose ? getMaxReveal() : 0;
    const targetEl = gestureTarget || chatContainer;

    if (shouldClose) {
      const remainingDistance = Math.max(0, targetX - lastTranslate);
      const closeDuration = Math.max(320, Math.min(CLOSE_DURATION_MS + 120, 320 + remainingDistance * 0.4));

      // Lock current position and then, on next frames, animate to the right edge.
      targetEl.style.removeProperty('transition');
      targetEl.style.transform = `translate3d(${lastTranslate}px, 0, 0)`;
      void targetEl.offsetWidth;

      let finished = false;
      const finishClose = () => {
        if (finished) return;
        finished = true;
        targetEl.removeEventListener('transitionend', onCloseTransitionEnd);
        targetEl.style.removeProperty('transition');
        targetEl.style.removeProperty('will-change');
        targetEl.style.removeProperty('transform');
        chatContainer.classList.remove('profile-view-peek');
        if (swipeProfileSection && typeof app.closeContactProfileSection === 'function') {
          app.closeContactProfileSection();
        } else {
          app.closeChat({ animate: false });
        }
        if (!swipeProfileSection && appRoot) {
          appRoot.classList.remove('swipe-peek');
          appRoot.style.removeProperty('--swipe-peek-header-center');
        }
        gestureTarget = null;
        swipeProfileSection = false;
      };
      const onCloseTransitionEnd = (event) => {
        if (event.target !== targetEl || event.propertyName !== 'transform') return;
        finishClose();
      };
      targetEl.addEventListener('transitionend', onCloseTransitionEnd);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
      targetEl.style.setProperty(
        'transition',
        `transform ${closeDuration}ms cubic-bezier(0.22, 0.61, 0.36, 1)`,
        'important'
      );
      targetEl.style.transform = `translate3d(${targetX}px, 0, 0)`;
        });
      });

      // Fallback in case transitionend is missed on some devices.
      window.setTimeout(finishClose, closeDuration + 80);
      return;
    }

    const duration = SNAP_BACK_DURATION_MS;
    const easing = 'cubic-bezier(0.22, 1, 0.36, 1)';

    const finish = () => {
      targetEl.style.removeProperty('transition');
      targetEl.style.removeProperty('will-change');
      if (!swipeProfileSection && appRoot) {
        appRoot.classList.remove('swipe-peek');
        appRoot.style.removeProperty('--swipe-peek-header-center');
      }
      targetEl.style.removeProperty('transform');
      chatContainer.classList.remove('profile-view-peek');
      gestureTarget = null;
      swipeProfileSection = false;
    };

    targetEl.style.setProperty(
      'transition',
      `transform ${duration}ms ${easing}`,
      'important'
    );
    targetEl.style.transform = `translate3d(${targetX}px, 0, 0)`;
    window.setTimeout(finish, duration + 20);
  };

  chatContainer.addEventListener('touchstart', onStart, { passive: true });
  chatContainer.addEventListener('touchmove', onMove, { passive: false });
  chatContainer.addEventListener('touchend', onEnd);
  chatContainer.addEventListener('touchcancel', onEnd);
}

/**
 * Налаштування свайпу для повернення з підрозділу налаштувань
 * @param {HTMLElement} settingsContainer - Контейнер налаштувань
 * @param {ChatApp} app - Інстанс додатку
 */
export function setupSettingsSwipeBack(settingsContainer, app) {
  if (window.innerWidth > 768) return;

  let startX = 0;
  let startY = 0;
  let dragging = false;
  let active = false;
  let lastTranslate = 0;

  const onStart = (e) => {
    if (window.innerWidth > 768) return;
    if (e.touches.length !== 1) return;
    
    const target = e.target;
    if (target.closest('input[type="range"]') || 
        target.closest('.font-size-slider-wrapper') || 
        target.closest('.font-size-slider-container') || 
        target.closest('.toggle-switch') || 
        target.closest('select') || 
        target.closest('input')) {
      dragging = false;
      return;
    }
    
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    dragging = true;
    active = false;
    lastTranslate = 0;
  };

  const onMove = (e) => {
    if (!dragging || window.innerWidth > 768) return;
    
    const touch = e.touches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    if (!active) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) return;
      active = true;
    }

    const maxReveal = window.innerWidth;
    const distance = Math.min(Math.max(0, dx), maxReveal);
    lastTranslate = distance;

    settingsContainer.style.transform = `translateX(${distance}px)`;

    if (active) e.preventDefault();
  };

  const onEnd = () => {
    if (!dragging) return;
    dragging = false;

    if (!active) return;

    const shouldGoBack = lastTranslate > window.innerWidth * 0.25;

    settingsContainer.style.transform = '';
    
    if (shouldGoBack) {
      app.showSettings(app.settingsParentSection || 'messenger-settings');
    }
  };

  const settingsSection = settingsContainer.querySelector('.settings-section');
  if (settingsSection) {
    settingsSection.addEventListener('touchstart', onStart, { passive: true });
    settingsSection.addEventListener('touchmove', onMove, { passive: false });
    settingsSection.addEventListener('touchend', onEnd);
    settingsSection.addEventListener('touchcancel', onEnd);
  }
}
