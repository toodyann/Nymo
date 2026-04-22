import {
  TAP_PERSONS_AVATAR_IMPORTER_BY_KEY,
  TAP_AUTO_AWAY_START_TS_KEY,
} from '../features-parts/features-tap-avatar-config.js';
import {
  ORION_DRIVE_SHOP_CARS,
  ORION_DRIVE_CAR_PHYSICS_DEFAULT,
  ORION_DRIVE_CAR_PHYSICS,
  ORION_DRIVE_SMOKE_DEFAULT,
  ORION_DRIVE_SHOP_SMOKE_COLORS
} from '../features-parts/features-drive-config.js';

export class ChatAppFeaturesFaqDriveUtilsMethods {
  initFaqSection(settingsContainer, { behavior = 'auto' } = {}) {
    if (!(settingsContainer instanceof HTMLElement)) return;

    const faqRoot = settingsContainer.querySelector('#faq-settings');
    const contentEl = settingsContainer.querySelector('#faq-settings .settings-content');
    if (!(faqRoot instanceof HTMLElement) || !(contentEl instanceof HTMLElement)) return;

    if (faqRoot.dataset.faqBound !== 'true') {
      faqRoot.querySelectorAll('.faq-block-toggle').forEach((toggleEl) => {
        if (!(toggleEl instanceof HTMLButtonElement)) return;
        toggleEl.addEventListener('click', () => {
          const blockEl = toggleEl.closest('.faq-block');
          if (!(blockEl instanceof HTMLElement)) return;
          const nextOpen = !blockEl.classList.contains('is-open');
          blockEl.classList.toggle('is-open', nextOpen);
          toggleEl.setAttribute('aria-expanded', String(nextOpen));
        });
      });

      faqRoot.querySelectorAll('.faq-card-toggle').forEach((toggleEl) => {
        if (!(toggleEl instanceof HTMLButtonElement)) return;
        toggleEl.addEventListener('click', () => {
          const cardEl = toggleEl.closest('.faq-card');
          if (!(cardEl instanceof HTMLElement)) return;
          const nextOpen = !cardEl.classList.contains('is-open');
          cardEl.classList.toggle('is-open', nextOpen);
          toggleEl.setAttribute('aria-expanded', String(nextOpen));
        });
      });

      faqRoot.dataset.faqBound = 'true';
    }

    const safeSection = String(this.pendingFaqSection || 'overview').trim() || 'overview';
    this.pendingFaqSection = null;

    const blocks = Array.from(faqRoot.querySelectorAll('[data-faq-anchor]'));
    blocks.forEach((blockEl) => {
      if (!(blockEl instanceof HTMLElement)) return;
      const blockName = String(blockEl.dataset.faqAnchor || '').trim();
      blockEl.classList.toggle('is-faq-block-active', blockName === safeSection);
    });

    const targetBlock = blocks.find((blockEl) => {
      if (!(blockEl instanceof HTMLElement)) return false;
      return String(blockEl.dataset.faqAnchor || '').trim() === safeSection;
    });
    if (!(targetBlock instanceof HTMLElement)) return;

    if (targetBlock.classList.contains('faq-block')) {
      targetBlock.classList.add('is-open');
      const blockToggleEl = targetBlock.querySelector('.faq-block-toggle');
      if (blockToggleEl instanceof HTMLButtonElement) {
        blockToggleEl.setAttribute('aria-expanded', 'true');
      }

      const firstCardEl = targetBlock.querySelector('.faq-card');
      const openCardEl = targetBlock.querySelector('.faq-card.is-open');
      const targetCardEl = openCardEl instanceof HTMLElement ? openCardEl : firstCardEl;
      if (targetCardEl instanceof HTMLElement) {
        targetCardEl.classList.add('is-open');
        const cardToggleEl = targetCardEl.querySelector('.faq-card-toggle');
        if (cardToggleEl instanceof HTMLButtonElement) {
          cardToggleEl.setAttribute('aria-expanded', 'true');
        }
      }
    }

    window.requestAnimationFrame(() => {
      const contentRect = contentEl.getBoundingClientRect();
      const blockRect = targetBlock.getBoundingClientRect();
      const blockCenterOffset = (blockRect.top - contentRect.top) + (blockRect.height / 2);
      const targetTop = Math.max(
        0,
        Math.min(
          contentEl.scrollHeight - contentEl.clientHeight,
          contentEl.scrollTop + blockCenterOffset - (contentEl.clientHeight / 2)
        )
      );
      if (behavior === 'smooth') {
        contentEl.scrollTo({ top: targetTop, behavior: 'smooth' });
      } else {
        contentEl.scrollTop = targetTop;
      }
    });
  }


