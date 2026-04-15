import { setupSettingsSwipeBack } from '../../shared/gestures/swipe-handlers.js';
import { escapeHtml } from '../../shared/helpers/ui-helpers.js';
import { buildApiUrl } from '../../shared/api/api-url.js';
import {
  getAuthSession,
  setAuthSession,
  syncLegacyUserProfile
} from '../../shared/auth/auth-session.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const flappyCoinSoundUrl = new URL('../../../Sounds/coin-sound.mp3', import.meta.url).href;
const flappyWingSoundUrl = new URL('../../../Sounds/sfx-wing.mp3', import.meta.url).href;
const flappyDieSoundUrl = new URL('../../../Sounds/sfx-die.mp3', import.meta.url).href;
const orionDriveCarColormapUrl = new URL('../../../Assets/NymoDrive/Сar-kit/Models/GLB format/Textures/colormap.png', import.meta.url).href;

function createOrionDriveGltfLoader() {
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    const safeUrl = String(url || '').trim();
    if (!safeUrl) return safeUrl;
    if (/Textures\/colormap\.png(?:[?#].*)?$/i.test(safeUrl)) {
      return orionDriveCarColormapUrl;
    }
    return safeUrl;
  });
  return new GLTFLoader(manager);
}

const ORION_DRIVE_SHOP_CARS = [
  {
    id: 'car_taxi',
    type: 'car',
    effect: 'taxi',
    title: 'Taxi Sprint',
    description: 'Класичне таксі з кращою видимістю у щільному трафіку.',
    price: 820,
    assetSrc: new URL('../../../Assets/NymoDrive/Сar-kit/Models/GLB format/taxi.glb', import.meta.url).href,
    previewSrc: new URL('../../../Assets/NymoDrive/Сar-kit/Previews/taxi.png', import.meta.url).href
  },
  {
    id: 'car_sedan_sports',
    type: 'car',
    effect: 'sedan-sports',
    title: 'Sedan Sports',
    description: 'Легка спортивна седан-платформа для маневрених заїздів.',
    price: 980,
    assetSrc: new URL('../../../Assets/NymoDrive/Сar-kit/Models/GLB format/sedan-sports.glb', import.meta.url).href,
    previewSrc: new URL('../../../Assets/NymoDrive/Сar-kit/Previews/sedan-sports.png', import.meta.url).href
  },
  {
    id: 'car_suv_luxury',
    type: 'car',
    effect: 'suv-luxury',
    title: 'SUV Luxury',
    description: 'Преміум SUV для стабільної їзди та важкого стилю.',
    price: 1260,
    assetSrc: new URL('../../../Assets/NymoDrive/Сar-kit/Models/GLB format/suv-luxury.glb', import.meta.url).href,
    previewSrc: new URL('../../../Assets/NymoDrive/Сar-kit/Previews/suv-luxury.png', import.meta.url).href
  },
  {
    id: 'car_police',
    type: 'car',
    effect: 'police',
    title: 'Interceptor',
    description: 'Поліцейський перехоплювач із агресивним силуетом.',
    price: 1490,
    assetSrc: new URL('../../../Assets/NymoDrive/Сar-kit/Models/GLB format/police.glb', import.meta.url).href,
    previewSrc: new URL('../../../Assets/NymoDrive/Сar-kit/Previews/police.png', import.meta.url).href
  },
  {
    id: 'car_race_future',
    type: 'car',
    effect: 'race-future',
    title: 'Race Future',
    description: 'Футуристичний болід для Nymo Drive.',
    price: 1740,
    assetSrc: new URL('../../../Assets/NymoDrive/Сar-kit/Models/GLB format/race-future.glb', import.meta.url).href,
    previewSrc: new URL('../../../Assets/NymoDrive/Сar-kit/Previews/race-future.png', import.meta.url).href
  },
  {
    id: 'car_firetruck',
    type: 'car',
    effect: 'firetruck',
    title: 'Firetruck XL',
    description: 'Пожежний важковаговик для нестандартного драйву.',
    price: 1980,
    assetSrc: new URL('../../../Assets/NymoDrive/Сar-kit/Models/GLB format/firetruck.glb', import.meta.url).href,
    previewSrc: new URL('../../../Assets/NymoDrive/Сar-kit/Previews/firetruck.png', import.meta.url).href
  }
];

const ORION_DRIVE_CAR_PHYSICS_DEFAULT = {
  maxForward: 700,
  maxReverse: 260,
  forwardAccel: 360,
  reverseAccel: 360,
  transitionBrake: 760,
  shiftBrakeForce: 980
};

const ORION_DRIVE_CAR_PHYSICS = {
  taxi: {
    maxForward: 675,
    maxReverse: 245,
    forwardAccel: 338,
    reverseAccel: 330,
    transitionBrake: 750,
    shiftBrakeForce: 940
  },
  'sedan-sports': {
    maxForward: 735,
    maxReverse: 270,
    forwardAccel: 392,
    reverseAccel: 370,
    transitionBrake: 780,
    shiftBrakeForce: 1010
  },
  'suv-luxury': {
    maxForward: 655,
    maxReverse: 235,
    forwardAccel: 322,
    reverseAccel: 315,
    transitionBrake: 820,
    shiftBrakeForce: 1060
  },
  police: {
    maxForward: 770,
    maxReverse: 280,
    forwardAccel: 402,
    reverseAccel: 384,
    transitionBrake: 820,
    shiftBrakeForce: 1080
  },
  'race-future': {
    maxForward: 840,
    maxReverse: 292,
    forwardAccel: 438,
    reverseAccel: 396,
    transitionBrake: 860,
    shiftBrakeForce: 1120
  },
  firetruck: {
    maxForward: 595,
    maxReverse: 215,
    forwardAccel: 286,
    reverseAccel: 274,
    transitionBrake: 910,
    shiftBrakeForce: 1220
  }
};

const ORION_DRIVE_SMOKE_DEFAULT = {
  id: 'smoke_default',
  type: 'smoke',
  effect: '',
  title: 'Stock Smoke',
  description: 'Базовий сірий дим Nymo Drive.',
  price: 0,
  wheelColorHex: 0xaeb7c4,
  exhaustColorHex: 0xc5ccd8,
  burnoutColorHex: 0xdee5f0,
  previewColor: '#aeb7c4',
  previewAccent: '#dee5f0'
};

const ORION_DRIVE_SHOP_SMOKE_COLORS = [
  {
    id: 'smoke_ice',
    type: 'smoke',
    effect: 'ice',
    title: 'Ice Mist',
    description: 'Холодний блакитний шлейф для чистого ковзання.',
    price: 520,
    wheelColorHex: 0x82d8ff,
    exhaustColorHex: 0xb4eaff,
    burnoutColorHex: 0xe0f7ff,
    previewColor: '#82d8ff',
    previewAccent: '#e0f7ff'
  },
  {
    id: 'smoke_neon',
    type: 'smoke',
    effect: 'neon',
    title: 'Neon Pulse',
    description: 'Неоновий бірюзовий дим у стилі нічного міста.',
    price: 640,
    wheelColorHex: 0x3df2d0,
    exhaustColorHex: 0x7afbe4,
    burnoutColorHex: 0xc8fff3,
    previewColor: '#3df2d0',
    previewAccent: '#c8fff3'
  },
  {
    id: 'smoke_magenta',
    type: 'smoke',
    effect: 'magenta',
    title: 'Magenta Flow',
    description: 'Яскравий рожево-фіолетовий шлейф для ефектних заїздів.',
    price: 760,
    wheelColorHex: 0xf472dd,
    exhaustColorHex: 0xf8a3ea,
    burnoutColorHex: 0xffddf8,
    previewColor: '#f472dd',
    previewAccent: '#ffddf8'
  },
  {
    id: 'smoke_amber',
    type: 'smoke',
    effect: 'amber',
    title: 'Amber Burn',
    description: 'Теплий бурштиновий дим із виразним glow-ефектом.',
    price: 880,
    wheelColorHex: 0xffb347,
    exhaustColorHex: 0xffca77,
    burnoutColorHex: 0xffe2ad,
    previewColor: '#ffb347',
    previewAccent: '#ffe2ad'
  },
  {
    id: 'smoke_toxic',
    type: 'smoke',
    effect: 'toxic',
    title: 'Toxic Lime',
    description: 'Кислотний лаймовий дим для агресивного стилю їзди.',
    price: 980,
    wheelColorHex: 0x98ff5a,
    exhaustColorHex: 0xbdff87,
    burnoutColorHex: 0xe4ffc8,
    previewColor: '#98ff5a',
    previewAccent: '#e4ffc8'
  }
];

