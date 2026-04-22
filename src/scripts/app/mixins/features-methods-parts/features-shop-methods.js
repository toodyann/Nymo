import * as THREE from 'three';
import { setupSettingsSwipeBack } from '../../../shared/gestures/swipe-handlers.js';
import { escapeHtml } from '../../../shared/helpers/ui-helpers.js';
import { buildApiUrl } from '../../../shared/api/api-url.js';
import {
  getAuthSession,
  setAuthSession,
  syncLegacyUserProfile
} from '../../../shared/auth/auth-session.js';
import {
  flappyCoinSoundUrl,
  flappyWingSoundUrl,
  flappyDieSoundUrl,
  TAP_PERSONS_AVATAR_POOL,
  TAP_PERSONS_AVATAR_IMPORTER_BY_KEY,
  TAP_AUTO_AWAY_START_TS_KEY,
  TAP_AUTO_PENDING_REWARD_CENTS_KEY,
  TAP_AUTO_PENDING_REWARD_SECONDS_KEY,
  ORION_DRIVE_SHOP_CARS,
  ORION_DRIVE_CAR_PHYSICS_DEFAULT,
  ORION_DRIVE_CAR_PHYSICS,
  ORION_DRIVE_SMOKE_DEFAULT,
  ORION_DRIVE_SHOP_SMOKE_COLORS,
  createOrionDriveGltfLoader
} from '../features-parts/index.js';
import { ChatAppFeaturesFaqDriveUtilsMethods } from './features-faq-drive-utils-methods.js';

