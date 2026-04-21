export function setupDriftControlsRuntime({
  driftSteerLeftBtn = null,
  driftSteerRightBtn = null,
  driftGasBtn = null,
  driftBrakeBtn = null,
  driftCanvasWrapEl = null,
  driftState = null,
  syncDriftControlButtons = () => {},
  setMiniGameView = () => {},
  getCurrentMiniGameView = () => 'tapper'
} = {}) {
  if (!driftState || typeof driftState !== 'object') return;

  const setDriftSteerDirection = (direction) => {
    driftState.steerDirection = direction;
    syncDriftControlButtons();
  };

  const setDriftThrottleDirection = (direction) => {
    driftState.throttleDirection = direction;
    syncDriftControlButtons();
  };

  const bindDriftControlButton = (buttonEl, onPress, onRelease) => {
    if (!buttonEl || buttonEl.dataset.bound === 'true') return;
    buttonEl.dataset.bound = 'true';

    buttonEl.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      setMiniGameView('drift');
      onPress();
    });

    buttonEl.addEventListener('pointerup', onRelease);
    buttonEl.addEventListener('pointercancel', onRelease);
    buttonEl.addEventListener('pointerleave', onRelease);

    buttonEl.addEventListener('touchstart', (event) => {
      event.preventDefault();
      setMiniGameView('drift');
      onPress();
    }, { passive: false });

    buttonEl.addEventListener('touchend', onRelease, { passive: true });
    buttonEl.addEventListener('touchcancel', onRelease, { passive: true });
  };

  bindDriftControlButton(driftSteerLeftBtn, () => setDriftSteerDirection(-1), () => setDriftSteerDirection(0));
  bindDriftControlButton(driftSteerRightBtn, () => setDriftSteerDirection(1), () => setDriftSteerDirection(0));
  bindDriftControlButton(driftGasBtn, () => setDriftThrottleDirection(1), () => setDriftThrottleDirection(0));
  bindDriftControlButton(driftBrakeBtn, () => setDriftThrottleDirection(-1), () => setDriftThrottleDirection(0));

  if (!driftCanvasWrapEl || driftCanvasWrapEl.dataset.bound === 'true') return;
  driftCanvasWrapEl.dataset.bound = 'true';

  driftCanvasWrapEl.addEventListener('touchstart', (event) => {
    if (event.target instanceof Element && event.target.closest('.orion-drift-controls, .orion-drift-start-overlay')) return;
    if (event.touches && event.touches.length > 1) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    const point = event.changedTouches?.[0];
    if (!point) return;

    driftState.swipeStartX = point.clientX;
    driftState.swipeStartY = point.clientY;
    driftState.touchSteerDirection = 0;
    syncDriftControlButtons();
  }, { passive: false });

  driftCanvasWrapEl.addEventListener('touchmove', (event) => {
    if (event.target instanceof Element && event.target.closest('.orion-drift-controls, .orion-drift-start-overlay')) return;
    if (event.touches && event.touches.length > 1) {
      event.preventDefault();
      return;
    }

    const point = event.changedTouches?.[0];
    if (!point) return;

    const dx = point.clientX - driftState.swipeStartX;
    const dy = point.clientY - driftState.swipeStartY;
    if (Math.abs(dx) > 16 && Math.abs(dx) > Math.abs(dy) * 0.8) {
      driftState.touchSteerDirection = dx > 0 ? 1 : -1;
      if (getCurrentMiniGameView() !== 'drift') setMiniGameView('drift');
      event.preventDefault();
    } else {
      driftState.touchSteerDirection = 0;
    }
    syncDriftControlButtons();
  }, { passive: false });

  const finishSwipe = () => {
    driftState.touchSteerDirection = 0;
    syncDriftControlButtons();
  };

  driftCanvasWrapEl.addEventListener('touchend', finishSwipe, { passive: true });
  driftCanvasWrapEl.addEventListener('touchcancel', finishSwipe, { passive: true });

  const preventDriftGestureZoom = (event) => event.preventDefault();
  driftCanvasWrapEl.addEventListener('gesturestart', preventDriftGestureZoom);
  driftCanvasWrapEl.addEventListener('gesturechange', preventDriftGestureZoom);
  driftCanvasWrapEl.addEventListener('gestureend', preventDriftGestureZoom);
}