export class ChatAppFeaturesMethods {
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
          { category: 'shop' }
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
    const gridEl = settingsContainer.querySelector('#shopGrid');
    if (!balanceEl || !gridEl || !shopContentEl) return;

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
        const spent = this.applyCoinTransaction(
          -item.price,
          `Купівля: ${item.title}`,
          { category: 'shop' }
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

  initMiniGames(settingsContainer) {
    const miniGamesSection = settingsContainer.querySelector('#mini-games');
    const tapperContentEl = settingsContainer.querySelector('[data-mini-game-panel="tapper"]');
    const miniGamesListEl = settingsContainer.querySelector('.mini-games-list');
    const balanceEl = settingsContainer.querySelector('#coinTapBalance');
    const tapBtn = settingsContainer.querySelector('#coinTapBtn');
    const levelIslandEl = settingsContainer.querySelector('.coin-level-island');
    const rateEl = settingsContainer.querySelector('.coin-tapper-rate');
    const levelValueEl = settingsContainer.querySelector('#coinTapLevelValue');
    const rewardValueEl = settingsContainer.querySelector('#coinTapRewardValue');
    if (!miniGamesSection || !balanceEl || !tapBtn) return;

    const gameSelectButtons = settingsContainer.querySelectorAll('[data-mini-game-select]');
    const gamePanels = settingsContainer.querySelectorAll('[data-mini-game-panel]');

    if (miniGamesListEl && tapperContentEl && window.matchMedia('(max-width: 768px)').matches) {
      const miniGamesContentEl = tapperContentEl.parentElement;
      if (miniGamesContentEl && miniGamesListEl.parentElement === miniGamesContentEl) {
        miniGamesContentEl.insertBefore(miniGamesListEl, tapperContentEl.nextSibling);
      }
    }

    const MINI_GAME_VIEW_KEY = 'orionMiniGameView';
    const normalizeMiniGameView = (value) => {
      if (value === 'grid2048') return 'grid2048';
      if (value === 'flappy') return 'flappy';
      if (value === 'drift') return 'drift';
      return 'tapper';
    };
    const pendingMiniGameView = normalizeMiniGameView(this.pendingMiniGameView || 'tapper');
    let currentMiniGameView = pendingMiniGameView;
    if (!this.pendingMiniGameView) {
      try {
        currentMiniGameView = normalizeMiniGameView(window.localStorage.getItem(MINI_GAME_VIEW_KEY));
      } catch {
        currentMiniGameView = 'tapper';
      }
    }
    this.pendingMiniGameView = null;

    const gridPanelEl = settingsContainer.querySelector('[data-mini-game-panel="grid2048"]');
    const gridBoardEl = settingsContainer.querySelector('#grid2048Board');
    const gridCanvasEl = settingsContainer.querySelector('#grid2048Canvas');
    const gridScoreEl = settingsContainer.querySelector('#grid2048Score');
    const gridBestEl = settingsContainer.querySelector('#grid2048Best');
    const gridEarnedEl = settingsContainer.querySelector('#grid2048Earned');
    const gridReplayBtn = settingsContainer.querySelector('#grid2048Replay') || settingsContainer.querySelector('#grid2048Restart');
    const gridHintEl = gridPanelEl?.querySelector('.mini-game-hint');
    const flappyPanelEl = settingsContainer.querySelector('[data-mini-game-panel="flappy"]');
    const flappyCanvasWrapEl = settingsContainer.querySelector('#flappyOrionCanvasWrap');
    const flappyCanvasEl = settingsContainer.querySelector('#flappyOrionCanvas');
    const flappyBestEl = settingsContainer.querySelector('#flappyOrionBest');
    const flappyStartBtn = settingsContainer.querySelector('#flappyOrionStart');
    const driftPanelEl = settingsContainer.querySelector('[data-mini-game-panel="drift"]');
    const driftCanvasWrapEl = settingsContainer.querySelector('#orionDriftCanvasWrap');
    const driftCanvasEl = settingsContainer.querySelector('#orionDriftCanvas');
    const driftStatusEl = settingsContainer.querySelector('#orionDriftStatus');
    const driftScoreEl = settingsContainer.querySelector('#orionDriftScore');
    const driftMultiplierEl = settingsContainer.querySelector('#orionDriftMultiplier');
    const driftSpeedEl = settingsContainer.querySelector('#orionDriftSpeed');
    const driftOrbsEl = settingsContainer.querySelector('#orionDriftOrbs');
    const driftBestEl = settingsContainer.querySelector('#orionDriftBest');
    const driftStartBtn = settingsContainer.querySelector('#orionDriftStart');
    const driftSteerLeftBtn = settingsContainer.querySelector('#orionDriftSteerLeft');
    const driftSteerRightBtn = settingsContainer.querySelector('#orionDriftSteerRight');
    const driftGasBtn = settingsContainer.querySelector('#orionDriftGas');
    const driftBrakeBtn = settingsContainer.querySelector('#orionDriftBrake');
    if (driftCanvasEl) {
      if (!driftCanvasEl.dataset.defaultCarSrc) {
        driftCanvasEl.dataset.defaultCarSrc = driftCanvasEl.dataset.carSrc || '';
      }
      const equippedCarSrc = this.getOrionDriveCarAssetSrc(this.user?.equippedDriveCar || '');
      driftCanvasEl.dataset.carSrc = equippedCarSrc || driftCanvasEl.dataset.defaultCarSrc;
    }
    const GRID_2048_SIZE = 4;
    const GRID_2048_BEST_KEY = 'orionGrid2048Best';
    const FLAPPY_BEST_KEY = 'orionFlappyBest';
    const DRIFT_BEST_KEY = 'orionDriftBest';
    const FLAPPY_GRAVITY = 1120;
    const FLAPPY_FLAP_VELOCITY = -390;
    const FLAPPY_PIPE_SPEED = 240;
    const FLAPPY_PIPE_SPAWN_INTERVAL = 1.45;
    const FLAPPY_PIPE_WIDTH = 86;
    const FLAPPY_PIPE_GAP_BASE = 198;
    const FLAPPY_MAX_DT = 1 / 30;
    const DRIFT_SPEED_FACTOR = 0.32;
    const DRIFT_SHIFT_DELAY_SECONDS = 0.5;
    const isMobileMiniGameViewport = () => window.matchMedia('(max-width: 768px)').matches;
    const getGridControlHintText = () => (
      isMobileMiniGameViewport()
        ? 'Керування: свайпи по полю.'
        : 'Керування: стрілки або W/A/S/D.'
    );
    const getDriftIdleStatusText = () => (
      isMobileMiniGameViewport()
        ? 'Натисни «Старт». Керування: кнопки ← →, Газ, Гальмо.'
        : 'Натисни «Старт». Керування: стрілки або W/A/S/D.'
    );
    const getDriftRunningStatusText = () => (
      isMobileMiniGameViewport()
        ? 'Відкритий режим: катайся вільно. Керування: кнопки ← →, Газ, Гальмо.'
        : 'Відкритий режим: катайся вільно. Керування: стрілки або W/A/S/D.'
    );
    const applyMiniGameContainerBackground = (view = currentMiniGameView) => {
      if (!settingsContainer) return;
      const isMobileViewport = isMobileMiniGameViewport();
      if (isMobileViewport) {
        settingsContainer.style.setProperty('background', 'transparent', 'important');
        settingsContainer.style.setProperty('background-color', 'transparent', 'important');
        return;
      }

      settingsContainer.style.setProperty('background', 'var(--bg-color)', 'important');
      settingsContainer.style.setProperty('background-color', 'var(--bg-color)', 'important');
    };
    const lockLandscapeForDrift = () => {
      if (!isMobileMiniGameViewport()) return;
      const orientationApi = window.screen?.orientation;
      if (!orientationApi || typeof orientationApi.lock !== 'function') return;
      orientationApi.lock('landscape').catch(() => {});
    };
    const lockPortraitForApp = () => {
      if (!isMobileMiniGameViewport()) return;
      const orientationApi = window.screen?.orientation;
      if (!orientationApi || typeof orientationApi.lock !== 'function') return;
      orientationApi.lock('portrait').catch(() => {});
    };
    const unlockOrientationIfAvailable = () => {
      const orientationApi = window.screen?.orientation;
      if (!orientationApi || typeof orientationApi.unlock !== 'function') return;
      try {
        orientationApi.unlock();
      } catch {
        // Ignore unsupported unlock errors.
      }
    };
    const grid2048State = {
      board: new Array(GRID_2048_SIZE * GRID_2048_SIZE).fill(0),
      score: 0,
      best: 0,
      isGameOver: false,
      earnedCents: 0,
      rewardLogged: false
    };
    const flappyState = {
      isRunning: false,
      isDeathFalling: false,
      score: 0,
      coins: 0,
      best: 0,
      earnedCents: 0,
      rewardLogged: false,
      gameOver: false,
      worldWidth: 960,
      worldHeight: 540,
      birdY: 270,
      birdVelocity: 0,
      birdRotation: 0,
      pipes: [],
      pipeSpawnTimer: 0,
      groundOffset: 0,
      cloudOffset: 0,
      lastTimestamp: 0,
      rafId: null,
      spriteReady: false,
      coinReady: false,
      assetsLoading: false,
      spriteAtlas: null,
      spriteImage: null,
      coinImage: null,
      flapFrame: 0,
      flapFrameIndex: 0
    };
    const driftState = {
      isRunning: false,
      score: 0,
      scoreRaw: 0,
      multiplier: 1,
      orbs: 0,
      best: 0,
      earnedCents: 0,
      rewardLogged: false,
      worldWidth: 900,
      worldHeight: 540,
      cameraX: 0,
      cameraY: 0,
      prevCameraX: 0,
      prevCameraY: 0,
      cameraShakeX: 0,
      cameraShakeY: 0,
      backgroundScroll: 0,
      backgroundFlowSpeed: 0,
      runTime: 0,
      speed: 0,
      carX: 0,
      carY: 0,
      carAngle: 0,
      bodyAngle: 0,
      steerAngle: 0,
      yawRate: 0,
      driftSlipVelocity: 0,
      driftCharge: 0,
      driftTime: 0,
      coins: [],
      obstacles: [],
      particles: [],
      tireTracks: [],
      trackSpawnCarry: 0,
      trackIdSeed: 0,
      trackRearOffset: 18,
      trackWheelOffset: 8,
      trackMarkWidth: 2.2,
      trackMarkLength: 6.8,
      exhaustPuffs: [],
      exhaustSpawnTimer: 0,
      exhaustIdSeed: 0,
      wheelSmokePuffs: [],
      wheelSmokeSpawnCarry: 0,
      wheelSmokeIdSeed: 0,
      exhaustRearOffset: 16,
      exhaustSideOffset: 0,
      exhaustHeight: 0.16,
      coinSpawnTimer: 0,
      obstacleSpawnTimer: 0,
      hitCooldown: 0,
      lastTimestamp: 0,
      rafId: null,
      assetsLoading: false,
      carReady: false,
      coneReady: false,
      boxReady: false,
      orbReady: false,
      steerDirection: 0,
      throttleDirection: 0,
      touchSteerDirection: 0,
      touchThrottleDirection: 0,
      keyLeft: false,
      keyRight: false,
      keyGas: false,
      keyBrake: false,
      keyHandbrake: false,
      lastSteerInput: 0,
      cameraSteer: 0,
      cameraDriveDirection: 1,
      cameraHeading: 0,
      cameraDriftYaw: 0,
      gearDirection: 1,
      shiftTargetDirection: 0,
      shiftDelayTimer: 0,
      swipeStartX: 0,
      swipeStartY: 0
    };
    const drift3d = {
      scene: null,
      camera: null,
      renderer: null,
      ground: null,
      grid: null,
      carRoot: null,
      carVisual: null,
      carFallback: null,
      conePrototype: null,
      boxPrototype: null,
      coinTexture: null,
      coinMaterial: null,
      coinObjects: new Map(),
      trackGeometry: null,
      trackMaterial: null,
      trackObjects: new Map(),
      exhaustTexture: null,
      exhaustMaterial: null,
      exhaustObjects: new Map(),
      wheelSmokeTexture: null,
      wheelSmokeMaterial: null,
      wheelSmokeObjects: new Map(),
      obstacleObjects: new Map(),
      headlights: [],
      brakeLights: [],
      reverseLights: [],
      frontWheels: [],
      steerVisual: 0,
      cameraPosition: new THREE.Vector3(0, 10, 14),
      cameraLookAt: new THREE.Vector3(0, 0, 0),
      loader: createOrionDriveGltfLoader(),
      textureLoader: new THREE.TextureLoader(),
      themeKey: '',
      worldScale: 0.03,
      failed: false
    };
    const disposeDriftThreeContext = (context) => {
      if (!context) return;
      try {
        if (context.scene) {
          context.scene.traverse((node) => {
            if (node.isMesh || node.isSprite) {
              if (node.geometry) node.geometry.dispose();
              const materials = Array.isArray(node.material) ? node.material : [node.material];
              materials.forEach((material) => {
                if (!material || material === context.coinMaterial) return;
                Object.values(material).forEach((value) => {
                  if (value && value.isTexture) value.dispose();
                });
                material.dispose?.();
              });
            }
          });
        }
        context.coinMaterial?.dispose?.();
        context.coinTexture?.dispose?.();
        context.trackMaterial?.dispose?.();
        context.trackGeometry?.dispose?.();
        context.exhaustMaterial?.dispose?.();
        context.exhaustTexture?.dispose?.();
        context.wheelSmokeMaterial?.dispose?.();
        context.wheelSmokeTexture?.dispose?.();
        context.renderer?.dispose?.();
      } catch {
        // Ignore renderer dispose issues.
      }
    };

    if (this.flappyOrionAnimationFrame) {
      window.cancelAnimationFrame(this.flappyOrionAnimationFrame);
      this.flappyOrionAnimationFrame = null;
    }
    if (this.orionDriftAnimationFrame) {
      window.cancelAnimationFrame(this.orionDriftAnimationFrame);
      this.orionDriftAnimationFrame = null;
    }
    if (this.orionDriftThreeContext) {
      disposeDriftThreeContext(this.orionDriftThreeContext);
      this.orionDriftThreeContext = null;
    }
    this.orionDriftThreeContext = drift3d;

    try {
      const savedBest = Number.parseInt(window.localStorage.getItem(GRID_2048_BEST_KEY) || '0', 10);
      grid2048State.best = Number.isFinite(savedBest) && savedBest > 0 ? savedBest : 0;
    } catch {
      grid2048State.best = 0;
    }

    try {
      const savedBest = Number.parseInt(window.localStorage.getItem(FLAPPY_BEST_KEY) || '0', 10);
      flappyState.best = Number.isFinite(savedBest) && savedBest > 0 ? savedBest : 0;
    } catch {
      flappyState.best = 0;
    }

    try {
      const savedBest = Number.parseInt(window.localStorage.getItem(DRIFT_BEST_KEY) || '0', 10);
      driftState.best = Number.isFinite(savedBest) && savedBest > 0 ? savedBest : 0;
    } catch {
      driftState.best = 0;
    }

    const commitGridReward = () => {
      if (grid2048State.rewardLogged || grid2048State.earnedCents <= 0) return;
      this.addCoinTransaction({
        amountCents: grid2048State.earnedCents,
        title: 'Гра: Nymo 2048',
        category: 'games'
      });
      grid2048State.rewardLogged = true;
    };

    const commitFlappyReward = () => {
      if (flappyState.rewardLogged || flappyState.earnedCents <= 0) return;
      this.addCoinTransaction({
        amountCents: flappyState.earnedCents,
        title: 'Гра: Flappy Nymo',
        category: 'games'
      });
      flappyState.rewardLogged = true;
    };

    const saveGridBest = () => {
      try {
        window.localStorage.setItem(GRID_2048_BEST_KEY, String(grid2048State.best));
      } catch {
        // Ignore storage failures.
      }
    };

    const saveFlappyBest = () => {
      try {
        window.localStorage.setItem(FLAPPY_BEST_KEY, String(flappyState.best));
      } catch {
        // Ignore storage failures.
      }
    };

    const updateFlappyHud = () => {
      if (flappyBestEl) flappyBestEl.textContent = String(flappyState.best);
    };

    const drawFlappyHudText = (ctx, text, x, y, options = {}) => {
      if (!ctx || !text) return;
      const fontSize = Number.isFinite(options.fontSize) ? options.fontSize : 26;
      ctx.save();
      ctx.textAlign = options.align || 'left';
      ctx.textBaseline = options.baseline || 'top';
      ctx.font = `400 ${fontSize}px "Press Start 2P", "Pixelify Sans", monospace`;
      ctx.fillStyle = options.stroke || 'rgba(7, 10, 16, 0.92)';
      const shadowStep = Math.max(1, Math.round(fontSize * 0.06));
      ctx.fillText(text, x - shadowStep, y);
      ctx.fillText(text, x + shadowStep, y);
      ctx.fillText(text, x, y - shadowStep);
      ctx.fillText(text, x, y + shadowStep);
      ctx.fillStyle = options.fill || '#f5f8ff';
      ctx.fillText(text, x, y);
      ctx.restore();
    };

    const resolveFlappyWorldSize = () => {
      if (!flappyCanvasEl) return;
      const rect = flappyCanvasEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      // Keep pixel-art rendering on whole-number DPR to avoid subpixel seams.
      const devicePixelRatio = Math.min(2, Math.max(1, Math.round(window.devicePixelRatio || 1)));
      flappyState.worldWidth = Math.max(280, Math.round(rect.width));
      flappyState.worldHeight = Math.max(240, Math.round(rect.height));
      const targetWidth = Math.max(1, Math.round(flappyState.worldWidth * devicePixelRatio));
      const targetHeight = Math.max(1, Math.round(flappyState.worldHeight * devicePixelRatio));
      if (flappyCanvasEl.width !== targetWidth) flappyCanvasEl.width = targetWidth;
      if (flappyCanvasEl.height !== targetHeight) flappyCanvasEl.height = targetHeight;
    };

    const getFlappyGroundHeight = () => Math.round(Math.max(62, flappyState.worldHeight * 0.125));
    const getFlappyBirdX = () => Math.round(flappyState.worldWidth * 0.25);
    const getFlappyBirdRadius = () => Math.max(14, Math.round(flappyState.worldHeight * 0.025));
    const getFlappyPipeGap = () => {
      const playableHeight = Math.max(220, flappyState.worldHeight - getFlappyGroundHeight());
      return Math.round(Math.min(FLAPPY_PIPE_GAP_BASE, Math.max(132, playableHeight * 0.42)));
    };

    const addFlappyReward = (amountCents) => {
      const safeAmount = Number.isFinite(amountCents) ? Math.max(0, Math.floor(amountCents)) : 0;
      if (!safeAmount) return;
      flappyState.earnedCents += safeAmount;
      this.setTapBalanceCents(this.getTapBalanceCents() + safeAmount, {
        transactionMeta: {
          title: 'Гра: Flappy Nymo',
          category: 'games',
          amountCents: safeAmount
        }
      });
      balanceEl.textContent = this.formatCoinBalance(this.getTapBalanceCents());
    };

    const playFlappyCoinSound = () => {
      if (this.settings?.soundNotifications === false) return;
      try {
        if (!this.flappyCoinAudio) {
          this.flappyCoinAudio = new Audio(flappyCoinSoundUrl);
          this.flappyCoinAudio.preload = 'auto';
          this.flappyCoinAudio.volume = 0.45;
        }
        const coinAudio = this.flappyCoinAudio.cloneNode(true);
        coinAudio.currentTime = 0;
        coinAudio.volume = this.flappyCoinAudio.volume;
        const playResult = coinAudio.play();
        if (playResult && typeof playResult.catch === 'function') {
          playResult.catch(() => {});
        }
      } catch {
        // Ignore audio playback issues.
      }
    };

    const playFlappyWingSound = () => {
      if (this.settings?.soundNotifications === false) return;
      try {
        if (!this.flappyWingAudio) {
          this.flappyWingAudio = new Audio(flappyWingSoundUrl);
          this.flappyWingAudio.preload = 'auto';
          this.flappyWingAudio.volume = 0.38;
        }
        const wingAudio = this.flappyWingAudio.cloneNode(true);
        wingAudio.currentTime = 0;
        wingAudio.volume = this.flappyWingAudio.volume;
        const playResult = wingAudio.play();
        if (playResult && typeof playResult.catch === 'function') {
          playResult.catch(() => {});
        }
      } catch {
        // Ignore audio playback issues.
      }
    };

    const playFlappyDieSound = () => {
      if (this.settings?.soundNotifications === false) return;
      try {
        if (!this.flappyDieAudio) {
          this.flappyDieAudio = new Audio(flappyDieSoundUrl);
          this.flappyDieAudio.preload = 'auto';
          this.flappyDieAudio.volume = 0.42;
        }
        const dieAudio = this.flappyDieAudio.cloneNode(true);
        dieAudio.currentTime = 0;
        dieAudio.volume = this.flappyDieAudio.volume;
        const playResult = dieAudio.play();
        if (playResult && typeof playResult.catch === 'function') {
          playResult.catch(() => {});
        }
      } catch {
        // Ignore audio playback issues.
      }
    };

    const prepareFlappySpriteAtlas = (sourceImage) => {
      return sourceImage;
    };

    const renderFlappyFrame = () => {
      if (!flappyCanvasEl) return;
      const ctx = flappyCanvasEl.getContext('2d');
      if (!ctx) return;

      const worldWidth = flappyState.worldWidth || 960;
      const worldHeight = flappyState.worldHeight || 540;
      const dpr = worldWidth > 0 ? flappyCanvasEl.width / worldWidth : 1;
      const groundHeight = getFlappyGroundHeight();
      const birdX = getFlappyBirdX();
      const birdRadius = getFlappyBirdRadius();

      const sprite = flappyState.spriteAtlas;
      const hasSprite = Boolean(flappyState.spriteReady && sprite);
      const spriteMap = {
        bird: [
          { x: 42, y: 42, w: 92, h: 76 },
          { x: 164, y: 37, w: 93, h: 92 },
          { x: 282, y: 38, w: 92, h: 86 },
          { x: 404, y: 42, w: 93, h: 82 },
          { x: 522, y: 42, w: 92, h: 81 },
          { x: 650, y: 62, w: 93, h: 75 },
          { x: 404, y: 148, w: 93, h: 87 },
          { x: 164, y: 147, w: 93, h: 88 }
        ],
        ground: { x: 31, y: 601, w: 445, h: 77 },
        clouds: [
          { x: 35, y: 473, w: 137, h: 93 },
          { x: 207, y: 473, w: 173, h: 93 },
          { x: 420, y: 479, w: 200, h: 82 },
          { x: 660, y: 484, w: 152, h: 77 },
          { x: 836, y: 489, w: 173, h: 66 },
          { x: 1029, y: 505, w: 77, h: 50 },
          { x: 1124, y: 484, w: 114, h: 77 }
        ]
      };

      const drawSprite = (part, dx, dy, dw, dh) => {
        if (!hasSprite || !part) return false;
        ctx.drawImage(sprite, part.x, part.y, part.w, part.h, dx, dy, dw, dh);
        return true;
      };

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, worldWidth, worldHeight);

      const skyGradient = ctx.createLinearGradient(0, 0, 0, worldHeight - groundHeight);
      skyGradient.addColorStop(0, 'rgba(35, 46, 72, 0.98)');
      skyGradient.addColorStop(1, 'rgba(12, 16, 26, 0.98)');
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, worldWidth, worldHeight - groundHeight);

      const cloudSpacing = Math.max(210, Math.round(worldWidth * 0.24));
      const cloudY = Math.round(worldHeight * 0.12);
      const cloudOffset = Math.max(0, flappyState.cloudOffset);
      const firstCloudSegment = Math.floor(cloudOffset / cloudSpacing) - 2;
      const visibleCloudSegments = Math.ceil(worldWidth / cloudSpacing) + 5;
      for (let i = 0; i < visibleCloudSegments; i += 1) {
        const segmentIndex = firstCloudSegment + i;
        const cloud = spriteMap.clouds[((segmentIndex % spriteMap.clouds.length) + spriteMap.clouds.length) % spriteMap.clouds.length];
        const x = Math.round(segmentIndex * cloudSpacing - cloudOffset);
        const y = cloudY + ((segmentIndex % 2) ? 10 : -8);
        const width = Math.round(cloud.w * 0.52);
        const height = Math.round(cloud.h * 0.52);
        if (!drawSprite(cloud, x, y, width, height)) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
          ctx.beginPath();
          ctx.ellipse(x + width * 0.55, y + height * 0.62, width * 0.5, height * 0.34, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const groundPart = hasSprite
        ? { ...spriteMap.ground, x: spriteMap.ground.x + 2, w: Math.min(64, spriteMap.ground.w - 4) }
        : spriteMap.ground;
      const groundTileWidth = Math.max(1, Math.round(groundPart.w));
      const groundY = Math.round(worldHeight - groundHeight);
      const groundShift = ((Math.floor(flappyState.groundOffset) % groundTileWidth) + groundTileWidth) % groundTileWidth;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, groundY, worldWidth, groundHeight);
      ctx.clip();
      for (let x = -groundTileWidth; x < worldWidth + groundTileWidth; x += groundTileWidth) {
        const drawX = Math.round(x - groundShift);
        if (!drawSprite(groundPart, drawX, groundY, groundTileWidth, groundHeight)) {
          ctx.fillStyle = '#5d3f27';
          ctx.fillRect(drawX, groundY, groundTileWidth, groundHeight);
          ctx.fillStyle = '#6ea848';
          ctx.fillRect(drawX, groundY, groundTileWidth, 14);
        }
      }
      ctx.restore();

      flappyState.pipes.forEach((pipe) => {
        const gapHeight = pipe.gapHeight || getFlappyPipeGap();
        const topEnd = Math.round(pipe.gapCenter - gapHeight / 2);
        const bottomStart = Math.round(pipe.gapCenter + gapHeight / 2);
        const pipeX = Math.round(pipe.x);
        const capHeight = 18;
        const topBodyHeight = Math.max(0, topEnd);
        const bottomBodyHeight = Math.max(0, worldHeight - groundHeight - bottomStart);

        if (topBodyHeight > 0) {
          const topGrad = ctx.createLinearGradient(pipeX, 0, pipeX + FLAPPY_PIPE_WIDTH, 0);
          topGrad.addColorStop(0, '#6ea64a');
          topGrad.addColorStop(0.45, '#89c35c');
          topGrad.addColorStop(1, '#4f7f35');
          ctx.fillStyle = topGrad;
          ctx.fillRect(pipeX, 0, FLAPPY_PIPE_WIDTH, topBodyHeight);
          ctx.fillStyle = 'rgba(42, 64, 30, 0.55)';
          ctx.fillRect(pipeX + 10, 0, 6, topBodyHeight);
          ctx.fillRect(pipeX + FLAPPY_PIPE_WIDTH - 16, 0, 6, topBodyHeight);
          ctx.fillStyle = '#3d5d2a';
          ctx.fillRect(pipeX - 6, topEnd - capHeight, FLAPPY_PIPE_WIDTH + 12, capHeight);
          ctx.fillStyle = '#9ad36e';
          ctx.fillRect(pipeX - 2, topEnd - capHeight + 4, FLAPPY_PIPE_WIDTH + 4, 5);
        }

        if (bottomBodyHeight > 0) {
          const bottomGrad = ctx.createLinearGradient(pipeX, 0, pipeX + FLAPPY_PIPE_WIDTH, 0);
          bottomGrad.addColorStop(0, '#6ea64a');
          bottomGrad.addColorStop(0.45, '#89c35c');
          bottomGrad.addColorStop(1, '#4f7f35');
          ctx.fillStyle = bottomGrad;
          ctx.fillRect(pipeX, bottomStart, FLAPPY_PIPE_WIDTH, bottomBodyHeight);
          ctx.fillStyle = 'rgba(42, 64, 30, 0.55)';
          ctx.fillRect(pipeX + 10, bottomStart, 6, bottomBodyHeight);
          ctx.fillRect(pipeX + FLAPPY_PIPE_WIDTH - 16, bottomStart, 6, bottomBodyHeight);
          ctx.fillStyle = '#3d5d2a';
          ctx.fillRect(pipeX - 6, bottomStart, FLAPPY_PIPE_WIDTH + 12, capHeight);
          ctx.fillStyle = '#9ad36e';
          ctx.fillRect(pipeX - 2, bottomStart + 4, FLAPPY_PIPE_WIDTH + 4, 5);
        }

        if (pipe.coin && !pipe.coin.collected) {
          const coinSize = Math.max(26, Math.round(worldHeight * 0.064));
          const coinX = pipe.coin.x - coinSize / 2;
          const coinY = pipe.coin.y - coinSize / 2;
          if (flappyState.coinReady && flappyState.coinImage) {
            ctx.drawImage(flappyState.coinImage, coinX, coinY, coinSize, coinSize);
          } else {
            ctx.fillStyle = '#f3c94c';
            ctx.beginPath();
            ctx.arc(pipe.coin.x, pipe.coin.y, coinSize * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });

      ctx.save();
      ctx.translate(birdX, flappyState.birdY);
      ctx.rotate(flappyState.birdRotation);
      const birdSize = birdRadius * 3.6;
      const frameIndex = Math.floor(flappyState.flapFrameIndex) % spriteMap.bird.length;
      const currentFrame = spriteMap.bird[frameIndex] || spriteMap.bird[0];
      if (!drawSprite(currentFrame, -birdSize / 2, -birdSize / 2, birdSize, birdSize)) {
        ctx.fillStyle = '#f3c94c';
        ctx.beginPath();
        ctx.arc(0, 0, birdRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      const hudPaddingX = Math.max(16, Math.round(worldWidth * 0.035));
      const hudPaddingY = Math.max(18, Math.round(worldHeight * 0.045));
      const hudFontSize = Math.max(9, Math.round(worldHeight * 0.022));
      const gameOverTitleSize = Math.max(28, Math.round(worldHeight * 0.1));
      const gameOverStatSize = Math.max(10, Math.round(worldHeight * 0.026));

      if (flappyState.isRunning) {
        drawFlappyHudText(ctx, `SCORE ${flappyState.score}`, hudPaddingX, hudPaddingY, {
          fontSize: hudFontSize,
          align: 'left',
          baseline: 'middle'
        });
        drawFlappyHudText(ctx, `COINS ${flappyState.coins}`, worldWidth - hudPaddingX, hudPaddingY, {
          fontSize: hudFontSize,
          align: 'right',
          baseline: 'middle'
        });
      }

      if (flappyState.gameOver) {
        ctx.save();
        ctx.fillStyle = 'rgba(4, 6, 10, 0.42)';
        ctx.fillRect(0, 0, worldWidth, worldHeight);
        ctx.restore();

        const centerX = worldWidth * 0.5;
        const overlayTop = Math.round(worldHeight * 0.36);
        const desiredStatsTop = overlayTop + Math.max(58, Math.round(gameOverTitleSize * 2.25));
        const statLineGap = Math.max(20, Math.round(gameOverStatSize * 2.05));
        const maxStatsTop = Math.max(
          overlayTop + Math.round(gameOverTitleSize * 1.9),
          worldHeight - groundHeight - statLineGap - Math.round(gameOverStatSize * 1.4) - 24
        );
        const statsTop = Math.min(desiredStatsTop, maxStatsTop);

        drawFlappyHudText(ctx, 'GAME OVER', centerX, overlayTop, {
          fontSize: gameOverTitleSize,
          align: 'center'
        });
        drawFlappyHudText(ctx, `SCORE ${flappyState.score}`, centerX, statsTop, {
          fontSize: gameOverStatSize,
          align: 'center'
        });
        drawFlappyHudText(ctx, `COINS ${flappyState.coins}`, centerX, statsTop + statLineGap, {
          fontSize: gameOverStatSize,
          align: 'center'
        });
      }
    };

    const ensureFlappyAssets = () => {
      if (!flappyCanvasEl) return;

      if (this.flappyOrionPreparedAtlas) {
        flappyState.spriteAtlas = this.flappyOrionPreparedAtlas;
        flappyState.spriteReady = true;
      }
      if (this.flappyOrionCoinImage?.complete) {
        flappyState.coinImage = this.flappyOrionCoinImage;
        flappyState.coinReady = true;
      }

      if (flappyState.assetsLoading || (flappyState.spriteReady && flappyState.coinReady)) return;
      flappyState.assetsLoading = true;

      const spriteSrc = flappyCanvasEl.dataset.spriteSrc || '';
      const coinSrc = flappyCanvasEl.dataset.coinSrc || '';

      const finishLoad = () => {
        flappyState.assetsLoading = false;
        renderFlappyFrame();
      };

      let pendingAssets = 0;
      const onAssetDone = () => {
        pendingAssets -= 1;
        if (pendingAssets <= 0) finishLoad();
      };

      if (!flappyState.spriteReady && spriteSrc) {
        pendingAssets += 1;
        const spriteImage = new Image();
        spriteImage.decoding = 'async';
        spriteImage.onload = () => {
          this.flappyOrionPreparedAtlas = prepareFlappySpriteAtlas(spriteImage);
          flappyState.spriteAtlas = this.flappyOrionPreparedAtlas;
          flappyState.spriteImage = spriteImage;
          flappyState.spriteReady = true;
          onAssetDone();
        };
        spriteImage.onerror = () => onAssetDone();
        spriteImage.src = spriteSrc;
      }

      if (!flappyState.coinReady && coinSrc) {
        pendingAssets += 1;
        const coinImage = new Image();
        coinImage.decoding = 'async';
        coinImage.onload = () => {
          this.flappyOrionCoinImage = coinImage;
          flappyState.coinImage = coinImage;
          flappyState.coinReady = true;
          onAssetDone();
        };
        coinImage.onerror = () => onAssetDone();
        coinImage.src = coinSrc;
      }

      if (!pendingAssets) finishLoad();
    };

    const spawnFlappyPipe = () => {
      const groundHeight = getFlappyGroundHeight();
      const gapHeight = getFlappyPipeGap();
      const playableHeight = flappyState.worldHeight - groundHeight;
      const minGapCenter = 58 + gapHeight / 2;
      const maxGapCenter = playableHeight - 58 - gapHeight / 2;
      const gapCenter = maxGapCenter > minGapCenter
        ? (minGapCenter + Math.random() * (maxGapCenter - minGapCenter))
        : (playableHeight * 0.5);
      const pipe = {
        x: flappyState.worldWidth + FLAPPY_PIPE_WIDTH + 20,
        width: FLAPPY_PIPE_WIDTH,
        gapCenter,
        gapHeight,
        passed: false,
        coin: null
      };

      if (Math.random() > 0.32) {
        const coinSpread = gapHeight * 0.42;
        pipe.coin = {
          x: pipe.x + FLAPPY_PIPE_WIDTH * 0.5,
          y: gapCenter + (Math.random() * 2 - 1) * coinSpread * 0.5,
          collected: false
        };
      }

      flappyState.pipes.push(pipe);
    };

    const buildFlappyPreviewPipes = () => {
      const groundHeight = getFlappyGroundHeight();
      const gapHeight = getFlappyPipeGap();
      const laneCenter = Math.round((flappyState.worldHeight - groundHeight) * 0.5);
      return [
        {
          x: Math.round(flappyState.worldWidth * 0.78),
          width: FLAPPY_PIPE_WIDTH,
          gapCenter: laneCenter - 34,
          gapHeight,
          passed: true,
          coin: {
            x: Math.round(flappyState.worldWidth * 0.78 + FLAPPY_PIPE_WIDTH * 0.5),
            y: laneCenter - 16,
            collected: false
          }
        },
        {
          x: Math.round(flappyState.worldWidth * 0.78 + 320),
          width: FLAPPY_PIPE_WIDTH,
          gapCenter: laneCenter + 24,
          gapHeight,
          passed: true,
          coin: null
        }
      ];
    };

    const resetFlappyRound = () => {
      const groundHeight = getFlappyGroundHeight();
      flappyState.score = 0;
      flappyState.coins = 0;
      flappyState.earnedCents = 0;
      flappyState.rewardLogged = false;
      flappyState.gameOver = false;
      flappyState.isDeathFalling = false;
      flappyState.birdY = Math.round((flappyState.worldHeight - groundHeight) * 0.42);
      flappyState.birdVelocity = 0;
      flappyState.birdRotation = 0;
      flappyState.pipes = buildFlappyPreviewPipes();
      flappyState.pipeSpawnTimer = 0.72;
      flappyState.lastTimestamp = performance.now();
      flappyState.flapFrame = 0;
      flappyState.flapFrameIndex = 0;
      if (flappyPanelEl) {
        flappyPanelEl.classList.remove('flappy-game-over');
      }
      updateFlappyHud();
      renderFlappyFrame();
    };

    const circleRectCollision = (cx, cy, radius, rx, ry, rw, rh) => {
      const nearestX = Math.max(rx, Math.min(cx, rx + rw));
      const nearestY = Math.max(ry, Math.min(cy, ry + rh));
      const dx = cx - nearestX;
      const dy = cy - nearestY;
      return dx * dx + dy * dy <= radius * radius;
    };

    const stopFlappyOrion = (reason = 'finished') => {
      const hasProgress = flappyState.score > 0 || flappyState.coins > 0 || flappyState.earnedCents > 0;
      const shouldHandle =
        flappyState.isRunning ||
        flappyState.isDeathFalling ||
        ((reason === 'switch' || reason === 'restart') && hasProgress);
      if (!shouldHandle) return;

      flappyState.isRunning = false;
      flappyState.isDeathFalling = false;
      if (flappyState.rafId) {
        window.cancelAnimationFrame(flappyState.rafId);
        flappyState.rafId = null;
      }
      if (this.flappyOrionAnimationFrame) {
        window.cancelAnimationFrame(this.flappyOrionAnimationFrame);
        this.flappyOrionAnimationFrame = null;
      }

      commitFlappyReward();
      if (flappyState.score > flappyState.best) {
        flappyState.best = flappyState.score;
        saveFlappyBest();
      }

      if (reason === 'collision') {
        playFlappyDieSound();
      }

      if (reason !== 'restart') {
        flappyState.gameOver = reason !== 'switch';
      }

      if (flappyPanelEl) {
        flappyPanelEl.classList.remove('is-running');
        flappyPanelEl.classList.toggle('flappy-game-over', flappyState.gameOver);
      }
      if (flappyStartBtn) {
        flappyStartBtn.textContent = 'Старт';
      }

      updateFlappyHud();
      renderFlappyFrame();
    };

    const stepFlappyDeathFall = (timestamp) => {
      if (!flappyState.isDeathFalling) return;
      if (!miniGamesSection.isConnected || !miniGamesSection.classList.contains('active') || currentMiniGameView !== 'flappy') {
        stopFlappyOrion('switch');
        return;
      }

      const elapsedSeconds = Math.min(FLAPPY_MAX_DT, Math.max(0, (timestamp - flappyState.lastTimestamp) / 1000));
      flappyState.lastTimestamp = timestamp;
      flappyState.groundOffset += FLAPPY_PIPE_SPEED * elapsedSeconds * 0.28;
      flappyState.cloudOffset += FLAPPY_PIPE_SPEED * elapsedSeconds * 0.08;
      flappyState.flapFrameIndex += elapsedSeconds * 4;
      flappyState.birdVelocity += FLAPPY_GRAVITY * elapsedSeconds * 1.12;
      flappyState.birdY += flappyState.birdVelocity * elapsedSeconds;
      flappyState.birdRotation = Math.min(1.45, flappyState.birdRotation + elapsedSeconds * 3.2);

      const groundHeight = getFlappyGroundHeight();
      const birdRadius = getFlappyBirdRadius();
      const landingY = flappyState.worldHeight - groundHeight - birdRadius * 0.82;
      if (flappyState.birdY >= landingY) {
        flappyState.birdY = landingY;
        flappyState.birdVelocity = 0;
        stopFlappyOrion('finished');
        return;
      }

      renderFlappyFrame();
      flappyState.rafId = window.requestAnimationFrame(stepFlappyDeathFall);
      this.flappyOrionAnimationFrame = flappyState.rafId;
    };

    const beginFlappyCollisionFall = () => {
      if (flappyState.isDeathFalling || flappyState.gameOver) return;

      if (flappyState.score > flappyState.best) {
        flappyState.best = flappyState.score;
        saveFlappyBest();
      }
      commitFlappyReward();
      playFlappyDieSound();

      flappyState.isRunning = false;
      flappyState.isDeathFalling = true;
      flappyState.gameOver = false;
      flappyState.birdVelocity = Math.max(flappyState.birdVelocity, 150);
      flappyState.birdRotation = Math.max(flappyState.birdRotation, 0.25);
      flappyState.lastTimestamp = performance.now();
      if (flappyPanelEl) {
        flappyPanelEl.classList.remove('flappy-game-over');
      }

      if (flappyState.rafId) {
        window.cancelAnimationFrame(flappyState.rafId);
      }
      if (this.flappyOrionAnimationFrame) {
        window.cancelAnimationFrame(this.flappyOrionAnimationFrame);
      }

      flappyState.rafId = window.requestAnimationFrame(stepFlappyDeathFall);
      this.flappyOrionAnimationFrame = flappyState.rafId;
    };

    const stepFlappyOrion = (timestamp) => {
      if (!flappyState.isRunning) return;
      if (!miniGamesSection.isConnected || !miniGamesSection.classList.contains('active') || currentMiniGameView !== 'flappy') {
        stopFlappyOrion('switch');
        return;
      }
      const birdX = getFlappyBirdX();
      const birdRadius = getFlappyBirdRadius();
      const groundHeight = getFlappyGroundHeight();

      const elapsedSeconds = Math.min(FLAPPY_MAX_DT, Math.max(0, (timestamp - flappyState.lastTimestamp) / 1000));
      flappyState.lastTimestamp = timestamp;
      flappyState.pipeSpawnTimer -= elapsedSeconds;
      flappyState.groundOffset += FLAPPY_PIPE_SPEED * elapsedSeconds;
      flappyState.cloudOffset += FLAPPY_PIPE_SPEED * elapsedSeconds * 0.16;
      flappyState.flapFrameIndex += elapsedSeconds * 14;

      if (flappyState.pipeSpawnTimer <= 0) {
        spawnFlappyPipe();
        flappyState.pipeSpawnTimer = FLAPPY_PIPE_SPAWN_INTERVAL + Math.random() * 0.28;
      }

      flappyState.birdVelocity += FLAPPY_GRAVITY * elapsedSeconds;
      flappyState.birdY += flappyState.birdVelocity * elapsedSeconds;
      flappyState.birdRotation = Math.max(-0.52, Math.min(1.08, flappyState.birdVelocity / 560));

      const topLimit = birdRadius * 0.86;
      const bottomLimit = flappyState.worldHeight - groundHeight - birdRadius * 0.82;
      if (flappyState.birdY < topLimit || flappyState.birdY > bottomLimit) {
        flappyState.birdY = Math.min(bottomLimit, Math.max(topLimit, flappyState.birdY));
        beginFlappyCollisionFall();
        return;
      }

      const passReward = Math.max(1, Math.floor(this.getTapLevelStats().rewardPerTapCents / 2));
      const coinReward = Math.max(4, this.getTapLevelStats().rewardPerTapCents * 2);
      let hasPipeCollision = false;
      flappyState.pipes.forEach((pipe) => {
        if (hasPipeCollision) return;
        pipe.x -= FLAPPY_PIPE_SPEED * elapsedSeconds;
        if (pipe.coin) {
          pipe.coin.x = pipe.x + pipe.width * 0.5;
        }

        const gapHeight = pipe.gapHeight || getFlappyPipeGap();
        const topEnd = pipe.gapCenter - gapHeight / 2;
        const bottomStart = pipe.gapCenter + gapHeight / 2;
        const topCollision = circleRectCollision(
          birdX,
          flappyState.birdY,
          birdRadius,
          pipe.x,
          0,
          pipe.width,
          topEnd
        );
        const bottomCollision = circleRectCollision(
          birdX,
          flappyState.birdY,
          birdRadius,
          pipe.x,
          bottomStart,
          pipe.width,
          flappyState.worldHeight - groundHeight - bottomStart
        );
        if (topCollision || bottomCollision) {
          hasPipeCollision = true;
          return;
        }

        if (!pipe.passed && pipe.x + pipe.width < birdX - birdRadius * 0.35) {
          pipe.passed = true;
          flappyState.score += 1;
          addFlappyReward(passReward);
        }

        if (pipe.coin && !pipe.coin.collected) {
          const coinSize = Math.max(26, Math.round(flappyState.worldHeight * 0.064));
          const dx = birdX - pipe.coin.x;
          const dy = flappyState.birdY - pipe.coin.y;
          const collisionDistance = birdRadius + coinSize * 0.38;
          if (dx * dx + dy * dy <= collisionDistance * collisionDistance) {
            pipe.coin.collected = true;
            flappyState.coins += 1;
            addFlappyReward(coinReward);
            playFlappyCoinSound();
          }
        }
      });

      if (hasPipeCollision) {
        beginFlappyCollisionFall();
        return;
      }

      if (!flappyState.isRunning) return;

      flappyState.pipes = flappyState.pipes.filter((pipe) => pipe.x + pipe.width > -120);
      updateFlappyHud();
      renderFlappyFrame();
      flappyState.rafId = window.requestAnimationFrame(stepFlappyOrion);
      this.flappyOrionAnimationFrame = flappyState.rafId;
    };

    const startFlappyOrion = () => {
      if (!flappyCanvasEl) return;
      resolveFlappyWorldSize();
      ensureFlappyAssets();
      stopFlappyOrion('restart');
      resetFlappyRound();
      flappyState.isRunning = true;
      flappyState.lastTimestamp = performance.now();
      if (flappyPanelEl) {
        flappyPanelEl.classList.remove('flappy-game-over');
        flappyPanelEl.classList.add('is-running');
      }
      if (flappyStartBtn) {
        flappyStartBtn.textContent = 'Перезапуск';
      }
      flappyState.pipes = [];
      flappyState.pipeSpawnTimer = 0.95;
      flappyState.rafId = window.requestAnimationFrame(stepFlappyOrion);
      this.flappyOrionAnimationFrame = flappyState.rafId;
    };

    const flappyJump = () => {
      if (!flappyCanvasEl) return;
      if (flappyState.isDeathFalling) return;
      if (!flappyState.isRunning) {
        startFlappyOrion();
        if (!flappyState.isRunning) return;
      }
      flappyState.birdVelocity = FLAPPY_FLAP_VELOCITY;
      flappyState.birdRotation = -0.52;
      flappyState.flapFrameIndex += 2;
      playFlappyWingSound();
    };

    const saveDriftBest = () => {
      try {
        window.localStorage.setItem(DRIFT_BEST_KEY, String(driftState.best));
      } catch {
        // Ignore storage failures.
      }
    };

    const commitDriftReward = () => {
      if (driftState.rewardLogged || driftState.earnedCents <= 0) return;
      this.addCoinTransaction({
        amountCents: driftState.earnedCents,
        title: 'Гра: Nymo Drive',
        category: 'games'
      });
      driftState.rewardLogged = true;
    };

    const addDriftReward = (amountCents) => {
      const safeAmount = Number.isFinite(amountCents) ? Math.max(0, Math.floor(amountCents)) : 0;
      if (!safeAmount) return;
      driftState.earnedCents += safeAmount;
      this.setTapBalanceCents(this.getTapBalanceCents() + safeAmount, {
        transactionMeta: {
          title: 'Гра: Nymo Drive',
          category: 'games',
          amountCents: safeAmount
        }
      });
      balanceEl.textContent = this.formatCoinBalance(this.getTapBalanceCents());
    };

    const updateDriftHud = () => {
      if (driftScoreEl) driftScoreEl.textContent = String(Math.max(0, Math.floor(driftState.score)));
      if (driftMultiplierEl) driftMultiplierEl.textContent = `x${driftState.multiplier.toFixed(1)}`;
      if (driftSpeedEl) {
        const speedKmh = Math.max(0, Math.round(Math.abs(driftState.speed) * DRIFT_SPEED_FACTOR));
        driftSpeedEl.textContent = String(speedKmh);
      }
      if (driftOrbsEl) driftOrbsEl.textContent = String(driftState.orbs);
      if (driftBestEl) driftBestEl.textContent = String(driftState.best);
    };

    const setDriftStatus = (message) => {
      if (!driftStatusEl) return;
      driftStatusEl.textContent = message;
    };

    const syncMiniGameControlHints = () => {
      if (gridHintEl) {
        gridHintEl.textContent = getGridControlHintText();
      }
      if (!driftState.isRunning) {
        setDriftStatus(getDriftIdleStatusText());
      }
    };

    const resolveDriftSteerInput = () => {
      if (driftState.steerDirection) return driftState.steerDirection;
      const keyDirection = (driftState.keyRight ? 1 : 0) - (driftState.keyLeft ? 1 : 0);
      if (keyDirection) return keyDirection;
      return driftState.touchSteerDirection;
    };

    const resolveDriftThrottleInput = () => {
      if (driftState.throttleDirection) return driftState.throttleDirection;
      const keyDirection = (driftState.keyGas ? 1 : 0) - (driftState.keyBrake ? 1 : 0);
      if (keyDirection) return keyDirection;
      return driftState.touchThrottleDirection;
    };

    const syncDriftControlButtons = () => {
      if (driftSteerLeftBtn) driftSteerLeftBtn.classList.toggle('active', resolveDriftSteerInput() < 0);
      if (driftSteerRightBtn) driftSteerRightBtn.classList.toggle('active', resolveDriftSteerInput() > 0);
      if (driftGasBtn) driftGasBtn.classList.toggle('active', resolveDriftThrottleInput() > 0);
      if (driftBrakeBtn) driftBrakeBtn.classList.toggle('active', resolveDriftThrottleInput() < 0);
    };

    const resolveDriftWorldSize = () => {
      if (!driftCanvasEl) return;
      const rect = driftCanvasEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const devicePixelRatio = Math.min(2, Math.max(1, Math.round(window.devicePixelRatio || 1)));
      driftState.worldWidth = Math.max(280, Math.round(rect.width));
      driftState.worldHeight = Math.max(240, Math.round(rect.height));
      const targetWidth = Math.max(1, Math.round(driftState.worldWidth * devicePixelRatio));
      const targetHeight = Math.max(1, Math.round(driftState.worldHeight * devicePixelRatio));
      if (driftCanvasEl.width !== targetWidth) driftCanvasEl.width = targetWidth;
      if (driftCanvasEl.height !== targetHeight) driftCanvasEl.height = targetHeight;
      if (drift3d.renderer && drift3d.camera) {
        drift3d.renderer.setPixelRatio(Math.min(2, Math.max(1, window.devicePixelRatio || 1)));
        drift3d.renderer.setSize(driftState.worldWidth, driftState.worldHeight, false);
        drift3d.camera.aspect = driftState.worldWidth / Math.max(1, driftState.worldHeight);
        drift3d.camera.updateProjectionMatrix();
      }
      if (!driftState.isRunning) {
        driftState.carX = 0;
        driftState.carY = 0;
        driftState.carAngle = 0;
        driftState.bodyAngle = 0;
        driftState.cameraX = 0;
        driftState.cameraY = 0;
        driftState.prevCameraX = 0;
        driftState.prevCameraY = 0;
        driftState.cameraShakeX = 0;
        driftState.cameraShakeY = 0;
        driftState.cameraHeading = 0;
        driftState.cameraDriftYaw = 0;
      }
    };

    const addDriftParticles = (x, y, amount = 2, color = 'rgba(255, 138, 46, 0.72)') => {
      for (let i = 0; i < amount; i += 1) {
        driftState.particles.push({
          x: x + (Math.random() * 16 - 8),
          y: y + (Math.random() * 16 - 8),
          vx: (Math.random() * 2 - 1) * 48,
          vy: (Math.random() * 2 - 1) * 48,
          life: 0.24 + Math.random() * 0.34,
          size: 2 + Math.random() * 2.6,
          color
        });
      }
      if (driftState.particles.length > 180) {
        driftState.particles.splice(0, driftState.particles.length - 180);
      }
    };

    const addDriftTrackMark = (x, y, angle, intensity = 1, width = 2.2, length = 6.8) => {
      const trackLife = 7.2 + Math.random() * 2.6;
      driftState.trackIdSeed = (driftState.trackIdSeed + 1) % 1_000_000_000;
      driftState.tireTracks.push({
        id: driftState.trackIdSeed,
        x,
        y,
        angle,
        width: width * (0.9 + Math.random() * 0.16),
        length: length * (0.88 + Math.random() * 0.18),
        life: trackLife,
        maxLife: trackLife,
        intensity: Math.max(0.3, Math.min(1, intensity))
      });
      if (driftState.tireTracks.length > 900) {
        driftState.tireTracks.splice(0, driftState.tireTracks.length - 900);
      }
    };

    const addDriftExhaustPuff = (x, y, angle, strength = 0.2, speedAbs = 0) => {
      const smokeStyle = this.getOrionDriveSmokeDefinition(this.user?.equippedDriveSmokeColor || '');
      driftState.exhaustIdSeed = (driftState.exhaustIdSeed + 1) % 1_000_000_000;
      const backDrift = 0.24 + speedAbs * 0.016 + strength * 0.52;
      const spread = 0.26 + strength * 0.42;
      const forwardX = Math.sin(angle);
      const forwardY = -Math.cos(angle);
      const sideX = Math.cos(angle);
      const sideY = Math.sin(angle);
      driftState.exhaustPuffs.push({
        id: driftState.exhaustIdSeed,
        x: x + sideX * (Math.random() * 2 - 1) * 0.24,
        y: y + sideY * (Math.random() * 2 - 1) * 0.24,
        height: driftState.exhaustHeight + (Math.random() * 0.008 - 0.004),
        vx: -forwardX * backDrift + sideX * (Math.random() * 2 - 1) * spread,
        vy: -forwardY * backDrift + sideY * (Math.random() * 2 - 1) * spread,
        rise: 0.028 + Math.random() * 0.03 + strength * 0.02,
        size: 3.2 + Math.random() * 1.6 + strength * 1.8,
        opacity: 0.045 + strength * 0.07,
        colorHex: smokeStyle.exhaustColorHex,
        life: 0.72 + Math.random() * 0.42 + strength * 0.24,
        maxLife: 1
      });
      const lastPuff = driftState.exhaustPuffs[driftState.exhaustPuffs.length - 1];
      if (lastPuff) lastPuff.maxLife = lastPuff.life;
      if (driftState.exhaustPuffs.length > 180) {
        driftState.exhaustPuffs.splice(0, driftState.exhaustPuffs.length - 180);
      }
    };

    const addDriftWheelSmokePuff = (
      x,
      y,
      angle,
      strength = 0.45,
      speedAbs = 0,
      burnout = false,
      options = {}
    ) => {
      const smokeStyle = this.getOrionDriveSmokeDefinition(this.user?.equippedDriveSmokeColor || '');
      const {
        alongOffset = 0,
        sideOffset = 0,
        heightBoost = 0,
        spreadBoost = 0,
        sizeBoost = 0,
        opacityBoost = 0,
        lifeBoost = 0,
        riseBoost = 0,
        swirlBoost = 0
      } = options || {};
      driftState.wheelSmokeIdSeed = (driftState.wheelSmokeIdSeed + 1) % 1_000_000_000;
      const forwardX = Math.sin(angle);
      const forwardY = -Math.cos(angle);
      const sideX = Math.cos(angle);
      const sideY = Math.sin(angle);
      const backSpeed = 0.28 + speedAbs * 0.02 + strength * 0.7;
      const sideSpread = 0.24 + strength * 0.48 + (burnout ? 0.22 : 0) + spreadBoost;
      const jitter = (burnout ? 0.32 : 0.18) + Math.min(0.3, Math.abs(sideOffset) * 0.2);
      const activeWheelSmokeColor = Number.isFinite(smokeStyle.wheelColorHex)
        ? smokeStyle.wheelColorHex
        : ORION_DRIVE_SMOKE_DEFAULT.wheelColorHex;
      const emissionX = x
        - forwardX * alongOffset
        + sideX * sideOffset
        + sideX * (Math.random() * 2 - 1) * jitter;
      const emissionY = y
        - forwardY * alongOffset
        + sideY * sideOffset
        + sideY * (Math.random() * 2 - 1) * jitter;
      const swirl = 0.16 + strength * 0.28 + (burnout ? 0.14 : 0) + swirlBoost;
      driftState.wheelSmokePuffs.push({
        id: driftState.wheelSmokeIdSeed,
        x: emissionX,
        y: emissionY,
        height: 0.04 + Math.random() * 0.018 + heightBoost,
        vx: -forwardX * backSpeed + sideX * (Math.random() * 2 - 1) * sideSpread,
        vy: -forwardY * backSpeed + sideY * (Math.random() * 2 - 1) * sideSpread,
        rise: 0.1 + Math.random() * 0.08 + strength * 0.1 + (burnout ? 0.06 : 0) + riseBoost,
        size: 4.8 + Math.random() * 2.2 + strength * 2.8 + (burnout ? 2.1 : 0) + sizeBoost,
        opacity: 0.16 + strength * 0.18 + (burnout ? 0.08 : 0) + opacityBoost,
        colorHex: activeWheelSmokeColor,
        life: 0.5 + Math.random() * 0.28 + strength * 0.28 + (burnout ? 0.12 : 0) + lifeBoost,
        maxLife: 1,
        age: 0,
        swirl,
        noisePhase: Math.random() * Math.PI * 2,
        noiseSpeed: 3.2 + Math.random() * 2.4,
        drag: 2.2 + Math.random() * 1.2 + (burnout ? 0.5 : 0),
        spread: 0.16 + Math.random() * 0.22 + Math.max(0, spreadBoost) * 0.4,
        verticalStretch: 1 + Math.random() * 0.34,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() * 2 - 1) * 0.34
      });
      const lastPuff = driftState.wheelSmokePuffs[driftState.wheelSmokePuffs.length - 1];
      if (lastPuff) lastPuff.maxLife = lastPuff.life;
      if (driftState.wheelSmokePuffs.length > 460) {
        driftState.wheelSmokePuffs.splice(0, driftState.wheelSmokePuffs.length - 460);
      }
    };

    const addDriftWheelSmokeCluster = (
      wheelX,
      wheelY,
      angle,
      strength = 0.45,
      speedAbs = 0,
      burnout = false,
      wheelSide = 0
    ) => {
      addDriftWheelSmokePuff(wheelX, wheelY, angle, strength, speedAbs, burnout);
      const extraLayers = burnout ? 3 : strength > 0.82 ? 2 : 1;
      for (let i = 0; i < extraLayers; i += 1) {
        const layerFactor = i + 1;
        addDriftWheelSmokePuff(wheelX, wheelY, angle, strength, speedAbs, burnout, {
          alongOffset: 0.2 + layerFactor * (0.22 + Math.random() * 0.1),
          sideOffset: wheelSide * (0.14 + layerFactor * 0.08) + (Math.random() * 2 - 1) * (0.12 + strength * 0.22),
          heightBoost: 0.016 + layerFactor * 0.018,
          spreadBoost: 0.12 + strength * 0.15,
          sizeBoost: 0.8 + layerFactor * 0.58 + strength * 0.56,
          opacityBoost: 0.012 + layerFactor * 0.009,
          lifeBoost: 0.06 + layerFactor * 0.06,
          riseBoost: 0.04 + layerFactor * 0.035,
          swirlBoost: 0.08 + layerFactor * 0.06
        });
      }
    };

    const spawnDriftCoin = (minDistance = 200, maxDistance = 760) => {
      if (driftState.coins.length >= 24) return;
      const angle = Math.random() * Math.PI * 2;
      const distance = minDistance + Math.random() * (maxDistance - minDistance);
      driftState.coins.push({
        id: Math.floor(Math.random() * 1_000_000),
        x: driftState.carX + Math.cos(angle) * distance,
        y: driftState.carY + Math.sin(angle) * distance,
        size: Math.max(24, Math.round(driftState.worldHeight * 0.06)),
        bobPhase: Math.random() * Math.PI * 2,
        bobSpeed: 1.9 + Math.random() * 1.1,
        bobHeight: 0.1 + Math.random() * 0.08
      });
    };

    const spawnDriftObstacle = (minDistance = 240, maxDistance = 1250) => {
      if (driftState.obstacles.length >= 22) return;
      const angle = Math.random() * Math.PI * 2;
      const distance = minDistance + Math.random() * (maxDistance - minDistance);
      const type = Math.random() < 0.36 ? 'box' : 'cone';
      const size = type === 'box'
        ? Math.max(30, Math.round(driftState.worldHeight * (0.07 + Math.random() * 0.024)))
        : Math.max(28, Math.round(driftState.worldHeight * (0.062 + Math.random() * 0.02)));
      driftState.obstacles.push({
        id: Math.floor(Math.random() * 1_000_000),
        x: driftState.carX + Math.cos(angle) * distance,
        y: driftState.carY + Math.sin(angle) * distance,
        type,
        size,
        rotation: (Math.random() - 0.5) * (type === 'box' ? 0.58 : 0.18)
      });
    };

    const createDriftCoinObject = () => {
      if (drift3d.coinMaterial) {
        const spriteMaterial = drift3d.coinMaterial.clone();
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.renderOrder = 2;
        return sprite;
      }
      const geometry = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 20);
      const material = new THREE.MeshStandardMaterial({
        color: 0xf8b449,
        emissive: 0x265a8e,
        emissiveIntensity: 0.42,
        metalness: 0.45,
        roughness: 0.35
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = false;
      mesh.position.y = 0.92;
      return mesh;
    };

    const createDriftTrackObject = () => {
      if (!drift3d.trackGeometry) {
        drift3d.trackGeometry = new THREE.PlaneGeometry(1, 1);
      }
      if (!drift3d.trackMaterial) {
        drift3d.trackMaterial = new THREE.MeshBasicMaterial({
          color: 0x07090c,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2
        });
      }
      const material = drift3d.trackMaterial.clone();
      const mesh = new THREE.Mesh(drift3d.trackGeometry, material);
      mesh.renderOrder = 1;
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.008;
      return mesh;
    };

    const createDriftExhaustObject = () => {
      if (!drift3d.exhaustTexture) {
        const textureCanvas = document.createElement('canvas');
        textureCanvas.width = 96;
        textureCanvas.height = 96;
        const ctx = textureCanvas.getContext('2d');
        if (ctx) {
          const gradient = ctx.createRadialGradient(48, 48, 6, 48, 48, 46);
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.58)');
          gradient.addColorStop(0.44, 'rgba(255, 255, 255, 0.36)');
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 96, 96);
        }
        const texture = new THREE.CanvasTexture(textureCanvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        drift3d.exhaustTexture = texture;
      }
      if (!drift3d.exhaustMaterial) {
        drift3d.exhaustMaterial = new THREE.SpriteMaterial({
          map: drift3d.exhaustTexture,
          color: 0xffffff,
          transparent: true,
          opacity: 0.16,
          depthWrite: false
        });
      }
      const material = drift3d.exhaustMaterial.clone();
      const sprite = new THREE.Sprite(material);
      sprite.renderOrder = 4;
      return sprite;
    };

    const createDriftWheelSmokeObject = () => {
      if (!drift3d.wheelSmokeTexture) {
        const textureCanvas = document.createElement('canvas');
        textureCanvas.width = 128;
        textureCanvas.height = 128;
        const ctx = textureCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 128, 128);
          const blobs = [
            { x: 50, y: 74, r: 42, alpha: 0.38 },
            { x: 84, y: 68, r: 36, alpha: 0.3 },
            { x: 70, y: 46, r: 34, alpha: 0.28 },
            { x: 44, y: 48, r: 30, alpha: 0.26 }
          ];
          blobs.forEach((blob) => {
            const gradient = ctx.createRadialGradient(blob.x, blob.y, blob.r * 0.18, blob.x, blob.y, blob.r);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${blob.alpha})`);
            gradient.addColorStop(0.56, `rgba(255, 255, 255, ${blob.alpha * 0.54})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(blob.x - blob.r, blob.y - blob.r, blob.r * 2, blob.r * 2);
          });
          const haze = ctx.createRadialGradient(64, 66, 14, 64, 66, 60);
          haze.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
          haze.addColorStop(0.72, 'rgba(255, 255, 255, 0.08)');
          haze.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = haze;
          ctx.fillRect(0, 0, 128, 128);
        }
        const texture = new THREE.CanvasTexture(textureCanvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        drift3d.wheelSmokeTexture = texture;
      }
      if (!drift3d.wheelSmokeMaterial) {
        drift3d.wheelSmokeMaterial = new THREE.SpriteMaterial({
          map: drift3d.wheelSmokeTexture,
          color: 0xffffff,
          transparent: true,
          opacity: 0.26,
          depthWrite: false
        });
      }
      const material = drift3d.wheelSmokeMaterial.clone();
      const sprite = new THREE.Sprite(material);
      sprite.renderOrder = 5;
      return sprite;
    };

    const createFallbackConeMesh = () => {
      const geometry = new THREE.ConeGeometry(0.34, 0.92, 18);
      const material = new THREE.MeshStandardMaterial({
        color: 0xff8d3d,
        metalness: 0.08,
        roughness: 0.72
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.position.y = 0.46;
      return mesh;
    };

    const createFallbackBoxMesh = () => {
      const geometry = new THREE.BoxGeometry(0.72, 0.72, 0.72);
      const material = new THREE.MeshStandardMaterial({
        color: 0x8f704b,
        metalness: 0.06,
        roughness: 0.82
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.position.y = 0.36;
      return mesh;
    };

    const alignDriftCarLights = (carBody = drift3d.carVisual || drift3d.carFallback) => {
      if (!drift3d.carRoot || !carBody) return;
      drift3d.carRoot.updateMatrixWorld(true);
      const worldBox = new THREE.Box3().setFromObject(carBody);
      if (worldBox.isEmpty()) return;

      const localMin = worldBox.min.clone();
      const localMax = worldBox.max.clone();
      drift3d.carRoot.worldToLocal(localMin);
      drift3d.carRoot.worldToLocal(localMax);

      const minX = Math.min(localMin.x, localMax.x);
      const maxX = Math.max(localMin.x, localMax.x);
      const minY = Math.min(localMin.y, localMax.y);
      const maxY = Math.max(localMin.y, localMax.y);
      const minZ = Math.min(localMin.z, localMax.z);
      const maxZ = Math.max(localMin.z, localMax.z);
      const width = Math.max(0.2, maxX - minX);
      const height = Math.max(0.2, maxY - minY);
      const length = Math.max(0.4, maxZ - minZ);
      const inverseWorldScale = 1 / Math.max(0.0001, drift3d.worldScale);

      const sideOffset = Math.max(0.14, Math.min(0.55, width * 0.23));
      const rearAxleOffset = Math.max(0.08, Math.min(length * 0.46, Math.abs(minZ + length * 0.26)));
      const frontY = minY + height * 0.38;
      const rearY = minY + height * 0.33;
      const frontZ = maxZ - Math.max(0.03, length * 0.02);
      const rearZ = minZ + Math.max(0.03, length * 0.03);
      const exhaustRearOffset = Math.max(0.06, length * 0.08);
      const exhaustSideOffset = Math.max(0.035, width * 0.12);
      const targetZ = frontZ + Math.max(8.5, length * 7.2);
      const targetY = minY + Math.max(0.02, height * 0.06);
      driftState.trackRearOffset = Math.max(8, rearAxleOffset * inverseWorldScale);
      driftState.trackWheelOffset = Math.max(3.8, sideOffset * inverseWorldScale * 0.94);
      driftState.trackMarkWidth = Math.max(1.1, Math.min(2.8, width * inverseWorldScale * 0.1));
      driftState.trackMarkLength = Math.max(3.6, Math.min(8.4, length * inverseWorldScale * 0.14));
      const exhaustRearWorld = Math.max(3.6, Math.min(7.8, exhaustRearOffset * inverseWorldScale));
      const exhaustSideWorld = Math.max(1.1, Math.min(2.6, exhaustSideOffset * inverseWorldScale));
      driftState.exhaustRearOffset = exhaustRearWorld;
      driftState.exhaustSideOffset = exhaustSideWorld;
      driftState.exhaustHeight = Math.max(0.008, minY + height * 0.03);

      drift3d.headlights.forEach((light, index) => {
        const side = index === 0 ? -1 : 1;
        const x = sideOffset * side;
        light.position.set(x, frontY, frontZ);
        const target = light.userData.targetNode;
        if (target) target.position.set(x * 0.7, targetY, targetZ);
      });
      drift3d.brakeLights.forEach((light, index) => {
        const side = index === 0 ? -1 : 1;
        light.position.set(sideOffset * side, rearY, rearZ);
      });
      drift3d.reverseLights.forEach((light, index) => {
        const side = index === 0 ? -1 : 1;
        light.position.set(sideOffset * side * 0.88, rearY, rearZ + 0.01);
      });
    };

    const ensureDriftThreeScene = () => {
      if (!driftCanvasEl || drift3d.failed) return false;
      if (drift3d.renderer && drift3d.scene && drift3d.camera && drift3d.carRoot) return true;

      try {
        const renderer = new THREE.WebGLRenderer({
          canvas: driftCanvasEl,
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance'
        });
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setPixelRatio(Math.min(2, Math.max(1, window.devicePixelRatio || 1)));
        renderer.setSize(driftState.worldWidth, driftState.worldHeight, false);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
          58,
          driftState.worldWidth / Math.max(1, driftState.worldHeight),
          0.1,
          420
        );
        camera.position.copy(drift3d.cameraPosition);

        const ambient = new THREE.AmbientLight(0xffffff, 0.34);
        const hemi = new THREE.HemisphereLight(0x8eb5ff, 0x1c2027, 0.48);
        const directional = new THREE.DirectionalLight(0xffffff, 0.6);
        directional.position.set(18, 24, 10);
        directional.castShadow = true;
        directional.shadow.mapSize.width = 1024;
        directional.shadow.mapSize.height = 1024;
        directional.shadow.camera.near = 0.5;
        directional.shadow.camera.far = 120;
        directional.shadow.camera.left = -28;
        directional.shadow.camera.right = 28;
        directional.shadow.camera.top = 28;
        directional.shadow.camera.bottom = -28;

        const ground = new THREE.Mesh(
          new THREE.PlaneGeometry(720, 720, 1, 1),
          new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.95, metalness: 0.02 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.02;
        ground.receiveShadow = true;

        const grid = new THREE.GridHelper(720, 120, 0x2f3a47, 0x2f3a47);
        grid.position.y = 0.01;
        grid.material.opacity = 0.28;
        grid.material.transparent = true;

        const carRoot = new THREE.Group();
        carRoot.position.set(0, 0.08, 0);

        const fallbackCar = new THREE.Mesh(
          new THREE.BoxGeometry(1.35, 0.46, 2.35),
          new THREE.MeshStandardMaterial({ color: 0xdd4040, metalness: 0.2, roughness: 0.55 })
        );
        fallbackCar.position.y = 0.38;
        fallbackCar.castShadow = true;
        fallbackCar.receiveShadow = false;
        carRoot.add(fallbackCar);

        const makeHeadlight = (offsetX) => {
          const light = new THREE.SpotLight(0xffd996, 3.2, 42, Math.PI / 4.6, 0.56, 0.85);
          light.position.set(offsetX, 0.5, 0.96);
          const target = new THREE.Object3D();
          target.position.set(offsetX * 0.7, 0.04, 10);
          carRoot.add(target);
          light.target = target;
          light.userData.targetNode = target;
          carRoot.add(light);
          return light;
        };
        const makeRearLight = (offsetX, color) => {
          const light = new THREE.PointLight(color, 0, 3.6, 2.1);
          light.position.set(offsetX, 0.34, -1.02);
          carRoot.add(light);
          return light;
        };

        drift3d.headlights = [makeHeadlight(-0.28), makeHeadlight(0.28)];
        drift3d.brakeLights = [makeRearLight(-0.26, 0xff4a4a), makeRearLight(0.26, 0xff4a4a)];
        drift3d.reverseLights = [makeRearLight(-0.23, 0xffffff), makeRearLight(0.23, 0xffffff)];

        scene.add(ground);
        scene.add(grid);
        scene.add(ambient);
        scene.add(hemi);
        scene.add(directional);
        scene.add(carRoot);

        drift3d.renderer = renderer;
        drift3d.scene = scene;
        drift3d.camera = camera;
        drift3d.ground = ground;
        drift3d.grid = grid;
        drift3d.carRoot = carRoot;
        drift3d.carFallback = fallbackCar;
        drift3d.themeKey = '';
        alignDriftCarLights(fallbackCar);
      } catch {
        drift3d.failed = true;
        setDriftStatus('3D рендер недоступний у цьому браузері. Спробуй інший браузер або пристрій.');
        return false;
      }

      return true;
    };

    const syncDriftThreeEntities = () => {
      if (!drift3d.scene) return;
      const isDarkTheme = document.documentElement.classList.contains('dark-theme');

      const trackIds = new Set(driftState.tireTracks.map((track) => track.id));
      drift3d.trackObjects.forEach((object3d, id) => {
        if (trackIds.has(id)) return;
        drift3d.scene.remove(object3d);
        if (object3d.material) object3d.material.dispose?.();
        drift3d.trackObjects.delete(id);
      });

      driftState.tireTracks.forEach((track) => {
        let trackObject = drift3d.trackObjects.get(track.id);
        if (!trackObject) {
          trackObject = createDriftTrackObject();
          drift3d.scene.add(trackObject);
          drift3d.trackObjects.set(track.id, trackObject);
        }
        const sceneX = track.x * drift3d.worldScale;
        const sceneZ = track.y * drift3d.worldScale;
        const fade = track.maxLife > 0 ? Math.max(0, track.life / track.maxLife) : 0;
        const trackOpacityBase = (0.3 + fade * 0.5) * track.intensity;
        trackObject.position.set(sceneX, 0.008 + (1 - fade) * 0.002, sceneZ);
        trackObject.rotation.y = -track.angle;
        const scaleX = Math.max(0.06, track.width * drift3d.worldScale);
        const scaleY = Math.max(0.2, track.length * drift3d.worldScale);
        trackObject.scale.set(scaleX, scaleY, 1);
        if (trackObject.material?.isMaterial) {
          trackObject.material.opacity = Math.max(0, Math.min(0.97, trackOpacityBase * (isDarkTheme ? 1 : 0.78)));
          trackObject.material.color.setHex(isDarkTheme ? 0x090c10 : 0x4e4332);
        }
      });

      const exhaustIds = new Set(driftState.exhaustPuffs.map((puff) => puff.id));
      drift3d.exhaustObjects.forEach((object3d, id) => {
        if (exhaustIds.has(id)) return;
        drift3d.scene.remove(object3d);
        if (object3d.material) object3d.material.dispose?.();
        drift3d.exhaustObjects.delete(id);
      });

      driftState.exhaustPuffs.forEach((puff) => {
        let exhaustObject = drift3d.exhaustObjects.get(puff.id);
        if (!exhaustObject) {
          exhaustObject = createDriftExhaustObject();
          drift3d.scene.add(exhaustObject);
          drift3d.exhaustObjects.set(puff.id, exhaustObject);
        }
        const sceneX = puff.x * drift3d.worldScale;
        const sceneZ = puff.y * drift3d.worldScale;
        const fade = puff.maxLife > 0 ? Math.max(0, puff.life / puff.maxLife) : 0;
        const scale = Math.max(0.07, puff.size * drift3d.worldScale * (1 + (1 - fade) * 1.7));
        exhaustObject.position.set(sceneX, puff.height, sceneZ);
        exhaustObject.scale.set(scale, scale, 1);
        if (exhaustObject.material?.isMaterial) {
          exhaustObject.material.color.setHex(
            Number.isFinite(puff.colorHex) ? puff.colorHex : ORION_DRIVE_SMOKE_DEFAULT.exhaustColorHex
          );
          exhaustObject.material.opacity = Math.max(
            0,
            Math.min(0.2, puff.opacity * fade * (isDarkTheme ? 1 : 0.75))
          );
        }
      });

      const wheelSmokeIds = new Set(driftState.wheelSmokePuffs.map((puff) => puff.id));
      drift3d.wheelSmokeObjects.forEach((object3d, id) => {
        if (wheelSmokeIds.has(id)) return;
        drift3d.scene.remove(object3d);
        if (object3d.material) object3d.material.dispose?.();
        drift3d.wheelSmokeObjects.delete(id);
      });

      driftState.wheelSmokePuffs.forEach((puff) => {
        let smokeObject = drift3d.wheelSmokeObjects.get(puff.id);
        if (!smokeObject) {
          smokeObject = createDriftWheelSmokeObject();
          drift3d.scene.add(smokeObject);
          drift3d.wheelSmokeObjects.set(puff.id, smokeObject);
        }
        const sceneX = puff.x * drift3d.worldScale;
        const sceneZ = puff.y * drift3d.worldScale;
        const fade = puff.maxLife > 0 ? Math.max(0, puff.life / puff.maxLife) : 0;
        const scaleBase = Math.max(0.11, puff.size * drift3d.worldScale * (1 + (1 - fade) * 1.68));
        const spread = Number.isFinite(puff.spread) ? puff.spread : 0.2;
        const verticalStretch = Number.isFinite(puff.verticalStretch) ? puff.verticalStretch : 1.1;
        const scaleX = scaleBase * (1 + spread * (1 - fade) * 0.55);
        const scaleY = scaleBase * (0.84 + verticalStretch * (1 - fade) * 0.34);
        smokeObject.position.set(sceneX, puff.height, sceneZ);
        smokeObject.scale.set(scaleX, scaleY, 1);
        if (smokeObject.material?.isMaterial) {
          smokeObject.material.color.setHex(
            Number.isFinite(puff.colorHex) ? puff.colorHex : ORION_DRIVE_SMOKE_DEFAULT.wheelColorHex
          );
          smokeObject.material.rotation = (Number.isFinite(puff.rotation) ? puff.rotation : 0) + (1 - fade) * (puff.spin || 0);
          smokeObject.material.opacity = Math.max(
            0,
            Math.min(0.4, puff.opacity * fade * (isDarkTheme ? 1 : 0.74))
          );
        }
      });

      const coinIds = new Set(driftState.coins.map((coin) => coin.id));
      drift3d.coinObjects.forEach((object3d, id) => {
        if (coinIds.has(id)) return;
        drift3d.scene.remove(object3d);
        if (object3d.geometry) object3d.geometry.dispose();
        if (object3d.material && object3d.material !== drift3d.coinMaterial) object3d.material.dispose();
        drift3d.coinObjects.delete(id);
      });

      driftState.coins.forEach((coin) => {
        let coinObject = drift3d.coinObjects.get(coin.id);
        if (!coinObject) {
          coinObject = createDriftCoinObject();
          drift3d.scene.add(coinObject);
          drift3d.coinObjects.set(coin.id, coinObject);
        }
        const sceneX = coin.x * drift3d.worldScale;
        const sceneZ = coin.y * drift3d.worldScale;
        const bob = Math.sin(driftState.runTime * coin.bobSpeed + coin.bobPhase) * coin.bobHeight;
        coinObject.position.set(sceneX, 0.94 + bob, sceneZ);
        if (coinObject.isSprite) {
          const coinScale = Math.max(1.8, coin.size * drift3d.worldScale * 0.86);
          coinObject.scale.set(coinScale, coinScale, 1);
          coinObject.material.rotation = 0;
        }
      });

      const obstacleIds = new Set(driftState.obstacles.map((obstacle) => obstacle.id));
      drift3d.obstacleObjects.forEach((object3d, id) => {
        if (obstacleIds.has(id)) return;
        drift3d.scene.remove(object3d);
        drift3d.obstacleObjects.delete(id);
      });

      driftState.obstacles.forEach((obstacle) => {
        let obstacleObject = drift3d.obstacleObjects.get(obstacle.id);
        if (!obstacleObject) {
          const obstacleType = obstacle.type === 'box' ? 'box' : 'cone';
          if (obstacleType === 'box') {
            if (drift3d.boxPrototype) {
              obstacleObject = drift3d.boxPrototype.clone(true);
            } else {
              obstacleObject = createFallbackBoxMesh();
            }
          } else if (drift3d.conePrototype) {
            obstacleObject = drift3d.conePrototype.clone(true);
          } else {
            obstacleObject = createFallbackConeMesh();
          }
          obstacleObject.userData.baseScale = obstacleObject.scale.clone();
          drift3d.scene.add(obstacleObject);
          drift3d.obstacleObjects.set(obstacle.id, obstacleObject);
        }
        const sceneX = obstacle.x * drift3d.worldScale;
        const sceneZ = obstacle.y * drift3d.worldScale;
        const obstacleType = obstacle.type === 'box' ? 'box' : 'cone';
        const baseSize = obstacleType === 'box' ? 42 : 36;
        const scaleMultiplier = Math.max(0.68, obstacle.size / baseSize);
        if (obstacleObject.userData.baseScale) {
          obstacleObject.scale.copy(obstacleObject.userData.baseScale).multiplyScalar(scaleMultiplier);
        } else {
          obstacleObject.scale.setScalar(scaleMultiplier);
        }
        obstacleObject.position.x = sceneX;
        obstacleObject.position.z = sceneZ;
        obstacleObject.rotation.y = -obstacle.rotation;
      });
    };

    const renderOrionDriftFrame = () => {
      if (!driftCanvasEl) return;
      if (!ensureDriftThreeScene()) return;
      resolveDriftWorldSize();
      syncDriftThreeEntities();

      const isDarkTheme = document.documentElement.classList.contains('dark-theme');
      const themeKey = isDarkTheme ? 'dark' : 'light';
      if (drift3d.themeKey !== themeKey) {
        drift3d.themeKey = themeKey;
        const clearColor = isDarkTheme ? 0x111318 : 0xf0e6d4;
        const groundColor = isDarkTheme ? 0x1a1d22 : 0xe7dac3;
        const gridColor = isDarkTheme ? 0x2e3642 : 0x9f8e72;
        drift3d.renderer.setClearColor(clearColor, 1);
        drift3d.scene.fog = new THREE.Fog(clearColor, 30, 130);
        if (drift3d.ground?.material) drift3d.ground.material.color.setHex(groundColor);
        if (drift3d.grid) {
          drift3d.grid.material.color.setHex(gridColor);
          drift3d.grid.material.opacity = isDarkTheme ? 0.28 : 0.34;
        }
      }

      const carX = driftState.carX * drift3d.worldScale;
      const carZ = driftState.carY * drift3d.worldScale;
      const visualCarAngle = Number.isFinite(driftState.bodyAngle) ? driftState.bodyAngle : driftState.carAngle;
      const forwardX = Math.sin(visualCarAngle);
      const forwardZ = -Math.cos(visualCarAngle);
      const sideX = Math.cos(visualCarAngle);
      const sideZ = Math.sin(visualCarAngle);
      const speedAbs = Math.abs(driftState.speed);
      const speedRatio = Math.max(0, Math.min(1, speedAbs / 620));
      const yaw = Math.atan2(forwardX, forwardZ);

      drift3d.carRoot.position.set(carX, 0.08, carZ);
      drift3d.carRoot.rotation.y = yaw;
      const visualSteerTarget = Math.max(-0.62, Math.min(0.62, driftState.steerAngle * 1.1));
      drift3d.steerVisual += (visualSteerTarget - drift3d.steerVisual) * 0.22;
      const wheelTurnAngle = Math.max(-0.48, Math.min(0.48, drift3d.steerVisual));
      drift3d.frontWheels.forEach((wheel) => {
        wheel.node.rotation.y = wheel.baseY - wheelTurnAngle;
      });

      const beamAlpha = (driftState.isRunning ? 0.9 : 0.5) * (0.55 + Math.min(0.45, speedAbs / 640));
      drift3d.headlights.forEach((light) => {
        light.intensity = (isDarkTheme ? 4.4 : 3.2) * beamAlpha;
        light.distance = 22 + Math.min(24, speedAbs * 0.07);
      });

      const brakeInput = driftState.isRunning ? Math.max(0, -resolveDriftThrottleInput()) : 0;
      const brakeStrength = Math.min(1, brakeInput * (speedAbs > 10 ? 1 : 0.7));
      drift3d.brakeLights.forEach((light) => {
        light.intensity = 0.18 + brakeStrength * 2.2;
      });
      const isReversePreparing = driftState.isRunning
        && driftState.shiftTargetDirection < 0
        && driftState.shiftDelayTimer > 0
        && Math.abs(driftState.speed) < 1.5;
      const isReverseEngaged = driftState.isRunning && driftState.gearDirection < 0;
      const reverseStrength = isReversePreparing ? 0.35 : isReverseEngaged ? 0.22 : 0;
      drift3d.reverseLights.forEach((light) => {
        light.intensity = reverseStrength;
      });

      const steerBlend = Math.min(1, 0.035 + speedRatio * 0.06);
      driftState.cameraSteer += (driftState.lastSteerInput - driftState.cameraSteer) * steerBlend;
      const lateralShift = driftState.cameraSteer * (0.08 + speedRatio * 0.24);
      const lookAhead = 5.6 + speedRatio * 9.4;
      const followDistance = 6.8 + speedRatio * 1.6;
      const cameraHeight = 3.9 + speedRatio * 1.0;
      const reverseBlend = (1 - driftState.cameraDriveDirection) * 0.5;
      const baseCameraHeading = Number.isFinite(driftState.cameraHeading)
        ? driftState.cameraHeading
        : visualCarAngle;
      const cameraHeading = baseCameraHeading + driftState.cameraDriftYaw * 0.72 + reverseBlend * Math.PI;
      const cameraForwardX = Math.sin(cameraHeading);
      const cameraForwardZ = -Math.cos(cameraHeading);
      const cameraSideX = Math.cos(cameraHeading);
      const cameraSideZ = Math.sin(cameraHeading);
      const desiredCamera = new THREE.Vector3(
        carX - cameraForwardX * followDistance + cameraSideX * lateralShift + driftState.cameraShakeX * 0.012,
        cameraHeight,
        carZ - cameraForwardZ * followDistance + cameraSideZ * lateralShift + driftState.cameraShakeY * 0.012
      );
      const desiredLookAt = new THREE.Vector3(
        carX + cameraForwardX * lookAhead + cameraSideX * lateralShift * 0.34,
        0.82,
        carZ + cameraForwardZ * lookAhead + cameraSideZ * lateralShift * 0.34
      );
      const cameraLerp = Math.min(1, 0.045 + speedRatio * 0.09);
      drift3d.cameraPosition.lerp(desiredCamera, cameraLerp);
      drift3d.cameraLookAt.lerp(desiredLookAt, Math.min(1, cameraLerp * 1.15));
      const targetFov = 60 + speedRatio * 12;
      if (Math.abs(drift3d.camera.fov - targetFov) > 0.05) {
        drift3d.camera.fov += (targetFov - drift3d.camera.fov) * Math.min(1, cameraLerp * 0.9);
        drift3d.camera.updateProjectionMatrix();
      }
      drift3d.camera.position.copy(drift3d.cameraPosition);
      drift3d.camera.lookAt(drift3d.cameraLookAt);

      drift3d.renderer.render(drift3d.scene, drift3d.camera);
    };

    const ensureDriftAssets = () => {
      if (!driftCanvasEl) return;
      if (!ensureDriftThreeScene()) return;
      const carSrc = driftCanvasEl.dataset.carSrc || '';
      const coneSrc = driftCanvasEl.dataset.coneSrc || '';
      const boxSrc = driftCanvasEl.dataset.boxSrc || '';
      const orbSrc = driftCanvasEl.dataset.orbSrc || '';
      if (!boxSrc) driftState.boxReady = true;

      if (
        driftState.assetsLoading
        || (driftState.carReady && driftState.coneReady && driftState.boxReady && driftState.orbReady)
      ) return;
      driftState.assetsLoading = true;
      const tasks = [];

      const normalizeLoadedModel = (object3d, targetSize) => {
        object3d.traverse((node) => {
          if (!node.isMesh) return;
          node.castShadow = true;
          node.receiveShadow = false;
          if (node.material) {
            node.material.metalness = Math.min(0.65, node.material.metalness ?? 0.12);
            node.material.roughness = Math.max(0.28, node.material.roughness ?? 0.62);
          }
        });
        const box = new THREE.Box3().setFromObject(object3d);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDimension = Math.max(size.x, size.y, size.z, 0.001);
        const scaleFactor = targetSize / maxDimension;
        object3d.scale.multiplyScalar(scaleFactor);
        box.setFromObject(object3d);
        const center = new THREE.Vector3();
        box.getCenter(center);
        object3d.position.sub(center);
        box.setFromObject(object3d);
        object3d.position.y -= box.min.y;
      };

      const finish = () => {
        driftState.assetsLoading = false;
        renderOrionDriftFrame();
      };

      if (!driftState.carReady && carSrc) {
        tasks.push(new Promise((resolve) => {
          drift3d.loader.load(carSrc, (gltf) => {
            const carScene = gltf.scene || gltf.scenes?.[0];
            if (carScene && drift3d.carRoot) {
              normalizeLoadedModel(carScene, 2.7);
              if (drift3d.carVisual) drift3d.carRoot.remove(drift3d.carVisual);
              if (drift3d.carFallback) drift3d.carRoot.remove(drift3d.carFallback);
              drift3d.carVisual = carScene;
              drift3d.carRoot.add(carScene);
              drift3d.frontWheels = [];
              drift3d.steerVisual = 0;
              carScene.traverse((node) => {
                const nodeName = String(node.name || '').toLowerCase();
                if (!nodeName.includes('wheel') || !nodeName.includes('front')) return;
                drift3d.frontWheels.push({
                  node,
                  baseY: node.rotation.y
                });
              });
              alignDriftCarLights(carScene);
            }
            driftState.carReady = true;
            resolve();
          }, undefined, () => {
            driftState.carReady = true;
            resolve();
          });
        }));
      }

      if (!driftState.coneReady && coneSrc) {
        tasks.push(new Promise((resolve) => {
          drift3d.loader.load(coneSrc, (gltf) => {
            const coneScene = gltf.scene || gltf.scenes?.[0];
            if (coneScene) {
              normalizeLoadedModel(coneScene, 1.05);
              drift3d.conePrototype = coneScene;
            }
            driftState.coneReady = true;
            resolve();
          }, undefined, () => {
            driftState.coneReady = true;
            resolve();
          });
        }));
      }

      if (!driftState.boxReady && boxSrc) {
        tasks.push(new Promise((resolve) => {
          drift3d.loader.load(boxSrc, (gltf) => {
            const boxScene = gltf.scene || gltf.scenes?.[0];
            if (boxScene) {
              normalizeLoadedModel(boxScene, 1.18);
              drift3d.boxPrototype = boxScene;
            }
            driftState.boxReady = true;
            resolve();
          }, undefined, () => {
            driftState.boxReady = true;
            resolve();
          });
        }));
      }

      if (!driftState.orbReady && orbSrc) {
        tasks.push(new Promise((resolve) => {
          drift3d.textureLoader.load(orbSrc, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.anisotropy = Math.min(8, drift3d.renderer?.capabilities?.getMaxAnisotropy?.() || 1);
            texture.needsUpdate = true;
            drift3d.coinTexture = texture;
            drift3d.coinMaterial = new THREE.SpriteMaterial({
              map: texture,
              transparent: true,
              depthWrite: false,
              depthTest: false
            });
            driftState.orbReady = true;
            resolve();
          }, undefined, () => {
            driftState.orbReady = true;
            resolve();
          });
        }));
      }

      if (!tasks.length) {
        finish();
        return;
      }
      Promise.all(tasks).finally(finish);
    };

    const resetOrionDriftRound = () => {
      driftState.score = 0;
      driftState.scoreRaw = 0;
      driftState.multiplier = 1;
      driftState.orbs = 0;
      driftState.earnedCents = 0;
      driftState.rewardLogged = false;
      driftState.runTime = 0;
      driftState.speed = 0;
      driftState.carX = 0;
      driftState.carY = 0;
      driftState.carAngle = 0;
      driftState.bodyAngle = 0;
      driftState.steerAngle = 0;
      driftState.yawRate = 0;
      driftState.driftSlipVelocity = 0;
      driftState.cameraX = 0;
      driftState.cameraY = 0;
      driftState.prevCameraX = 0;
      driftState.prevCameraY = 0;
      driftState.cameraShakeX = 0;
      driftState.cameraShakeY = 0;
      driftState.backgroundScroll = 0;
      driftState.backgroundFlowSpeed = 0;
      driftState.driftCharge = 0;
      driftState.driftTime = 0;
      driftState.coins = [];
      driftState.obstacles = [];
      driftState.particles = [];
      driftState.tireTracks = [];
      driftState.trackSpawnCarry = 0;
      driftState.trackIdSeed = 0;
      driftState.exhaustPuffs = [];
      driftState.exhaustSpawnTimer = 0;
      driftState.exhaustIdSeed = 0;
      driftState.wheelSmokePuffs = [];
      driftState.wheelSmokeSpawnCarry = 0;
      driftState.wheelSmokeIdSeed = 0;
      driftState.coinSpawnTimer = 0.5;
      driftState.obstacleSpawnTimer = 0.9;
      driftState.hitCooldown = 0;
      driftState.lastTimestamp = performance.now();
      driftState.steerDirection = 0;
      driftState.throttleDirection = 0;
      driftState.touchSteerDirection = 0;
      driftState.touchThrottleDirection = 0;
      driftState.keyLeft = false;
      driftState.keyRight = false;
      driftState.keyGas = false;
      driftState.keyBrake = false;
      driftState.keyHandbrake = false;
      driftState.lastSteerInput = 0;
      driftState.cameraSteer = 0;
      driftState.cameraDriveDirection = 1;
      driftState.cameraHeading = 0;
      driftState.cameraDriftYaw = 0;
      driftState.gearDirection = 1;
      driftState.shiftTargetDirection = 0;
      driftState.shiftDelayTimer = 0;
      for (let i = 0; i < 10; i += 1) spawnDriftCoin(140, 900);
      for (let i = 0; i < 8; i += 1) spawnDriftObstacle(190, 1200);
      syncDriftControlButtons();
      updateDriftHud();
      renderOrionDriftFrame();
    };

    const stopOrionDrift = (reason = 'finished') => {
      const hasProgress = driftState.score > 0 || driftState.orbs > 0 || driftState.earnedCents > 0;
      const shouldHandle = driftState.isRunning || ((reason === 'switch' || reason === 'restart') && hasProgress);
      if (!shouldHandle) return;

      driftState.isRunning = false;
      if (driftState.rafId) {
        window.cancelAnimationFrame(driftState.rafId);
        driftState.rafId = null;
      }
      if (this.orionDriftAnimationFrame) {
        window.cancelAnimationFrame(this.orionDriftAnimationFrame);
        this.orionDriftAnimationFrame = null;
      }

      commitDriftReward();
      if (driftState.score > driftState.best) {
        driftState.best = driftState.score;
        saveDriftBest();
      }

      if (driftPanelEl) driftPanelEl.classList.remove('is-running');
      if (driftStartBtn) driftStartBtn.textContent = 'Старт';

      if (reason === 'switch') {
        setDriftStatus('Режим призупинено. Повернись в Nymo Drive, щоб продовжити поїздку.');
      } else if (reason !== 'restart') {
        setDriftStatus(`Сесію завершено. Очки: ${Math.floor(driftState.score)}. Орби: ${driftState.orbs}. Зароблено: ${this.formatCoinBalance(driftState.earnedCents)}.`);
      }

      syncDriftControlButtons();
      updateDriftHud();
      renderOrionDriftFrame();
    };

    const stepOrionDrift = (timestamp) => {
      if (!driftState.isRunning) return;
      if (!miniGamesSection.isConnected || !miniGamesSection.classList.contains('active') || currentMiniGameView !== 'drift') {
        stopOrionDrift('switch');
        return;
      }

      const elapsedSeconds = Math.min(1 / 30, Math.max(0, (timestamp - driftState.lastTimestamp) / 1000));
      driftState.lastTimestamp = timestamp;
      driftState.runTime += elapsedSeconds;
      driftState.hitCooldown = Math.max(0, driftState.hitCooldown - elapsedSeconds);
      if (!Number.isFinite(driftState.bodyAngle)) driftState.bodyAngle = driftState.carAngle;
      if (!Number.isFinite(driftState.cameraHeading)) driftState.cameraHeading = driftState.bodyAngle;
      if (!Number.isFinite(driftState.cameraDriftYaw)) driftState.cameraDriftYaw = 0;

      const steerInput = resolveDriftSteerInput();
      const throttleInput = resolveDriftThrottleInput();
      const handbrakeRequested = driftState.keyHandbrake;
      const carPhysics = this.getOrionDriveCarPhysics(this.user?.equippedDriveCar || '');
      driftState.lastSteerInput = Math.max(-1, Math.min(1, steerInput));
      syncDriftControlButtons();

      const desiredDirection = throttleInput > 0 ? 1 : throttleInput < 0 ? -1 : 0;
      const isShiftRequested = desiredDirection !== 0 && desiredDirection !== driftState.gearDirection;
      const isNearlyStopped = Math.abs(driftState.speed) < 8;

      if (isShiftRequested) {
        driftState.shiftTargetDirection = desiredDirection;
        if (!isNearlyStopped) {
          driftState.shiftDelayTimer = DRIFT_SHIFT_DELAY_SECONDS;
          const shiftBrakeForce = carPhysics.shiftBrakeForce;
          if (driftState.speed > 0) {
            driftState.speed = Math.max(0, driftState.speed - shiftBrakeForce * elapsedSeconds);
          } else {
            driftState.speed = Math.min(0, driftState.speed + shiftBrakeForce * elapsedSeconds);
          }
        } else {
          driftState.speed = 0;
          if (driftState.shiftDelayTimer <= 0) {
            driftState.shiftDelayTimer = DRIFT_SHIFT_DELAY_SECONDS;
          }
          driftState.shiftDelayTimer = Math.max(0, driftState.shiftDelayTimer - elapsedSeconds);
          if (driftState.shiftDelayTimer <= 0) {
            driftState.gearDirection = desiredDirection;
            driftState.shiftTargetDirection = 0;
          }
        }
      } else {
        if (driftState.shiftTargetDirection !== 0) {
          driftState.shiftTargetDirection = 0;
          driftState.shiftDelayTimer = 0;
        }

        if (desiredDirection === 0) {
          const coastingDrag = handbrakeRequested ? 1.95 : 0.22;
          driftState.speed *= Math.exp(-coastingDrag * elapsedSeconds);
          if (Math.abs(driftState.speed) < 0.35) driftState.speed = 0;
        } else if (desiredDirection > 0) {
          if (driftState.speed < 0) driftState.speed += carPhysics.transitionBrake * elapsedSeconds;
          driftState.speed += handbrakeRequested ? 130 * elapsedSeconds : carPhysics.forwardAccel * elapsedSeconds;
        } else {
          if (driftState.speed > 0) driftState.speed -= carPhysics.transitionBrake * elapsedSeconds;
          driftState.speed -= carPhysics.reverseAccel * elapsedSeconds;
        }
      }

      const maxForward = carPhysics.maxForward;
      const maxReverse = carPhysics.maxReverse;
      driftState.speed = Math.max(-maxReverse, Math.min(maxForward, driftState.speed));

      let speedAbs = Math.abs(driftState.speed);
      const handbrakeActive = handbrakeRequested && driftState.gearDirection >= 0 && speedAbs > 5;
      if (handbrakeActive) {
        const handbrakeDrag = 1.35 + Math.min(1.45, speedAbs / 300);
        driftState.speed *= Math.exp(-handbrakeDrag * elapsedSeconds);
        speedAbs = Math.abs(driftState.speed);
      }
      const speedRatio = Math.max(0, Math.min(1, speedAbs / Math.max(560, maxForward)));
      const throttleActive = Math.abs(throttleInput) > 0.08;
      const idleExhaust = !throttleActive && speedAbs < 5;
      const coastExhaust = !throttleActive && speedAbs >= 5;
      driftState.exhaustSpawnTimer = Math.max(0, driftState.exhaustSpawnTimer - elapsedSeconds);
      if (!throttleActive && (idleExhaust || coastExhaust)) {
        if (driftState.exhaustSpawnTimer <= 0) {
          const exhaustForwardX = Math.sin(driftState.bodyAngle);
          const exhaustForwardY = -Math.cos(driftState.bodyAngle);
          const exhaustSideX = Math.cos(driftState.bodyAngle);
          const exhaustSideY = Math.sin(driftState.bodyAngle);
          const puffStrength = idleExhaust ? 0.16 : 0.07;
          const emitterOffsets = [-driftState.exhaustSideOffset, driftState.exhaustSideOffset];
          emitterOffsets.forEach((offset) => {
            const exhaustX = driftState.carX
              - exhaustForwardX * driftState.exhaustRearOffset
              + exhaustSideX * offset;
            const exhaustY = driftState.carY
              - exhaustForwardY * driftState.exhaustRearOffset
              + exhaustSideY * offset;
            addDriftExhaustPuff(exhaustX, exhaustY, driftState.bodyAngle, puffStrength, speedAbs);
          });
          driftState.exhaustSpawnTimer = idleExhaust
            ? 0.11 + Math.random() * 0.06
            : 0.2 + Math.random() * 0.1;
        }
      } else {
        driftState.exhaustSpawnTimer = 0;
      }
      const cameraDirectionTarget = driftState.speed <= -8
        ? -1
        : driftState.speed >= 8
          ? 1
          : driftState.cameraDriveDirection;
      driftState.cameraDriveDirection += (cameraDirectionTarget - driftState.cameraDriveDirection)
        * Math.min(1, elapsedSeconds * 6.2);
      const targetBackgroundSpeed = speedAbs * 0.42;
      const backgroundLerp = Math.min(1, elapsedSeconds * (throttleInput === 0 ? 2.4 : 4));
      driftState.backgroundFlowSpeed += (targetBackgroundSpeed - driftState.backgroundFlowSpeed) * backgroundLerp;
      driftState.backgroundScroll = (driftState.backgroundScroll + driftState.backgroundFlowSpeed * elapsedSeconds) % 20000;
      const steerSpeedPenalty = Math.max(0, Math.min(1, speedAbs / Math.max(560, maxForward)));
      const maxSteerAngle = (36 - steerSpeedPenalty * 14) * (Math.PI / 180);
      const targetSteerAngle = steerInput * maxSteerAngle;
      const steerResponse = 10.2 - steerSpeedPenalty * 2.1;
      driftState.steerAngle += (targetSteerAngle - driftState.steerAngle) * Math.min(1, elapsedSeconds * steerResponse);

      const wheelBase = Math.max(56, Math.round(driftState.worldHeight * 0.11));
      const baseGripFactor = 1 - Math.max(0, Math.min(0.52, (speedAbs - 170) / 620));
      const handbrakeGripPenalty = handbrakeActive ? Math.min(0.42, 0.18 + speedAbs / 760) : 0;
      const gripFactor = Math.max(0.16, baseGripFactor - handbrakeGripPenalty);
      const steerAuthority = 2.35 - steerSpeedPenalty * 0.3;
      const targetYawRate = (driftState.speed / wheelBase) * Math.tan(driftState.steerAngle) * gripFactor * steerAuthority;
      const yawResponse = 10.8 - steerSpeedPenalty * 1.6;
      driftState.yawRate += (targetYawRate - driftState.yawRate) * Math.min(1, elapsedSeconds * yawResponse);

      const steerNormalized = maxSteerAngle > 0.001 ? Math.abs(driftState.steerAngle) / maxSteerAngle : 0;
      const steerAbs = Math.abs(steerInput);
      const driftSpeedFactor = Math.max(0, Math.min(1, (speedAbs - 102) / 260));
      const driftSteerFactor = Math.max(0, Math.min(1, (steerAbs - 0.24) / 0.5));
      const driftThrottleFactor = throttleInput > 0 ? 1 : 0.68;
      let driftIntentStrength = desiredDirection >= 0
        ? driftSpeedFactor * driftSteerFactor * driftThrottleFactor
        : 0;
      if (handbrakeActive) {
        const handbrakeBoost = (0.22 + Math.min(0.46, speedAbs / 300)) * Math.max(0.28, steerAbs);
        driftIntentStrength += handbrakeBoost;
      }
      driftIntentStrength = Math.max(0, Math.min(1.45, driftIntentStrength));
      const driftIntent = driftIntentStrength > 0.04;
      const steadyCornerSlip = Math.sign(steerInput) * speedAbs * steerNormalized * 0.02;
      const handbrakeSlipBoost = handbrakeActive ? 0.16 : 0;
      const driftSlipTarget = Math.sign(steerInput) * speedAbs * (0.055 + driftIntentStrength * 0.23 + handbrakeSlipBoost);
      const slipTarget = driftIntent ? driftSlipTarget : steadyCornerSlip;
      const slipBuild = 2.5 + driftIntentStrength * 5.6 + steerSpeedPenalty * 0.9;
      driftState.driftSlipVelocity += (slipTarget - driftState.driftSlipVelocity) * Math.min(1, elapsedSeconds * slipBuild);
      const counterSteer = steerAbs > 0.08 && Math.sign(steerInput) !== Math.sign(driftState.driftSlipVelocity);
      if (!driftIntent || steerAbs < 0.08) {
        const slipDamping = counterSteer ? (9.4 + steerSpeedPenalty * 2.4) : (6.2 + steerSpeedPenalty * 1.8);
        driftState.driftSlipVelocity *= Math.exp(-elapsedSeconds * slipDamping);
      }

      const slipRatio = speedAbs > 1
        ? Math.min(1.2, Math.abs(driftState.driftSlipVelocity) / Math.max(42, speedAbs * 0.62))
        : 0;
      const yawSlipAssist = (driftState.driftSlipVelocity / Math.max(108, speedAbs * 0.9))
        * (1.5 + driftIntentStrength * 4.8 + (handbrakeActive ? 2 : 0));
      driftState.yawRate += yawSlipAssist * elapsedSeconds;
      driftState.yawRate *= Math.exp(-elapsedSeconds * (0.52 + (1 - driftIntentStrength) * 0.24 + steerSpeedPenalty * 0.16));
      driftState.carAngle += driftState.yawRate * elapsedSeconds;
      const slipVisualStrength = Math.min(1, Math.abs(driftState.driftSlipVelocity) / Math.max(120, speedAbs * 0.85));
      const maxBodySlipAngle = (8 + speedRatio * 12 + driftIntentStrength * 24) * (Math.PI / 180);
      const slipVisualAngle = Math.max(
        -maxBodySlipAngle,
        Math.min(
          maxBodySlipAngle,
          (driftState.driftSlipVelocity / Math.max(128, speedAbs * 0.88)) * (0.38 + slipVisualStrength * 1.02)
        )
      );
      const bodyTargetAngle = driftState.carAngle + slipVisualAngle;
      const bodyAngleDelta = Math.atan2(
        Math.sin(bodyTargetAngle - driftState.bodyAngle),
        Math.cos(bodyTargetAngle - driftState.bodyAngle)
      );
      const bodyFollowSpeed = Math.min(1, elapsedSeconds * (5.2 + speedRatio * 4.6 + driftIntentStrength * 3.8));
      driftState.bodyAngle += bodyAngleDelta * bodyFollowSpeed;
      const cameraDriftYawTargetRaw = Math.max(
        -0.34,
        Math.min(
          0.34,
          (driftState.driftSlipVelocity / Math.max(170, speedAbs * 1.08)) * (0.16 + driftIntentStrength * 0.34)
        )
      );
      const cameraDriftYawTarget = Math.abs(cameraDriftYawTargetRaw) < 0.008 ? 0 : cameraDriftYawTargetRaw;
      const cameraDriftYawLerp = Math.min(1, elapsedSeconds * (2.1 + driftIntentStrength * 3.2));
      driftState.cameraDriftYaw += (cameraDriftYawTarget - driftState.cameraDriftYaw) * cameraDriftYawLerp;
      const cameraHeadingDelta = Math.atan2(
        Math.sin(driftState.bodyAngle - driftState.cameraHeading),
        Math.cos(driftState.bodyAngle - driftState.cameraHeading)
      );
      const cameraHeadingFollow = Math.min(1, elapsedSeconds * (1.5 + speedRatio * 1.2));
      driftState.cameraHeading += cameraHeadingDelta * cameraHeadingFollow;

      const isDrifting = speedAbs > 102 && driftIntentStrength > 0.2 && slipRatio > 0.14;
      if (isDrifting) {
        driftState.driftTime += elapsedSeconds;
        driftState.driftCharge = Math.min(1, driftState.driftCharge + elapsedSeconds * 0.72);
      } else {
        driftState.driftTime = Math.max(0, driftState.driftTime - elapsedSeconds * 2.4);
        driftState.driftCharge = Math.max(0, driftState.driftCharge - elapsedSeconds * 0.52);
      }

      const targetMultiplier = isDrifting ? Math.min(5, 1 + driftState.driftCharge * 2.6) : 1;
      driftState.multiplier += (targetMultiplier - driftState.multiplier) * Math.min(1, elapsedSeconds * 8);

      const forwardX = Math.sin(driftState.carAngle);
      const forwardY = -Math.cos(driftState.carAngle);
      const sideX = Math.cos(driftState.carAngle);
      const sideY = Math.sin(driftState.carAngle);
      driftState.carX += forwardX * driftState.speed * elapsedSeconds;
      driftState.carY += forwardY * driftState.speed * elapsedSeconds;
      const sideSlip = driftState.driftSlipVelocity * (0.2 + driftState.driftCharge * 0.46);
      driftState.carX += sideX * sideSlip * elapsedSeconds;
      driftState.carY += sideY * sideSlip * elapsedSeconds;
      if (isDrifting || driftIntentStrength > 0.16) {
        addDriftParticles(
          driftState.carX - sideX * 26,
          driftState.carY - sideY * 26,
          isDrifting ? 4 : 2
        );
      }

      const carHitRadius = Math.max(22, Math.round(driftState.worldHeight * 0.045));
      for (let i = driftState.obstacles.length - 1; i >= 0; i -= 1) {
        const obstacle = driftState.obstacles[i];
        const dx = driftState.carX - obstacle.x;
        const dy = driftState.carY - obstacle.y;
        const obstacleRadius = obstacle.size * (obstacle.type === 'box' ? 0.38 : 0.32);
        const hitDistance = carHitRadius + obstacleRadius;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared > hitDistance * hitDistance) continue;

        const distance = Math.max(0.001, Math.sqrt(distanceSquared));
        const normalX = dx / distance;
        const normalY = dy / distance;
        const overlap = hitDistance - distance;
        driftState.carX += normalX * overlap;
        driftState.carY += normalY * overlap;
        driftState.speed *= -0.16;
        driftState.driftSlipVelocity *= -0.24;
        if (Math.abs(driftState.speed) < 18) driftState.speed = 0;
        driftState.yawRate += (Math.random() - 0.5) * 1.2;
        driftState.scoreRaw = Math.max(0, driftState.scoreRaw - 18);
        addDriftParticles(obstacle.x, obstacle.y, 12, 'rgba(255, 148, 96, 0.86)');
        driftState.cameraShakeX += normalX * 2.1;
        driftState.cameraShakeY += normalY * 2.1;
        if (driftState.hitCooldown <= 0) {
          setDriftStatus('Удар об перешкоду! Обережніше на швидкості.');
          driftState.hitCooldown = 1.05;
        }
        driftState.obstacles.splice(i, 1);
        driftState.obstacleSpawnTimer = Math.min(driftState.obstacleSpawnTimer, 0.35);
      }

      const visualForwardX = Math.sin(driftState.bodyAngle);
      const visualForwardY = -Math.cos(driftState.bodyAngle);
      const visualSideX = Math.cos(driftState.bodyAngle);
      const visualSideY = Math.sin(driftState.bodyAngle);
      const rearOffset = driftState.trackRearOffset;
      const wheelOffset = driftState.trackWheelOffset;
      const trackWidth = driftState.trackMarkWidth;
      const trackLength = driftState.trackMarkLength;
      const rearX = driftState.carX - visualForwardX * rearOffset;
      const rearY = driftState.carY - visualForwardY * rearOffset;
      const leftWheelX = rearX - visualSideX * wheelOffset;
      const leftWheelY = rearY - visualSideY * wheelOffset;
      const rightWheelX = rearX + visualSideX * wheelOffset;
      const rightWheelY = rearY + visualSideY * wheelOffset;
      const burnoutActive = handbrakeRequested && throttleInput > 0.24 && speedAbs < 96;
      const wheelSlipLevel = Math.min(
        1.35,
        slipRatio
          + driftIntentStrength * 0.86
          + (handbrakeActive ? 0.34 : 0)
          + (burnoutActive ? 0.42 : 0)
      );
      const shouldLeaveTracks = speedAbs > 42
        && (isDrifting || handbrakeActive || driftIntentStrength > 0.12 || throttleInput < 0 || (Math.abs(steerInput) > 0.26 && speedAbs > 88));
      if (shouldLeaveTracks) {
        const driftTrackBoost = Math.min(0.7, driftIntentStrength * 1.1);
        const intensity = isDrifting
          ? 1
          : Math.min(1, 0.62 + driftTrackBoost + Math.min(0.26, speedAbs / 680));
        const trackSpawnRate = isDrifting ? 74 : (30 + driftIntentStrength * 26);
        driftState.trackSpawnCarry += elapsedSeconds * trackSpawnRate * Math.min(2.4, speedAbs / 180);
        while (driftState.trackSpawnCarry >= 1) {
          driftState.trackSpawnCarry -= 1;
          addDriftTrackMark(leftWheelX, leftWheelY, driftState.bodyAngle, intensity, trackWidth, trackLength);
          addDriftTrackMark(rightWheelX, rightWheelY, driftState.bodyAngle, intensity, trackWidth, trackLength);
        }
      } else {
        driftState.trackSpawnCarry = Math.max(0, driftState.trackSpawnCarry - elapsedSeconds * 5);
      }

      const shouldEmitWheelSmoke = wheelSlipLevel > 0.1 && (speedAbs > 28 || burnoutActive);
      if (shouldEmitWheelSmoke) {
        const smokeRate = (isDrifting ? 46 : burnoutActive ? 36 : 24) * (0.58 + wheelSlipLevel * 0.82);
        driftState.wheelSmokeSpawnCarry += elapsedSeconds * smokeRate;
        while (driftState.wheelSmokeSpawnCarry >= 1) {
          driftState.wheelSmokeSpawnCarry -= 1;
          const smokeStrength = Math.min(
            1.25,
            0.24
              + wheelSlipLevel * 0.58
              + (isDrifting ? 0.22 : 0)
              + (burnoutActive ? 0.3 : 0)
          );
          addDriftWheelSmokeCluster(
            leftWheelX,
            leftWheelY,
            driftState.bodyAngle,
            smokeStrength,
            speedAbs,
            burnoutActive,
            -1
          );
          addDriftWheelSmokeCluster(
            rightWheelX,
            rightWheelY,
            driftState.bodyAngle,
            smokeStrength,
            speedAbs,
            burnoutActive,
            1
          );
          if (smokeStrength > 0.72 || burnoutActive) {
            addDriftWheelSmokePuff(rearX, rearY, driftState.bodyAngle, smokeStrength, speedAbs, burnoutActive, {
              alongOffset: 0.42 + Math.random() * 0.3,
              sideOffset: (Math.random() * 2 - 1) * (wheelOffset * 0.42),
              heightBoost: 0.06 + Math.random() * 0.03,
              spreadBoost: 0.22 + smokeStrength * 0.16,
              sizeBoost: 1.4 + smokeStrength * 0.88,
              opacityBoost: 0.03,
              lifeBoost: 0.16,
              riseBoost: 0.08,
              swirlBoost: 0.16
            });
          }
        }
      } else {
        driftState.wheelSmokeSpawnCarry = Math.max(0, driftState.wheelSmokeSpawnCarry - elapsedSeconds * 6);
      }

      const previousCameraX = driftState.cameraX;
      const previousCameraY = driftState.cameraY;
      const cameraLookAhead = Math.min(160, speedAbs * 0.22);
      const movementSign = driftState.speed >= 0 ? 1 : -1;
      const cameraTargetHeading = driftState.cameraHeading + driftState.cameraDriftYaw * 0.35;
      const cameraForwardX = Math.sin(cameraTargetHeading);
      const cameraForwardY = -Math.cos(cameraTargetHeading);
      const cameraTargetX = driftState.carX + cameraForwardX * cameraLookAhead * movementSign;
      const cameraTargetY = driftState.carY + cameraForwardY * cameraLookAhead * movementSign;
      const camLerp = Math.min(1, elapsedSeconds * (5.2 + speedAbs / 240));
      driftState.cameraX += (cameraTargetX - driftState.cameraX) * camLerp;
      driftState.cameraY += (cameraTargetY - driftState.cameraY) * camLerp;
      driftState.prevCameraX = previousCameraX;
      driftState.prevCameraY = previousCameraY;
      const shakeIntensity = Math.max(0, Math.min(1, (speedAbs - 190) / 280));
      if (shakeIntensity > 0.001) {
        const shakeAmplitude = 2.8 * shakeIntensity;
        const phaseBase = driftState.runTime * (22 + speedAbs * 0.03);
        const targetShakeX = (
          Math.sin(phaseBase * 1.09)
          + Math.sin(phaseBase * 2.03 + 1.2) * 0.36
        ) * shakeAmplitude * 0.62;
        const targetShakeY = (
          Math.cos(phaseBase * 0.98 + 0.8)
          + Math.sin(phaseBase * 1.74) * 0.34
        ) * shakeAmplitude * 0.84;
        const shakeLerp = Math.min(1, elapsedSeconds * 14);
        driftState.cameraShakeX += (targetShakeX - driftState.cameraShakeX) * shakeLerp;
        driftState.cameraShakeY += (targetShakeY - driftState.cameraShakeY) * shakeLerp;
      } else {
        const settleLerp = Math.min(1, elapsedSeconds * 12);
        driftState.cameraShakeX += (0 - driftState.cameraShakeX) * settleLerp;
        driftState.cameraShakeY += (0 - driftState.cameraShakeY) * settleLerp;
      }

      driftState.coinSpawnTimer -= elapsedSeconds;
      driftState.obstacleSpawnTimer -= elapsedSeconds;
      if (driftState.coinSpawnTimer <= 0) {
        spawnDriftCoin();
        driftState.coinSpawnTimer = 0.7 + Math.random() * 1.4;
      }
      if (driftState.obstacleSpawnTimer <= 0) {
        spawnDriftObstacle(230, 1200);
        driftState.obstacleSpawnTimer = 0.9 + Math.random() * 1.8;
      }

      const pickupReward = Math.max(2, Math.ceil(this.getTapLevelStats().rewardPerTapCents * 0.6));
      for (let i = driftState.coins.length - 1; i >= 0; i -= 1) {
        const coin = driftState.coins[i];
        const dx = driftState.carX - coin.x;
        const dy = driftState.carY - coin.y;
        const pickupDistance = Math.max(48, coin.size * 0.85);
        if (dx * dx + dy * dy <= pickupDistance * pickupDistance) {
          driftState.coins.splice(i, 1);
          driftState.orbs += 1;
          addDriftReward(pickupReward);
          addDriftParticles(coin.x, coin.y, 9, 'rgba(64, 191, 255, 0.8)');
          driftState.coinSpawnTimer = Math.min(driftState.coinSpawnTimer, 0.25);
          continue;
        }
        if (dx * dx + dy * dy > 3_400_000) {
          driftState.coins.splice(i, 1);
        }
      }

      for (let i = driftState.obstacles.length - 1; i >= 0; i -= 1) {
        const obstacle = driftState.obstacles[i];
        const dx = driftState.carX - obstacle.x;
        const dy = driftState.carY - obstacle.y;
        if (dx * dx + dy * dy > 8_600_000) {
          driftState.obstacles.splice(i, 1);
        }
      }

      driftState.particles.forEach((particle) => {
        particle.x += particle.vx * elapsedSeconds;
        particle.y += particle.vy * elapsedSeconds;
        particle.life -= elapsedSeconds;
      });
      driftState.particles = driftState.particles.filter((particle) => particle.life > 0);
      driftState.exhaustPuffs.forEach((puff) => {
        puff.x += puff.vx * elapsedSeconds;
        puff.y += puff.vy * elapsedSeconds;
        puff.height += puff.rise * elapsedSeconds;
        puff.vx *= Math.exp(-elapsedSeconds * 2.4);
        puff.vy *= Math.exp(-elapsedSeconds * 2.4);
        puff.life -= elapsedSeconds;
      });
      driftState.exhaustPuffs = driftState.exhaustPuffs.filter((puff) => puff.life > 0);
      driftState.wheelSmokePuffs.forEach((puff) => {
        puff.age = (puff.age || 0) + elapsedSeconds;
        const lifeProgress = puff.maxLife > 0 ? Math.max(0, 1 - (puff.life / puff.maxLife)) : 0;
        const swirl = Number.isFinite(puff.swirl) ? puff.swirl : 0.18;
        const noiseSpeed = Number.isFinite(puff.noiseSpeed) ? puff.noiseSpeed : 4;
        const noisePhase = (Number.isFinite(puff.noisePhase) ? puff.noisePhase : 0)
          + puff.age * noiseSpeed;
        const turbulence = swirl * (0.72 + lifeProgress * 0.94);
        puff.vx += Math.cos(noisePhase) * turbulence * elapsedSeconds;
        puff.vy += Math.sin(noisePhase * 0.92 + 0.7) * turbulence * elapsedSeconds;
        puff.x += puff.vx * elapsedSeconds;
        puff.y += puff.vy * elapsedSeconds;
        puff.height += puff.rise * elapsedSeconds;
        const drag = Number.isFinite(puff.drag) ? puff.drag : 3.1;
        const velocityDamping = Math.exp(-elapsedSeconds * drag);
        puff.vx *= velocityDamping;
        puff.vy *= velocityDamping;
        puff.life -= elapsedSeconds;
      });
      driftState.wheelSmokePuffs = driftState.wheelSmokePuffs.filter((puff) => puff.life > 0);
      driftState.tireTracks.forEach((track) => {
        track.life -= elapsedSeconds;
      });
      driftState.tireTracks = driftState.tireTracks.filter((track) => track.life > 0);

      driftState.scoreRaw += speedAbs * 0.055 * (isDrifting ? driftState.multiplier : 1) * elapsedSeconds;
      driftState.score = Math.max(0, Math.floor(driftState.scoreRaw));
      if (driftState.score > driftState.best) {
        driftState.best = driftState.score;
      }

      updateDriftHud();
      renderOrionDriftFrame();
      driftState.rafId = window.requestAnimationFrame(stepOrionDrift);
      this.orionDriftAnimationFrame = driftState.rafId;
    };

    const startOrionDrift = () => {
      if (!driftCanvasEl) return;
      resolveDriftWorldSize();
      ensureDriftAssets();
      stopOrionDrift('restart');
      resetOrionDriftRound();
      driftState.isRunning = true;
      driftState.lastTimestamp = performance.now();
      if (driftPanelEl) driftPanelEl.classList.add('is-running');
      if (driftStartBtn) driftStartBtn.textContent = 'Рестарт';
      setDriftStatus(getDriftRunningStatusText());
      driftState.rafId = window.requestAnimationFrame(stepOrionDrift);
      this.orionDriftAnimationFrame = driftState.rafId;
    };

    const getGridRow = (row) => {
      const start = row * GRID_2048_SIZE;
      return grid2048State.board.slice(start, start + GRID_2048_SIZE);
    };

    const setGridRow = (row, values) => {
      const start = row * GRID_2048_SIZE;
      for (let i = 0; i < GRID_2048_SIZE; i += 1) {
        grid2048State.board[start + i] = values[i];
      }
    };

    const getGridColumn = (col) => (
      Array.from({ length: GRID_2048_SIZE }, (_, row) => grid2048State.board[row * GRID_2048_SIZE + col])
    );

    const setGridColumn = (col, values) => {
      for (let row = 0; row < GRID_2048_SIZE; row += 1) {
        grid2048State.board[row * GRID_2048_SIZE + col] = values[row];
      }
    };

    const mergeGridLine = (line) => {
      const compact = line.filter((value) => value !== 0);
      let gained = 0;

      for (let i = 0; i < compact.length - 1; i += 1) {
        if (compact[i] !== compact[i + 1]) continue;
        compact[i] *= 2;
        gained += compact[i];
        compact.splice(i + 1, 1);
      }

      while (compact.length < GRID_2048_SIZE) compact.push(0);

      const moved = compact.some((value, index) => value !== line[index]);
      return { values: compact, gained, moved };
    };

    const getGridEmptyIndexes = () => {
      const indexes = [];
      grid2048State.board.forEach((value, index) => {
        if (value === 0) indexes.push(index);
      });
      return indexes;
    };

    const spawnGridTile = (count = 1) => {
      for (let i = 0; i < count; i += 1) {
        const emptyIndexes = getGridEmptyIndexes();
        if (!emptyIndexes.length) return;
        const randomIndex = emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)];
        grid2048State.board[randomIndex] = Math.random() < 0.9 ? 2 : 4;
      }
    };

    const checkGridGameOver = () => {
      if (grid2048State.board.includes(0)) return false;

      for (let row = 0; row < GRID_2048_SIZE; row += 1) {
        for (let col = 0; col < GRID_2048_SIZE; col += 1) {
          const index = row * GRID_2048_SIZE + col;
          const value = grid2048State.board[index];
          const right = col < GRID_2048_SIZE - 1 ? grid2048State.board[index + 1] : null;
          const down = row < GRID_2048_SIZE - 1 ? grid2048State.board[index + GRID_2048_SIZE] : null;
          if (value === right || value === down) return false;
        }
      }

      return true;
    };

    const renderGrid2048 = () => {
      if (!gridBoardEl) return;
      if (gridBoardEl.childElementCount !== GRID_2048_SIZE * GRID_2048_SIZE) {
        gridBoardEl.innerHTML = '';
        for (let i = 0; i < GRID_2048_SIZE * GRID_2048_SIZE; i += 1) {
          const cell = document.createElement('div');
          cell.className = 'tile';
          gridBoardEl.appendChild(cell);
        }
      }

      const tiles = gridBoardEl.querySelectorAll('.tile');
      tiles.forEach((tile, index) => {
        const value = grid2048State.board[index];
        tile.className = 'tile';
        tile.textContent = value ? String(value) : '';
        if (!value) return;

        const cappedClass = value <= 2048 ? `value-${value}` : 'value-2048';
        tile.classList.add(cappedClass);
        if (value >= 128) tile.classList.add('value-high');
        if (value >= 1024) tile.classList.add('value-super');
      });

      if (gridScoreEl) gridScoreEl.textContent = String(grid2048State.score);
      if (gridBestEl) gridBestEl.textContent = String(grid2048State.best);
      if (gridEarnedEl) gridEarnedEl.textContent = this.formatCoinBalance(grid2048State.earnedCents);
      const endMessage = grid2048State.isGameOver
        ? `Гру завершено\nЗароблено: ${this.formatCoinBalance(grid2048State.earnedCents)}`
        : '';
      if (gridPanelEl) {
        gridPanelEl.classList.toggle('game-over', grid2048State.isGameOver);
      }
      if (gridCanvasEl) {
        gridCanvasEl.dataset.endMessage = endMessage;
      }
    };

    const startGrid2048 = () => {
      commitGridReward();
      grid2048State.board = new Array(GRID_2048_SIZE * GRID_2048_SIZE).fill(0);
      grid2048State.score = 0;
      grid2048State.isGameOver = false;
      grid2048State.earnedCents = 0;
      grid2048State.rewardLogged = false;
      spawnGridTile(2);
      renderGrid2048();
    };

    const applyGridMove = (direction) => {
      if (grid2048State.isGameOver) return false;
      let moved = false;
      let gainedTotal = 0;

      const processLine = (line, reverse = false) => {
        const source = reverse ? [...line].reverse() : [...line];
        const merged = mergeGridLine(source);
        const values = reverse ? merged.values.reverse() : merged.values;
        if (merged.moved) moved = true;
        gainedTotal += merged.gained;
        return values;
      };

      if (direction === 'left' || direction === 'right') {
        for (let row = 0; row < GRID_2048_SIZE; row += 1) {
          const nextValues = processLine(getGridRow(row), direction === 'right');
          setGridRow(row, nextValues);
        }
      } else {
        for (let col = 0; col < GRID_2048_SIZE; col += 1) {
          const nextValues = processLine(getGridColumn(col), direction === 'down');
          setGridColumn(col, nextValues);
        }
      }

      if (!moved) return false;

      grid2048State.score += gainedTotal;
      if (gainedTotal > 0) {
        const rewardCents = Math.max(1, Math.floor(gainedTotal / 16));
        grid2048State.earnedCents += rewardCents;
        this.setTapBalanceCents(this.getTapBalanceCents() + rewardCents, {
          transactionMeta: {
            title: 'Гра: Nymo 2048',
            category: 'games',
            amountCents: rewardCents
          }
        });
        balanceEl.textContent = this.formatCoinBalance(this.getTapBalanceCents());
      }
      if (grid2048State.score > grid2048State.best) {
        grid2048State.best = grid2048State.score;
        saveGridBest();
      }

      spawnGridTile(1);
      grid2048State.isGameOver = checkGridGameOver();
      if (grid2048State.isGameOver) commitGridReward();
      renderGrid2048();
      return true;
    };

    const handleGridMove = (direction) => {
      if (currentMiniGameView !== 'grid2048') return;
      if (!miniGamesSection.isConnected || !miniGamesSection.classList.contains('active')) return;
      applyGridMove(direction);
    };

    const setMiniGameView = (view) => {
      const safeView = normalizeMiniGameView(view);
      currentMiniGameView = safeView;
      if (miniGamesSection) {
        miniGamesSection.dataset.activeMiniGame = safeView;
        const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;
        if (isMobileViewport) {
          miniGamesSection.dataset.mobileMiniGameFullscreen = safeView === 'tapper' ? 'false' : 'true';
          const appEl = document.querySelector('.orion-app');
          if (appEl) {
            appEl.classList.toggle('mobile-game-fullscreen', safeView !== 'tapper');
          }
        } else {
          delete miniGamesSection.dataset.mobileMiniGameFullscreen;
          const appEl = document.querySelector('.orion-app');
          if (appEl) {
            appEl.classList.remove('mobile-game-fullscreen');
          }
        }
        if (isMobileViewport && safeView === 'drift') {
          lockLandscapeForDrift();
        } else {
          if (isMobileViewport) {
            lockPortraitForApp();
          } else {
            unlockOrientationIfAvailable();
          }
        }
        applyMiniGameContainerBackground(safeView);
      }

      gameSelectButtons.forEach((buttonEl) => {
        const isActive = buttonEl.dataset.miniGameSelect === safeView;
        buttonEl.classList.toggle('active', isActive);
        buttonEl.setAttribute('aria-pressed', String(isActive));
      });

      gamePanels.forEach((panelEl) => {
        const isActive = panelEl.dataset.miniGamePanel === safeView;
        panelEl.classList.toggle('active', isActive);
      });

      if (safeView !== 'grid2048') {
        commitGridReward();
      }
      if (safeView !== 'flappy') {
        stopFlappyOrion('switch');
      } else {
        resolveFlappyWorldSize();
        ensureFlappyAssets();
        renderFlappyFrame();
      }
      if (safeView !== 'drift') {
        stopOrionDrift('switch');
      } else {
        resolveDriftWorldSize();
        ensureDriftAssets();
        renderOrionDriftFrame();
      }

      try {
        window.localStorage.setItem(MINI_GAME_VIEW_KEY, safeView);
      } catch {
        // Ignore storage failures.
      }
    };

    const addMobileGameCenterBackButtons = () => {
      const panelsWithHeader = settingsContainer.querySelectorAll('.mini-game-panel.mini-game-view[data-mini-game-panel]');
      panelsWithHeader.forEach((panelEl) => {
        const panelName = panelEl.dataset.miniGamePanel;
        if (!panelName || panelName === 'tapper') return;
        const headerEl = panelEl.querySelector('.mini-game-view-header');
        if (!headerEl || headerEl.querySelector('[data-mini-game-mobile-back]')) return;
        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'mini-game-mobile-back';
        backBtn.setAttribute('data-mini-game-mobile-back', 'true');
        backBtn.setAttribute('aria-label', 'Повернутись в ігровий центр');
        backBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"></path>
          </svg>
        `;
        backBtn.addEventListener('click', () => setMiniGameView('tapper'));
        headerEl.prepend(backBtn);
      });
    };

    addMobileGameCenterBackButtons();

    gameSelectButtons.forEach((buttonEl) => {
      if (buttonEl.dataset.bound === 'true') return;
      buttonEl.dataset.bound = 'true';
      buttonEl.addEventListener('click', () => {
        setMiniGameView(buttonEl.dataset.miniGameSelect || 'tapper');
      });
    });

    if (gridReplayBtn && gridReplayBtn.dataset.bound !== 'true') {
      gridReplayBtn.dataset.bound = 'true';
      gridReplayBtn.addEventListener('click', () => {
        setMiniGameView('grid2048');
        startGrid2048();
      });
    }

    if (flappyStartBtn && flappyStartBtn.dataset.bound !== 'true') {
      flappyStartBtn.dataset.bound = 'true';
      flappyStartBtn.addEventListener('click', () => {
        setMiniGameView('flappy');
        startFlappyOrion();
      });
    }

    if (flappyCanvasWrapEl && flappyCanvasWrapEl.dataset.bound !== 'true') {
      flappyCanvasWrapEl.dataset.bound = 'true';
      flappyCanvasWrapEl.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        setMiniGameView('flappy');
        flappyJump();
      });
    }

    if (driftStartBtn && driftStartBtn.dataset.bound !== 'true') {
      driftStartBtn.dataset.bound = 'true';
      driftStartBtn.addEventListener('click', () => {
        lockLandscapeForDrift();
        setMiniGameView('drift');
        startOrionDrift();
      });
    }

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

    if (driftCanvasWrapEl && driftCanvasWrapEl.dataset.bound !== 'true') {
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
          if (currentMiniGameView !== 'drift') setMiniGameView('drift');
          event.preventDefault();
        } else {
          driftState.touchSteerDirection = 0;
        }
        syncDriftControlButtons();
      }, { passive: false });

      const finishSwipe = (event) => {
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

    if (this.grid2048KeyHandler) {
      document.removeEventListener('keydown', this.grid2048KeyHandler);
      this.grid2048KeyHandler = null;
    }
    this.grid2048KeyHandler = (event) => {
      if (currentMiniGameView !== 'grid2048') return;
      if (event.defaultPrevented) return;
      const keyMap = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'up',
        a: 'left',
        s: 'down',
        d: 'right'
      };
      const direction = keyMap[event.key];
      if (!direction) return;
      event.preventDefault();
      handleGridMove(direction);
    };
    document.addEventListener('keydown', this.grid2048KeyHandler);

    if (this.flappyOrionKeyHandler) {
      document.removeEventListener('keydown', this.flappyOrionKeyHandler);
      this.flappyOrionKeyHandler = null;
    }
    this.flappyOrionKeyHandler = (event) => {
      if (currentMiniGameView !== 'flappy') return;
      if (!miniGamesSection.isConnected || !miniGamesSection.classList.contains('active')) return;
      if (event.defaultPrevented) return;
      if (event.repeat && flappyState.isRunning) return;

      const isJumpKey = event.code === 'Space'
        || event.code === 'ArrowUp'
        || event.code === 'KeyW';
      if (!isJumpKey) return;

      event.preventDefault();
      flappyJump();
    };
    document.addEventListener('keydown', this.flappyOrionKeyHandler);

    if (this.orionDriftKeyDownHandler) {
      document.removeEventListener('keydown', this.orionDriftKeyDownHandler);
      this.orionDriftKeyDownHandler = null;
    }
    if (this.orionDriftKeyUpHandler) {
      document.removeEventListener('keyup', this.orionDriftKeyUpHandler);
      this.orionDriftKeyUpHandler = null;
    }
    this.orionDriftKeyDownHandler = (event) => {
      if (currentMiniGameView !== 'drift') return;
      if (!miniGamesSection.isConnected || !miniGamesSection.classList.contains('active')) return;
      if (event.defaultPrevented) return;
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
        driftState.keyLeft = true;
        event.preventDefault();
      } else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
        driftState.keyRight = true;
        event.preventDefault();
      } else if (event.code === 'ArrowUp' || event.code === 'KeyW') {
        driftState.keyGas = true;
        event.preventDefault();
      } else if (event.code === 'ArrowDown' || event.code === 'KeyS') {
        driftState.keyBrake = true;
        event.preventDefault();
      } else if (event.code === 'Space') {
        driftState.keyHandbrake = true;
        event.preventDefault();
      }
      syncDriftControlButtons();
    };
    this.orionDriftKeyUpHandler = (event) => {
      if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
        driftState.keyLeft = false;
      } else if (event.code === 'ArrowRight' || event.code === 'KeyD') {
        driftState.keyRight = false;
      } else if (event.code === 'ArrowUp' || event.code === 'KeyW') {
        driftState.keyGas = false;
      } else if (event.code === 'ArrowDown' || event.code === 'KeyS') {
        driftState.keyBrake = false;
      } else if (event.code === 'Space') {
        driftState.keyHandbrake = false;
        event.preventDefault();
      }
      syncDriftControlButtons();
    };
    document.addEventListener('keydown', this.orionDriftKeyDownHandler);
    document.addEventListener('keyup', this.orionDriftKeyUpHandler);

    let gridTouchStartX = 0;
    let gridTouchStartY = 0;

    if (gridCanvasEl && gridCanvasEl.dataset.bound !== 'true') {
      gridCanvasEl.dataset.bound = 'true';

      gridCanvasEl.addEventListener('touchstart', (event) => {
        const point = event.changedTouches?.[0];
        if (!point) return;
        gridTouchStartX = point.clientX;
        gridTouchStartY = point.clientY;
      }, { passive: true });

      gridCanvasEl.addEventListener('touchend', (event) => {
        const point = event.changedTouches?.[0];
        if (!point) return;
        const dx = point.clientX - gridTouchStartX;
        const dy = point.clientY - gridTouchStartY;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
        if (Math.abs(dx) > Math.abs(dy)) {
          handleGridMove(dx > 0 ? 'right' : 'left');
          return;
        }
        handleGridMove(dy > 0 ? 'down' : 'up');
      }, { passive: true });
    }

    resolveFlappyWorldSize();
    ensureFlappyAssets();
    updateFlappyHud();
    renderFlappyFrame();
    resolveDriftWorldSize();
    ensureDriftAssets();
    setDriftStatus(getDriftIdleStatusText());
    syncMiniGameControlHints();
    updateDriftHud();
    renderOrionDriftFrame();
    startGrid2048();
    setMiniGameView(currentMiniGameView);

    if (this.flappyOrionResizeHandler) {
      window.removeEventListener('resize', this.flappyOrionResizeHandler);
      this.flappyOrionResizeHandler = null;
    }
    this.flappyOrionResizeHandler = () => {
      resolveFlappyWorldSize();
      renderFlappyFrame();
      resolveDriftWorldSize();
      renderOrionDriftFrame();
      syncMiniGameControlHints();
      applyMiniGameContainerBackground(currentMiniGameView);
    };
    window.addEventListener('resize', this.flappyOrionResizeHandler, { passive: true });

    if (window.innerWidth <= 768 && tapperContentEl && levelIslandEl) {
      if (rateEl && rateEl.parentElement === tapperContentEl) {
        tapperContentEl.insertBefore(levelIslandEl, rateEl);
      } else {
        tapperContentEl.appendChild(levelIslandEl);
      }
      levelIslandEl.style.setProperty('position', 'static', 'important');
      levelIslandEl.style.setProperty('top', 'auto', 'important');
      levelIslandEl.style.setProperty('right', 'auto', 'important');
      levelIslandEl.style.setProperty('left', 'auto', 'important');
      levelIslandEl.style.setProperty('transform', 'none', 'important');
      levelIslandEl.style.setProperty('margin-top', '8px', 'important');
      levelIslandEl.style.setProperty('align-self', 'center', 'important');
    }

    if (miniGamesSection && miniGamesSection.dataset.zoomLockBound !== 'true') {
      miniGamesSection.dataset.zoomLockBound = 'true';

      const preventMultiTouchZoom = (event) => {
        if (event.touches && event.touches.length > 1) {
          event.preventDefault();
        }
      };
      const preventGestureZoom = (event) => {
        event.preventDefault();
      };
      const preventCtrlWheelZoom = (event) => {
        if (event.ctrlKey) {
          event.preventDefault();
        }
      };

      miniGamesSection.addEventListener('touchstart', preventMultiTouchZoom, { passive: false });
      miniGamesSection.addEventListener('touchmove', preventMultiTouchZoom, { passive: false });
      miniGamesSection.addEventListener('gesturestart', preventGestureZoom);
      miniGamesSection.addEventListener('gesturechange', preventGestureZoom);
      miniGamesSection.addEventListener('gestureend', preventGestureZoom);
      miniGamesSection.addEventListener('wheel', preventCtrlWheelZoom, { passive: false });
    }

    const syncTapperStats = () => {
      const stats = this.getTapLevelStats();
      balanceEl.textContent = this.formatCoinBalance(this.getTapBalanceCents());

      if (levelValueEl) {
        levelValueEl.textContent = String(stats.level);
      }
      if (levelIslandEl) {
        const progressPercent = Math.max(0, Math.min(100, Math.round(stats.levelProgress * 100)));
        levelIslandEl.style.setProperty('--coin-level-progress', `${progressPercent}%`);
      }
      if (rewardValueEl) {
        rewardValueEl.textContent = this.formatCoinBalance(stats.rewardPerTapCents, 1);
      }
    };

    this.setTapBalanceCents(this.getTapBalanceCents());
    this.setTapTotalClicks(this.getTapTotalClicks());
    syncTapperStats();

    if (tapBtn.dataset.bound === 'true') return;
    tapBtn.dataset.bound = 'true';

    let tapAnimationTimer = null;
    let lastTapTimestamp = Number.NEGATIVE_INFINITY;
    const TAP_DEDUPE_MS = 40;

    tapBtn.addEventListener('click', (event) => {
      const eventTimestamp = typeof event.timeStamp === 'number' ? event.timeStamp : performance.now();
      if (eventTimestamp - lastTapTimestamp < TAP_DEDUPE_MS) return;
      lastTapTimestamp = eventTimestamp;

      const levelStats = this.getTapLevelStats();
      const rewardCents = levelStats.rewardPerTapCents;
      const currentBalance = this.getTapBalanceCents();
      this.setTapBalanceCents(currentBalance + rewardCents, {
        transactionMeta: {
          title: 'Гра: Клікер',
          category: 'games',
          amountCents: rewardCents
        }
      });
      this.setTapTotalClicks(levelStats.totalClicks + 1);
      syncTapperStats();

      tapBtn.classList.remove('is-tapping');
      void tapBtn.offsetWidth;
      tapBtn.classList.add('is-tapping');

      if (tapAnimationTimer) window.clearTimeout(tapAnimationTimer);
      tapAnimationTimer = window.setTimeout(() => {
        tapBtn.classList.remove('is-tapping');
      }, 180);
    });
  }

  initProfileItems(settingsContainer, options = {}) {
    const balanceEl = settingsContainer.querySelector('#profileItemsBalance');
    const itemsCountEl = settingsContainer.querySelector('#profileItemsCount');
    const gridEl = settingsContainer.querySelector('#profileItemsGrid');
    const viewButtons = settingsContainer.querySelectorAll('[data-profile-items-view]');
    if (!balanceEl || !itemsCountEl || !gridEl) return;
    const scope = options?.scope === 'games' ? 'games' : 'all';

    const inventory = new Set(this.loadShopInventory());
    const shopCatalog = [
      ...this.getShopCatalog(),
      ...this.getOrionDriveCarCatalog(),
      ...this.getOrionDriveSmokeCatalog()
    ];
    const catalogById = new Map(shopCatalog.map(item => [item.id, item]));
    const carPreviewCache = this.shopCarPreviewCache instanceof Map ? this.shopCarPreviewCache : new Map();
    const SELL_MULTIPLIER = 0.6;
    const PROFILE_ITEMS_VIEW_KEY = 'orionProfileItemsView';
    const normalizeView = (value) => (value === 'list' ? 'list' : 'cards');
    let currentView = 'cards';

    try {
      currentView = normalizeView(window.localStorage.getItem(PROFILE_ITEMS_VIEW_KEY));
    } catch {
      currentView = 'cards';
    }

    const setView = (view) => {
      currentView = normalizeView(view);
      gridEl.classList.toggle('is-list', currentView === 'list');
      viewButtons.forEach(btn => {
        const isActive = btn.dataset.profileItemsView === currentView;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
      });
      try {
        window.localStorage.setItem(PROFILE_ITEMS_VIEW_KEY, currentView);
      } catch {
        // Ignore storage failures.
      }
    };

    const getSellPrice = (item) => Math.max(1, Math.floor(item.price * SELL_MULTIPLIER));

    const getTypeLabel = (type) => {
      if (type === 'frame') return 'Рамка';
      if (type === 'aura') return 'Фон';
      if (type === 'motion') return 'Анімація';
      if (type === 'badge') return 'Бейдж';
      if (type === 'car') return 'Авто Nymo Drive';
      if (type === 'smoke') return 'Дим Nymo Drive';
      return 'Предмет';
    };

    const isGameItem = (item) => item?.type === 'car' || item?.type === 'smoke';

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
        const cachedPreview = carPreviewCache.get(item.effect);
        const previewSrc = cachedPreview || item.previewSrc;
        const qualityClass = cachedPreview ? 'is-enhanced' : 'is-fallback';
        return `
          <div class="shop-item-preview-vehicle">
            <img
              class="shop-item-preview-vehicle-image ${qualityClass}"
              src="${previewSrc}"
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

    const setEquippedValue = (item, value) => {
      if (item.type === 'frame') this.user.equippedAvatarFrame = value;
      if (item.type === 'aura') this.user.equippedProfileAura = value;
      if (item.type === 'motion') this.user.equippedProfileMotion = value;
      if (item.type === 'badge') this.user.equippedProfileBadge = value;
      if (item.type === 'car') this.user.equippedDriveCar = value;
      if (item.type === 'smoke') this.user.equippedDriveSmokeColor = value;
    };

    const saveCosmetics = () => {
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
    };

    const renderInventory = () => {
      const ownedItems = [...inventory]
        .map(id => catalogById.get(id))
        .filter(Boolean)
        .filter((item) => (scope === 'games' ? isGameItem(item) : true));

      balanceEl.textContent = this.formatCoinBalance(this.getTapBalanceCents());
      itemsCountEl.textContent = String(ownedItems.length);

      if (!ownedItems.length) {
        gridEl.innerHTML = `
          <div class="profile-items-empty">
            <strong>${scope === 'games' ? 'Ігрових предметів поки немає' : 'Інвентар порожній'}</strong>
            <span>${scope === 'games' ? 'Купи предмети Nymo Drive у магазині, щоб керувати ними тут.' : 'Купи предмети в магазині, щоб керувати ними тут.'}</span>
          </div>
        `;
        return;
      }

      gridEl.innerHTML = ownedItems.map(item => {
        const equipped = isEquipped(item);
        const sellPrice = getSellPrice(item);

        return `
          <article class="shop-item-card profile-item-card ${equipped ? 'equipped' : ''}">
            <div class="shop-item-top profile-item-top">
              <span class="shop-item-type profile-item-type">${getTypeLabel(item.type)}</span>
            </div>
            <div class="shop-item-preview">
              ${createPreview(item)}
            </div>
            <h3 class="shop-item-title profile-item-title">${escapeHtml(item.title)}</h3>
            <p class="shop-item-description profile-item-description">${escapeHtml(item.description)}</p>
            <div class="profile-item-actions">
              <button
                type="button"
                class="shop-item-action profile-item-action profile-item-action-equip ${equipped ? 'is-equipped' : 'is-owned'}"
                data-profile-item-action="toggle-equip"
                data-profile-item-id="${item.id}"
              >${equipped ? 'Зняти з профілю' : 'Встановити в профіль'}</button>
              <button
                type="button"
                class="shop-item-action profile-item-action profile-item-action-sell can-buy"
                data-profile-item-action="sell"
                data-profile-item-id="${item.id}"
              >Продати за&nbsp;<span class="currency-value-inline">${this.formatCoinBalance(sellPrice, 1)}</span></button>
            </div>
          </article>
        `;
      }).join('');
    };

    renderInventory();
    setView(currentView);

    viewButtons.forEach(btn => {
      if (btn.dataset.bound === 'true') return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', () => {
        const nextView = btn.dataset.profileItemsView;
        setView(nextView);
      });
    });

    if (gridEl.dataset.bound === 'true') return;
    gridEl.dataset.bound = 'true';

    gridEl.addEventListener('click', async (event) => {
      const actionBtn = event.target.closest('[data-profile-item-action]');
      if (!actionBtn) return;

      const itemId = actionBtn.dataset.profileItemId;
      const action = actionBtn.dataset.profileItemAction;
      if (!itemId || !action) return;

      const item = catalogById.get(itemId);
      if (!item || !inventory.has(item.id)) return;

      if (action === 'toggle-equip') {
        const equipped = isEquipped(item);
        setEquippedValue(item, equipped ? '' : item.effect);
        saveCosmetics();
        renderInventory();
        return;
      }

      if (action === 'sell') {
        const sellPrice = getSellPrice(item);
        const confirmed = await this.showConfirm(
          `Продати "${item.title}" за ${this.formatCoinBalance(sellPrice, 1)}?`,
          'Продаж предмета'
        );
        if (!confirmed) return;

        inventory.delete(item.id);
        this.saveShopInventory([...inventory]);

        if (isEquipped(item)) {
          setEquippedValue(item, '');
          saveCosmetics();
        }

        this.applyCoinTransaction(
          sellPrice,
          `Продаж: ${item.title}`,
          { category: 'shop' }
        );
        renderInventory();
      }
    });
  }

  initWalletLedger(settingsContainer, options = {}) {
    const safeOptions = options && typeof options === 'object' ? options : {};
    const balanceEl = settingsContainer.querySelector('#walletBalanceValue');
    const badgeEl = settingsContainer.querySelector('#walletBalanceBadge');
    const countEl = settingsContainer.querySelector('#walletTransactionsCount');
    const listEl = settingsContainer.querySelector('#walletTransactionsList');
    const walletViewButtons = [...settingsContainer.querySelectorAll('[data-wallet-view]')];
    const walletPanels = [...settingsContainer.querySelectorAll('[data-wallet-panel]')];
    const analyticsIncomeEl = settingsContainer.querySelector('#walletAnalyticsIncome');
    const analyticsExpenseEl = settingsContainer.querySelector('#walletAnalyticsExpense');
    const analyticsNetEl = settingsContainer.querySelector('#walletAnalyticsNet');
    const analyticsBarsTitleEl = settingsContainer.querySelector('#walletAnalyticsBarsTitle');
    const analyticsLineTitleEl = settingsContainer.querySelector('#walletAnalyticsLineTitle');
    const analyticsBarsEl = settingsContainer.querySelector('#walletAnalyticsBars');
    const analyticsAreaEl = settingsContainer.querySelector('#walletAnalyticsArea');
    const analyticsLineChartEl = settingsContainer.querySelector('#walletAnalyticsLineChart');
    const analyticsLineEl = settingsContainer.querySelector('#walletAnalyticsLine');
    const analyticsZeroLineEl = settingsContainer.querySelector('#walletAnalyticsZeroLine');
    const analyticsPointsEl = settingsContainer.querySelector('#walletAnalyticsPoints');
    const analyticsLineWrapEl = settingsContainer.querySelector('#walletAnalyticsLineWrap');
    const analyticsLineTooltipEl = settingsContainer.querySelector('#walletAnalyticsLineTooltip');
    const analyticsLineStartDayEl = settingsContainer.querySelector('#walletAnalyticsLineStartDay');
    const analyticsLineEndDayEl = settingsContainer.querySelector('#walletAnalyticsLineEndDay');
    const analyticsDonutEl = settingsContainer.querySelector('#walletAnalyticsDonut');
    const analyticsDonutSegmentsEl = settingsContainer.querySelector('#walletAnalyticsDonutSegments');
    const analyticsDonutCenterLabelEl = settingsContainer.querySelector('#walletAnalyticsDonutCenterLabel');
    const analyticsDonutCenterValueEl = settingsContainer.querySelector('#walletAnalyticsDonutCenterValue');
    const analyticsSourcesEl = settingsContainer.querySelector('#walletAnalyticsSourceList');
    const analyticsRangeControlEls = [
      ...settingsContainer.querySelectorAll('[data-analytics-range-control]')
    ];
    const analyticsModeControlEl = settingsContainer.querySelector('#walletAnalyticsMode');
    const analyticsFocusLabelEl = settingsContainer.querySelector('#walletAnalyticsFocusLabel');
    const analyticsFocusValueEl = settingsContainer.querySelector('#walletAnalyticsFocusValue');
    const analyticsFocusMetaEl = settingsContainer.querySelector('#walletAnalyticsFocusMeta');
    const donutPalette = ['#64e6bf', '#63beff', '#f7cb67', '#b89aff', '#ff94b8'];
    const donutMutedPalette = [
      'rgba(100, 230, 191, 0.3)',
      'rgba(99, 190, 255, 0.3)',
      'rgba(247, 203, 103, 0.3)',
      'rgba(184, 154, 255, 0.3)',
      'rgba(255, 148, 184, 0.3)'
    ];
    const analyticsSourceColorMap = {
      'ігри': { color: '#58b8ff', mutedColor: 'rgba(88, 184, 255, 0.28)' },
      'списання': { color: '#ff6b8a', mutedColor: 'rgba(255, 107, 138, 0.28)' },
      'магазин': { color: '#f7b84f', mutedColor: 'rgba(247, 184, 79, 0.28)' },
      'перекази': { color: '#a58bff', mutedColor: 'rgba(165, 139, 255, 0.28)' },
      'бонуси': { color: '#5fd8d0', mutedColor: 'rgba(95, 216, 208, 0.28)' },
      'інше': { color: '#9db0c9', mutedColor: 'rgba(157, 176, 201, 0.26)' }
    };
    const readCssVarColor = (name, fallback) => {
      try {
        const resolved = window.getComputedStyle(document.documentElement)
          .getPropertyValue(name)
          .trim();
        return resolved || fallback;
      } catch {
        return fallback;
      }
    };
    const getWalletIncomeColor = () => readCssVarColor('--wallet-income-color', '#3ed08b');
    const getWalletIncomeMutedColor = () => `color-mix(in srgb, ${getWalletIncomeColor()} 28%, transparent)`;
    const analyticsModeLabels = {
      net: 'Чистий результат',
      income: 'Дохід',
      expense: 'Витрати'
    };
    let analyticsDonutSegments = [];
    let analyticsActiveSourceIndex = null;
    let analyticsDailySeries = [];
    let analyticsLinePoints = [];
    let analyticsLineViewportWidth = 300;
    let analyticsLineViewportHeight = 120;
    let analyticsMode = 'net';
    let analyticsRangeDays = 14;
    let analyticsPeriodIncome = 0;
    let analyticsPeriodExpense = 0;
    let analyticsPeriodNet = 0;
    let analyticsPeriodTransactions = 0;
    let analyticsActiveDayKey = '';
    if (!balanceEl || !listEl) return;

    const formatPercentLabel = (value) => {
      const safeValue = Number.isFinite(value) ? value : 0;
      if (safeValue >= 99.95) return '100%';
      return `${safeValue.toFixed(1).replace('.', ',')}%`;
    };

    const setAnalyticsDonutCenter = (segment = null) => {
      if (!analyticsDonutCenterLabelEl || !analyticsDonutCenterValueEl) return;

      if (!segment) {
        if (analyticsDonutSegments.length) {
          analyticsDonutCenterLabelEl.textContent = 'Усі джерела';
          analyticsDonutCenterValueEl.textContent = '100%';
        } else {
          analyticsDonutCenterLabelEl.textContent = 'Немає даних';
          analyticsDonutCenterValueEl.textContent = '0%';
        }
        analyticsDonutCenterValueEl.removeAttribute('title');
        return;
      }

      analyticsDonutCenterLabelEl.textContent = segment.label;
      analyticsDonutCenterValueEl.textContent = formatPercentLabel(segment.percent);
      analyticsDonutCenterValueEl.title = this.formatCoinBalance(segment.amount);
    };

    const setAnalyticsFocus = ({ label, value, meta, tone = 'neutral' }) => {
      if (!analyticsFocusLabelEl || !analyticsFocusValueEl || !analyticsFocusMetaEl) return;
      analyticsFocusLabelEl.textContent = label || 'Фокус';
      analyticsFocusValueEl.textContent = value || 'Увесь період';
      analyticsFocusMetaEl.textContent = meta || 'Наведи на рядок, точку графіка або джерело.';
      const focusRoot = analyticsFocusLabelEl.closest('.wallet-analytics-focus');
      if (focusRoot) focusRoot.dataset.tone = tone;
    };

    const setIdleAnalyticsFocus = () => {
      const periodLabel = `${analyticsRangeDays} днів`;
      const modeLabel = analyticsModeLabels[analyticsMode] || analyticsModeLabels.net;
      const modeValue = analyticsMode === 'income'
        ? analyticsPeriodIncome
        : analyticsMode === 'expense'
          ? -analyticsPeriodExpense
          : analyticsPeriodNet;
      setAnalyticsFocus({
        label: `${modeLabel} · ${periodLabel}`,
        value: formatSignedCoins(modeValue),
        meta: `Транзакцій у періоді: ${analyticsPeriodTransactions}`,
        tone: modeValue >= 0 ? 'positive' : 'negative'
      });
    };

    const setAnalyticsControlState = () => {
      analyticsRangeControlEls.forEach((controlEl) => {
        controlEl.querySelectorAll('[data-analytics-range]').forEach((button) => {
          if (!(button instanceof HTMLButtonElement)) return;
          const buttonRange = Number(button.getAttribute('data-analytics-range'));
          const isActive = buttonRange === analyticsRangeDays;
          button.classList.toggle('is-active', isActive);
          button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
      });

      if (analyticsModeControlEl) {
        analyticsModeControlEl.querySelectorAll('[data-analytics-mode]').forEach((button) => {
          if (!(button instanceof HTMLButtonElement)) return;
          const buttonMode = String(button.getAttribute('data-analytics-mode') || '').trim().toLowerCase();
          const isActive = buttonMode === analyticsMode;
          button.classList.toggle('is-active', isActive);
          button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
      }
    };

    const hideAnalyticsLineTooltip = () => {
      if (!analyticsLineTooltipEl) return;
      analyticsLineTooltipEl.hidden = true;
      analyticsLineTooltipEl.style.removeProperty('left');
      analyticsLineTooltipEl.style.removeProperty('top');
    };

    const updateAnalyticsChartViewport = () => {
      const fallbackWidth = analyticsLineViewportWidth > 0 ? analyticsLineViewportWidth : 300;
      const fallbackHeight = analyticsLineViewportHeight > 0 ? analyticsLineViewportHeight : 120;
      if (!(analyticsLineChartEl instanceof SVGElement)) {
        analyticsLineViewportWidth = fallbackWidth;
        analyticsLineViewportHeight = fallbackHeight;
        return { width: fallbackWidth, height: fallbackHeight };
      }

      const rect = analyticsLineChartEl.getBoundingClientRect();
      const measuredWidth = Math.max(120, Math.round(rect.width || fallbackWidth));
      const measuredHeight = Math.max(80, Math.round(rect.height || fallbackHeight));
      analyticsLineViewportWidth = measuredWidth;
      analyticsLineViewportHeight = measuredHeight;
      analyticsLineChartEl.setAttribute('viewBox', `0 0 ${measuredWidth} ${measuredHeight}`);
      return { width: measuredWidth, height: measuredHeight };
    };

    const setActiveAnalyticsDay = (dayKey = '') => {
      analyticsActiveDayKey = String(dayKey || '').trim();

      if (analyticsBarsEl) {
        analyticsBarsEl.querySelectorAll('.wallet-analytics-bar-row[data-day-key]').forEach((rowEl) => {
          const rowKey = String(rowEl.getAttribute('data-day-key') || '');
          rowEl.classList.toggle('is-active', Boolean(analyticsActiveDayKey) && rowKey === analyticsActiveDayKey);
        });
      }

      if (analyticsPointsEl) {
        analyticsPointsEl.querySelectorAll('.wallet-analytics-point').forEach((pointEl) => {
          const pointKey = String(pointEl.getAttribute('data-day-key') || '');
          pointEl.classList.toggle('is-active', Boolean(analyticsActiveDayKey) && pointKey === analyticsActiveDayKey);
        });
      }
    };

    const focusAnalyticsPoint = (dayKey = '') => {
      const normalizedKey = String(dayKey || '').trim();
      if (!normalizedKey) {
        setActiveAnalyticsDay('');
        hideAnalyticsLineTooltip();
        setIdleAnalyticsFocus();
        return;
      }

      const point = analyticsLinePoints.find((item) => item.key === normalizedKey);
      if (!point) {
        setActiveAnalyticsDay('');
        hideAnalyticsLineTooltip();
        setIdleAnalyticsFocus();
        return;
      }

      setActiveAnalyticsDay(point.key);
      if (analyticsLineTooltipEl && analyticsLineWrapEl) {
        const wrapRect = analyticsLineWrapEl.getBoundingClientRect();
        const chartRect = analyticsLineChartEl instanceof SVGElement
          ? analyticsLineChartEl.getBoundingClientRect()
          : wrapRect;
        const offsetLeft = chartRect.left - wrapRect.left;
        const offsetTop = chartRect.top - wrapRect.top;
        const rawLeft = offsetLeft + ((point.x / analyticsLineViewportWidth) * chartRect.width);
        const rawTop = offsetTop + ((point.y / analyticsLineViewportHeight) * chartRect.height);
        analyticsLineTooltipEl.hidden = false;
        analyticsLineTooltipEl.textContent = `${point.label} · ${formatSignedCoins(point.value)}`;
        const tooltipRect = analyticsLineTooltipEl.getBoundingClientRect();
        const halfWidth = Math.max(0, tooltipRect.width / 2);
        const minLeft = offsetLeft + halfWidth + 6;
        const maxLeft = offsetLeft + chartRect.width - halfWidth - 6;
        const clampedLeft = Math.max(minLeft, Math.min(maxLeft, rawLeft));
        analyticsLineTooltipEl.style.left = `${clampedLeft}px`;
        analyticsLineTooltipEl.style.top = `${rawTop}px`;
      }

      const tone = point.value >= 0 ? 'positive' : 'negative';
      setAnalyticsFocus({
        label: `День · ${point.label}`,
        value: formatSignedCoins(point.value),
        meta: `Режим: ${analyticsModeLabels[analyticsMode] || analyticsModeLabels.net}`,
        tone
      });
    };

    const focusLatestAnalyticsPoint = () => {
      const latestPoint = analyticsLinePoints[analyticsLinePoints.length - 1];
      if (!latestPoint) {
        focusAnalyticsPoint('');
        return;
      }
      focusAnalyticsPoint(latestPoint.key);
    };

    const renderAnalyticsDonut = (activeIndex = null) => {
      if (!analyticsDonutEl) return;

      if (!analyticsDonutSegments.length) {
        if (analyticsDonutSegmentsEl) analyticsDonutSegmentsEl.innerHTML = '';
        analyticsDonutEl.classList.remove('is-interactive-active');
        return;
      }

      const totalRaw = analyticsDonutSegments.reduce((sum, segment) => {
        return sum + Math.max(0, Number(segment.percent) || 0);
      }, 0) || 1;
      const normalizedSegments = analyticsDonutSegments.map((segment) => ({
        ...segment,
        normalizedPercent: (Math.max(0, Number(segment.percent) || 0) / totalRaw) * 100
      }));
      let cursor = 0;
      const visualSegments = normalizedSegments.map((segment, index) => {
        const start = cursor;
        if (index === normalizedSegments.length - 1) {
          cursor = 100;
        } else {
          cursor += segment.normalizedPercent;
        }
        return {
          ...segment,
          start,
          end: cursor,
          visualPercent: Math.max(0, cursor - start)
        };
      });

      if (analyticsDonutSegmentsEl) {
        analyticsDonutSegmentsEl.innerHTML = visualSegments.map((segment, index) => {
          const color = activeIndex === null || activeIndex === index
            ? segment.color
            : segment.mutedColor;
          const opacity = activeIndex === null || activeIndex === index ? 1 : 0.65;
          const dash = Math.max(0, segment.visualPercent);
          const gap = Math.max(0, 100 - dash);
          return `
            <circle
              class="wallet-analytics-donut-segment"
              cx="50"
              cy="50"
              r="39"
              fill="none"
              stroke="${color}"
              stroke-width="22"
              pathLength="100"
              stroke-dasharray="${dash} ${gap}"
              stroke-dashoffset="${-segment.start}"
              style="opacity:${opacity};"
            ></circle>
          `;
        }).join('');
      } else {
        const stops = visualSegments.map((segment, index) => {
          const color = activeIndex === null || activeIndex === index
            ? segment.color
            : segment.mutedColor;
          return `${color} ${segment.start}% ${segment.end}%`;
        });
        analyticsDonutEl.style.background = `conic-gradient(from -90deg, ${stops.join(', ')})`;
      }

      analyticsDonutEl.classList.toggle('is-interactive-active', activeIndex !== null);
    };

    const setActiveAnalyticsSource = (index = null) => {
      const normalizedIndex = Number.isInteger(index)
        && index >= 0
        && index < analyticsDonutSegments.length
        ? index
        : null;

      if (analyticsActiveSourceIndex === normalizedIndex) return;
      analyticsActiveSourceIndex = normalizedIndex;

      if (analyticsSourcesEl) {
        analyticsSourcesEl.querySelectorAll('.wallet-analytics-source-item').forEach((itemEl) => {
          const itemIndex = Number(itemEl.getAttribute('data-source-index'));
          itemEl.classList.toggle('is-active', normalizedIndex !== null && itemIndex === normalizedIndex);
        });
      }

      const activeSegment = normalizedIndex === null ? null : analyticsDonutSegments[normalizedIndex] || null;
      setAnalyticsDonutCenter(activeSegment);
      renderAnalyticsDonut(normalizedIndex);

      if (activeSegment) {
        hideAnalyticsLineTooltip();
        setActiveAnalyticsDay('');
        setAnalyticsFocus({
          label: `Джерело · ${activeSegment.label}`,
          value: formatPercentLabel(activeSegment.percent),
          meta: this.formatCoinBalance(activeSegment.amount),
          tone: 'neutral'
        });
      } else {
        setIdleAnalyticsFocus();
      }
    };

    if (analyticsSourcesEl && analyticsSourcesEl.dataset.analyticsInteractiveBound !== 'true') {
      analyticsSourcesEl.dataset.analyticsInteractiveBound = 'true';

      analyticsSourcesEl.addEventListener('pointerover', (event) => {
        const sourceEl = event.target.closest('.wallet-analytics-source-item[data-source-index]');
        if (!sourceEl || !analyticsSourcesEl.contains(sourceEl)) return;
        setActiveAnalyticsSource(Number(sourceEl.getAttribute('data-source-index')));
      });

      analyticsSourcesEl.addEventListener('pointerleave', () => {
        setActiveAnalyticsSource(null);
      });

      analyticsSourcesEl.addEventListener('focusin', (event) => {
        const sourceEl = event.target.closest('.wallet-analytics-source-item[data-source-index]');
        if (!sourceEl || !analyticsSourcesEl.contains(sourceEl)) return;
        setActiveAnalyticsSource(Number(sourceEl.getAttribute('data-source-index')));
      });

      analyticsSourcesEl.addEventListener('focusout', (event) => {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && analyticsSourcesEl.contains(nextTarget)) return;
        setActiveAnalyticsSource(null);
      });
    }

    analyticsRangeControlEls.forEach((controlEl, index) => {
      const boundKey = `analyticsRangeBound${index}`;
      if (controlEl.dataset[boundKey] === 'true') return;
      controlEl.dataset[boundKey] = 'true';
      controlEl.addEventListener('click', (event) => {
        const button = event.target.closest('[data-analytics-range]');
        if (!(button instanceof HTMLButtonElement) || !controlEl.contains(button)) return;
        const nextRange = Number(button.getAttribute('data-analytics-range'));
        if (!Number.isFinite(nextRange) || nextRange < 2) return;
        analyticsRangeDays = Math.trunc(nextRange);
        render();
      });
    });

    if (analyticsModeControlEl && analyticsModeControlEl.dataset.analyticsModeBound !== 'true') {
      analyticsModeControlEl.dataset.analyticsModeBound = 'true';
      analyticsModeControlEl.addEventListener('click', (event) => {
        const button = event.target.closest('[data-analytics-mode]');
        if (!(button instanceof HTMLButtonElement) || !analyticsModeControlEl.contains(button)) return;
        const nextMode = String(button.getAttribute('data-analytics-mode') || '').trim().toLowerCase();
        if (!['net', 'income', 'expense'].includes(nextMode)) return;
        analyticsMode = nextMode;
        render();
      });
    }

    if (analyticsBarsEl && analyticsBarsEl.dataset.analyticsBarsBound !== 'true') {
      analyticsBarsEl.dataset.analyticsBarsBound = 'true';

      analyticsBarsEl.addEventListener('pointerover', (event) => {
        const rowEl = event.target.closest('.wallet-analytics-bar-row[data-day-key]');
        if (!rowEl || !analyticsBarsEl.contains(rowEl)) return;
        focusAnalyticsPoint(String(rowEl.getAttribute('data-day-key') || ''));
      });

      analyticsBarsEl.addEventListener('focusin', (event) => {
        const rowEl = event.target.closest('.wallet-analytics-bar-row[data-day-key]');
        if (!rowEl || !analyticsBarsEl.contains(rowEl)) return;
        focusAnalyticsPoint(String(rowEl.getAttribute('data-day-key') || ''));
      });

      analyticsBarsEl.addEventListener('pointerleave', () => {
        focusLatestAnalyticsPoint();
      });

      analyticsBarsEl.addEventListener('focusout', (event) => {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && analyticsBarsEl.contains(nextTarget)) return;
        focusLatestAnalyticsPoint();
      });
    }

    if (analyticsLineWrapEl && analyticsLineWrapEl.dataset.analyticsLineBound !== 'true') {
      analyticsLineWrapEl.dataset.analyticsLineBound = 'true';

      analyticsLineWrapEl.addEventListener('pointermove', (event) => {
        if (!analyticsLinePoints.length) return;
        const rect = analyticsLineChartEl instanceof SVGElement
          ? analyticsLineChartEl.getBoundingClientRect()
          : analyticsLineWrapEl.getBoundingClientRect();
        if (!rect.width) return;
        const localX = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
        const rawX = (localX / rect.width) * analyticsLineViewportWidth;
        let nearestPoint = analyticsLinePoints[0];
        for (let index = 1; index < analyticsLinePoints.length; index += 1) {
          const point = analyticsLinePoints[index];
          if (Math.abs(point.x - rawX) < Math.abs(nearestPoint.x - rawX)) nearestPoint = point;
        }
        focusAnalyticsPoint(nearestPoint.key);
      });

      analyticsLineWrapEl.addEventListener('pointerleave', () => {
        focusLatestAnalyticsPoint();
      });

      analyticsLineWrapEl.addEventListener('click', (event) => {
        const pointEl = event.target.closest('.wallet-analytics-point[data-day-key]');
        if (!pointEl || !analyticsLineWrapEl.contains(pointEl)) return;
        focusAnalyticsPoint(String(pointEl.getAttribute('data-day-key') || ''));
      });

      analyticsLineWrapEl.addEventListener('focusin', (event) => {
        const pointEl = event.target.closest('.wallet-analytics-point[data-day-key]');
        if (!pointEl || !analyticsLineWrapEl.contains(pointEl)) return;
        focusAnalyticsPoint(String(pointEl.getAttribute('data-day-key') || ''));
      });

      analyticsLineWrapEl.addEventListener('focusout', (event) => {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && analyticsLineWrapEl.contains(nextTarget)) return;
        focusLatestAnalyticsPoint();
      });
    }

    const formatDate = (value) => {
      const parsedDate = new Date(value);
      if (Number.isNaN(parsedDate.getTime())) return '';
      return parsedDate.toLocaleString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const formatSignedCoins = (amountCents) => {
      const safeAmount = Number.isFinite(amountCents) ? Math.trunc(amountCents) : 0;
      const sign = safeAmount >= 0 ? '+' : '-';
      return `${sign}${this.formatCoinBalance(Math.abs(safeAmount))}`;
    };

    const startOfDay = (dateInput) => {
      const date = new Date(dateInput);
      if (Number.isNaN(date.getTime())) return null;
      date.setHours(0, 0, 0, 0);
      return date;
    };

    const dayKey = (dateInput) => {
      const date = startOfDay(dateInput);
      if (!date) return '';
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const dayLabel = (dateInput) => {
      const date = startOfDay(dateInput);
      if (!date) return '';
      return date.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
    };

    const resolveSourceLabel = (entry) => {
      if (!entry || typeof entry !== 'object') return 'Інше';
      const category = String(entry.category || '').trim().toLowerCase();
      const title = String(entry.title || '').trim().toLowerCase();
      const source = `${category} ${title}`;

      if (/flappy|2048|клікер|clicker|tapper|drive|drift|race|гра/.test(source)) return 'Ігри';
      if (/shop|store|магазин|purchase|buy|sell|продаж/.test(source)) return 'Магазин';
      if (/transfer|переказ/.test(source)) return 'Перекази';
      if (/bonus|reward|referral|бонус/.test(source)) return 'Бонуси';
      if (/deposit|topup|поповнення|income|credit|earn/.test(source)) return 'Поповнення';
      if (/withdraw|expense|debit|списання/.test(source)) return 'Списання';
      return 'Інше';
    };

    const resolveAnalyticsSourceColors = (label, index = 0) => {
      const normalizedLabel = String(label || '').trim().toLowerCase();
      if (normalizedLabel === 'поповнення') {
        return {
          color: getWalletIncomeColor(),
          mutedColor: getWalletIncomeMutedColor()
        };
      }
      const mapped = analyticsSourceColorMap[normalizedLabel];
      if (mapped) return mapped;
      return {
        color: donutPalette[index % donutPalette.length],
        mutedColor: donutMutedPalette[index % donutMutedPalette.length]
      };
    };

    const buildSmoothLinePath = (points, tension = 0.5) => {
      if (!Array.isArray(points) || !points.length) return 'M 8,60 L 292,60';
      if (points.length === 1) {
        return `M ${points[0].x},${points[0].y} L ${points[0].x},${points[0].y}`;
      }
      if (points.length === 2) {
        return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
      }

      let path = `M ${points[0].x},${points[0].y}`;
      for (let index = 0; index < points.length - 1; index += 1) {
        const p0 = points[index - 1] || points[index];
        const p1 = points[index];
        const p2 = points[index + 1];
        const p3 = points[index + 2] || p2;
        const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension;
        const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension;
        const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension;
        const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension;
        path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
      }
      return path;
    };

    const buildDailySeries = (history, days, mode = analyticsMode) => {
      const safeDays = Number.isFinite(days) ? Math.max(1, Math.trunc(days)) : 7;
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const points = [];
      const sumByDay = new Map();

      history.forEach((entry) => {
        const key = dayKey(entry.createdAt);
        if (!key) return;
        const amount = Number(entry.amountCents) || 0;
        const normalizedMode = String(mode || 'net').toLowerCase();
        const modeAmount = normalizedMode === 'income'
          ? (amount > 0 ? amount : 0)
          : normalizedMode === 'expense'
            ? (amount < 0 ? amount : 0)
            : amount;
        if (!modeAmount) return;
        const current = sumByDay.get(key) || 0;
        const next = current + modeAmount;
        sumByDay.set(key, next);
      });

      for (let index = safeDays - 1; index >= 0; index -= 1) {
        const day = new Date(now);
        day.setDate(now.getDate() - index);
        const key = dayKey(day);
        points.push({
          key,
          label: dayLabel(day),
          value: Number(sumByDay.get(key) || 0)
        });
      }

      return points;
    };

    const renderAnalytics = (history) => {
      setAnalyticsControlState();
      if (analyticsBarsTitleEl) {
        analyticsBarsTitleEl.textContent = `Рух за ${Math.min(10, analyticsRangeDays)} з ${analyticsRangeDays} днів`;
      }
      if (analyticsLineTitleEl) {
        analyticsLineTitleEl.textContent = `Динаміка за ${analyticsRangeDays} днів`;
      }

      if (!Array.isArray(history) || !history.length) {
        if (analyticsIncomeEl) analyticsIncomeEl.textContent = '+0,00';
        if (analyticsExpenseEl) analyticsExpenseEl.textContent = '-0,00';
        if (analyticsNetEl) analyticsNetEl.textContent = '+0,00';
        analyticsPeriodIncome = 0;
        analyticsPeriodExpense = 0;
        analyticsPeriodNet = 0;
        analyticsPeriodTransactions = 0;
        analyticsDailySeries = [];
        analyticsLinePoints = [];
        analyticsActiveDayKey = '';
        if (analyticsBarsEl) {
          analyticsBarsEl.innerHTML = '<div class="wallet-analytics-empty">Недостатньо даних для графіка.</div>';
        }
        if (analyticsLineEl) {
          const { width: baseWidth, height: baseHeight } = updateAnalyticsChartViewport();
          const centerY = Math.round(baseHeight / 2);
          analyticsLineEl.setAttribute('d', `M 8,${centerY} L ${Math.max(8, baseWidth - 8)},${centerY}`);
        }
        if (analyticsAreaEl) {
          analyticsAreaEl.setAttribute('d', '');
        }
        if (analyticsZeroLineEl) {
          const centerY = Math.round(analyticsLineViewportHeight / 2);
          analyticsZeroLineEl.setAttribute('x1', '0');
          analyticsZeroLineEl.setAttribute('x2', String(analyticsLineViewportWidth));
          analyticsZeroLineEl.setAttribute('y1', String(centerY));
          analyticsZeroLineEl.setAttribute('y2', String(centerY));
        }
        if (analyticsPointsEl) {
          analyticsPointsEl.innerHTML = '';
        }
        if (analyticsLineStartDayEl) analyticsLineStartDayEl.textContent = '-';
        if (analyticsLineEndDayEl) analyticsLineEndDayEl.textContent = 'Сьогодні';
        hideAnalyticsLineTooltip();
        analyticsDonutSegments = [];
        renderAnalyticsDonut(null);
        setAnalyticsDonutCenter(null);
        if (analyticsSourcesEl) {
          analyticsSourcesEl.innerHTML = '<div class="wallet-analytics-empty">Транзакції ще не накопичились.</div>';
        }
        analyticsActiveSourceIndex = null;
        setIdleAnalyticsFocus();
        return;
      }

      const periodSeriesNet = buildDailySeries(history, analyticsRangeDays, 'net');
      const periodKeys = new Set(periodSeriesNet.map((item) => item.key));
      const periodHistory = history.filter((entry) => periodKeys.has(dayKey(entry.createdAt)));
      analyticsPeriodTransactions = periodHistory.length;

      analyticsPeriodIncome = periodHistory
        .filter((entry) => Number(entry.amountCents) > 0)
        .reduce((sum, entry) => sum + (Number(entry.amountCents) || 0), 0);
      analyticsPeriodExpense = periodHistory
        .filter((entry) => Number(entry.amountCents) < 0)
        .reduce((sum, entry) => sum + Math.abs(Number(entry.amountCents) || 0), 0);
      analyticsPeriodNet = analyticsPeriodIncome - analyticsPeriodExpense;

      if (analyticsIncomeEl) analyticsIncomeEl.textContent = `+${this.formatCoinBalance(analyticsPeriodIncome)}`;
      if (analyticsExpenseEl) analyticsExpenseEl.textContent = `-${this.formatCoinBalance(analyticsPeriodExpense)}`;
      if (analyticsNetEl) analyticsNetEl.textContent = formatSignedCoins(analyticsPeriodNet);
      const netCardEl = analyticsNetEl ? analyticsNetEl.closest('.wallet-analytics-net-card') : null;
      if (netCardEl) {
        netCardEl.classList.toggle('is-positive', analyticsPeriodNet >= 0);
        netCardEl.classList.toggle('is-negative', analyticsPeriodNet < 0);
      }

      analyticsDailySeries = buildDailySeries(history, analyticsRangeDays, analyticsMode);
      const barsWindow = analyticsDailySeries.slice(-Math.min(10, analyticsDailySeries.length));
      if (analyticsBarsEl) {
        const peak = barsWindow.reduce((max, item) => Math.max(max, Math.abs(item.value)), 0) || 1;
        const incomeBarColor = getWalletIncomeColor();
        analyticsBarsEl.innerHTML = barsWindow.map((item) => {
          const absoluteValue = Math.abs(item.value);
          const ratio = absoluteValue > 0
            ? Math.max(4, Math.round((absoluteValue / peak) * 100))
            : 0;
          const fillColor = item.value > 0
            ? incomeBarColor
            : item.value < 0
              ? '#ff6b8a'
              : 'transparent';
          const tone = analyticsMode === 'income'
            ? 'is-income'
            : analyticsMode === 'expense'
              ? 'is-expense'
              : item.value >= 0 ? 'is-income' : 'is-expense';
          return `
            <button type="button" class="wallet-analytics-bar-row ${tone}" data-day-key="${escapeHtml(item.key)}" title="${escapeHtml(`${item.label}: ${formatSignedCoins(item.value)}`)}">
              <span class="wallet-analytics-bar-label">${escapeHtml(item.label)}</span>
              <div class="wallet-analytics-bar-track">
                <span class="wallet-analytics-bar-fill" style="width:${ratio}%; background:${fillColor};"></span>
              </div>
              <strong class="wallet-analytics-bar-value">${escapeHtml(formatSignedCoins(item.value))}</strong>
            </button>
          `;
        }).join('');
      }

      if (analyticsLineEl) {
        const timeline = analyticsDailySeries;
        const viewport = updateAnalyticsChartViewport();
        const width = viewport.width;
        const height = viewport.height;
        const xPadding = 8;
        const usableWidth = Math.max(1, width - (xPadding * 2));
        const yPadding = 14;
        const values = timeline.map((item) => Number(item.value) || 0);
        let min = Math.min(...values, 0);
        let max = Math.max(...values, 0);
        if (!Number.isFinite(min)) min = 0;
        if (!Number.isFinite(max)) max = 0;
        if (min === max) {
          const delta = min === 0 ? 1 : Math.max(1, Math.abs(min) * 0.15);
          min -= delta;
          max += delta;
        }
        const chartHeight = Math.max(1, height - (yPadding * 2));
        const range = Math.max(0.0001, max - min);
        const projectY = (plotValue) => {
          const ratio = (plotValue - min) / range;
          return Math.round((height - yPadding) - (ratio * chartHeight));
        };
        const zeroY = Math.max(yPadding, Math.min(height - yPadding, projectY(0)));
        analyticsLinePoints = timeline.map((item, index) => {
          const x = timeline.length <= 1
            ? Math.round(width / 2)
            : Math.round(xPadding + ((index / (timeline.length - 1)) * usableWidth));
          const y = projectY(Number(item.value) || 0);
          return {
            ...item,
            x,
            y
          };
        });
        const linePath = buildSmoothLinePath(analyticsLinePoints, 0.48);
        analyticsLineEl.setAttribute('d', linePath);
        if (analyticsAreaEl) {
          if (!analyticsLinePoints.length) {
            analyticsAreaEl.setAttribute('d', '');
          } else {
            const bottomY = height - yPadding;
            const start = analyticsLinePoints[0];
            const end = analyticsLinePoints[analyticsLinePoints.length - 1];
            analyticsAreaEl.setAttribute('d', `${linePath} L ${end.x},${bottomY} L ${start.x},${bottomY} Z`);
          }
        }
        if (analyticsZeroLineEl) {
          analyticsZeroLineEl.setAttribute('x1', '0');
          analyticsZeroLineEl.setAttribute('x2', String(width));
          analyticsZeroLineEl.setAttribute('y1', String(zeroY));
          analyticsZeroLineEl.setAttribute('y2', String(zeroY));
        }
        if (analyticsLineStartDayEl) {
          analyticsLineStartDayEl.textContent = analyticsLinePoints[0]?.label || '-';
        }
        if (analyticsLineEndDayEl) {
          const endLabel = analyticsLinePoints[analyticsLinePoints.length - 1]?.label || '-';
          analyticsLineEndDayEl.textContent = analyticsLinePoints.length ? `${endLabel} · Сьогодні` : '-';
        }
        if (analyticsPointsEl) {
          analyticsPointsEl.innerHTML = analyticsLinePoints.map((point) => {
            const isToday = analyticsLinePoints[analyticsLinePoints.length - 1]?.key === point.key;
            return `
              <circle class="wallet-analytics-point ${isToday ? 'is-today' : ''}" data-day-key="${escapeHtml(point.key)}" cx="${point.x}" cy="${point.y}" r="${isToday ? '3.8' : '3.1'}" tabindex="0" focusable="true"></circle>
            `;
          }).join('');
        }
      }

      const sourceTotals = new Map();
      periodHistory.forEach((entry) => {
        const label = resolveSourceLabel(entry);
        const next = (sourceTotals.get(label) || 0) + Math.abs(Number(entry.amountCents) || 0);
        sourceTotals.set(label, next);
      });
      const sourceEntries = [...sourceTotals.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      const total = sourceEntries.reduce((sum, [, amount]) => sum + amount, 0) || 1;
      analyticsDonutSegments = sourceEntries.map(([label, amount], index) => {
        const tones = resolveAnalyticsSourceColors(label, index);
        return {
          label,
          amount,
          percent: (amount / total) * 100,
          color: tones.color,
          mutedColor: tones.mutedColor
        };
      });
      renderAnalyticsDonut(null);
      setAnalyticsDonutCenter(null);

      if (analyticsSourcesEl) {
        if (!sourceEntries.length) {
          analyticsSourcesEl.innerHTML = '<div class="wallet-analytics-empty">Немає даних.</div>';
        } else {
          analyticsSourcesEl.innerHTML = analyticsDonutSegments.map((segment, index) => {
            return `
              <button class="wallet-analytics-source-item" type="button" data-source-index="${index}" title="${escapeHtml(`${segment.label}: ${this.formatCoinBalance(segment.amount)}`)}">
                <span class="wallet-analytics-source-dot" style="background:${segment.color}"></span>
                <span class="wallet-analytics-source-label">${escapeHtml(segment.label)}</span>
                <strong class="wallet-analytics-source-value">${escapeHtml(formatPercentLabel(segment.percent))}</strong>
              </button>
            `;
          }).join('');
        }
      }

      analyticsActiveSourceIndex = null;
      if (analyticsActiveDayKey && analyticsLinePoints.some((item) => item.key === analyticsActiveDayKey)) {
        focusAnalyticsPoint(analyticsActiveDayKey);
      } else {
        focusLatestAnalyticsPoint();
      }
    };

    const setWalletView = (view, { persist = true } = {}) => {
      const normalizedView = view === 'analytics' ? 'analytics' : 'ledger';
      if (persist) this.walletActiveView = normalizedView;
      walletViewButtons.forEach((button) => {
        const isActive = button.getAttribute('data-wallet-view') === normalizedView;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      walletPanels.forEach((panel) => {
        const isActive = panel.getAttribute('data-wallet-panel') === normalizedView;
        panel.classList.toggle('is-active', isActive);
        panel.hidden = !isActive;
      });
      if (normalizedView !== 'analytics') {
        hideAnalyticsLineTooltip();
        setActiveAnalyticsDay('');
      } else {
        setIdleAnalyticsFocus();
        window.requestAnimationFrame(() => {
          render();
        });
      }
    };

    walletViewButtons.forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      if (button.dataset.walletViewBound === 'true') return;
      button.dataset.walletViewBound = 'true';
      button.addEventListener('click', () => {
        const nextView = String(button.getAttribute('data-wallet-view') || '').trim().toLowerCase();
        setWalletView(nextView || 'ledger');
      });
    });

    const render = () => {
      const balance = this.getTapBalanceCents();
      const history = this.getCoinTransactionHistory();

      balanceEl.textContent = this.formatCoinBalance(balance);
      if (countEl) countEl.textContent = String(history.length);
      if (badgeEl) badgeEl.textContent = `Транзакцій: ${history.length}`;

      if (!history.length) {
        listEl.innerHTML = `
          <div class="wallet-history-empty">
            <strong>Транзакцій поки немає</strong>
            <span>Купуйте предмети в магазині або заробляйте монети в іграх.</span>
          </div>
        `;
        renderAnalytics([]);
        return;
      }

      listEl.innerHTML = history.map((entry) => {
        const safeAmount = Math.abs(Number(entry.amountCents) || 0);
        const isIncome = Number(entry.amountCents) > 0;
        const sign = isIncome ? '+' : '-';
        const amountText = `${sign}${this.formatCoinBalance(safeAmount)}`;
        const title = escapeHtml(entry.title || 'Транзакція');
        const dateLabel = escapeHtml(formatDate(entry.createdAt));

        return `
          <article class="wallet-history-item ${isIncome ? 'is-income' : 'is-expense'}">
            <div class="wallet-history-item-main">
              <strong>${title}</strong>
              <span>${dateLabel}</span>
            </div>
            <span class="wallet-history-item-amount">${amountText}</span>
          </article>
        `;
      }).join('');

      renderAnalytics(history);
    };

    render();
    setWalletView(
      String(safeOptions.view || this.walletActiveView || 'ledger').trim().toLowerCase(),
      { persist: true }
    );
    this.refreshCoinWalletFromBackend({ includeTransactions: true, silent: true })
      .then(() => {
        render();
      })
      .catch(() => {});
  }

  showSettingsSubsection(subsectionName, settingsContainerId, sourceSection = null) {
    const sectionMap = {
      'notifications': 'notifications-settings',
      'privacy': 'privacy-settings',
      'messages': 'messages-settings',
      'appearance': 'appearance-settings',
      'language': 'language-settings',
      'faq': 'faq-settings',
      'wallet': 'wallet',
      'profile-items': 'profile-items'
    };
    
    const sectionName = sectionMap[subsectionName];
    if (sectionName) {
      this.settingsParentSection = sourceSection || this.settingsParentSection || 'messenger-settings';
      this.showSettings(sectionName);
    }
  }

  updateFontPreview(fontSize, displayElement, previewElement) {
    const fontSizeLabels = {
      12: 'Малий',
      13: 'Малий',
      14: 'Малий',
      15: 'Середній',
      16: 'Середній',
      17: 'Великий',
      18: 'Великий',
      19: 'Великий',
      20: 'Великий'
    };
    
    if (displayElement) {
      displayElement.textContent = fontSizeLabels[fontSize] || 'Середній';
    }
    
    if (previewElement) {
      const previewText = previewElement.querySelector('.preview-bubble p');
      const previewTime = previewElement.querySelector('.preview-time');
      
      if (previewText) {
        previewText.style.fontSize = fontSize + 'px';
      }
      if (previewTime) {
        previewTime.style.fontSize = Math.max(10, fontSize - 4) + 'px';
      }
    }
  }

  mapFontSliderToPreset(sliderValue) {
    const safeValue = Number.isFinite(sliderValue) ? sliderValue : 15;
    if (safeValue <= 14) return 'small';
    if (safeValue <= 16) return 'medium';
    return 'large';
  }

  getBlockedChatIds() {
    const stored = this.readJsonStorage('orion_blocked_chat_ids', []);
    if (!Array.isArray(stored)) return [];
    const normalized = stored
      .map(value => Number.parseInt(String(value), 10))
      .filter(value => Number.isFinite(value) && value > 0);
    return [...new Set(normalized)];
  }

  saveBlockedChatIds(ids) {
    const normalized = [...new Set(
      (Array.isArray(ids) ? ids : [])
        .map(value => Number.parseInt(String(value), 10))
        .filter(value => Number.isFinite(value) && value > 0)
    )];

    try {
      window.localStorage.setItem('orion_blocked_chat_ids', JSON.stringify(normalized));
    } catch {
      // Ignore storage failures.
    }
    return normalized;
  }

  updateBlockedUsersSummary(settingsContainer) {
    const summaryEl = settingsContainer?.querySelector('#blockedUsersSummary');
    if (!summaryEl) return;
    const count = this.getBlockedChatIds().length;
    summaryEl.textContent = count > 0 ? `Заблоковано чатів: ${count}` : 'Список порожній';
  }

  async openBlockedUsersManager(settingsContainer) {
    const chats = Array.isArray(this.chats) ? this.chats : [];
    if (!chats.length) {
      await this.showAlert('Наразі немає чатів для блокування.');
      return;
    }

    const blockedSet = new Set(this.getBlockedChatIds());
    const preview = chats
      .slice(0, 14)
      .map(chat => `${chat.id} — ${chat.name}${blockedSet.has(chat.id) ? ' (заблоковано)' : ''}`)
      .join('\n');

    const rawValue = window.prompt(
      `Введіть ID чату для блокування/розблокування:\n${preview}`,
      ''
    );
    if (rawValue === null) return;

    const chatId = Number.parseInt(rawValue.trim(), 10);
    if (!Number.isFinite(chatId)) {
      await this.showAlert('Невірний ID чату.');
      return;
    }

    const targetChat = chats.find(chat => chat.id === chatId);
    if (!targetChat) {
      await this.showAlert('Чат із таким ID не знайдено.');
      return;
    }

    const isBlocked = blockedSet.has(chatId);
    if (isBlocked) {
      blockedSet.delete(chatId);
    } else {
      blockedSet.add(chatId);
    }

    this.saveBlockedChatIds([...blockedSet]);
    this.updateBlockedUsersSummary(settingsContainer);
    this.renderChatsList();

    await this.showAlert(
      isBlocked
        ? `Чат "${targetChat.name}" розблоковано.`
        : `Чат "${targetChat.name}" заблоковано.`
    );
  }

  updateDesktopNotificationStatus(settingsContainer) {
    const stateEl = settingsContainer?.querySelector('#desktopNotificationState');
    const actionBtn = settingsContainer?.querySelector('#desktopNotificationActionBtn');
    if (!stateEl || !actionBtn) return;

    if (!('Notification' in window)) {
      stateEl.textContent = 'Браузер не підтримує системні сповіщення';
      actionBtn.textContent = 'Недоступно';
      actionBtn.disabled = true;
      return;
    }

    actionBtn.disabled = false;
    if (Notification.permission === 'granted') {
      stateEl.textContent = 'Доступ надано';
      actionBtn.textContent = 'Тест';
      return;
    }
    if (Notification.permission === 'denied') {
      stateEl.textContent = 'Доступ заблоковано у браузері';
      actionBtn.textContent = 'Заблоковано';
      actionBtn.disabled = true;
      return;
    }

    stateEl.textContent = 'Доступ не надано';
    actionBtn.textContent = 'Надати доступ';
  }

  async handleDesktopNotificationAction(settingsContainer) {
    if (!('Notification' in window)) {
      await this.showAlert('Цей браузер не підтримує системні сповіщення.');
      return;
    }

    if (Notification.permission === 'granted') {
      this.showDesktopBrowserNotification({
        title: 'Nymo',
        body: 'Тестове сповіщення працює.',
        notificationKey: `system:test:${Date.now()}`,
        requireEnabledSetting: false,
        closeAfterMs: 3500
      });
      return;
    }

    const permission = await Notification.requestPermission();
    this.settings = {
      ...(this.settings || {}),
      desktopNotifications: permission === 'granted'
    };
    this.saveSettings(this.settings);
    this.updateDesktopNotificationStatus(settingsContainer);

    if (permission !== 'granted') {
      await this.showAlert('Браузер не надав доступ до системних сповіщень.');
    }
  }

  isStandalonePwaMode() {
    const mediaStandalone = typeof window.matchMedia === 'function'
      && window.matchMedia('(display-mode: standalone)').matches;
    const iosStandalone = window.navigator?.standalone === true;
    return Boolean(mediaStandalone || iosStandalone);
  }

  updatePwaControls(settingsContainer) {
    const installStateEl = settingsContainer?.querySelector('#pwaInstallState');
    const installBtn = settingsContainer?.querySelector('#pwaInstallActionBtn');
    const updateStateEl = settingsContainer?.querySelector('#pwaUpdateState');
    const updateBtn = settingsContainer?.querySelector('#pwaUpdateActionBtn');
    if (!installStateEl || !installBtn || !updateStateEl || !updateBtn) return;

    const isSupported = 'serviceWorker' in navigator;
    const isInstalled = this.isStandalonePwaMode();
    const deferredPrompt = window.__ORION_PWA_DEFERRED_PROMPT || null;
    const updateRegistration = window.__ORION_PWA_UPDATE_REGISTRATION || null;
    const hasUpdate = Boolean(updateRegistration?.waiting);

    if (!('serviceWorker' in navigator)) {
      installStateEl.textContent = 'PWA не підтримується у цьому браузері';
      installBtn.textContent = 'Недоступно';
      installBtn.disabled = true;
      updateStateEl.textContent = 'Service Worker недоступний';
      updateBtn.textContent = 'Недоступно';
      updateBtn.disabled = true;
      return;
    }

    if (isInstalled) {
      installStateEl.textContent = 'Застосунок уже встановлено';
      installBtn.textContent = 'Встановлено';
      installBtn.disabled = true;
    } else if (deferredPrompt) {
      installStateEl.textContent = 'Можна встановити Nymo як застосунок';
      installBtn.textContent = 'Встановити';
      installBtn.disabled = false;
    } else if (isSupported) {
      installStateEl.textContent = 'Браузер ще не дозволив показати вікно встановлення для цієї сторінки';
      installBtn.textContent = 'Очікування';
      installBtn.disabled = true;
    } else {
      installStateEl.textContent = 'PWA не підтримується у цьому браузері';
      installBtn.textContent = 'Недоступно';
      installBtn.disabled = true;
    }

    if (hasUpdate) {
      updateStateEl.textContent = 'Є нова версія Nymo';
      updateBtn.textContent = 'Оновити';
      updateBtn.disabled = false;
    } else {
      updateStateEl.textContent = 'Остання версія вже активна';
      updateBtn.textContent = 'Актуально';
      updateBtn.disabled = true;
    }
  }

  async handlePwaInstallAction(settingsContainer) {
    const deferredPrompt = window.__ORION_PWA_DEFERRED_PROMPT || null;
    if (!deferredPrompt || typeof deferredPrompt.prompt !== 'function') {
      this.updatePwaControls(settingsContainer);
      return;
    }

    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch (_) {
      // Ignore prompt dismissal errors.
    } finally {
      window.__ORION_PWA_DEFERRED_PROMPT = null;
      this.updatePwaControls(settingsContainer);
    }
  }

  handlePwaUpdateAction() {
    const registration = window.__ORION_PWA_UPDATE_REGISTRATION || null;
    const waitingWorker = registration?.waiting;
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }

  applyThemeMode(mode) {
    const themeMode = ['light', 'dark', 'system'].includes(mode) ? mode : 'system';
    this.settings = { ...(this.settings || {}), theme: themeMode };
    this.saveSettings(this.settings);
    this.loadTheme();
  }

  // Метод-обгортка для імпортованої функції setupSettingsSwipeBack
  setupSettingsSwipeBack(settingsContainer) {
    setupSettingsSwipeBack(settingsContainer, this);
  }

  async showSettings(sectionName) {
    this.disposeShopGarageViewer();

    const appRootEl = document.querySelector('.orion-app');
    if (appRootEl && sectionName !== 'mini-games') {
      appRootEl.classList.remove('mobile-game-fullscreen');
    }

    // На мобільному використовуємо settingsContainerMobile, на ПК - settingsContainer
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      this.showBottomNav();
    } else {
      this.restoreBottomNavToHome({ animate: false });
    }
    const settingsContainerId = isMobile ? 'settingsContainerMobile' : 'settingsContainer';
    const settingsContainer = document.getElementById(settingsContainerId);
    
    const chatContainer = document.getElementById('chatContainer');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const chatsList = document.getElementById('chatsList');
    const chatsListHeader = document.querySelector('.chats-list-header');
    
    // Hide chat and welcome screen
    if (chatContainer) chatContainer.classList.remove('active');
    if (welcomeScreen) welcomeScreen.classList.add('hidden');
    const appEl = document.querySelector('.orion-app');
    if (isMobile && document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    if (typeof this.stopVoiceRecording === 'function') {
      this.stopVoiceRecording({ discard: true, silent: true });
    }
    if (typeof this.stopActiveVoicePlayback === 'function') {
      this.stopActiveVoicePlayback();
    }
    this.currentChat = null;
    this.updateChatHeader();
    if (appEl) {
      appEl.classList.remove('chat-open');
      appEl.classList.remove('chat-active');
      appEl.classList.remove('mobile-chat-open');
      appEl.classList.remove('keyboard-open');
      appEl.classList.remove('composer-focus');
      appEl.style.setProperty('--keyboard-inset', '0px');
    }
    this.setMobilePageScrollLock(false);
    
    // Hide chats list header when showing settings
    if (chatsListHeader) chatsListHeader.style.display = 'none';

    // On desktop, keep sidebar visible and keep nav inside sidebar.
    if (!isMobile) {
      const sidebar = document.querySelector('.sidebar');
      const profileMenu = document.querySelector('.profile-menu-wrapper');
      if (sidebar) {
        sidebar.style.display = '';
        sidebar.classList.remove('compact');
      }
      if (profileMenu) {
        profileMenu.classList.remove('floating-nav');
        this.restoreBottomNavToHome({ animate: false });
        this.updateBottomNavIndicator();
      }
    }
    
    // On mobile, hide chats list and search when showing settings
    const searchBox = document.querySelector('.search-box');
    if (chatsList) {
      if (isMobile) {
        chatsList.classList.add('hidden');
        if (searchBox) searchBox.style.display = 'none';
      } else {
        chatsList.classList.remove('hidden-on-settings');
      }
    }

    // On desktop, hide chat container display
    if (!isMobile && chatContainer) {
      chatContainer.style.display = 'none';
    }
    
    try {
      const htmlContent = this.getSettingsTemplate(sectionName);
      if (!htmlContent) {
        console.error('Template not found for:', sectionName);
        return;
      }
      
      settingsContainer.innerHTML = htmlContent;
      settingsContainer.classList.add('active');
      
      // Очищаємо всі попередні секції
      document.querySelectorAll('.settings-section').forEach(section => {
        if (section !== settingsContainer.querySelector('.settings-section')) {
          section.classList.remove('active');
        }
      });
      
      if (isMobile) {
        // На мобільному видаляємо всі позиційні стилі
        settingsContainer.style.cssText = `
          display: flex !important;
          position: relative !important;
          top: auto !important;
          left: auto !important;
          right: auto !important;
          bottom: auto !important;
          width: 100% !important;
          height: 100% !important;
          z-index: auto !important;
          background-color: transparent !important;
          flex-direction: column !important;
          overflow: hidden !important;
          flex: 1 !important;
          min-height: 0 !important;
        `;
      } else {
        // На ПК просто показуємо контейнер як flex item в chat-area (займає місце welcomeScreen)
        settingsContainer.style.cssText = `
          display: flex !important;
          flex: 1 !important;
          flex-direction: column !important;
          width: auto !important;
          height: 100% !important;
          position: static !important;
          overflow: hidden !important;
          background-color: var(--bg-color) !important;
          min-height: 0 !important;
        `;
      }
      
      const settingsSection = settingsContainer.querySelector('.settings-section');
      
      if (settingsSection) {
        settingsSection.classList.add('active');
        
        // Force inline styles for section
        settingsSection.style.display = 'flex';
        settingsSection.style.flexDirection = 'column';
        settingsSection.style.height = '100%';
        settingsSection.style.minHeight = '0';
        settingsSection.style.width = '100%';
      }
      
      if (sectionName === 'profile-settings') {
        this.captureProfileSettingsSnapshot();

        const profileNameInput = settingsContainer.querySelector('#profileName');
        const profileEmailInput = settingsContainer.querySelector('#profileEmail');
        const profileBioInput = settingsContainer.querySelector('#profileBio');
        const profileDobInput = settingsContainer.querySelector('#profileDob');
        const avatarDiv = settingsContainer.querySelector('.profile-avatar-large');
        
        if (profileNameInput) profileNameInput.value = this.user.name;
        if (profileEmailInput) profileEmailInput.value = this.user.email;
        if (profileBioInput) profileBioInput.value = this.user.bio;
        if (profileDobInput) {
          profileDobInput.value = this.user.birthDate || '';
          if (profileDobInput.dataset.pickerBound !== 'true') {
            profileDobInput.dataset.pickerBound = 'true';
            profileDobInput.addEventListener('click', () => {
              if (typeof profileDobInput.showPicker !== 'function') return;
              try {
                profileDobInput.showPicker();
              } catch (_) {
                // Some browsers can throw when picker is blocked; keep native fallback.
              }
            });
          }
        }
        
        this.renderProfileAvatar(avatarDiv);

        const avatarUpload = settingsContainer.querySelector('#profileAvatarUpload');
        if (avatarUpload) {
          avatarUpload.addEventListener('change', async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
              await this.showAlert('Файл завеликий. Максимум 2MB.');
              avatarUpload.value = '';
              return;
            }
            avatarUpload.disabled = true;
            try {
              const { payload: profileResponse, localPreviewUrl } = await this.uploadCurrentUserAvatarToServer(file);
              const serverAvatar = this.getAvatarImage(
                profileResponse?.avatarImage
                || profileResponse?.avatarUrl
                || profileResponse?.url
                || profileResponse?.image
                || profileResponse?.user?.avatarImage
                || profileResponse?.user?.avatarUrl
                || profileResponse?.data?.avatarImage
                || profileResponse?.data?.avatarUrl
                || profileResponse?.data?.url
                || localPreviewUrl
              );

              const nextUser = {
                ...this.user,
                avatarImage: serverAvatar,
                avatarUrl: serverAvatar
              };
              this.saveUserProfile(nextUser);
              this.syncAvatarToAuthSession(nextUser);
              this.renderProfileAvatar(avatarDiv);
              this.renderChatsList();
              this.updateChatHeader();
            } catch (error) {
              await this.showAlert(error?.message || 'Не вдалося оновити аватар на сервері.');
            } finally {
              avatarUpload.value = '';
              avatarUpload.disabled = false;
            }
          });
        }
        
        const changeAvatarBtn = settingsContainer.querySelector('.btn-change-avatar');
        if (changeAvatarBtn) {
          changeAvatarBtn.addEventListener('click', () => this.handleAvatarChange(settingsContainer));
        }

        const cancelProfileBtn = settingsContainer.querySelector('.btn-cancel-profile');
        if (cancelProfileBtn) {
          cancelProfileBtn.addEventListener('click', () => {
            this.restoreProfileSettingsSnapshot();
            this.showSettings(this.settingsParentSection || 'profile');
          });
        }
      }

      if (sectionName === 'profile') {
        this.settingsParentSection = 'profile';
        const avatarDiv = settingsContainer.querySelector('.profile-avatar-large');
        const inlineEditBtn = settingsContainer.querySelector('.profile-edit-inline');
        const profileMyItemsBtn = settingsContainer.querySelector('#profileMyItemsBtn');
        const profileWalletBtn = settingsContainer.querySelector('#profileWalletBtn');
        const menuItems = settingsContainer.querySelectorAll('.settings-menu-item');

        this.renderProfileAvatar(avatarDiv);
        this.applyProfileAura(settingsContainer.querySelector('.profile-hero-card'));
        this.applyProfileMotion(settingsContainer.querySelector('.profile-hero-card'));
        this.applyProfileBadge(settingsContainer.querySelector('#profileNameBadges'));
        this.updateProfileDisplay();
        this.updateProfileMenuButton();

        const openProfileSettings = () => this.showSettings('profile-settings');
        if (inlineEditBtn) inlineEditBtn.addEventListener('click', openProfileSettings);
        if (profileMyItemsBtn) {
          profileMyItemsBtn.addEventListener('click', () => {
            this.settingsParentSection = 'profile';
            this.pendingProfileItemsScope = 'all';
            this.showSettings('profile-items');
          });
        }
        if (profileWalletBtn) {
          profileWalletBtn.addEventListener('click', () => {
            this.settingsParentSection = 'profile';
            this.showSettings('wallet');
          });
        }

        menuItems.forEach(item => {
          item.addEventListener('click', () => {
            const subsection = item.getAttribute('data-section');
            if (subsection) {
              this.showSettingsSubsection(subsection, settingsContainerId, 'profile');
            }
          });
        });
      }

      if (sectionName === 'settings-home') {
        this.settingsParentSection = 'settings-home';
        if (!isMobile && typeof this.syncDesktopNavRailActive === 'function') {
          this.syncDesktopNavRailActive('navSettings');
        }
        const menuItems = settingsContainer.querySelectorAll('.settings-menu-item');
        menuItems.forEach(item => {
          item.addEventListener('click', () => {
            const subsection = item.getAttribute('data-section');
            if (subsection) {
              this.showSettingsSubsection(subsection, settingsContainerId, 'settings-home');
            }
          });
        });
      }

      if (sectionName === 'mobile-sections') {
        this.settingsParentSection = 'mobile-sections';
        const mobileSectionsNav = document.getElementById('navExplore');
        if (mobileSectionsNav) this.setActiveNavButton(mobileSectionsNav);
        const menuItems = settingsContainer.querySelectorAll('[data-mobile-sections-target]');
        menuItems.forEach((item) => {
          item.addEventListener('click', () => {
            const nextSection = String(item.getAttribute('data-mobile-sections-target') || '').trim();
            if (!nextSection) return;
            if (mobileSectionsNav) this.setActiveNavButton(mobileSectionsNav);
            this.settingsParentSection = 'mobile-sections';
            this.showSettings(nextSection);
          });
        });
      }

      if (sectionName === 'faq-settings' && !isMobile && typeof this.syncDesktopNavRailActive === 'function') {
        this.syncDesktopNavRailActive('navFaq');
      }
      if (sectionName === 'faq-settings') {
        this.initFaqSection(settingsContainer, { behavior: 'auto' });
      }

      if (sectionName === 'mini-games') {
        this.settingsParentSection = 'mini-games';
        this.initMiniGames(settingsContainer);
      }

      if (sectionName === 'wallet') {
        this.settingsParentSection = 'wallet';
        const requestedWalletView = String(this.pendingWalletView || '').trim().toLowerCase();
        this.pendingWalletView = null;
        this.initWalletLedger(settingsContainer, {
          view: requestedWalletView === 'analytics' ? 'analytics' : 'ledger'
        });
      }

      if (sectionName === 'group-create') {
        if (!isMobile && typeof this.syncDesktopNavRailActive === 'function') {
          this.syncDesktopNavRailActive('navChats');
        }
        this.initChatAreaGroupCreate(settingsContainer);
      }

      if (sectionName === 'messenger-settings') {
        this.settingsParentSection = 'messenger-settings';
        this.initShop(settingsContainer);
      }

      if (sectionName === 'orion-drive-garage') {
        this.settingsParentSection = 'messenger-settings';
        this.initOrionDriveGarage(settingsContainer);
      }

      if (sectionName === 'profile-items') {
        const inheritedScope = this.settingsParentSection === 'mini-games' ? 'games' : 'all';
        const profileItemsScope = this.pendingProfileItemsScope === 'games'
          ? 'games'
          : (this.pendingProfileItemsScope === 'all' ? 'all' : inheritedScope);
        this.pendingProfileItemsScope = null;
        if (!this.settingsParentSection) {
          this.settingsParentSection = profileItemsScope === 'games' ? 'mini-games' : 'profile';
        }
        this.initProfileItems(settingsContainer, { scope: profileItemsScope });
      }
      
      const bindLiveSave = (element, eventName = 'change', afterChange = null) => {
        if (!element || element.dataset.liveBound === 'true') return;
        element.dataset.liveBound = 'true';
        element.addEventListener(eventName, async () => {
          await this.saveMessengerSettings({ silent: true });
          if (typeof afterChange === 'function') afterChange();
        });
      };

      // Завантаження значень для підрозділів + live-функціонал
      if (sectionName === 'notifications-settings') {
        const soundNotif = settingsContainer.querySelector('#soundNotifications');
        const desktopNotif = settingsContainer.querySelector('#desktopNotifications');
        const vibrationEnabled = settingsContainer.querySelector('#vibrationEnabled');
        const messagePreview = settingsContainer.querySelector('#messagePreview');
        const desktopNotificationActionBtn = settingsContainer.querySelector('#desktopNotificationActionBtn');
        const pwaInstallActionBtn = settingsContainer.querySelector('#pwaInstallActionBtn');
        const pwaUpdateActionBtn = settingsContainer.querySelector('#pwaUpdateActionBtn');
        this.activePwaSettingsContainer = settingsContainer;
        
        if (soundNotif) soundNotif.checked = this.settings.soundNotifications ?? true;
        if (desktopNotif) desktopNotif.checked = this.settings.desktopNotifications ?? true;
        if (vibrationEnabled) vibrationEnabled.checked = this.settings.vibrationEnabled ?? true;
        if (messagePreview) messagePreview.checked = this.settings.messagePreview ?? true;

        bindLiveSave(soundNotif);
        bindLiveSave(desktopNotif, 'change', () => this.updateDesktopNotificationStatus(settingsContainer));
        bindLiveSave(vibrationEnabled);
        bindLiveSave(messagePreview);

        this.updateDesktopNotificationStatus(settingsContainer);
        this.updatePwaControls(settingsContainer);
        if (desktopNotificationActionBtn && desktopNotificationActionBtn.dataset.bound !== 'true') {
          desktopNotificationActionBtn.dataset.bound = 'true';
          desktopNotificationActionBtn.addEventListener('click', async () => {
            await this.handleDesktopNotificationAction(settingsContainer);
          });
        }
        if (pwaInstallActionBtn && pwaInstallActionBtn.dataset.bound !== 'true') {
          pwaInstallActionBtn.dataset.bound = 'true';
          pwaInstallActionBtn.addEventListener('click', async () => {
            await this.handlePwaInstallAction(settingsContainer);
          });
        }
        if (pwaUpdateActionBtn && pwaUpdateActionBtn.dataset.bound !== 'true') {
          pwaUpdateActionBtn.dataset.bound = 'true';
          pwaUpdateActionBtn.addEventListener('click', () => {
            this.handlePwaUpdateAction();
          });
        }
        if (!this.pwaStateEventsBound) {
          this.pwaStateEventsBound = true;
          const syncPwaState = () => {
            if (this.activePwaSettingsContainer) {
              this.updatePwaControls(this.activePwaSettingsContainer);
            }
          };
          window.addEventListener('orion:pwa-installable-change', syncPwaState);
          window.addEventListener('orion:pwa-update-change', syncPwaState);
          window.addEventListener('orion:pwa-installed', syncPwaState);
        }
      }
      
      if (sectionName === 'privacy-settings') {
        const onlineStatus = settingsContainer.querySelector('#showOnlineStatus');
        const typingIndic = settingsContainer.querySelector('#showTypingIndicator');
        const readReceipts = settingsContainer.querySelector('#readReceipts');
        const lastSeen = settingsContainer.querySelector('#lastSeen');
        const twoFactorAuth = settingsContainer.querySelector('#twoFactorAuth');
        const profileVisibility = settingsContainer.querySelector('#profileVisibility');
        const hideBlockedChats = settingsContainer.querySelector('#hideBlockedChats');
        const manageBlockedUsersBtn = settingsContainer.querySelector('#manageBlockedUsersBtn');
        
        if (onlineStatus) onlineStatus.checked = this.settings.showOnlineStatus ?? true;
        if (typingIndic) typingIndic.checked = this.settings.showTypingIndicator ?? true;
        if (readReceipts) readReceipts.checked = this.settings.readReceipts ?? true;
        if (lastSeen) lastSeen.checked = this.settings.lastSeen ?? true;
        if (twoFactorAuth) twoFactorAuth.checked = this.settings.twoFactorAuth ?? true;
        if (profileVisibility) profileVisibility.value = this.settings.profileVisibility || 'friends';
        if (hideBlockedChats) hideBlockedChats.checked = this.settings.hideBlockedChats ?? true;
        this.updateBlockedUsersSummary(settingsContainer);

        bindLiveSave(onlineStatus);
        bindLiveSave(typingIndic);
        bindLiveSave(readReceipts);
        bindLiveSave(lastSeen);
        bindLiveSave(twoFactorAuth);
        bindLiveSave(profileVisibility);
        bindLiveSave(hideBlockedChats, 'change', () => this.renderChatsList());

        if (manageBlockedUsersBtn && manageBlockedUsersBtn.dataset.bound !== 'true') {
          manageBlockedUsersBtn.dataset.bound = 'true';
          manageBlockedUsersBtn.addEventListener('click', async () => {
            await this.openBlockedUsersManager(settingsContainer);
          });
        }
      }
      
      if (sectionName === 'messages-settings') {
        const enterToSend = settingsContainer.querySelector('#enterToSend');
        const autoPlayMedia = settingsContainer.querySelector('#autoPlayMedia');
        const autoSaveMedia = settingsContainer.querySelector('#autoSaveMedia');
        
        if (enterToSend) enterToSend.checked = this.settings.enterToSend ?? true;
        if (autoPlayMedia) autoPlayMedia.checked = this.settings.autoPlayMedia ?? true;
        if (autoSaveMedia) autoSaveMedia.checked = this.settings.autoSaveMedia ?? false;

        bindLiveSave(enterToSend);
        bindLiveSave(autoPlayMedia);
        bindLiveSave(autoSaveMedia);
      }
      
      if (sectionName === 'appearance-settings') {
        const fontSizeSlider = settingsContainer.querySelector('#fontSizeSlider');
        const fontSizeDisplay = settingsContainer.querySelector('#fontSizeDisplay');
        const fontPreview = settingsContainer.querySelector('#fontPreview');
        const animationsEnabled = settingsContainer.querySelector('#animationsEnabled');
        const compactMode = settingsContainer.querySelector('#compactMode');
        const themeMode = settingsContainer.querySelector('#themeMode');
        
        if (fontSizeSlider) {
          const currentFontSize = this.settings.fontSize || 'medium';
          const fontSizeMap = { 'small': 13, 'medium': 15, 'large': 18 };
          const sliderValue = fontSizeMap[currentFontSize] || 15;
          fontSizeSlider.value = sliderValue;
          
          // Функція для оновлення градієнта slider
          const updateSliderBackground = (value) => {
            const min = parseInt(fontSizeSlider.min);
            const max = parseInt(fontSizeSlider.max);
            const percentage = ((value - min) / (max - min)) * 100;
            fontSizeSlider.style.background = `linear-gradient(to right, var(--primary-color) 0%, var(--primary-color) ${percentage}%, var(--border-color) ${percentage}%, var(--border-color) 100%)`;
          };
          
          // Оновлюємо початковий градієнт
          updateSliderBackground(sliderValue);
          
          this.updateFontPreview(sliderValue, fontSizeDisplay, fontPreview);
          
          fontSizeSlider.addEventListener('input', (e) => {
            const fontSize = parseInt(e.target.value);
            updateSliderBackground(fontSize);
            this.updateFontPreview(fontSize, fontSizeDisplay, fontPreview);
            this.applyFontSize(this.mapFontSliderToPreset(fontSize));
          });

          bindLiveSave(fontSizeSlider, 'change');
        }
        
        if (themeMode) {
          themeMode.value = this.settings.theme || 'system';
          bindLiveSave(themeMode);
        }
        
        if (animationsEnabled) animationsEnabled.checked = this.settings.animationsEnabled ?? true;
        if (compactMode) compactMode.checked = this.settings.compactMode ?? false;
        bindLiveSave(animationsEnabled);
        bindLiveSave(compactMode);
      }
      
      if (sectionName === 'language-settings') {
        const language = settingsContainer.querySelector('#language');
        if (language) language.value = this.settings.language || 'uk';
        bindLiveSave(language);
      }
      
      // Обробник кнопки назад для підрозділів
      const backSubsectionBtn = settingsContainer.querySelector('.btn-back-subsection');
      if (backSubsectionBtn) {
        backSubsectionBtn.addEventListener('click', () => {
          this.showSettings(this.settingsParentSection || 'messenger-settings');
        });
      }

      // Обробник кнопки назад для головного меню налаштувань
      const backSettingsBtn = settingsContainer.querySelector('.btn-back-settings');
      if (backSettingsBtn) {
        backSettingsBtn.addEventListener('click', () => {
          settingsContainer.classList.remove('active');
          settingsContainer.style.display = 'none';
          const section = settingsContainer.querySelector('.settings-section');
          if (section) {
            section.classList.remove('active');
          }
          // Restore chat area
          this.showWelcomeScreen();
          // Set nav back to chats
          const navChats = document.getElementById('navChats');
          if (navChats) this.setActiveNavButton(navChats);
        });
      }
      
      // Додаємо свайп для повернення назад в підрозділах
      if (sectionName !== 'messenger-settings'
        && sectionName !== 'profile'
        && sectionName !== 'calls'
        && sectionName !== 'mini-games'
        && sectionName !== 'wallet'
        && sectionName !== 'mobile-sections'
        && sectionName !== 'group-create'
        && sectionName !== 'settings-home') {
        this.setupSettingsSwipeBack(settingsContainer);
      }
      
      const closeButtons = settingsContainer.querySelectorAll('.btn-secondary:not(.btn-change-avatar):not(.btn-cancel-profile)');
      closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          if ((sectionName === 'profile-settings' || sectionName.endsWith('-settings')) && btn.closest('.settings-buttons')) {
            this.showSettings(this.settingsParentSection || 'profile');
            return;
          }
          settingsContainer.classList.remove('active');
        });
      });
      
      const saveProfileBtn = settingsContainer.querySelector('.btn-save-profile');
      if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', () => {
          this.saveProfileSettings();
        });
      }
      