  getOrionDriveCarCatalog() {
    return ORION_DRIVE_SHOP_CARS.map((item) => ({ ...item }));
  }


  getOrionDriveSmokeCatalog() {
    return ORION_DRIVE_SHOP_SMOKE_COLORS.map((item) => ({ ...item }));
  }


  getOrionDriveSmokeDefinition(effect = '') {
    const match = ORION_DRIVE_SHOP_SMOKE_COLORS.find((item) => item.effect === effect);
    if (match) return { ...match };
    return { ...ORION_DRIVE_SMOKE_DEFAULT };
  }


  getOrionDriveCarAssetSrc(effect = '') {
    const match = ORION_DRIVE_SHOP_CARS.find((item) => item.effect === effect);
    return match?.assetSrc || '';
  }


  getOrionDriveCarPhysics(effect = '') {
    const safeEffect = String(effect || '').trim();
    const match = ORION_DRIVE_CAR_PHYSICS[safeEffect];
    return {
      ...ORION_DRIVE_CAR_PHYSICS_DEFAULT,
      ...(match || {})
    };
  }


  disposeThreeObjectResources(object3d) {
    if (!object3d) return;
    object3d.traverse((node) => {
      if (!node.isMesh) return;
      node.geometry?.dispose?.();
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => {
        if (!material) return;
        Object.values(material).forEach((value) => {
          if (value && value.isTexture) value.dispose?.();
        });
        material.dispose?.();
      });
    });
  }


  disposeShopGarageViewer() {
    const context = this.shopGarageViewerContext;
    if (!context) return;

    if (context.rafId) {
      window.cancelAnimationFrame(context.rafId);
    }

    if (context.resizeObserver) {
      context.resizeObserver.disconnect();
    } else if (context.onWindowResize) {
      window.removeEventListener('resize', context.onWindowResize);
    }

    if (context.stageEl && context.pointerHandlers) {
      context.stageEl.removeEventListener('pointerdown', context.pointerHandlers.down);
      context.stageEl.removeEventListener('pointermove', context.pointerHandlers.move);
      context.stageEl.removeEventListener('pointerup', context.pointerHandlers.up);
      context.stageEl.removeEventListener('pointercancel', context.pointerHandlers.up);
      context.stageEl.removeEventListener('pointerleave', context.pointerHandlers.up);
    }

    if (Array.isArray(context.rotateHandlers)) {
      context.rotateHandlers.forEach((entry) => {
        if (typeof entry?.cleanup === 'function') {
          entry.cleanup();
          return;
        }
        const button = entry?.button;
        const handler = entry?.handler;
        button?.removeEventListener('click', handler);
      });
    }

    this.disposeThreeObjectResources(context.model);
    context.renderer?.dispose?.();
    context.renderer?.forceContextLoss?.();
    this.shopGarageViewerContext = null;
  }


  markTapAutoAwayStart(timestamp = Date.now()) {
    const safeTs = Number.isFinite(timestamp) ? Math.max(0, Math.floor(timestamp)) : Date.now();
    try {
      window.localStorage.setItem(TAP_AUTO_AWAY_START_TS_KEY, String(safeTs));
    } catch {
      // Ignore storage failures.
    }
  }


  stopTapAutoMiningRuntime({ markAway = false } = {}) {
    if (this.tapAutoMiningInterval) {
      window.clearInterval(this.tapAutoMiningInterval);
      this.tapAutoMiningInterval = null;
    }
    if (this.tapAutoMiningPulseInterval) {
      window.clearInterval(this.tapAutoMiningPulseInterval);
      this.tapAutoMiningPulseInterval = null;
    }
    if (this.tapAutoLastGainBadgeTimer) {
      window.clearTimeout(this.tapAutoLastGainBadgeTimer);
      this.tapAutoLastGainBadgeTimer = null;
    }
    if (this.tapAutoMiningGainFlashTimer) {
      window.clearTimeout(this.tapAutoMiningGainFlashTimer);
      this.tapAutoMiningGainFlashTimer = null;
    }
    if (typeof this.tapAutoMenuCleanup === 'function') {
      this.tapAutoMenuCleanup();
      this.tapAutoMenuCleanup = null;
    }
    if (markAway) {
      this.markTapAutoAwayStart();
    }
  }


  async resolveTapPersonAvatarSrc(avatarKey = '') {
    const safeKey = String(avatarKey || '').trim();
    if (!safeKey) return '';

    if (!(this.tapPersonAvatarSrcCache instanceof Map)) {
      this.tapPersonAvatarSrcCache = new Map();
    }
    const cached = this.tapPersonAvatarSrcCache.get(safeKey);
    if (cached) return cached;

    const importer = TAP_PERSONS_AVATAR_IMPORTER_BY_KEY.get(safeKey);
    if (typeof importer !== 'function') return '';
    try {
      const loaded = await importer();
      const resolved = loaded && typeof loaded === 'object' && 'default' in loaded
        ? loaded.default
        : loaded;
      const src = String(resolved || '').trim();
      if (src) {
        const thumbnailSrc = await this.buildTapPersonAvatarThumbnail(src);
        const finalSrc = String(thumbnailSrc || src).trim();
        this.tapPersonAvatarSrcCache.set(safeKey, finalSrc || src);
      }
      return this.tapPersonAvatarSrcCache.get(safeKey) || src;
    } catch {
      return '';
    }
  }


  async buildTapPersonAvatarThumbnail(source = '') {
    const safeSource = String(source || '').trim();
    if (!safeSource || typeof window === 'undefined' || typeof document === 'undefined') {
      return safeSource;
    }

    const image = new Image();
    image.decoding = 'async';
    image.loading = 'eager';
    image.src = safeSource;
    await new Promise((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Avatar image load failed'));
    });

    const canvas = document.createElement('canvas');
    const targetSize = 64;
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return safeSource;

    const srcW = Math.max(1, image.naturalWidth || image.width || targetSize);
    const srcH = Math.max(1, image.naturalHeight || image.height || targetSize);
    const scale = Math.max(targetSize / srcW, targetSize / srcH);
    const drawW = Math.max(1, Math.round(srcW * scale));
    const drawH = Math.max(1, Math.round(srcH * scale));
    const drawX = Math.round((targetSize - drawW) / 2);
    const drawY = Math.round((targetSize - drawH) / 2);

    ctx.clearRect(0, 0, targetSize, targetSize);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'low';
    ctx.drawImage(image, drawX, drawY, drawW, drawH);

    const webpDataUrl = canvas.toDataURL('image/webp', 0.45);
    if (typeof webpDataUrl === 'string' && webpDataUrl.startsWith('data:image/webp')) {
      return webpDataUrl;
    }
    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.5);
    if (typeof jpegDataUrl === 'string' && jpegDataUrl.startsWith('data:image/jpeg')) {
      return jpegDataUrl;
    }
    return safeSource;
  }

}