export class ChatAppFeaturesShopMethods extends ChatAppFeaturesFaqDriveUtilsMethods {
  initOrionDriveGarage(settingsContainer) {
    const sectionEl = settingsContainer.querySelector('#orion-drive-garage');
    const stageEl = settingsContainer.querySelector('#shopGarageStage');
    const canvasEl = settingsContainer.querySelector('#shopGarageCanvas');
    const fallbackEl = settingsContainer.querySelector('#shopGarageFallback');
    const ownershipTagEl = settingsContainer.querySelector('#shopGarageOwnershipTag');
    const titleEl = settingsContainer.querySelector('#shopGarageTitle');
    const descriptionEl = settingsContainer.querySelector('#shopGarageDescription');
    const classEl = settingsContainer.querySelector('#shopGarageClass');
    const priceEl = settingsContainer.querySelector('#shopGaragePrice');
    const balanceEl = settingsContainer.querySelector('#shopGarageBalance');
    const specsEl = settingsContainer.querySelector('#shopGarageSpecs');
    const actionBtn = settingsContainer.querySelector('#shopGarageActionBtn');
    if (!sectionEl || !stageEl || !canvasEl || !specsEl || !actionBtn) return;

    const cars = this.getOrionDriveCarCatalog();
    if (!cars.length) return;

    const carsById = new Map(cars.map((item) => [item.id, item]));
    const queuedCarId = String(this.pendingShopGarageCarId || '').trim();
    this.pendingShopGarageCarId = '';

    const equippedCar = cars.find((item) => item.effect === this.user?.equippedDriveCar);
    const initialCar = carsById.get(queuedCarId) || equippedCar || cars[0];
    let currentCarIndex = Math.max(0, cars.findIndex((item) => item.id === initialCar?.id));
    let currentCar = cars[currentCarIndex] || cars[0];

    const inventory = new Set(this.loadShopInventory());
    const carClassByEffect = {
      taxi: 'Міський клас',
      'sedan-sports': 'Спорт-седан',
      'suv-luxury': 'Преміум SUV',
      police: 'Перехоплювач',
      'race-future': 'Футуристичний',
      firetruck: 'Важкий клас'
    };
    const allPhysics = cars.map((car) => this.getOrionDriveCarPhysics(car.effect));

    const physicsRange = (key) => {
      const values = allPhysics.map((row) => Number(row[key]) || 0);
      return {
        min: Math.min(...values),
        max: Math.max(...values)
      };
    };

    const ranges = {
      maxForward: physicsRange('maxForward'),
      forwardAccel: physicsRange('forwardAccel'),
      transitionBrake: physicsRange('transitionBrake'),
      shiftBrakeForce: physicsRange('shiftBrakeForce')
    };

    const normalizeToPercent = (value, range) => {
      const safeValue = Number(value) || 0;
      const min = Number(range?.min) || 0;
      const max = Number(range?.max) || 0;
      if (max <= min) return 50;
      return Math.round(((safeValue - min) / (max - min)) * 100);
    };

    const getSelectedState = () => {
      const owned = inventory.has(currentCar.id);
      const equipped = this.user?.equippedDriveCar === currentCar.effect;
      const balance = this.getTapBalanceCents();
      const canBuy = balance >= currentCar.price;
      return { owned, equipped, balance, canBuy };
    };

    const renderSpecs = () => {
      const selectedPhysics = this.getOrionDriveCarPhysics(currentCar.effect);
      const topSpeed = Math.round((selectedPhysics.maxForward / 10) * 1.25);
      const accelRate = Math.round(selectedPhysics.forwardAccel / 8);
      const brakingRate = Math.round((selectedPhysics.transitionBrake + selectedPhysics.shiftBrakeForce) / 20);
      const controlRate = Math.round(((selectedPhysics.forwardAccel * 0.5) + (selectedPhysics.transitionBrake * 0.5)) / 12);

      const specs = [
        {
          label: 'Макс. швидкість',
          value: `${topSpeed} км/год`,
          percent: normalizeToPercent(selectedPhysics.maxForward, ranges.maxForward)
        },
        {
          label: 'Розгін',
          value: `${accelRate}/100`,
          percent: normalizeToPercent(selectedPhysics.forwardAccel, ranges.forwardAccel)
        },
        {
          label: 'Гальмування',
          value: `${brakingRate}/100`,
          percent: Math.round(
            (
              normalizeToPercent(selectedPhysics.transitionBrake, ranges.transitionBrake) * 0.55
              + normalizeToPercent(selectedPhysics.shiftBrakeForce, ranges.shiftBrakeForce) * 0.45
            )
          )
        },
        {
          label: 'Керованість',
          value: `${controlRate}/100`,
          percent: Math.round(
            (
              normalizeToPercent(selectedPhysics.forwardAccel, ranges.forwardAccel) * 0.4
              + normalizeToPercent(selectedPhysics.transitionBrake, ranges.transitionBrake) * 0.6
            )
          )
        }
      ];

      specsEl.innerHTML = specs.map((spec) => `
        <div class="orion-drive-garage-spec">
          <div class="orion-drive-garage-spec-row">
            <span>${spec.label}</span>
            <strong>${spec.value}</strong>
          </div>
          <div class="orion-drive-garage-spec-meter">
            <span style="width: ${Math.max(6, Math.min(100, spec.percent))}%;"></span>
          </div>
        </div>
      `).join('');
    };

    const renderCarInfo = () => {
      if (titleEl) titleEl.textContent = currentCar.title;
      if (descriptionEl) descriptionEl.textContent = currentCar.description;
      if (classEl) classEl.textContent = carClassByEffect[currentCar.effect] || 'Універсальний';
      if (priceEl) priceEl.textContent = this.formatCoinBalance(currentCar.price, 1);
      if (balanceEl) balanceEl.textContent = this.formatCoinBalance(this.getTapBalanceCents(), 1);
      renderSpecs();
    };

    const renderActionState = () => {
      const { owned, equipped, canBuy } = getSelectedState();
      if (ownershipTagEl) {
        ownershipTagEl.textContent = owned
          ? (equipped ? 'Встановлено' : 'Куплено')
          : 'Не куплено';
      }

      actionBtn.className = 'shop-item-action orion-drive-garage-action';
      if (owned) {
        actionBtn.classList.add(equipped ? 'is-equipped' : 'is-owned');
        actionBtn.innerHTML = equipped ? 'Встановлено' : 'Встановити';
        actionBtn.disabled = false;
        return;
      }

      actionBtn.classList.add(canBuy ? 'can-buy' : 'is-locked');
      actionBtn.innerHTML = `Купити за&nbsp;<span class="currency-value-inline">${this.formatCoinBalance(currentCar.price, 1)}</span>`;
      actionBtn.disabled = !canBuy;
    };

    const applyAction = () => {
      const { owned, balance } = getSelectedState();
      if (!owned) {
        if (balance < currentCar.price) return;
        const spent = this.applyCoinTransaction(
          -currentCar.price,
          `Купівля: ${currentCar.title}`,
          {
            category: 'shop',
            type: 'purchase',
            subtitle: 'Гра: Nymo Drive',
            game: 'Nymo Drive',
            item: currentCar.title,
            source: 'Магазин'
          }
        );
        if (!spent) return;
        inventory.add(currentCar.id);
        this.saveShopInventory([...inventory]);
      }

      this.user.equippedDriveCar = this.user.equippedDriveCar === currentCar.effect
        ? ''
        : currentCar.effect;

      this.saveUserProfile({
        ...this.user,
        equippedAvatarFrame: this.user.equippedAvatarFrame || '',
        equippedProfileAura: this.user.equippedProfileAura || '',
        equippedProfileMotion: this.user.equippedProfileMotion || '',
        equippedProfileBadge: this.user.equippedProfileBadge || '',
        equippedDriveCar: this.user.equippedDriveCar || '',
        equippedDriveSmokeColor: this.user.equippedDriveSmokeColor || ''
      });
      this.syncProfileCosmetics();
      renderCarInfo();
      renderActionState();
    };

    actionBtn.addEventListener('click', applyAction);
    renderCarInfo();
    renderActionState();

    this.disposeShopGarageViewer();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);
    camera.position.set(3.2, 1.9, 4.4);
    camera.lookAt(0, 0.72, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.72);
    const hemisphere = new THREE.HemisphereLight(0xbfd7ff, 0x161c28, 0.7);
    const keyLight = new THREE.DirectionalLight(0xfff4db, 1.24);
    keyLight.position.set(4.6, 5.4, 2.2);
    const rimLight = new THREE.DirectionalLight(0x8ec3ff, 0.66);
    rimLight.position.set(-3.8, 3.8, -4.2);
    scene.add(ambient, hemisphere, keyLight, rimLight);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 2.0, 0.09, 56),
      new THREE.MeshStandardMaterial({
        color: 0x2f3542,
        metalness: 0.25,
        roughness: 0.66
      })
    );
    base.position.set(0, -0.04, 0);
    scene.add(base);

    const shadowDisc = new THREE.Mesh(
      new THREE.CircleGeometry(1.54, 42),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.28
      })
    );
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = 0.001;
    scene.add(shadowDisc);

    let model = null;
    let dragging = false;
    let lastPointerX = 0;
    let rotationVelocity = 0;
    let loadRequestId = 0;

    const resize = () => {
      const rect = stageEl.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      renderer.setPixelRatio(Math.min(2, Math.max(1, window.devicePixelRatio || 1)));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const animate = () => {
      const context = this.shopGarageViewerContext;
      if (!context) return;
      if (!sectionEl.isConnected || !sectionEl.classList.contains('active')) {
        this.disposeShopGarageViewer();
        return;
      }
      if (model) {
        if (!dragging) {
          model.rotation.y += 0.0022 + rotationVelocity;
          rotationVelocity *= 0.92;
          if (Math.abs(rotationVelocity) < 0.0002) rotationVelocity = 0;
        }
        model.rotation.z = THREE.MathUtils.lerp(model.rotation.z, 0, 0.12);
      }
      renderer.render(scene, camera);
      context.rafId = window.requestAnimationFrame(animate);
    };

    const onPointerDown = (event) => {
      if (!model) return;
      dragging = true;
      lastPointerX = event.clientX;
      stageEl.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = (event) => {
      if (!dragging || !model) return;
      const delta = event.clientX - lastPointerX;
      lastPointerX = event.clientX;
      model.rotation.y += delta * 0.012;
      model.rotation.z = THREE.MathUtils.clamp(-delta * 0.0022, -0.18, 0.18);
    };

    const onPointerUp = (event) => {
      if (!dragging) return;
      dragging = false;
      stageEl.releasePointerCapture?.(event.pointerId);
    };

    stageEl.addEventListener('pointerdown', onPointerDown);
    stageEl.addEventListener('pointermove', onPointerMove);
    stageEl.addEventListener('pointerup', onPointerUp);
    stageEl.addEventListener('pointercancel', onPointerUp);
    stageEl.addEventListener('pointerleave', onPointerUp);

    const fitModel = (modelRoot) => {
      const box = new THREE.Box3().setFromObject(modelRoot);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z, 0.001);
      const scale = 2.46 / maxDim;
      modelRoot.scale.multiplyScalar(scale);
      box.setFromObject(modelRoot);
      const center = new THREE.Vector3();
      box.getCenter(center);
      modelRoot.position.sub(center);
      box.setFromObject(modelRoot);
      modelRoot.position.y -= box.min.y;
      modelRoot.rotation.y = Math.PI * 0.12;
    };

    const loader = this.shopGarageLoader || createOrionDriveGltfLoader();
    this.shopGarageLoader = loader;

    const clearCurrentModel = () => {
      if (!model) return;
      scene.remove(model);
      this.disposeThreeObjectResources(model);
      model = null;
      if (this.shopGarageViewerContext) {
        this.shopGarageViewerContext.model = null;
      }
    };

    const loadModelForCurrentCar = () => {
      if (!currentCar) return;
      const requestId = ++loadRequestId;
      clearCurrentModel();
      rotationVelocity = 0;
      if (fallbackEl) {
        fallbackEl.src = currentCar.previewSrc || '';
        fallbackEl.hidden = false;
      }
      if (!currentCar.assetSrc) return;
      loader.load(
        currentCar.assetSrc,
        (gltf) => {
          if (this.shopGarageViewerContext !== context || requestId !== loadRequestId) {
            this.disposeThreeObjectResources(gltf?.scene || gltf?.scenes?.[0] || null);
            return;
          }
          model = gltf?.scene || gltf?.scenes?.[0] || null;
          if (!model) return;
          model.traverse((node) => {
            if (!node.isMesh) return;
            node.castShadow = false;
            node.receiveShadow = false;
            if (node.material) {
              node.material.metalness = Math.min(0.62, node.material.metalness ?? 0.18);
              node.material.roughness = Math.max(0.24, node.material.roughness ?? 0.66);
            }
          });
          fitModel(model);
          scene.add(model);
          context.model = model;
          if (fallbackEl) fallbackEl.hidden = true;
        },
        undefined,
        () => {
          if (requestId !== loadRequestId) return;
          if (fallbackEl) fallbackEl.hidden = false;
        }
      );
    };

    const setCurrentCarByOffset = (offset) => {
      if (!cars.length) return;
      const nextIndex = (currentCarIndex + offset + cars.length) % cars.length;
      currentCarIndex = nextIndex;
      currentCar = cars[currentCarIndex];
      renderCarInfo();
      renderActionState();
      loadModelForCurrentCar();
    };

    const rotateHandlers = [];
    settingsContainer.querySelectorAll('[data-shop-garage-rotate]').forEach((button) => {
      const pointerBlocker = (event) => {
        event.stopPropagation();
      };
      button.addEventListener('pointerdown', pointerBlocker);
      const handler = () => {
        const direction = Number(button.dataset.shopGarageRotate) || 0;
        if (!direction) return;
        setCurrentCarByOffset(direction);
      };
      button.addEventListener('click', handler);
      rotateHandlers.push({
        button,
        handler,
        cleanup: () => {
          button.removeEventListener('click', handler);
          button.removeEventListener('pointerdown', pointerBlocker);
        }
      });
    });

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => resize())
      : null;
    if (resizeObserver) {
      resizeObserver.observe(stageEl);
    } else {
      window.addEventListener('resize', resize);
    }

    const context = {
      renderer,
      model: null,
      rafId: 0,
      stageEl,
      pointerHandlers: {
        down: onPointerDown,
        move: onPointerMove,
        up: onPointerUp
      },
      rotateHandlers,
      resizeObserver,
      onWindowResize: resizeObserver ? null : resize
    };
    this.shopGarageViewerContext = context;

    resize();
    loadModelForCurrentCar();
    animate();
  }


  initShop(settingsContainer) {
    const balanceEl = settingsContainer.querySelector('#shopBalanceValue');
    const islandBalanceEl = settingsContainer.querySelector('#shopIslandBalance');
    const shopHeaderEl = settingsContainer.querySelector('.shop-header');
    const balanceIslandEl = settingsContainer.querySelector('.shop-balance-island');
    const shopContentEl = settingsContainer.querySelector('.shop-content');
    const balanceCardEl = settingsContainer.querySelector('.shop-balance-card');
    const filterToggleEl = settingsContainer.querySelector('#shopFilterToggle');
    const filterSummaryEl = settingsContainer.querySelector('#shopFilterSummary');
    const filterPanelEl = settingsContainer.querySelector('#shopFilterPanel');
    const filterPanelScrollEl = settingsContainer.querySelector('.shop-filter-panel-scroll');
    const minPriceEl = settingsContainer.querySelector('#shopPriceMin');
    const maxPriceEl = settingsContainer.querySelector('#shopPriceMax');
    const minPriceValueEl = settingsContainer.querySelector('#shopPriceMinValue');
    const maxPriceValueEl = settingsContainer.querySelector('#shopPriceMaxValue');
    const filterResetEl = settingsContainer.querySelector('#shopFilterReset');
    const filterApplyEl = settingsContainer.querySelector('#shopFilterApply');
    const filterCloseEl = settingsContainer.querySelector('#shopFilterClose');
    const walletOpenActionButtons = [...settingsContainer.querySelectorAll('[data-wallet-open-action]')];
    const gridEl = settingsContainer.querySelector('#shopGrid');
    if (!balanceEl || !gridEl || !shopContentEl) return;

    walletOpenActionButtons.forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      if (button.dataset.walletOpenBound === 'true') return;
      button.dataset.walletOpenBound = 'true';
      button.addEventListener('click', () => {
        const action = String(button.getAttribute('data-wallet-open-action') || '').trim().toLowerCase();
        this.pendingWalletView = 'ledger';
        if (action === 'send' || action === 'receive') {
          this.pendingWalletAction = action;
        } else {
          this.pendingWalletAction = '';
        }
        this.showSettings('wallet');
      });
    });

    const inventory = new Set(this.loadShopInventory());
    const catalog = [
      ...this.getShopCatalog(),
      ...this.getOrionDriveCarCatalog(),
      ...this.getOrionDriveSmokeCatalog()
    ];
    const catalogById = new Map(catalog.map((item) => [item.id, item]));
    const minCatalogPrice = Math.min(...catalog.map(item => item.price));
    const maxCatalogPrice = Math.max(...catalog.map(item => item.price));
    const filterState = {
      category: 'all',
      ownership: 'all',
      availability: 'all',
      sort: 'default',
      minPrice: minCatalogPrice,
      maxPrice: maxCatalogPrice
    };
    const presetCategory = ['all', 'frame', 'aura', 'motion', 'badge', 'car', 'smoke'].includes(this.pendingShopCategory)
      ? this.pendingShopCategory
      : null;
    if (presetCategory) {
      filterState.category = presetCategory;
      this.pendingShopCategory = null;
    }
    const shouldOpenByDefault = false;
    balanceEl.textContent = this.formatCoinBalance(this.getTapBalanceCents());
    if (islandBalanceEl) {
      islandBalanceEl.textContent = this.formatShopIslandBalance(this.getTapBalanceCents());
    }

    if (minPriceEl && maxPriceEl) {
      minPriceEl.min = String(minCatalogPrice);
      minPriceEl.max = String(maxCatalogPrice);
      minPriceEl.value = String(minCatalogPrice);
      maxPriceEl.min = String(minCatalogPrice);
      maxPriceEl.max = String(maxCatalogPrice);
      maxPriceEl.value = String(maxCatalogPrice);
    }

    const carPreviewCache = this.shopCarPreviewCache instanceof Map ? this.shopCarPreviewCache : new Map();
    const carPreviewPending = this.shopCarPreviewPending instanceof Map ? this.shopCarPreviewPending : new Map();
    const shopPreviewLoader = this.shopPreviewLoader || createOrionDriveGltfLoader();
    this.shopCarPreviewCache = carPreviewCache;
    this.shopCarPreviewPending = carPreviewPending;
    this.shopPreviewLoader = shopPreviewLoader;

    const loadShopPreviewModel = (assetSrc) => new Promise((resolve, reject) => {
      shopPreviewLoader.load(assetSrc, (gltf) => {
        resolve(gltf.scene || gltf.scenes?.[0] || null);
      }, undefined, reject);
    });

    const disposeShopPreviewObject = (object3d) => {
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
    };

    const generateShopCarPreviewDataUrl = async (assetSrc) => {
      if (!assetSrc) return '';
      const previewCanvas = document.createElement('canvas');
      const width = 360;
      const height = 220;
      previewCanvas.width = width;
      previewCanvas.height = height;

      let renderer;
      let model;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas: previewCanvas,
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance'
        });
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.setPixelRatio(Math.min(2, Math.max(1, window.devicePixelRatio || 1)));
        renderer.setSize(width, height, false);
        renderer.setClearColor(0x000000, 0);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 60);
        camera.position.set(2.9, 1.95, 3.6);
        camera.lookAt(0, 0.64, 0);

        const ambient = new THREE.AmbientLight(0xffffff, 0.7);
        const hemi = new THREE.HemisphereLight(0xc2ddff, 0x1c2026, 0.62);
        const directional = new THREE.DirectionalLight(0xfff2da, 1.2);
        directional.position.set(3.8, 4.8, 2.9);
        scene.add(ambient, hemi, directional);

        model = await loadShopPreviewModel(assetSrc);
        if (!model) return '';
        model.traverse((node) => {
          if (!node.isMesh) return;
          if (node.material) {
            node.material.metalness = Math.min(0.65, node.material.metalness ?? 0.16);
            node.material.roughness = Math.max(0.26, node.material.roughness ?? 0.64);
          }
          node.castShadow = false;
          node.receiveShadow = false;
        });

        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z, 0.001);
        const scale = 2.28 / maxDim;
        model.scale.multiplyScalar(scale);
        box.setFromObject(model);
        const center = new THREE.Vector3();
        box.getCenter(center);
        model.position.sub(center);
        box.setFromObject(model);
        model.position.y -= box.min.y;
        model.rotation.y = Math.PI * 0.22;
        scene.add(model);

        renderer.render(scene, camera);
        return previewCanvas.toDataURL('image/png');
      } catch {
        return '';
      } finally {
        if (model) disposeShopPreviewObject(model);
        renderer?.dispose?.();
        renderer?.forceContextLoss?.();
      }
    };

    const applyShopCarPreviewToGrid = (effect, dataUrl) => {
      if (!effect || !dataUrl) return;
      const safeEffect = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? CSS.escape(effect)
        : String(effect).replace(/"/g, '\\"');
      gridEl.querySelectorAll(`img[data-shop-car-effect="${safeEffect}"]`).forEach((imgEl) => {
        imgEl.src = dataUrl;
        imgEl.classList.remove('is-fallback');
        imgEl.classList.add('is-enhanced');
      });
    };

    const ensureShopCarPreview = (item) => {
      if (!item || item.type !== 'car' || !item.assetSrc || !item.effect) return;
      const cachedDataUrl = carPreviewCache.get(item.effect);
      if (cachedDataUrl) {
        applyShopCarPreviewToGrid(item.effect, cachedDataUrl);
        return;
      }
      if (carPreviewPending.has(item.effect)) return;

      const renderTask = generateShopCarPreviewDataUrl(item.assetSrc)
        .then((dataUrl) => {
          if (!dataUrl) return;
          carPreviewCache.set(item.effect, dataUrl);
          applyShopCarPreviewToGrid(item.effect, dataUrl);
        })
        .catch(() => {
          // Keep PNG fallback if preview render fails.
        })
        .finally(() => {
          carPreviewPending.delete(item.effect);
        });

      carPreviewPending.set(item.effect, renderTask);
    };

    const createPreview = (item) => {
      if (item.type === 'frame') {
        return `
          <div class="shop-item-preview-avatar" data-avatar-frame="${item.effect}">
            <span>${this.getInitials(this.user?.name || 'Користувач Nymo')}</span>
          </div>
        `;
      }

      if (item.type === 'badge') {
        return `
          <div class="shop-item-preview-badges">
            <span class="shop-item-preview-name">${escapeHtml(this.user?.name || 'Nymo')}</span>
            ${this.getProfileBadgeMarkup(item.effect, 'shop-item-preview-badge-chip')}
          </div>
        `;
      }

      if (item.type === 'car') {
        return `
          <div class="shop-item-preview-vehicle">
            <img
              class="shop-item-preview-vehicle-image is-fallback"
              src="${item.previewSrc}"
              alt="${escapeHtml(item.title)}"
              loading="lazy"
              data-shop-car-effect="${this.escapeAttr(item.effect)}"
            />
          </div>
        `;
      }

      if (item.type === 'smoke') {
        return `
          <div
            class="shop-item-preview-smoke"
            style="--shop-smoke-color: ${this.escapeAttr(item.previewColor || '#aeb7c4')}; --shop-smoke-accent: ${this.escapeAttr(item.previewAccent || '#dee5f0')};"
          >
            <span class="shop-item-preview-smoke-aura" aria-hidden="true"></span>
            <span class="shop-item-preview-smoke-puff puff-1" aria-hidden="true"></span>
            <span class="shop-item-preview-smoke-puff puff-2" aria-hidden="true"></span>
            <span class="shop-item-preview-smoke-puff puff-3" aria-hidden="true"></span>
            <span class="shop-item-preview-smoke-puff puff-4" aria-hidden="true"></span>
            <span class="shop-item-preview-smoke-puff puff-5" aria-hidden="true"></span>
          </div>
        `;
      }

      return `
        <div class="shop-item-preview-card" ${item.type === 'motion' ? `data-profile-motion="${item.effect}"` : `data-profile-aura="${item.effect}"`}>
          <div class="shop-item-preview-card-line primary"></div>
          <div class="shop-item-preview-card-line"></div>
          <div class="shop-item-preview-card-line short"></div>
        </div>
      `;
    };

    const isEquipped = (item) => {
      if (item.type === 'frame') return this.user?.equippedAvatarFrame === item.effect;
      if (item.type === 'aura') return this.user?.equippedProfileAura === item.effect;
      if (item.type === 'motion') return this.user?.equippedProfileMotion === item.effect;
      if (item.type === 'badge') return this.user?.equippedProfileBadge === item.effect;
      if (item.type === 'car') return this.user?.equippedDriveCar === item.effect;
      if (item.type === 'smoke') return this.user?.equippedDriveSmokeColor === item.effect;
      return false;
    };

    const getItemTypeLabel = (type) => {
      if (type === 'frame') return 'Аватар';
      if (type === 'aura') return 'Фон';
      if (type === 'motion') return 'Анімація';
      if (type === 'badge') return 'Значок';
      if (type === 'car') return 'Авто Nymo Drive';
      if (type === 'smoke') return 'Дим Nymo Drive';
      return 'Предмет';
    };

    const getFilterSummary = () => {
      const parts = [];
      if (filterState.category === 'frame') parts.push('Аватар');
      if (filterState.category === 'aura') parts.push('Профіль');
      if (filterState.category === 'motion') parts.push('Анімація');
      if (filterState.category === 'badge') parts.push('Значки');
      if (filterState.category === 'car') parts.push('Авто Nymo Drive');
      if (filterState.category === 'smoke') parts.push('Дим Nymo Drive');
      if (filterState.ownership === 'owned') parts.push('Куплені');
      if (filterState.ownership === 'unowned') parts.push('Не куплені');
      if (filterState.availability === 'equipped') parts.push('Встановлені');
      if (filterState.availability === 'can-buy') parts.push('Можна купити');
      if (filterState.minPrice > minCatalogPrice || filterState.maxPrice < maxCatalogPrice) {
        parts.push(`Ціна ${this.formatCoinBalance(filterState.minPrice, 1)}-${this.formatCoinBalance(filterState.maxPrice, 1)}`);
      }
      if (filterState.sort === 'price-asc') parts.push('Дешеві спочатку');
      if (filterState.sort === 'price-desc') parts.push('Дорогі спочатку');
      return parts.length ? parts.join(' • ') : 'Усі товари';
    };

    const syncFilterControls = () => {
      if (filterPanelEl) {
        filterPanelEl.querySelectorAll('[data-shop-filter-group]').forEach(btn => {
          const group = btn.dataset.shopFilterGroup;
          const value = btn.dataset.shopFilterValue;
          btn.classList.toggle('active', Boolean(group) && filterState[group] === value);
        });
      }
      if (minPriceEl) minPriceEl.value = String(filterState.minPrice);
      if (maxPriceEl) maxPriceEl.value = String(filterState.maxPrice);
      if (minPriceValueEl) minPriceValueEl.textContent = this.formatCoinBalance(filterState.minPrice, 1);
      if (maxPriceValueEl) maxPriceValueEl.textContent = this.formatCoinBalance(filterState.maxPrice, 1);
      if (filterSummaryEl) filterSummaryEl.textContent = getFilterSummary();
    };

    const getFilterPanelEl = () => (
      filterPanelEl
      || settingsContainer.querySelector('#shopFilterPanel')
      || settingsContainer.querySelector('.shop-filter-panel')
    );
    const getFilterToggleEl = () => (
      filterToggleEl
      || settingsContainer.querySelector('#shopFilterToggle')
      || settingsContainer.querySelector('.shop-filter-trigger')
    );

    const setFilterPanelOpen = (isOpen) => {
      const panelEl = getFilterPanelEl();
      const toggleEl = getFilterToggleEl();
      if (!panelEl) return;
      panelEl.classList.toggle('is-open', isOpen);
      if (toggleEl) {
        toggleEl.classList.toggle('is-open', isOpen);
        toggleEl.setAttribute('aria-expanded', String(isOpen));
      }
      const scrollEl = filterPanelScrollEl || panelEl.querySelector('.shop-filter-panel-scroll');
      if (isOpen && scrollEl) {
        scrollEl.scrollTop = 0;
      }
    };

    const closeFilterPanel = (event) => {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      setFilterPanelOpen(false);
    };

    const syncShopFloatingIslands = () => {
      const currentScrollTop = shopContentEl.scrollTop || 0;
      const balanceCardReached = balanceCardEl
        ? currentScrollTop >= Math.max(0, balanceCardEl.offsetTop - 18)
        : false;
      const isMobileViewport = window.innerWidth <= 768;

      if (shopHeaderEl) {
        // Keep header stable on mobile to avoid instant hidden state from dynamic content paddings.
        if (isMobileViewport) {
          shopHeaderEl.classList.remove('is-hidden');
        } else {
          shopHeaderEl.classList.toggle('is-hidden', balanceCardReached);
        }
      }

      if (balanceIslandEl && balanceCardEl) {
        const balanceCardPassed = currentScrollTop > (balanceCardEl.offsetTop + balanceCardEl.offsetHeight - 56);
        balanceIslandEl.classList.toggle('is-visible', balanceCardPassed);
      }
    };

    const renderShop = () => {
      const activeBalance = this.getTapBalanceCents();
      balanceEl.textContent = this.formatCoinBalance(activeBalance);
      if (islandBalanceEl) {
        islandBalanceEl.textContent = this.formatShopIslandBalance(activeBalance);
      }
      syncFilterControls();

      const visibleItems = catalog
        .filter(item => {
          const owned = inventory.has(item.id);
          const equipped = isEquipped(item);
          const canBuy = !owned && activeBalance >= item.price;

          if (filterState.category !== 'all' && item.type !== filterState.category) return false;
          if (filterState.ownership === 'owned' && !owned) return false;
          if (filterState.ownership === 'unowned' && owned) return false;
          if (filterState.availability === 'equipped' && !equipped) return false;
          if (filterState.availability === 'can-buy' && !canBuy) return false;
          if (item.price < filterState.minPrice || item.price > filterState.maxPrice) return false;
          return true;
        })
        .sort((a, b) => {
          if (filterState.sort === 'price-asc') return a.price - b.price;
          if (filterState.sort === 'price-desc') return b.price - a.price;
          return 0;
        });

      if (!visibleItems.length) {
        gridEl.innerHTML = `
          <div class="shop-empty-state">
            <strong>Нічого не знайдено</strong>
            <span>Спробуйте інший фільтр або заробіть більше монет у грі.</span>
          </div>
        `;
        return;
      }

      gridEl.innerHTML = visibleItems.map(item => {
        const owned = inventory.has(item.id);
        const equipped = isEquipped(item);
        const canAfford = activeBalance >= item.price;
        const stateLabel = owned
          ? (equipped ? 'Встановлено' : 'Встановити')
          : `Купити за&nbsp;<span class="currency-value-inline">${this.formatCoinBalance(item.price, 1)}</span>`;
        const stateClass = owned
          ? (equipped ? 'is-equipped' : 'is-owned')
          : (canAfford ? 'can-buy' : 'is-locked');
        const isCarCard = item.type === 'car';

        return `
          <article class="shop-item-card ${owned ? 'owned' : ''} ${equipped ? 'equipped' : ''} ${isCarCard ? 'shop-item-card-car' : ''}">
            <div class="shop-item-top">
              <span class="shop-item-type">${getItemTypeLabel(item.type)}</span>
              <span class="shop-item-price">${this.formatCoinBalance(item.price, 1)}</span>
            </div>
            <div class="shop-item-preview">
              ${createPreview(item)}
            </div>
            <h3 class="shop-item-title">${item.title}</h3>
            <p class="shop-item-description">${item.description}</p>
            ${isCarCard ? `
              <div class="shop-item-actions-stack">
                <button
                  type="button"
                  class="shop-item-action shop-item-inspect-action"
                  data-shop-garage-open="${item.id}"
                >Оглянути</button>
                <button
                  type="button"
                  class="shop-item-action ${stateClass}"
                  data-shop-item="${item.id}"
                  ${!owned && !canAfford ? 'disabled' : ''}
                >${stateLabel}</button>
              </div>
            ` : `
              <button
                type="button"
                class="shop-item-action ${stateClass}"
                data-shop-item="${item.id}"
                ${!owned && !canAfford ? 'disabled' : ''}
              >${stateLabel}</button>
            `}
          </article>
        `;
      }).join('');

      visibleItems.forEach((item) => {
        if (item.type === 'car') ensureShopCarPreview(item);
      });
    };

    renderShop();
    setFilterPanelOpen(shouldOpenByDefault);
    syncShopFloatingIslands();

    if (shopContentEl.dataset.shopScrollBound !== 'true') {
      shopContentEl.dataset.shopScrollBound = 'true';
      shopContentEl.addEventListener('scroll', () => {
        syncShopFloatingIslands();
      }, { passive: true });
    }

    const bindFilterToggleEl = getFilterToggleEl();
    if (bindFilterToggleEl && bindFilterToggleEl.dataset.bound !== 'true') {
      bindFilterToggleEl.dataset.bound = 'true';
      let lastFilterToggleAt = 0;
      const handleFilterToggle = (event) => {
        if (event?.cancelable) event.preventDefault();
        if (typeof event?.stopPropagation === 'function') event.stopPropagation();
        const now = Date.now();
        const minGap = event?.type === 'click' ? 700 : 220;
        if (now - lastFilterToggleAt < minGap) return;
        lastFilterToggleAt = now;
        const shouldOpen = !getFilterPanelEl()?.classList.contains('is-open');
        setFilterPanelOpen(shouldOpen);
      };
      bindFilterToggleEl.addEventListener('click', handleFilterToggle);
      bindFilterToggleEl.addEventListener('pointerup', handleFilterToggle);
      bindFilterToggleEl.addEventListener('touchstart', handleFilterToggle, { passive: false });
      bindFilterToggleEl.addEventListener('touchend', handleFilterToggle, { passive: false });
    }

    if (filterPanelEl && filterPanelEl.dataset.bound !== 'true') {
      filterPanelEl.dataset.bound = 'true';
      const handlePanelInteraction = (event) => {
        if (event?.type === 'touchend' && event?.cancelable) {
          event.preventDefault();
        }
        if (event.target.closest('#shopFilterClose')) {
          closeFilterPanel(event);
          return;
        }
        const filterBtn = event.target.closest('[data-shop-filter-group]');
        if (!filterBtn) return;
        const group = filterBtn.dataset.shopFilterGroup;
        const value = filterBtn.dataset.shopFilterValue;
        if (!group || !value) return;
        filterState[group] = value;
        syncFilterControls();
      };
      filterPanelEl.addEventListener('click', handlePanelInteraction);
      filterPanelEl.addEventListener('touchend', handlePanelInteraction, { passive: false });
    }

    if (minPriceEl && minPriceEl.dataset.bound !== 'true') {
      minPriceEl.dataset.bound = 'true';
      minPriceEl.addEventListener('input', () => {
        const nextValue = Number(minPriceEl.value);
        filterState.minPrice = Math.min(nextValue, filterState.maxPrice);
        if (filterState.minPrice > filterState.maxPrice) {
          filterState.maxPrice = filterState.minPrice;
        }
        syncFilterControls();
      });
    }

    if (maxPriceEl && maxPriceEl.dataset.bound !== 'true') {
      maxPriceEl.dataset.bound = 'true';
      maxPriceEl.addEventListener('input', () => {
        const nextValue = Number(maxPriceEl.value);
        filterState.maxPrice = Math.max(nextValue, filterState.minPrice);
        if (filterState.maxPrice < filterState.minPrice) {
          filterState.minPrice = filterState.maxPrice;
        }
        syncFilterControls();
      });
    }

    if (filterResetEl && filterResetEl.dataset.bound !== 'true') {
      filterResetEl.dataset.bound = 'true';
      filterResetEl.addEventListener('click', () => {
        filterState.category = 'all';
        filterState.ownership = 'all';
        filterState.availability = 'all';
        filterState.sort = 'default';
        filterState.minPrice = minCatalogPrice;
        filterState.maxPrice = maxCatalogPrice;
        syncFilterControls();
        renderShop();
      });
    }

    if (filterApplyEl && filterApplyEl.dataset.bound !== 'true') {
      filterApplyEl.dataset.bound = 'true';
      filterApplyEl.addEventListener('click', () => {
        renderShop();
        setFilterPanelOpen(false);
      });
    }

    if (filterCloseEl && filterCloseEl.dataset.bound !== 'true') {
      filterCloseEl.dataset.bound = 'true';
      filterCloseEl.addEventListener('click', closeFilterPanel);
      filterCloseEl.addEventListener('pointerup', closeFilterPanel);
      filterCloseEl.addEventListener('touchend', closeFilterPanel, { passive: false });
    }

    this.refreshCoinWalletFromBackend({ includeTransactions: false, silent: true })
      .then(() => {
        renderShop();
      })
      .catch(() => {});

    if (gridEl.dataset.bound === 'true') return;
    gridEl.dataset.bound = 'true';

    gridEl.addEventListener('click', async (event) => {
      const garageBtn = event.target.closest('[data-shop-garage-open]');
      if (garageBtn) {
        const carItem = catalogById.get(garageBtn.dataset.shopGarageOpen || '');
        if (!carItem || carItem.type !== 'car') return;
        this.pendingShopGarageCarId = carItem.id;
        this.settingsParentSection = 'messenger-settings';
        this.showSettings('orion-drive-garage');
        return;
      }

      const actionBtn = event.target.closest('[data-shop-item]');
      if (!actionBtn) return;

      const item = catalogById.get(actionBtn.dataset.shopItem || '');
      if (!item) return;

      if (!inventory.has(item.id)) {
        const balance = this.getTapBalanceCents();
        if (balance < item.price) return;
        const sourceGame = (item.type === 'car' || item.type === 'smoke') ? 'Nymo Drive' : '';
        const spent = this.applyCoinTransaction(
          -item.price,
          `Купівля: ${item.title}`,
          {
            category: 'shop',
            type: 'purchase',
            subtitle: sourceGame ? `Гра: ${sourceGame}` : 'Розділ: Магазин',
            game: sourceGame,
            item: item.title,
            source: 'Магазин'
          }
        );
        if (!spent) return;
        inventory.add(item.id);
        this.saveShopInventory([...inventory]);
      }

      if (item.type === 'frame') {
        this.user.equippedAvatarFrame = this.user.equippedAvatarFrame === item.effect ? '' : item.effect;
      } else if (item.type === 'aura') {
        this.user.equippedProfileAura = this.user.equippedProfileAura === item.effect ? '' : item.effect;
      } else if (item.type === 'motion') {
        this.user.equippedProfileMotion = this.user.equippedProfileMotion === item.effect ? '' : item.effect;
      } else if (item.type === 'badge') {
        this.user.equippedProfileBadge = this.user.equippedProfileBadge === item.effect ? '' : item.effect;
      } else if (item.type === 'car') {
        this.user.equippedDriveCar = this.user.equippedDriveCar === item.effect ? '' : item.effect;
      } else if (item.type === 'smoke') {
        this.user.equippedDriveSmokeColor = this.user.equippedDriveSmokeColor === item.effect ? '' : item.effect;
      }

      this.saveUserProfile({
        ...this.user,
        equippedAvatarFrame: this.user.equippedAvatarFrame || '',
        equippedProfileAura: this.user.equippedProfileAura || '',
        equippedProfileMotion: this.user.equippedProfileMotion || '',
        equippedProfileBadge: this.user.equippedProfileBadge || '',
        equippedDriveCar: this.user.equippedDriveCar || '',
        equippedDriveSmokeColor: this.user.equippedDriveSmokeColor || ''
      });
      this.syncProfileCosmetics();
      renderShop();
    });
  }

}