      const saveMessengerBtn = settingsContainer.querySelector('.btn-save-messenger');
      if (saveMessengerBtn) {
        saveMessengerBtn.addEventListener('click', () => {
          this.saveMessengerSettings();
        });
      }
      
    } catch (error) {
      console.error('Error loading settings:', error);
      settingsContainer.innerHTML = '<p>Помилка завантаження розділу</p>';
    }
  }

  async saveProfileSettings() {
    const container =
      document.querySelector('#profile.active, #profile-settings.active')
      || document.getElementById('profile')
      || document.getElementById('profile-settings');
    const name = container?.querySelector('#profileName')?.value;
    const emailInput = container?.querySelector('#profileEmail');
    const email = emailInput?.value;
    const bio = container?.querySelector('#profileBio')?.value;
    const birthDate = container?.querySelector('#profileDob')?.value;
    
    if (!name) {
      await this.showAlert('Будь ласка, введіть ім\'я');
      return;
    }

    const normalizedEmail = email?.trim() || '';
    if (normalizedEmail && !this.isLikelyValidEmail(normalizedEmail)) {
      await this.showAlert('Вкажіть коректний email у форматі name@example.com');
      if (emailInput && typeof emailInput.focus === 'function') {
        emailInput.focus();
      }
      return;
    }
    
    const profileData = {
      ...this.user,
      name: name.trim(),
      email: normalizedEmail,
      status: this.user.status || 'online',
      bio: bio?.trim() || '',
      birthDate: birthDate?.trim() || '',
      avatarColor: this.user.avatarColor,
      avatarImage: this.user.avatarImage || this.user.avatarUrl || '',
      avatarUrl: this.user.avatarImage || this.user.avatarUrl || '',
      equippedAvatarFrame: this.user.equippedAvatarFrame || '',
      equippedProfileAura: this.user.equippedProfileAura || '',
      equippedProfileMotion: this.user.equippedProfileMotion || '',
      equippedProfileBadge: this.user.equippedProfileBadge || '',
      equippedDriveCar: this.user.equippedDriveCar || '',
      equippedDriveSmokeColor: this.user.equippedDriveSmokeColor || ''
    };
    
    this.saveUserProfile(profileData);
    await this.showNotice('Налаштування профілю збережено!');
    this.profileSettingsSnapshot = null;
    
    if (this.currentChat) {
      this.renderChat();
    }

    this.showSettings(this.settingsParentSection || 'profile');
  }

  isLikelyValidEmail(value = '') {
    if (typeof value !== 'string') return false;
    const email = value.trim();
    if (!email) return false;
    if (email.includes(' ')) return false;
    if ((email.match(/@/g) || []).length !== 1) return false;
    if (email.startsWith('.') || email.endsWith('.')) return false;
    if (email.includes('..')) return false;

    const [localPart, domainPart] = email.split('@');
    if (!localPart || !domainPart) return false;
    if (localPart.length > 64 || domainPart.length > 255) return false;
    if (domainPart.startsWith('-') || domainPart.endsWith('-')) return false;
    if (!domainPart.includes('.')) return false;

    const domainSections = domainPart.split('.');
    if (domainSections.some((part) => !part || part.startsWith('-') || part.endsWith('-'))) return false;
    const tld = domainSections[domainSections.length - 1];
    if (!/^[A-Za-z]{2,}$/.test(tld)) return false;

    const localPattern = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
    const domainPattern = /^[A-Za-z0-9.-]+$/;
    return localPattern.test(localPart) && domainPattern.test(domainPart);
  }

  async saveMessengerSettings(options = {}) {
    const { silent = false } = options;
    const previousSettings = { ...(this.settings || this.loadSettings()) };
    const settings = { ...previousSettings };

    const assignCheckbox = (id, key) => {
      const element = document.getElementById(id);
      if (element) settings[key] = Boolean(element.checked);
    };
    const assignValue = (id, key) => {
      const element = document.getElementById(id);
      if (element) settings[key] = element.value;
    };

    assignCheckbox('soundNotifications', 'soundNotifications');
    assignCheckbox('desktopNotifications', 'desktopNotifications');
    assignCheckbox('showOnlineStatus', 'showOnlineStatus');
    assignCheckbox('showTypingIndicator', 'showTypingIndicator');
    assignCheckbox('vibrationEnabled', 'vibrationEnabled');
    assignCheckbox('messagePreview', 'messagePreview');
    assignCheckbox('readReceipts', 'readReceipts');
    assignCheckbox('lastSeen', 'lastSeen');
    assignCheckbox('twoFactorAuth', 'twoFactorAuth');
    assignValue('profileVisibility', 'profileVisibility');
    assignCheckbox('hideBlockedChats', 'hideBlockedChats');
    assignCheckbox('enterToSend', 'enterToSend');
    assignCheckbox('autoPlayMedia', 'autoPlayMedia');
    assignCheckbox('autoSaveMedia', 'autoSaveMedia');
    assignCheckbox('animationsEnabled', 'animationsEnabled');
    assignCheckbox('compactMode', 'compactMode');
    assignValue('language', 'language');
    assignValue('themeMode', 'theme');

    const fontSizeSlider = document.getElementById('fontSizeSlider');
    if (fontSizeSlider) {
      const sliderValue = Number.parseInt(fontSizeSlider.value, 10);
      settings.fontSize = this.mapFontSliderToPreset(sliderValue);
    }

    this.saveSettings(settings);
    this.applyFontSize(settings.fontSize || 'medium');
    this.applySettingsToUI();

    if ((settings.theme || 'system') !== (previousSettings.theme || 'system')) {
      this.loadTheme();
    }

    if ((settings.hideBlockedChats ?? true) !== (previousSettings.hideBlockedChats ?? true)) {
      this.renderChatsList();
    }

    if (!silent) {
      await this.showNotice('Налаштування збережено!');
    }
  }

  applyFontSize(size) {
    const root = document.documentElement;
    switch(size) {
      case 'small':
        root.style.fontSize = '12px';
        break;
      case 'large':
        root.style.fontSize = '18px';
        break;
      case 'medium':
      default:
        root.style.fontSize = '16px';
    }
  }

  captureProfileSettingsSnapshot() {
    this.profileSettingsSnapshot = { ...this.user };
  }

  restoreProfileSettingsSnapshot() {
    if (!this.profileSettingsSnapshot) return;
    this.saveUserProfile({ ...this.profileSettingsSnapshot });
    this.profileSettingsSnapshot = null;
  }

  async buildProfileAvatarDataUrl(file) {
    if (!(file instanceof File)) {
      throw new Error('Некоректний файл аватара.');
    }

    const sourceDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Не вдалося прочитати файл аватара.'));
      reader.readAsDataURL(file);
    });
    if (!sourceDataUrl) {
      throw new Error('Не вдалося прочитати файл аватара.');
    }

    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Неможливо обробити зображення аватара.'));
      img.src = sourceDataUrl;
    });

    const maxSide = 320;
    const sourceWidth = Number(image.naturalWidth || image.width || maxSide) || maxSide;
    const sourceHeight = Number(image.naturalHeight || image.height || maxSide) || maxSide;
    const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
    const targetWidth = Math.max(64, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(64, Math.round(sourceHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Браузер не підтримує обробку зображень.');
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.clearRect(0, 0, targetWidth, targetHeight);
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    // Keep payload under typical JSON body limits on backend.
    let quality = 0.9;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    const maxLength = 90_000;
    while (dataUrl.length > maxLength && quality > 0.45) {
      quality = Number((quality - 0.1).toFixed(2));
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    return dataUrl;
  }

  buildProfileAvatarUploadFile(sourceFile, dataUrl) {
    const match = String(dataUrl || '').match(/^data:(image\/[a-z0-9.+-]+);base64,/i);
    const mimeType = match?.[1] || 'image/jpeg';
    const base64 = String(dataUrl || '').split(',')[1] || '';
    if (!base64) {
      throw new Error('Не вдалося підготувати файл аватара до відправки.');
    }

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    const safeName = String(sourceFile?.name || 'avatar.jpg').replace(/\.[^.]+$/, '') || 'avatar';
    const extension = mimeType === 'image/png' ? 'png' : 'jpg';
    return new File([bytes], `${safeName}.${extension}`, { type: mimeType });
  }

  async uploadCurrentUserAvatarToServer(file) {
    const optimizedAvatar = await this.buildProfileAvatarDataUrl(file);
    const uploadFile = this.buildProfileAvatarUploadFile(file, optimizedAvatar);
    const fieldNames = ['file', 'avatar', 'image'];
    let lastErrorMessage = '';

    for (const fieldName of fieldNames) {
      try {
        const formData = new FormData();
        formData.append(fieldName, uploadFile, uploadFile.name);

        const response = await fetch(buildApiUrl('/users/me/avatar'), {
          method: 'POST',
          headers: this.getApiHeaders(),
          body: formData
        });
        const data = await this.readJsonSafe(response);
        if (response.ok) {
          return {
            payload: data && typeof data === 'object' ? data : {},
            localPreviewUrl: optimizedAvatar
          };
        }

        lastErrorMessage = this.getRequestErrorMessage(data, 'Не вдалося завантажити аватар.');
      } catch (error) {
        lastErrorMessage = String(error?.message || 'Не вдалося завантажити аватар.');
      }
    }

    try {
      const fallbackResponse = await this.updateCurrentUserProfileOnServer({
        avatarUrl: optimizedAvatar
      });
      return {
        payload: fallbackResponse && typeof fallbackResponse === 'object' ? fallbackResponse : {},
        localPreviewUrl: optimizedAvatar
      };
    } catch (fallbackError) {
      const fallbackMessage = String(fallbackError?.message || '').trim();
      throw new Error(fallbackMessage || lastErrorMessage || 'Не вдалося оновити аватар на сервері.');
    }
  }

  syncAvatarToAuthSession(userProfile = {}) {
    const session = getAuthSession();
    if (!session || typeof session !== 'object') return;

    const avatarImage = this.getAvatarImage(userProfile?.avatarImage || userProfile?.avatarUrl);
    const mergedUser = {
      ...(session.user && typeof session.user === 'object' ? session.user : {}),
      name: userProfile?.name || session?.user?.name || session?.user?.nickname || '',
      nickname: userProfile?.name || session?.user?.nickname || session?.user?.name || '',
      avatarImage,
      avatarUrl: avatarImage,
      avatarColor: userProfile?.avatarColor || session?.user?.avatarColor || ''
    };
    setAuthSession({
      ...session,
      user: mergedUser
    });
    syncLegacyUserProfile(mergedUser);
  }

  handleAvatarChange(settingsContainer) {
    const colors = [
      'linear-gradient(135deg, #6b7280, #9ca3af)',
      'linear-gradient(135deg, #667eea, #764ba2)',
      'linear-gradient(135deg, #f093fb, #f5576c)',
      'linear-gradient(135deg, #4facfe, #00f2fe)',
      'linear-gradient(135deg, #43e97b, #38f9d7)',
      'linear-gradient(135deg, #fa709a, #a3a3a3)',
      'linear-gradient(135deg, #30cfd0, #330867)',
      'linear-gradient(135deg, #a8edea, #fed6e3)'
    ];

    let colorIndex = colors.findIndex(c => c === this.user.avatarColor);
    if (colorIndex === -1) colorIndex = 0;
    
    colorIndex = (colorIndex + 1) % colors.length;
    const newColor = colors[colorIndex];
    
    const avatarDiv = settingsContainer.querySelector('.profile-avatar-large');
    this.user.avatarColor = newColor;
    this.user.avatarImage = ''; 
    this.user.avatarUrl = '';

    if (avatarDiv) {
      this.renderProfileAvatar(avatarDiv);
    }
  }
}
