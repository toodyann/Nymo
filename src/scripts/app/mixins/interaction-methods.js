import {
  showAlert,
  showNotice,
  showConfirm,
  showConfirmWithOption,
  setupEmojiPicker,
  insertAtCursor,
  formatMessageDateTime
} from '../../shared/helpers/ui-helpers.js';
import { clearAuthSession, redirectToAuthPage } from '../../shared/auth/auth-session.js';
import QRCode from 'qrcode';

export class ChatAppInteractionMethods {
  enforcePlainChatModalHeader() {
    const header = document.querySelector('#chatContainer .chat-modal-header');
    if (!header) return;

    const styleTargets = [
      header,
      header.querySelector('#chatModalInfo'),
      header.querySelector('#chatModalMenuBtn'),
      ...header.querySelectorAll('.chat-modal-header-right .btn-icon')
    ].filter(Boolean);

    styleTargets.forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      el.style.setProperty('background', 'transparent', 'important');
      el.style.setProperty('border', 'none', 'important');
      el.style.setProperty('box-shadow', 'none', 'important');
      el.style.setProperty('backdrop-filter', 'none', 'important');
      el.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
    });
  }

  hasUnreadChats() {
    return this.getSortedChats().some(
      (chat) => Math.max(0, Number(chat?.unreadCount || 0)) > 0
    );
  }

  syncChatsNavUnreadIndicator() {
    const hasUnread = this.hasUnreadChats();
    const targets = [
      document.getElementById('navChats'),
      ...document.querySelectorAll('.desktop-nav-rail-item[data-nav-target="navChats"]')
    ];

    targets.forEach((target) => {
      if (!(target instanceof HTMLElement)) return;
      target.classList.toggle('has-unread-dot', hasUnread);
      target.toggleAttribute('data-has-unread', hasUnread);
    });
  }

  initDesktopSecondaryRainCanvas() {
    if (this.desktopSecondaryRainInitialized) return;
    const menu = document.getElementById('desktopSecondaryMenu');
    const canvas = document.getElementById('desktopSecondaryRainCanvas');
    if (!(menu instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.desktopSecondaryRainInitialized = true;
    this.desktopSecondaryRainCtx = ctx;
    this.desktopSecondaryRainCanvas = canvas;
    this.desktopSecondaryRainMenu = menu;
    this.desktopSecondaryRainParticles = [];
    this.desktopSecondaryRainDroplets = [];
    this.desktopSecondaryRainRunning = false;
    this.desktopSecondaryRainFrame = 0;
    this.desktopSecondaryRainLastTs = 0;
    this.desktopSecondaryRainElapsed = 0;
    this.desktopSecondaryRainSpawnCarry = 0;
    this.desktopSecondaryRainDropletCarry = 0;
    this.desktopSecondaryRainWidth = 0;
    this.desktopSecondaryRainHeight = 0;
    this.desktopSecondaryRainDpr = 1;

    const randomBetween = (min, max) => min + Math.random() * (max - min);
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    const createRainParticle = (randomY = false) => {
      const width = Math.max(1, this.desktopSecondaryRainWidth);
      const height = Math.max(1, this.desktopSecondaryRainHeight);
      return {
        x: randomBetween(-18, width + 18),
        y: randomY ? randomBetween(-height, height) : randomBetween(-height * 0.25, 0),
        length: randomBetween(12, 26),
        speed: randomBetween(320, 660),
        drift: randomBetween(-8, 8),
        alpha: randomBetween(0.06, 0.16),
        thickness: randomBetween(0.55, 1.15)
      };
    };

    const createGlassDroplet = (randomY = false) => {
      const width = Math.max(1, this.desktopSecondaryRainWidth);
      const height = Math.max(1, this.desktopSecondaryRainHeight);
      const radius = randomBetween(1.2, 3.2);
      return {
        x: randomBetween(0, width),
        y: randomY ? randomBetween(-18, height) : randomBetween(-8, height * 0.25),
        radius,
        vy: randomBetween(6, 26),
        alpha: randomBetween(0.05, 0.13),
        life: randomBetween(4.5, 10.5),
        wobble: randomBetween(-10, 10),
        phase: randomBetween(0, Math.PI * 2)
      };
    };

    const resizeCanvas = () => {
      const rect = menu.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const dpr = clamp(Math.round(window.devicePixelRatio || 1), 1, 2);
      if (width === this.desktopSecondaryRainWidth && height === this.desktopSecondaryRainHeight && dpr === this.desktopSecondaryRainDpr) {
        return;
      }
      this.desktopSecondaryRainWidth = width;
      this.desktopSecondaryRainHeight = height;
      this.desktopSecondaryRainDpr = dpr;

      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const area = width * height;
      const rainTarget = clamp(Math.round(area / 2300), 42, 170);
      const dropletTarget = clamp(Math.round(area / 28000), 10, 34);

      this.desktopSecondaryRainParticles = Array.from({ length: rainTarget }, () => createRainParticle(true));
      this.desktopSecondaryRainDroplets = Array.from({ length: dropletTarget }, () => createGlassDroplet(true));
    };

    const shouldAnimate = () => {
      if (window.innerWidth < 769) return false;
      if (document.visibilityState !== 'visible') return false;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      if (!document.documentElement.classList.contains('dark-theme')) return false;
      return menu.classList.contains('active');
    };

    const stop = () => {
      if (this.desktopSecondaryRainFrame) {
        window.cancelAnimationFrame(this.desktopSecondaryRainFrame);
        this.desktopSecondaryRainFrame = 0;
      }
      this.desktopSecondaryRainRunning = false;
      this.desktopSecondaryRainLastTs = 0;
      ctx.clearRect(0, 0, this.desktopSecondaryRainWidth, this.desktopSecondaryRainHeight);
    };

    const drawFrame = (timestamp) => {
      if (!this.desktopSecondaryRainRunning) return;
      if (!shouldAnimate()) {
        stop();
        return;
      }
      resizeCanvas();
      const width = this.desktopSecondaryRainWidth;
      const height = this.desktopSecondaryRainHeight;
      const dt = clamp((timestamp - (this.desktopSecondaryRainLastTs || timestamp)) / 1000, 0.008, 0.05);
      this.desktopSecondaryRainLastTs = timestamp;
      this.desktopSecondaryRainElapsed += dt;

      ctx.clearRect(0, 0, width, height);

      const rain = this.desktopSecondaryRainParticles;
      for (let i = 0; i < rain.length; i += 1) {
        const drop = rain[i];
        drop.y += drop.speed * dt;
        drop.x += drop.drift * dt;
        if (drop.y - drop.length > height || drop.x < -24 || drop.x > width + 24) {
          rain[i] = createRainParticle(false);
          continue;
        }
        ctx.strokeStyle = `rgba(190, 214, 255, ${drop.alpha})`;
        ctx.lineWidth = drop.thickness;
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - drop.drift * 0.06, drop.y - drop.length);
        ctx.stroke();
      }

      const droplets = this.desktopSecondaryRainDroplets;
      for (let i = 0; i < droplets.length; i += 1) {
        const droplet = droplets[i];
        droplet.life -= dt * 0.14;
        droplet.vy += dt * 5.2;
        droplet.y += droplet.vy * dt;
        droplet.x += Math.sin(this.desktopSecondaryRainElapsed * 0.9 + droplet.phase) * droplet.wobble * dt * 0.03;
        if (droplet.life <= 0 || droplet.y > height + 12 || droplet.x < -12 || droplet.x > width + 12) {
          droplets[i] = createGlassDroplet(false);
          continue;
        }

        const lifeFade = clamp(droplet.life / 10, 0.12, 1);
        const alpha = droplet.alpha * lifeFade;
        const radiusX = droplet.radius * 0.82;
        const radiusY = droplet.radius * 1.05;

        ctx.fillStyle = `rgba(194, 218, 255, ${alpha})`;
        ctx.beginPath();
        ctx.ellipse(droplet.x, droplet.y, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.72})`;
        ctx.beginPath();
        ctx.ellipse(
          droplet.x - radiusX * 0.28,
          droplet.y - radiusY * 0.36,
          Math.max(0.35, radiusX * 0.34),
          Math.max(0.35, radiusY * 0.3),
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      this.desktopSecondaryRainSpawnCarry += dt * 2.2;
      while (this.desktopSecondaryRainSpawnCarry >= 1) {
        this.desktopSecondaryRainSpawnCarry -= 1;
        rain.push(createRainParticle(false));
        if (rain.length > 190) rain.splice(0, rain.length - 190);
      }

      this.desktopSecondaryRainDropletCarry += dt * 1.15;
      while (this.desktopSecondaryRainDropletCarry >= 1) {
        this.desktopSecondaryRainDropletCarry -= 1;
        droplets.push(createGlassDroplet(false));
        if (droplets.length > 44) droplets.splice(0, droplets.length - 44);
      }

      this.desktopSecondaryRainFrame = window.requestAnimationFrame(drawFrame);
    };

    const start = () => {
      if (this.desktopSecondaryRainRunning) return;
      if (!shouldAnimate()) return;
      resizeCanvas();
      this.desktopSecondaryRainRunning = true;
      this.desktopSecondaryRainLastTs = 0;
      this.desktopSecondaryRainFrame = window.requestAnimationFrame(drawFrame);
    };

    const refreshState = () => {
      if (!shouldAnimate()) {
        stop();
        return;
      }
      start();
    };

    this.desktopSecondaryRainRefresh = refreshState;
    this.desktopSecondaryRainResizeHandler = () => {
      resizeCanvas();
      refreshState();
    };
    window.addEventListener('resize', this.desktopSecondaryRainResizeHandler, { passive: true });
    document.addEventListener('visibilitychange', refreshState);

    this.desktopSecondaryRainHtmlObserver = new MutationObserver(refreshState);
    this.desktopSecondaryRainHtmlObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    this.desktopSecondaryRainMenuObserver = new MutationObserver(refreshState);
    this.desktopSecondaryRainMenuObserver.observe(menu, {
      attributes: true,
      attributeFilter: ['class']
    });

    resizeCanvas();
    refreshState();
  }

  getDesktopSecondaryMenuConfig(targetNavId) {
    const menuMap = {
      navChats: {
        title: 'Чати',
        groups: [
          {
            title: 'РОЗМОВИ',
            items: [
              { label: 'Центр повідомлень', action: 'open-chats-home', icon: 'bell' },
              { label: 'Конфіденційність', section: 'privacy-settings', parentSection: 'messenger-settings', icon: 'shield' },
              { label: 'Повідомлення', section: 'messages-settings', parentSection: 'messenger-settings', icon: 'chat' }
            ]
          },
          {
            title: 'ПЕРСОНАЛІЗАЦІЯ',
            items: [
              { label: 'Інтерфейс', section: 'appearance-settings', parentSection: 'messenger-settings', icon: 'paint' },
              { label: 'Мова', section: 'language-settings', parentSection: 'messenger-settings', icon: 'globe' }
            ]
          }
        ]
      },
      navCalls: {
        title: 'Дзвінки',
        groups: [
          {
            title: 'ТЕЛЕФОНІЯ',
            items: [
              { label: 'Історія дзвінків', section: 'calls', icon: 'phone' },
              { label: 'Сповіщення', section: 'notifications-center', icon: 'bell' }
            ]
          }
        ]
      },
      navShop: {
        title: 'Магазин',
        groups: [
          {
            title: 'КАТАЛОГ',
            items: [
              { label: 'Усі товари', section: 'messenger-settings', parentSection: 'messenger-settings', icon: 'store', shopCategory: 'all' },
              { label: 'Аватар', section: 'messenger-settings', parentSection: 'messenger-settings', icon: 'user', shopCategory: 'frame' },
              { label: 'Фон', section: 'messenger-settings', parentSection: 'messenger-settings', icon: 'image', shopCategory: 'aura' },
              { label: 'Анімація', section: 'messenger-settings', parentSection: 'messenger-settings', icon: 'sparkles', shopCategory: 'motion' },
              { label: 'Значки', section: 'messenger-settings', parentSection: 'messenger-settings', icon: 'badge', shopCategory: 'badge' },
              { label: 'Авто Nymo Drive', section: 'messenger-settings', parentSection: 'messenger-settings', icon: 'drift', shopCategory: 'car' },
              { label: 'Дим Nymo Drive', section: 'messenger-settings', parentSection: 'messenger-settings', icon: 'smoke', shopCategory: 'smoke' }
            ]
          },
          {
            title: 'АКАУНТ',
            items: [
              { label: 'Мої предмети', section: 'profile-items', parentSection: 'messenger-settings', icon: 'cube' }
            ]
          }
        ]
      },
      navWallet: {
        title: 'Гаманець',
        groups: [
          {
            title: 'ФІНАНСИ',
            items: [
              { label: 'Гаманець і транзакції', section: 'wallet', icon: 'wallet' }
            ]
          }
        ]
      },
      navSettings: {
        title: 'Налаштування',
        groups: [
          {
            title: 'СПІЛКУВАННЯ',
            items: [
              { label: 'Сповіщення', section: 'notifications-settings', parentSection: 'messenger-settings', icon: 'bell' },
              { label: 'Конфіденційність', section: 'privacy-settings', parentSection: 'messenger-settings', icon: 'shield' },
              { label: 'Повідомлення', section: 'messages-settings', parentSection: 'messenger-settings', icon: 'chat' }
            ]
          },
          {
            title: 'ІНТЕРФЕЙС',
            items: [
              { label: 'Інтерфейс', section: 'appearance-settings', parentSection: 'messenger-settings', icon: 'paint' },
              { label: 'Мова', section: 'language-settings', parentSection: 'messenger-settings', icon: 'globe' }
            ]
          },
          {
            title: 'ПРОФІЛЬ',
            items: [
              { label: 'Мої предмети', section: 'profile-items', parentSection: 'messenger-settings', icon: 'cube' }
            ]
          }
        ]
      },
      navFaq: {
        title: 'FAQ',
        groups: [
          {
            title: 'ОСНОВНЕ',
            items: [
              { label: 'Огляд', section: 'faq-settings', parentSection: 'settings-home', icon: 'question', faqSection: 'overview' },
              { label: 'Швидкий старт', section: 'faq-settings', parentSection: 'settings-home', icon: 'sparkles', faqSection: 'getting-started' },
              { label: 'Навігація', section: 'faq-settings', parentSection: 'settings-home', icon: 'globe', faqSection: 'navigation' },
              { label: 'Профіль і акаунт', section: 'faq-settings', parentSection: 'settings-home', icon: 'user', faqSection: 'profile' },
              { label: 'Чати і дзвінки', section: 'faq-settings', parentSection: 'settings-home', icon: 'chat', faqSection: 'chats' },
              { label: 'Магазин і Nymo Value', section: 'faq-settings', parentSection: 'settings-home', icon: 'store', faqSection: 'shop' },
              { label: 'Гаманець', section: 'faq-settings', parentSection: 'settings-home', icon: 'wallet', faqSection: 'wallet' }
            ]
          },
          {
            title: 'ДОДАТКОВО',
            items: [
              { label: 'Персоналізація', section: 'faq-settings', parentSection: 'settings-home', icon: 'paint', faqSection: 'customization' },
              { label: 'Налаштування', section: 'faq-settings', parentSection: 'settings-home', icon: 'gear', faqSection: 'settings' },
              { label: 'Ігри та Nymo Drive', section: 'faq-settings', parentSection: 'settings-home', icon: 'drift', faqSection: 'games' },
              { label: 'Mobile версія', section: 'faq-settings', parentSection: 'settings-home', icon: 'sliders', faqSection: 'mobile' },
              { label: 'Якщо щось не так', section: 'faq-settings', parentSection: 'settings-home', icon: 'warning', faqSection: 'troubleshooting' }
            ]
          }
        ]
      },
      navGames: {
        title: 'Ігри',
        groups: [
          {
            title: 'ІГРОВИЙ ЦЕНТР',
            items: [
              { label: 'Клікер', section: 'mini-games', icon: 'clicker', miniGameView: 'tapper' },
              { label: 'Nymo 2048', section: 'mini-games', icon: 'grid2048', miniGameView: 'grid2048' },
              { label: 'Flappy Nymo', section: 'mini-games', icon: 'flappy', miniGameView: 'flappy' },
              { label: 'Nymo Drive', section: 'mini-games', icon: 'drift', miniGameView: 'drift' }
            ]
          },
          {
            title: 'АКАУНТ',
            items: [
              { label: 'Мої предмети', section: 'profile-items', parentSection: 'mini-games', icon: 'cube' },
              { label: 'Мій профіль', section: 'profile', parentSection: 'profile', icon: 'user' }
            ]
          }
        ]
      },
      navProfile: {
        title: 'Профіль',
        groups: [
          {
            title: 'ОСНОВНЕ',
            items: [
              { label: 'Мій профіль', section: 'profile', parentSection: 'profile', icon: 'user' },
              { label: 'Налаштування профілю', section: 'profile-settings', parentSection: 'profile', icon: 'profileSettings' },
              { label: 'Мої предмети', section: 'profile-items', parentSection: 'profile', icon: 'cube' }
            ]
          },
          {
            title: 'ПРИВАТНІСТЬ',
            items: [
              { label: 'Конфіденційність', section: 'privacy-settings', parentSection: 'profile', icon: 'shield' },
              { label: 'Сповіщення', section: 'notifications-settings', parentSection: 'profile', icon: 'bell' }
            ]
          }
        ]
      }
    };

    return menuMap[targetNavId] || menuMap.navSettings;
  }

  getDesktopSecondaryMenuItemIcon(iconName = 'gear') {
    const icons = {
      gear: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5Z" stroke="currentColor" stroke-width="2"/><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1.4 1.4a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0L4.3 17.8a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H3.5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1.4-1.4a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1.4 1.4a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
      users: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="7" r="3" stroke="currentColor" stroke-width="2"/><path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" stroke-width="2"/><path d="M16 3.13a3 3 0 0 1 0 5.75" stroke="currentColor" stroke-width="2"/></svg>',
      team: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24"><circle cx="8" cy="7" r="3" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="7" r="3" stroke="currentColor" stroke-width="2"/><path d="M2 21a6 6 0 0 1 12 0" stroke="currentColor" stroke-width="2"/><path d="M10 21a6 6 0 0 1 12 0" stroke="currentColor" stroke-width="2"/></svg>',
      sliders: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="6" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="11" cy="18" r="2" fill="currentColor"/></svg>',
      credit: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2"/><path d="M2 10h20" stroke="currentColor" stroke-width="2"/></svg>',
      shield: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.27,47,25.53a8,8,0,0,0,4.2,0c1-.26,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40Zm0,72c0,37.07-13.66,67.16-40.6,89.42A129.3,129.3,0,0,1,128,223.62a128.25,128.25,0,0,1-38.92-21.81C61.82,179.51,48,149.3,48,112l0-56,160,0Z"></path></svg>',
      cube: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 2 3 7l9 5 9-5-9-5Z" stroke="currentColor" stroke-width="2"/><path d="M3 17l9 5 9-5" stroke="currentColor" stroke-width="2"/><path d="M3 12l9 5 9-5" stroke="currentColor" stroke-width="2"/></svg>',
      user: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"></path></svg>',
      key: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24"><circle cx="7.5" cy="15.5" r="3.5" stroke="currentColor" stroke-width="2"/><path d="M11 13l9-9M16 4l4 4M14 6l4 4" stroke="currentColor" stroke-width="2"/></svg>',
      warning: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 3 2 21h20L12 3Z" stroke="currentColor" stroke-width="2"/><path d="M12 9v5" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg>',
      question: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180ZM128,72c-22.06,0-40,16.15-40,36v4a8,8,0,0,0,16,0v-4c0-11,10.77-20,24-20s24,9,24,20-10.77,20-24,20a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-.72c18.24-3.35,32-17.9,32-35.28C168,88.15,150.06,72,128,72Zm104,56A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"></path></svg>',
      bell: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216ZM48,184c7.7-13.24,16-43.92,16-80a64,64,0,1,1,128,0c0,36.05,8.28,66.73,16,80Z"></path></svg>',
      chat: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" stroke="currentColor" stroke-width="2"/></svg>',
      paint: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V96H40V56ZM40,112H96v88H40Zm176,88H112V112H216v88Z"></path></svg>',
      globe: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm88,104a87.62,87.62,0,0,1-6.4,32.94l-44.7-27.49a15.92,15.92,0,0,0-6.24-2.23l-22.82-3.08a16.11,16.11,0,0,0-16,7.86h-8.72l-3.8-7.86a15.91,15.91,0,0,0-11-8.67l-8-1.73L96.14,104h16.71a16.06,16.06,0,0,0,7.73-2l12.25-6.76a16.62,16.62,0,0,0,3-2.14l26.91-24.34A15.93,15.93,0,0,0,166,49.1l-.36-.65A88.11,88.11,0,0,1,216,128ZM143.31,41.34,152,56.9,125.09,81.24,112.85,88H96.14a16,16,0,0,0-13.88,8l-8.73,15.23L63.38,84.19,74.32,58.32a87.87,87.87,0,0,1,69-17ZM40,128a87.53,87.53,0,0,1,8.54-37.8l11.34,30.27a16,16,0,0,0,11.62,10l21.43,4.61L96.74,143a16.09,16.09,0,0,0,14.4,9h1.48l-7.23,16.23a16,16,0,0,0,2.86,17.37l.14.14L128,205.94l-1.94,10A88.11,88.11,0,0,1,40,128Zm102.58,86.78,1.13-5.81a16.09,16.09,0,0,0-4-13.9,1.85,1.85,0,0,1-.14-.14L120,174.74,133.7,144l22.82,3.08,45.72,28.12A88.18,88.18,0,0,1,142.58,214.78Z"></path></svg>',
      phone: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 11.2 19a19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7 12.8 12.8 0 0 0 .7 2.8 2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4 12.8 12.8 0 0 0 2.8.7A2 2 0 0 1 22 16.9Z" stroke="currentColor" stroke-width="2"/></svg>',
      gamepad: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="10" rx="4" stroke="currentColor" stroke-width="2"/><path d="M8 13h4M10 11v4M15.5 12.5h.01M18 14.5h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
      clicker: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M56,76a60,60,0,0,1,120,0,8,8,0,0,1-16,0,44,44,0,0,0-88,0,8,8,0,1,1-16,0Zm140,44a27.9,27.9,0,0,0-13.36,3.39A28,28,0,0,0,144,106.7V76a28,28,0,0,0-56,0v80l-3.82-6.13a28,28,0,0,0-48.41,28.17l29.32,50A8,8,0,1,0,78.89,220L49.6,170a12,12,0,1,1,20.78-12l.14.23,18.68,30A8,8,0,0,0,104,184V76a12,12,0,0,1,24,0v68a8,8,0,1,0,16,0V132a12,12,0,0,1,24,0v20a8,8,0,0,0,16,0v-4a12,12,0,0,1,24,0v36c0,21.61-7.1,36.3-7.16,36.42a8,8,0,0,0,3.58,10.73A7.9,7.9,0,0,0,208,232a8,8,0,0,0,7.16-4.42c.37-.73,8.85-18,8.85-43.58V148A28,28,0,0,0,196,120Z"></path></svg>',
      target: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M232,120h-8.34A96.14,96.14,0,0,0,136,32.34V24a8,8,0,0,0-16,0v8.34A96.14,96.14,0,0,0,32.34,120H24a8,8,0,0,0,0,16h8.34A96.14,96.14,0,0,0,120,223.66V232a8,8,0,0,0,16,0v-8.34A96.14,96.14,0,0,0,223.66,136H232a8,8,0,0,0,0-16Zm-96,87.6V200a8,8,0,0,0-16,0v7.6A80.15,80.15,0,0,1,48.4,136H56a8,8,0,0,0,0-16H48.4A80.15,80.15,0,0,1,120,48.4V56a8,8,0,0,0,16,0V48.4A80.15,80.15,0,0,1,207.6,120H200a8,8,0,0,0,0,16h7.6A80.15,80.15,0,0,1,136,207.6ZM128,88a40,40,0,1,0,40,40A40,40,0,0,0,128,88Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,152Z"></path></svg>',
      grid2048: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke="currentColor" stroke-width="1.8"/></svg>',
      flappy: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M176,68a12,12,0,1,1-12-12A12,12,0,0,1,176,68Zm64,12a8,8,0,0,1-3.56,6.66L216,100.28V120A104.11,104.11,0,0,1,112,224H24a16,16,0,0,1-12.49-26l.1-.12L96,96.63V76.89C96,43.47,122.79,16.16,155.71,16H156a60,60,0,0,1,57.21,41.86l23.23,15.48A8,8,0,0,1,240,80Zm-22.42,0L201.9,69.54a8,8,0,0,1-3.31-4.64A44,44,0,0,0,156,32h-.22C131.64,32.12,112,52.25,112,76.89V99.52a8,8,0,0,1-1.85,5.13L24,208h26.9l70.94-85.12a8,8,0,1,1,12.29,10.24L71.75,208H112a88.1,88.1,0,0,0,88-88V96a8,8,0,0,1,3.56-6.66Z"></path></svg>',
      drift: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M149.26,159.26C155.09,173.82,163.5,176,168,176s12.91-2.18,18.74-16.74c3.39-8.48,5.26-19.58,5.26-31.26s-1.87-22.78-5.26-31.26C180.91,82.18,172.5,80,168,80s-12.91,2.18-18.74,16.74C145.87,105.22,144,116.32,144,128S145.87,150.78,149.26,159.26ZM168,96.2c2.62,2.06,8,13,8,31.8s-5.38,29.74-8,31.8c-2.62-2.06-8-13-8-31.8S165.38,98.26,168,96.2ZM232,216H196.41C213.12,197.73,224,165.47,224,128c0-58.32-26.35-104-60-104H92C58.35,24,32,69.68,32,128S58.35,232,92,232H232a8,8,0,0,0,0-16ZM193.74,63.93C202.93,80.91,208,103.67,208,128s-5.07,47.09-14.26,64.07C185.38,207.5,174.82,216,164,216s-21.38-8.5-29.74-23.93C125.07,175.09,120,152.33,120,128s5.07-47.09,14.26-64.07C142.62,48.5,153.18,40,164,40S185.38,48.5,193.74,63.93ZM48,128c0-2.5.07-5,.17-7.44L80,97.83l24.43,17.45c-.28,4.16-.43,8.41-.43,12.72a179.89,179.89,0,0,0,3.07,33.5l-22.42-16a8,8,0,0,0-9.3,0l-23.74,17A161,161,0,0,1,48,128ZM62.26,63.93C70.62,48.5,81.18,40,92,40h39.59c-11.9,13-20.84,33.12-25,57.16L84.65,81.49a8,8,0,0,0-9.3,0L50.49,99.25C52.85,86,56.83,74,62.26,63.93Zm0,128.14a100.08,100.08,0,0,1-5.94-13.32L80,161.83l33.94,24.24c4.6,12,10.6,22.22,17.65,29.93H92C81.18,216,70.62,207.5,62.26,192.07Z"></path></svg>',
      smoke: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M160,40A88.09,88.09,0,0,0,81.29,88.67,64,64,0,1,0,72,216h88a88,88,0,0,0,0-176Zm0,160H72a48,48,0,0,1,0-96c1.1,0,2.2,0,3.29.11A88,88,0,0,0,72,128a8,8,0,0,0,16,0,72,72,0,1,1,72,72Z"></path></svg>',
      store: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M232,96a7.89,7.89,0,0,0-.3-2.2L217.35,43.6A16.07,16.07,0,0,0,202,32H54A16.07,16.07,0,0,0,38.65,43.6L24.31,93.8A7.89,7.89,0,0,0,24,96h0v16a40,40,0,0,0,16,32v72a8,8,0,0,0,8,8H208a8,8,0,0,0,8-8V144a40,40,0,0,0,16-32V96ZM54,48H202l11.42,40H42.61Zm50,56h48v8a24,24,0,0,1-48,0Zm-16,0v8a24,24,0,0,1-35.12,21.26,7.88,7.88,0,0,0-1.82-1.06A24,24,0,0,1,40,112v-8ZM200,208H56V151.2a40.57,40.57,0,0,0,8,.8,40,40,0,0,0,32-16,40,40,0,0,0,64,0,40,40,0,0,0,32,16,40.57,40.57,0,0,0,8-.8Zm4.93-75.8a8.08,8.08,0,0,0-1.8,1.05A24,24,0,0,1,168,112v-8h48v8A24,24,0,0,1,204.93,132.2Z"></path></svg>',
      image: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V158.75l-26.07-26.06a16,16,0,0,0-22.63,0l-20,20-44-44a16,16,0,0,0-22.62,0L40,149.37V56ZM40,172l52-52,80,80H40Zm176,28H194.63l-36-36,20-20L216,181.38V200ZM144,100a12,12,0,1,1,12,12A12,12,0,0,1,144,100Z"></path></svg>',
      sparkles: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M240,96a8,8,0,0,1-8,8H216v16a8,8,0,0,1-16,0V104H184a8,8,0,0,1,0-16h16V72a8,8,0,0,1,16,0V88h16A8,8,0,0,1,240,96ZM144,56h8v8a8,8,0,0,0,16,0V56h8a8,8,0,0,0,0-16h-8V32a8,8,0,0,0-16,0v8h-8a8,8,0,0,0,0,16Zm72.77,97a8,8,0,0,1,1.43,8A96,96,0,1,1,95.07,37.8a8,8,0,0,1,10.6,9.06A88.07,88.07,0,0,0,209.14,150.33,8,8,0,0,1,216.77,153Zm-19.39,14.88c-1.79.09-3.59.14-5.38.14A104.11,104.11,0,0,1,88,64c0-1.79,0-3.59.14-5.38A80,80,0,1,0,197.38,167.86Z"></path></svg>',
      badge: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.27,47,25.53a8,8,0,0,0,4.2,0c1-.26,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40Zm0,72c0,37.07-13.66,67.16-40.6,89.42A129.3,129.3,0,0,1,128,223.62a128.25,128.25,0,0,1-38.92-21.81C61.82,179.51,48,149.3,48,112l0-56,160,0Z"></path></svg>',
      wallet: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M216,64H56a8,8,0,0,1,0-16H192a8,8,0,0,0,0-16H56A24,24,0,0,0,32,56V184a24,24,0,0,0,24,24H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64Zm0,128H56a8,8,0,0,1-8-8V78.63A23.84,23.84,0,0,0,56,80H216Zm-48-60a12,12,0,1,1,12,12A12,12,0,0,1,168,132Z"></path></svg>',
      profileSettings: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M144,157.68a68,68,0,1,0-71.9,0c-20.65,6.76-39.23,19.39-54.17,37.17a8,8,0,1,0,12.24,10.3C50.25,181.19,77.91,168,108,168s57.75,13.19,77.87,37.15a8,8,0,0,0,12.26-10.3C183.18,177.07,164.6,164.44,144,157.68ZM56,100a52,52,0,1,1,52,52A52.06,52.06,0,0,1,56,100Zm196.25,43.07-4.66-2.69a23.6,23.6,0,0,0,0-8.76l4.66-2.69a8,8,0,1,0-8-13.86l-4.67,2.7a23.92,23.92,0,0,0-7.58-4.39V108a8,8,0,0,0-16,0v5.38a23.92,23.92,0,0,0-7.58,4.39l-4.67-2.7a8,8,0,1,0-8,13.86l4.66,2.69a23.6,23.6,0,0,0,0,8.76l-4.66,2.69a8,8,0,0,0,8,13.86l4.67-2.7a23.92,23.92,0,0,0,7.58,4.39V164a8,8,0,0,0,16,0v-5.38a23.92,23.92,0,0,0,7.58-4.39l4.67,2.7a7.92,7.92,0,0,0,4,1.07,8,8,0,0,0,4-14.93ZM216,136a8,8,0,1,1,8,8A8,8,0,0,1,216,136Z"></path></svg>',
      code: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="m8 16-4-4 4-4M16 8l4 4-4 4M14 4l-4 16" stroke="currentColor" stroke-width="2"/></svg>'
    };
    return icons[iconName] || icons.gear;
  }

  hideDesktopChatsPane() {
    if (window.innerWidth <= 768) return;
    const chatsList = document.getElementById('chatsList');
    if (chatsList) chatsList.classList.add('desktop-hidden');
    const searchBox = document.querySelector('.search-box');
    if (searchBox) searchBox.style.display = 'none';
    const chatsListHeader = document.querySelector('.chats-list-header');
    if (chatsListHeader) chatsListHeader.style.display = 'none';
  }

  animateDesktopSecondaryMenuOpen(menuRoot, triggerButton = null) {
    if (!(menuRoot instanceof HTMLElement)) return;
    if (window.innerWidth <= 768 || window.innerWidth > 900) return;

    const prefersReducedMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (this.desktopSecondaryMenuOpenAnimationFrame) {
      window.cancelAnimationFrame(this.desktopSecondaryMenuOpenAnimationFrame);
      this.desktopSecondaryMenuOpenAnimationFrame = null;
    }
    if (this.desktopSecondaryMenuOpenAnimationTimer) {
      window.clearTimeout(this.desktopSecondaryMenuOpenAnimationTimer);
      this.desktopSecondaryMenuOpenAnimationTimer = null;
    }

    menuRoot.classList.remove('is-opening');

    if (triggerButton instanceof HTMLElement) {
      triggerButton.classList.remove('is-activating');
      if (!prefersReducedMotion) {
        void triggerButton.offsetWidth;
        triggerButton.classList.add('is-activating');
        window.setTimeout(() => {
          triggerButton.classList.remove('is-activating');
        }, 180);
      }
    }

    if (prefersReducedMotion) return;

    void menuRoot.offsetWidth;
    this.desktopSecondaryMenuOpenAnimationFrame = window.requestAnimationFrame(() => {
      menuRoot.classList.add('is-opening');
      this.desktopSecondaryMenuOpenAnimationTimer = window.setTimeout(() => {
        menuRoot.classList.remove('is-opening');
        this.desktopSecondaryMenuOpenAnimationTimer = null;
      }, 340);
    });
  }

  resetDesktopSecondaryChatSearchState() {
    if (this.desktopSecondarySearchRevealTimer) {
      clearTimeout(this.desktopSecondarySearchRevealTimer);
      this.desktopSecondarySearchRevealTimer = null;
    }

    if (this.desktopSecondaryUserSearchTimer) {
      clearTimeout(this.desktopSecondaryUserSearchTimer);
      this.desktopSecondaryUserSearchTimer = null;
    }

    this.desktopSecondaryChatSearchQuery = '';
    this.desktopSecondaryChatSearchMode = false;
    this.desktopSecondaryUserSearchResults = [];
    this.desktopSecondaryUserSearchLoading = false;
    this.desktopSecondaryUserSearchError = '';
    this.desktopSecondaryUserSearchRequestId = 0;
    this.desktopSecondaryUserSearchLastRemoteQuery = '';
    this.desktopSecondaryChatSearchPendingKeyboardEdit = false;
    this.desktopSecondaryChatSearchRestoringFocus = false;
  }

  startDesktopSecondarySearchRevealAnimation(listEl) {
    if (!(listEl instanceof HTMLElement)) return;

    listEl.classList.remove('is-search-revealing');
    void listEl.offsetWidth;
    listEl.classList.add('is-search-revealing');

    if (this.desktopSecondarySearchRevealTimer) {
      clearTimeout(this.desktopSecondarySearchRevealTimer);
    }

    this.desktopSecondarySearchRevealTimer = window.setTimeout(() => {
      this.desktopSecondarySearchRevealTimer = null;
      listEl.classList.remove('is-search-revealing');
    }, 340);
  }

  collectDesktopSecondaryRecentUsers(limit = 6) {
    const byId = new Set();
    const users = [];

    this.getSortedChats().forEach((chat) => {
      if (!chat || chat.isGroup || users.length >= limit) return;
      const participantId = String(chat.participantId || '').trim();
      if (!participantId || byId.has(participantId)) return;

      const cachedMeta = typeof this.getCachedUserMeta === 'function'
        ? this.getCachedUserMeta(participantId)
        : {};
      byId.add(participantId);
      users.push({
        id: participantId,
        name: String(chat.name || cachedMeta?.name || 'Користувач').trim() || 'Користувач',
        tag: '',
        mobile: '',
        email: '',
        avatarImage: this.getAvatarImage(chat.avatarImage || cachedMeta?.avatarImage || ''),
        avatarColor: String(chat.avatarColor || cachedMeta?.avatarColor || '').trim(),
        raw: null
      });
    });

    return users;
  }

  collectDesktopSecondarySearchUsers() {
    const knownUsers = typeof this.collectKnownUsersForSearch === 'function'
      ? this.collectKnownUsersForSearch()
      : [];
    const recentUsers = this.collectDesktopSecondaryRecentUsers();
    const allUsers = Array.isArray(this.desktopSecondaryAllUsers)
      ? this.desktopSecondaryAllUsers
      : [];

    return typeof this.mergeNormalizedUsers === 'function'
      ? this.mergeNormalizedUsers(recentUsers, knownUsers, allUsers)
      : [...recentUsers, ...knownUsers, ...allUsers];
  }

  getDesktopSecondaryUserIdentityTokens(user) {
    if (!user || typeof user !== 'object') return [];
    const tokens = [];
    const safeId = String(user.id || '').trim();
    const safeTag = String(user.tag || '').trim().replace(/^@+/, '').toLowerCase();
    const safeMobile = String(user.mobile || '').replace(/\D/g, '').trim();
    const safeEmail = String(user.email || '').trim().toLowerCase();
    const safeName = String(user.name || '').trim().toLowerCase();

    if (safeId) tokens.push(`id:${safeId}`);
    if (safeTag) tokens.push(`tag:${safeTag}`);
    if (safeMobile) tokens.push(`mobile:${safeMobile}`);
    if (safeEmail) tokens.push(`email:${safeEmail}`);
    if (!tokens.length && safeName) tokens.push(`name:${safeName}`);
    return tokens;
  }

  isDesktopSecondaryUserInList(user, users = []) {
    const userTokens = this.getDesktopSecondaryUserIdentityTokens(user);
    if (!userTokens.length || !Array.isArray(users) || !users.length) return false;
    const userTokenSet = new Set(userTokens);
    return users.some((candidate) => {
      const candidateTokens = this.getDesktopSecondaryUserIdentityTokens(candidate);
      return candidateTokens.some((token) => userTokenSet.has(token));
    });
  }

  dedupeDesktopSecondaryUsers(users = []) {
    if (!Array.isArray(users) || !users.length) return [];
    const seenTokens = new Set();
    const uniqueUsers = [];

    users.forEach((user) => {
      const tokens = this.getDesktopSecondaryUserIdentityTokens(user);
      if (!tokens.length) {
        uniqueUsers.push(user);
        return;
      }
      if (tokens.some((token) => seenTokens.has(token))) return;
      uniqueUsers.push(user);
      tokens.forEach((token) => seenTokens.add(token));
    });

    return uniqueUsers;
  }

  async ensureDesktopSecondaryAllUsersLoaded(listEl, targetNavId = 'navChats', options = {}) {
    if (!listEl || this.desktopSecondaryAllUsersLoading) return;
    if (this.desktopSecondaryAllUsersFetched === true) return;
    if (Array.isArray(this.desktopSecondaryAllUsers) && this.desktopSecondaryAllUsers.length) return;

    const rerender = typeof options?.onStateChange === 'function'
      ? options.onStateChange
      : () => this.renderDesktopSecondaryChatsList(listEl, targetNavId);

    this.desktopSecondaryAllUsersLoading = true;
    this.desktopSecondaryUserSearchError = '';
    rerender();

    try {
      const users = typeof this.fetchAllRegisteredUsers === 'function'
        ? await this.fetchAllRegisteredUsers()
        : [];
      this.desktopSecondaryAllUsers = Array.isArray(users) ? users : [];
    } catch {
      this.desktopSecondaryAllUsers = [];
      this.desktopSecondaryUserSearchError = 'Не вдалося завантажити список користувачів.';
    } finally {
      this.desktopSecondaryAllUsersLoading = false;
      this.desktopSecondaryAllUsersFetched = true;
      if (typeof options?.onStateChange === 'function') {
        rerender();
        return;
      }
      const activeList = document.getElementById('desktopSecondaryMenuList');
      const menuRoot = document.getElementById('desktopSecondaryMenu');
      if (activeList === listEl && menuRoot?.dataset.menuRoot === targetNavId) {
        rerender();
      }
    }
  }

  scheduleDesktopSecondaryUserSearch(query, listEl, targetNavId = 'navChats', options = {}) {
    if (this.desktopSecondaryUserSearchTimer) {
      clearTimeout(this.desktopSecondaryUserSearchTimer);
      this.desktopSecondaryUserSearchTimer = null;
    }

    const rerender = typeof options?.onStateChange === 'function'
      ? options.onStateChange
      : () => this.renderDesktopSecondaryChatsList(listEl, targetNavId);

    const value = String(query || '').trim();
    const previousQuery = String(this.desktopSecondaryChatSearchQuery || '').trim();
    this.desktopSecondaryChatSearchQuery = value;
    this.desktopSecondaryChatSearchMode = true;
    this.desktopSecondaryUserSearchError = '';

    if (!value) {
      this.desktopSecondaryUserSearchLastRemoteQuery = '';
      this.desktopSecondaryUserSearchResults = [];
      this.desktopSecondaryUserSearchLoading = false;
      rerender();
      this.ensureDesktopSecondaryAllUsersLoaded(listEl, targetNavId, options);
      return;
    }

    const localUsers = this.collectDesktopSecondarySearchUsers();
    this.desktopSecondaryUserSearchResults = typeof this.rankUsersByQuery === 'function'
      ? this.rankUsersByQuery(localUsers, value)
      : localUsers;
    this.desktopSecondaryUserSearchLoading = value.length >= 2;
    rerender();

    if (value.length < 2 || typeof this.fetchRegisteredUsers !== 'function') {
      this.desktopSecondaryUserSearchLoading = false;
      rerender();
      return;
    }

    if (value === previousQuery && value === String(this.desktopSecondaryUserSearchLastRemoteQuery || '').trim()) {
      this.desktopSecondaryUserSearchLoading = false;
      rerender();
      return;
    }

    const requestId = (this.desktopSecondaryUserSearchRequestId || 0) + 1;
    this.desktopSecondaryUserSearchRequestId = requestId;

    this.desktopSecondaryUserSearchTimer = window.setTimeout(async () => {
      try {
        this.desktopSecondaryUserSearchLastRemoteQuery = value;
        const remoteUsers = await this.fetchRegisteredUsers(value);
        if (this.desktopSecondaryUserSearchRequestId !== requestId) return;

        const combined = typeof this.mergeNormalizedUsers === 'function'
          ? this.mergeNormalizedUsers(this.desktopSecondaryUserSearchResults, remoteUsers)
          : [...this.desktopSecondaryUserSearchResults, ...remoteUsers];
        this.desktopSecondaryUserSearchResults = typeof this.rankUsersByQuery === 'function'
          ? this.rankUsersByQuery(combined, value)
          : combined;
        if (Array.isArray(remoteUsers) && remoteUsers.length && typeof this.mergeNormalizedUsers === 'function') {
          this.desktopSecondaryAllUsers = this.mergeNormalizedUsers(this.desktopSecondaryAllUsers || [], remoteUsers);
        }
      } catch {
        if (this.desktopSecondaryUserSearchRequestId !== requestId) return;
        this.desktopSecondaryUserSearchError = 'Не вдалося виконати пошук користувачів.';
      } finally {
        if (this.desktopSecondaryUserSearchRequestId === requestId) {
          this.desktopSecondaryUserSearchLoading = false;
          if (typeof options?.onStateChange === 'function') {
            rerender();
            return;
          }
          const menuRoot = document.getElementById('desktopSecondaryMenu');
          if (menuRoot?.dataset.menuRoot === targetNavId) {
            rerender();
          }
        }
      }
    }, 320);
  }

  isDesktopSecondarySearchEditingKey(event) {
    const key = String(event?.key || '');
    if (!key) return false;
    if (event?.defaultPrevented) return false;
    if (key === 'Backspace' || key === 'Delete' || key === 'Enter' || key === ' ') return true;
    if (key.length === 1 && !event?.metaKey && !event?.ctrlKey && !event?.altKey) return true;
    return false;
  }

  renderDesktopSecondaryUserSection(
    title,
    users,
    contentEl,
    listEl,
    targetNavId = 'navChats',
    options = {}
  ) {
    if (!contentEl || !Array.isArray(users) || !users.length) return;

    const sectionEl = document.createElement('section');
    sectionEl.className = 'desktop-secondary-user-section';

    const titleEl = document.createElement('h4');
    titleEl.className = 'desktop-secondary-user-section-title';
    titleEl.textContent = title;
    sectionEl.appendChild(titleEl);

    const listWrap = document.createElement('div');
    listWrap.className = 'desktop-secondary-user-list';

    users.forEach((user) => {
      const safeSecondary = [
        user?.tag ? `@${user.tag}` : '',
        user?.mobile || user?.email || ''
      ].filter(Boolean).join(' · ');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'desktop-secondary-user-item';
      button.dataset.userId = String(user?.id || '');
      button.innerHTML = `
        ${this.getChatAvatarHtml({
          name: user?.name || 'Користувач',
          avatarImage: user?.avatarImage || '',
          avatarColor: user?.avatarColor || ''
        }, 'desktop-secondary-chat-avatar')}
        <span class="desktop-secondary-user-copy">
          <span class="desktop-secondary-user-main">${this.escapeHtml(user?.name || 'Користувач')}</span>
          <span class="desktop-secondary-user-secondary">${this.escapeHtml(safeSecondary || 'Натисніть, щоб відкрити чат')}</span>
        </span>
      `;
      button.addEventListener('click', async () => {
        try {
          if (typeof this.openOrCreateDirectChatByUser === 'function') {
            await this.openOrCreateDirectChatByUser(user);
          }
          if (typeof options?.onUserSelected === 'function') {
            options.onUserSelected(user);
          } else {
            this.resetDesktopSecondaryChatSearchState();
            this.renderDesktopSecondaryChatsList(listEl, targetNavId);
          }
        } catch (error) {
          await this.showAlert(error?.message || 'Не вдалося відкрити чат.');
        }
      });
      listWrap.appendChild(button);
    });

    sectionEl.appendChild(listWrap);
    contentEl.appendChild(sectionEl);
  }

  renderDesktopSecondaryChatSearchContent(contentEl, listEl, targetNavId = 'navChats', options = {}) {
    const query = String(this.desktopSecondaryChatSearchQuery || '').trim();
    const allUsers = Array.isArray(this.desktopSecondaryAllUsers)
      ? [...this.desktopSecondaryAllUsers].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'uk'))
      : [];
    const recentUsers = this.dedupeDesktopSecondaryUsers(this.collectDesktopSecondaryRecentUsers());
    const filteredAllUsers = this.dedupeDesktopSecondaryUsers(allUsers).filter(
      (user) => !this.isDesktopSecondaryUserInList(user, recentUsers)
    );

    if (!query) {
      if (recentUsers.length) {
        this.renderDesktopSecondaryUserSection(
          'Недавні користувачі',
          recentUsers,
          contentEl,
          listEl,
          targetNavId,
          options
        );
      }
      if (filteredAllUsers.length) {
        this.renderDesktopSecondaryUserSection(
          'Усі користувачі',
          filteredAllUsers,
          contentEl,
          listEl,
          targetNavId,
          options
        );
      }

      if (this.desktopSecondaryAllUsersLoading) {
        const loadingEl = document.createElement('div');
        loadingEl.className = 'desktop-secondary-search-state';
        loadingEl.textContent = 'Завантажуємо список користувачів...';
        contentEl.appendChild(loadingEl);
        return;
      }

      if (!recentUsers.length && !filteredAllUsers.length) {
        const emptyEl = document.createElement('div');
        emptyEl.className = 'desktop-secondary-search-state';
        emptyEl.textContent = this.desktopSecondaryUserSearchError || 'Користувачів поки не знайдено.';
        contentEl.appendChild(emptyEl);
      }
      return;
    }

    const localUsers = this.collectDesktopSecondarySearchUsers();
    const baseResults = typeof this.rankUsersByQuery === 'function'
      ? this.rankUsersByQuery(localUsers, query)
      : localUsers;
    const combinedResults = typeof this.mergeNormalizedUsers === 'function'
      ? this.mergeNormalizedUsers(baseResults, this.desktopSecondaryUserSearchResults || [])
      : [...baseResults, ...(this.desktopSecondaryUserSearchResults || [])];
    const rankedResultsRaw = typeof this.rankUsersByQuery === 'function'
      ? this.rankUsersByQuery(combinedResults, query)
      : combinedResults;
    const rankedResults = this.dedupeDesktopSecondaryUsers(rankedResultsRaw);

    if (rankedResults.length) {
      this.renderDesktopSecondaryUserSection(
        'Результати пошуку',
        rankedResults,
        contentEl,
        listEl,
        targetNavId,
        options
      );
    } else {
      const emptyEl = document.createElement('div');
      emptyEl.className = 'desktop-secondary-search-state';
      emptyEl.textContent = this.desktopSecondaryUserSearchLoading
        ? 'Шукаємо користувачів...'
        : (this.desktopSecondaryUserSearchError || `Немає користувачів за запитом "${query}".`);
      contentEl.appendChild(emptyEl);
    }
  }

  renderDesktopSecondaryChatsList(listEl, targetNavId = 'navChats') {
    if (!listEl) return;
    const activeElement = document.activeElement;
    const shouldRestoreSearchFocus = activeElement instanceof HTMLInputElement
      && activeElement.classList.contains('desktop-secondary-chat-search-input');
    const searchSelectionStart = shouldRestoreSearchFocus ? activeElement.selectionStart : null;
    const searchSelectionEnd = shouldRestoreSearchFocus ? activeElement.selectionEnd : null;

    listEl.innerHTML = '';
    listEl.classList.add('desktop-secondary-menu-list--chats');
    listEl.dataset.menuMode = this.desktopSecondaryChatSearchMode ? 'chat-search' : 'chats';

    const shell = document.createElement('div');
    shell.className = 'desktop-secondary-chat-shell';
    const refreshDesktopSecondarySearchContentOnly = () => {
      if (!this.desktopSecondaryChatSearchMode) return;
      const activeContent = listEl.querySelector('.desktop-secondary-chat-content');
      if (!(activeContent instanceof HTMLElement)) return;
      activeContent.innerHTML = '';
      this.renderDesktopSecondaryChatSearchContent(activeContent, listEl, targetNavId);
    };

    const searchWrap = document.createElement('div');
    searchWrap.className = 'desktop-secondary-chat-search';
    searchWrap.innerHTML = `
      <span class="desktop-secondary-chat-search-icon" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 256 256"><path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"></path></svg>
      </span>
    `;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'desktop-secondary-chat-search-input';
    input.placeholder = 'Пошук або новий чат';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.value = String(this.desktopSecondaryChatSearchQuery || '');
    const activateDesktopSecondarySearchMode = () => {
      if (this.desktopSecondaryChatSearchMode) return;
      this.desktopSecondaryChatSearchMode = true;
      this.startDesktopSecondarySearchRevealAnimation(listEl);
      this.renderDesktopSecondaryChatsList(listEl, targetNavId);
      this.ensureDesktopSecondaryAllUsersLoaded(listEl, targetNavId, {
        onStateChange: refreshDesktopSecondarySearchContentOnly
      });
      const nextInput = listEl.querySelector('.desktop-secondary-chat-search-input');
      if (nextInput instanceof HTMLInputElement) {
        window.requestAnimationFrame(() => {
          this.desktopSecondaryChatSearchRestoringFocus = true;
          nextInput.focus({ preventScroll: true });
          nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
        });
      }
    };
    input.addEventListener('pointerdown', (event) => {
      if (this.desktopSecondaryChatSearchMode) return;
      if (typeof event.button === 'number' && event.button !== 0) return;
      event.preventDefault();
      activateDesktopSecondarySearchMode();
    });
    input.addEventListener('focus', () => {
      if (this.desktopSecondaryChatSearchRestoringFocus === true) {
        this.desktopSecondaryChatSearchRestoringFocus = false;
        return;
      }
      if (!this.desktopSecondaryChatSearchMode) {
        activateDesktopSecondarySearchMode();
        return;
      }
      this.ensureDesktopSecondaryAllUsersLoaded(listEl, targetNavId, {
        onStateChange: refreshDesktopSecondarySearchContentOnly
      });
    });
    input.addEventListener('input', (event) => {
      this.desktopSecondaryChatSearchPendingKeyboardEdit = false;
      this.scheduleDesktopSecondaryUserSearch(event.target.value, listEl, targetNavId, {
        onStateChange: refreshDesktopSecondarySearchContentOnly
      });
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.desktopSecondaryChatSearchPendingKeyboardEdit = false;
        this.resetDesktopSecondaryChatSearchState();
        this.renderDesktopSecondaryChatsList(listEl, targetNavId);
      }
    });
    searchWrap.appendChild(input);
    shell.appendChild(searchWrap);

    const contentEl = document.createElement('div');
    contentEl.className = 'desktop-secondary-chat-content';

    if (this.desktopSecondaryChatSearchMode) {
      this.renderDesktopSecondaryChatSearchContent(contentEl, listEl, targetNavId);
    } else {
      const sortedChats = this.getSortedChats();
      if (!sortedChats.length) {
        const emptyState = document.createElement('div');
        emptyState.className = 'desktop-secondary-chat-empty';
        emptyState.textContent = 'Чатів ще немає';
        contentEl.appendChild(emptyState);
      } else {
        const listWrap = document.createElement('div');
        listWrap.className = 'desktop-secondary-chat-list';

        sortedChats.forEach((chat) => {
          const lastMessage = chat.messages[chat.messages.length - 1];
          const previewText = this.getChatPreviewText(chat, lastMessage);
          const safePreviewText = this.escapeHtml(previewText || 'Немає повідомлень');
          const typingClass = this.isChatTypingActive(chat) ? ' is-typing' : '';
          const deliveryState = (lastMessage && typeof this.getMessageDeliveryState === 'function')
            ? this.getMessageDeliveryState(lastMessage)
            : '';
          const statusCheckIcon = typeof this.getMessageStatusCheckSvg === 'function'
            ? this.getMessageStatusCheckSvg()
            : '<svg class="message-status-check" viewBox="0 0 256 256" aria-hidden="true" focusable="false"><path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"></path></svg>';
          const deliveryStatusHtml = deliveryState
            ? `<span class="desktop-secondary-chat-status ${deliveryState}" aria-label="${deliveryState === 'read' ? 'Прочитано' : 'Надіслано'}">${statusCheckIcon}${deliveryState === 'read' ? statusCheckIcon : ''}</span>`
            : '';
          const unreadCount = Math.max(0, Number(chat?.unreadCount || 0));
          const unreadBadge = unreadCount > 99 ? '99+' : String(unreadCount);
          const isActive = this.currentChat?.id === chat.id;
          const showPinnedMark = Boolean(chat?.isPinned);
          const button = document.createElement('button');
          button.type = 'button';
          button.className = `desktop-secondary-chat-item ${isActive ? 'active' : ''} ${unreadCount > 0 ? 'has-unread' : ''}`;
          button.dataset.chatId = String(chat.id);

          button.innerHTML = `
            ${showPinnedMark ? `<span class="desktop-secondary-chat-pin" aria-label="Закріплений чат" title="Закріплений чат"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M216,168h-9.29L185.54,48H192a8,8,0,0,0,0-16H64a8,8,0,0,0,0,16h6.46L49.29,168H40a8,8,0,0,0,0,16h80v56a8,8,0,0,0,16,0V184h80a8,8,0,0,0,0-16ZM86.71,48h82.58l21.17,120H65.54Z"></path></svg></span>` : ''}
            ${this.getChatAvatarHtml(chat, 'desktop-secondary-chat-avatar')}
            <div class="desktop-secondary-chat-info">
              <span class="desktop-secondary-chat-name">${this.escapeHtml(chat.name)}</span>
              <span class="desktop-secondary-chat-preview${typingClass}">${safePreviewText}</span>
            </div>
            <div class="desktop-secondary-chat-meta">
              <span class="desktop-secondary-chat-time-wrap">${deliveryStatusHtml}<span class="desktop-secondary-chat-time">${lastMessage?.time || ''}</span></span>
              ${unreadCount > 0 ? `<span class="desktop-secondary-chat-unread">${unreadBadge}</span>` : ''}
            </div>
          `;

          button.addEventListener('click', () => {
            const targetButton = document.getElementById(targetNavId);
            if (targetButton) this.setActiveNavButton(targetButton);
            this.selectChat(chat.id);
            this.renderDesktopSecondaryChatsList(listEl, targetNavId);
          });

          button.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.openChatListMenu(button, e.clientX, e.clientY);
          });

          listWrap.appendChild(button);
        });

        contentEl.appendChild(listWrap);
      }
    }

    shell.appendChild(contentEl);
    listEl.appendChild(shell);

    if (shouldRestoreSearchFocus) {
      const nextInput = listEl.querySelector('.desktop-secondary-chat-search-input');
      if (nextInput instanceof HTMLInputElement) {
        window.requestAnimationFrame(() => {
          this.desktopSecondaryChatSearchRestoringFocus = true;
          nextInput.focus({ preventScroll: true });
          const start = typeof searchSelectionStart === 'number' ? searchSelectionStart : nextInput.value.length;
          const end = typeof searchSelectionEnd === 'number' ? searchSelectionEnd : start;
          nextInput.setSelectionRange(start, end);
        });
      }
    }
  }

  refreshDesktopSecondaryChatsListIfVisible() {
    if (window.innerWidth <= 768) return;
    const menuRoot = document.getElementById('desktopSecondaryMenu');
    const listEl = document.getElementById('desktopSecondaryMenuList');
    if (!menuRoot || !listEl || !menuRoot.classList.contains('active')) return;
    if (listEl.dataset.menuMode !== 'chats' && listEl.dataset.menuMode !== 'chat-search') return;
    if (this.desktopSecondaryChatSearchMode) return;
    this.renderDesktopSecondaryChatsList(listEl, 'navChats');
  }

  openChatsHomeView({ syncNav = true } = {}) {
    const navChats = document.getElementById('navChats');
    if (syncNav && navChats) this.setActiveNavButton(navChats);
    this.showBottomNav();

    const settingsContainer = document.getElementById('settingsContainer');
    const settingsContainerMobile = document.getElementById('settingsContainerMobile');
    const chatsList = document.getElementById('chatsList');
    const chatContainer = document.getElementById('chatContainer');
    const chatsListHeader = document.querySelector('.chats-list-header');
    const sidebar = document.querySelector('.sidebar');
    const profileMenu = document.querySelector('.profile-menu-wrapper');
    const appEl = document.querySelector('.orion-app');
    const isMobile = window.innerWidth <= 768;

    if (settingsContainer) {
      settingsContainer.classList.remove('active');
      settingsContainer.style.display = 'none';
    }
    if (settingsContainerMobile) {
      settingsContainerMobile.classList.remove('active');
      settingsContainerMobile.style.display = 'none';
    }
    if (chatsList) chatsList.classList.remove('hidden');
    if (chatsListHeader) chatsListHeader.style.display = '';

    const searchBox = document.querySelector('.search-box');
    if (searchBox) searchBox.style.display = '';

    if (sidebar) {
      sidebar.style.display = '';
      sidebar.classList.remove('compact');
    }
    if (profileMenu) profileMenu.classList.remove('floating-nav');

    if (typeof this.stopVoiceRecording === 'function') {
      this.stopVoiceRecording({ discard: true, silent: true });
    }
    if (typeof this.stopActiveVoicePlayback === 'function') {
      this.stopActiveVoicePlayback();
    }
    if (typeof this.stopRealtimeTyping === 'function') {
      this.stopRealtimeTyping({ emit: true });
    }
    if (typeof this.leaveRealtimeChatRoom === 'function') {
      this.leaveRealtimeChatRoom();
    }
    this.currentChat = null;
    if (isMobile && this.mobileNewChatModeActive) {
      this.exitMobileNewChatMode({ clearQuery: true, render: false });
    }
    this.updateChatHeader();
    if (appEl) {
      appEl.classList.remove('chat-open');
      appEl.classList.remove('chat-active');
      appEl.classList.remove('mobile-chat-open');
    }
    if (chatContainer) {
      chatContainer.style.display = '';
      chatContainer.classList.remove('active');
    }
    this.setMobilePageScrollLock(false);
    this.showWelcomeScreen();
    this.restoreBottomNavToHome({ animate: false });
    this.renderChatsList();
  }

  handleDesktopSecondaryMenuSelect(button, item, targetNavId) {
    const list = document.getElementById('desktopSecondaryMenuList');
    if (list) {
      list.querySelectorAll('.desktop-secondary-menu-item').forEach((menuItem) => {
        menuItem.classList.remove('active');
      });
    }
    button.classList.add('active');

    const targetButton = document.getElementById(targetNavId);
    if (targetButton) {
      this.setActiveNavButton(targetButton);
    } else if (typeof this.syncDesktopNavRailActive === 'function') {
      this.syncDesktopNavRailActive(targetNavId);
    }
    if (item.action === 'open-chats-home') {
      this.openChatsHomeView({ syncNav: false });
      return;
    }
    if (item.parentSection) this.settingsParentSection = item.parentSection;
    this.pendingProfileItemsScope = item.section === 'profile-items' && targetNavId === 'navGames'
      ? 'games'
      : (item.section === 'profile-items' ? 'all' : null);
    if (item.section === 'messenger-settings') {
      this.pendingShopCategory = item.shopCategory || 'all';
    }
    if (item.section === 'mini-games') {
      this.pendingMiniGameView = item.miniGameView || 'tapper';
    }
    if (item.section === 'faq-settings') {
      this.pendingFaqSection = item.faqSection || 'overview';

      const settingsContainerId = window.innerWidth <= 768
        ? 'settingsContainerMobile'
        : 'settingsContainer';
      const settingsContainer = document.getElementById(settingsContainerId);
      const faqSectionEl = settingsContainer?.querySelector('#faq-settings');
      const faqAlreadyVisible = Boolean(
        settingsContainer?.classList.contains('active')
        && faqSectionEl instanceof HTMLElement
      );

      if (faqAlreadyVisible && typeof this.initFaqSection === 'function') {
        this.initFaqSection(settingsContainer, { behavior: 'smooth' });
        return;
      }
    }
    if (item.section) this.showSettings(item.section);
  }

  openDesktopSecondaryMenu(targetNavId, { activateFirst = true, triggerButton = null } = {}) {
    if (window.innerWidth <= 768) return;
    const menuRoot = document.getElementById('desktopSecondaryMenu');
    const titleEl = document.getElementById('desktopSecondaryMenuTitle');
    const listEl = document.getElementById('desktopSecondaryMenuList');
    if (!menuRoot || !titleEl || !listEl) return;
    menuRoot.dataset.menuRoot = targetNavId || '';

    const config = this.getDesktopSecondaryMenuConfig(targetNavId);
    titleEl.textContent = config.title;
    listEl.innerHTML = '';
    listEl.classList.remove('desktop-secondary-menu-list--chats');
    listEl.dataset.menuMode = 'default';
    this.closeDesktopSecondaryCreateMenu();
    if (targetNavId !== 'navChats') {
      this.resetDesktopSecondaryChatSearchState();
    }

    if (targetNavId === 'navChats') {
      this.resetDesktopSecondaryChatSearchState();
      const targetButton = document.getElementById(targetNavId);
      if (targetButton) this.setActiveNavButton(targetButton);
      this.openChatsHomeView({ syncNav: false });
      this.renderDesktopSecondaryChatsList(listEl, targetNavId);
      menuRoot.classList.add('active');
      this.hideDesktopChatsPane();
      this.animateDesktopSecondaryMenuOpen(menuRoot, triggerButton);
      return;
    }

    let firstButton = null;
    let firstItem = null;
    const groups = Array.isArray(config.groups) && config.groups.length
      ? config.groups
      : [{ title: '', items: config.items || [] }];

    groups.forEach((group) => {
      const groupEl = document.createElement('section');
      groupEl.className = 'desktop-secondary-menu-group';

      if (group.title) {
        const groupTitle = document.createElement('h4');
        groupTitle.className = 'desktop-secondary-menu-group-title';
        groupTitle.textContent = group.title;
        groupEl.appendChild(groupTitle);
      }

      const groupItemsEl = document.createElement('div');
      groupItemsEl.className = 'desktop-secondary-menu-group-items';

      (group.items || []).forEach((item) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'desktop-secondary-menu-item';
        const iconWrap = document.createElement('span');
        iconWrap.className = 'desktop-secondary-menu-item-icon';
        iconWrap.innerHTML = this.getDesktopSecondaryMenuItemIcon(item.icon);

        const labelWrap = document.createElement('span');
        labelWrap.className = 'desktop-secondary-menu-item-label';
        labelWrap.textContent = item.label;

        button.append(iconWrap, labelWrap);

        if (item.badge) {
          const badge = document.createElement('span');
          badge.className = 'desktop-secondary-menu-item-badge';
          badge.textContent = String(item.badge);
          button.appendChild(badge);
        }
        button.addEventListener('click', () => this.handleDesktopSecondaryMenuSelect(button, item, targetNavId));
        groupItemsEl.appendChild(button);

        if (!firstButton) {
          firstButton = button;
          firstItem = item;
        }
      });

      groupEl.appendChild(groupItemsEl);
      listEl.appendChild(groupEl);
    });

    menuRoot.classList.add('active');
    this.hideDesktopChatsPane();
    this.animateDesktopSecondaryMenuOpen(menuRoot, triggerButton);

    if (activateFirst && firstButton && firstItem) {
      this.handleDesktopSecondaryMenuSelect(firstButton, firstItem, targetNavId);
    }
  }

  collapseDesktopSecondaryMenu() {
    const menuRoot = document.getElementById('desktopSecondaryMenu');
    const listEl = document.getElementById('desktopSecondaryMenuList');
    const sidebar = document.querySelector('.sidebar');

    if (menuRoot) {
      menuRoot.classList.remove('active', 'is-opening');
      menuRoot.dataset.menuRoot = '';
    }
    if (listEl) {
      listEl.classList.remove('desktop-secondary-menu-list--chats');
      listEl.dataset.menuMode = 'default';
      listEl.innerHTML = '';
    }
    this.closeDesktopSecondaryCreateMenu();
    this.resetDesktopSecondaryChatSearchState();
    if (sidebar) {
      sidebar.classList.remove('compact');
    }
  }

  closeDesktopRailAccountMenu() {
    const menu = document.getElementById('desktopRailAccountMenu');
    const button = document.getElementById('desktopRailAccountBtn');
    if (!menu || !button) return;
    menu.classList.remove('active');
    menu.classList.remove('mobile-anchor');
    menu.style.left = '';
    menu.style.right = '';
    menu.style.top = '';
    menu.style.bottom = '';
    button.setAttribute('aria-expanded', 'false');
  }

  closeDesktopSecondaryCreateMenu() {
    const menu = document.getElementById('desktopSecondaryCreateMenu');
    const button = document.getElementById('desktopSecondaryMenuNewChat');
    if (!menu || !button) return;
    menu.classList.remove('active');
    button.setAttribute('aria-expanded', 'false');
  }

  toggleDesktopSecondaryCreateMenu(forceOpen = null) {
    const menu = document.getElementById('desktopSecondaryCreateMenu');
    const button = document.getElementById('desktopSecondaryMenuNewChat');
    if (!menu || !button) return;
    const shouldOpen = typeof forceOpen === 'boolean'
      ? forceOpen
      : !menu.classList.contains('active');
    menu.classList.toggle('active', shouldOpen);
    button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
  }

  async handleDesktopSecondaryCreateMenuAction(action = '') {
    if (!action) return;

    if (action === 'group') {
      if (typeof this.showSettings === 'function') {
        this.pendingGroupCreateReturnChatId = String(this.currentChat?.id || '').trim() || null;
        this.showSettings('group-create');
      }
      return;
    }

    if (action === 'channel') {
      await this.showNotice('Створення каналів буде додано в одному з наступних оновлень.', 'Чати');
    }
  }

  isMobileNewChatModeActive() {
    return window.innerWidth <= 768 && this.mobileNewChatModeActive === true;
  }

  closeMobileNewChatCreateMenu() {
    const menu = document.getElementById('mobileNewChatCreateMenu');
    const button = document.getElementById('newChatBtn');
    if (!menu || !button) return;
    menu.classList.remove('active', 'mobile-anchor');
    menu.style.left = '';
    menu.style.right = '';
    menu.style.top = '';
    menu.style.bottom = '';
    button.setAttribute('aria-expanded', 'false');
  }

  positionMobileNewChatCreateMenu(anchorEl) {
    const menu = document.getElementById('mobileNewChatCreateMenu');
    if (!menu || !(anchorEl instanceof HTMLElement) || window.innerWidth > 768) return;

    const rect = anchorEl.getBoundingClientRect();
    const estimatedWidth = 212;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const horizontalPadding = 12;
    const top = rect.bottom + 8;
    const rightAlignedLeft = rect.right - estimatedWidth;
    const left = Math.min(
      Math.max(horizontalPadding, rightAlignedLeft),
      Math.max(horizontalPadding, viewportWidth - estimatedWidth - horizontalPadding)
    );

    menu.classList.add('mobile-anchor');
    menu.style.left = `${Math.round(left)}px`;
    menu.style.right = 'auto';
    menu.style.top = `${Math.round(top)}px`;
    menu.style.bottom = 'auto';
  }

  toggleMobileNewChatCreateMenu(forceOpen = null, anchorEl = null) {
    const menu = document.getElementById('mobileNewChatCreateMenu');
    const button = document.getElementById('newChatBtn');
    if (!menu || !button || window.innerWidth > 768) return;

    const shouldOpen = typeof forceOpen === 'boolean'
      ? forceOpen
      : !menu.classList.contains('active');
    if (shouldOpen && anchorEl instanceof HTMLElement) {
      this.positionMobileNewChatCreateMenu(anchorEl);
    } else if (!shouldOpen) {
      menu.classList.remove('mobile-anchor');
      menu.style.left = '';
      menu.style.right = '';
      menu.style.top = '';
      menu.style.bottom = '';
    }

    menu.classList.toggle('active', shouldOpen);
    button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
  }

  enterMobileNewChatMode({ focusInput = true } = {}) {
    if (window.innerWidth > 768) return;

    this.mobileNewChatModeActive = true;
    this.mobileNewChatSearchRevealPending = true;
    this.desktopSecondaryChatSearchMode = true;
    this.desktopSecondaryUserSearchError = '';
    this.closeMobileNewChatCreateMenu();

    const searchBox = document.querySelector('.search-box');
    const searchInput = document.getElementById('searchInput');
    if (searchBox) searchBox.classList.add('is-mobile-new-chat-mode');
    if (searchInput instanceof HTMLInputElement) {
      searchInput.placeholder = 'Пошук або новий чат';
      searchInput.value = String(this.desktopSecondaryChatSearchQuery || '');
    }

    this.renderChatsList();
    const chatsList = document.getElementById('chatsList');
    this.ensureDesktopSecondaryAllUsersLoaded(chatsList, 'navChats', {
      onStateChange: () => this.renderChatsList()
    });

    if (focusInput && searchInput instanceof HTMLInputElement) {
      window.requestAnimationFrame(() => {
        searchInput.focus({ preventScroll: true });
        searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
      });
    }
  }

  exitMobileNewChatMode({ clearQuery = true, render = true } = {}) {
    this.closeMobileNewChatCreateMenu();
    this.mobileNewChatModeActive = false;
    this.mobileNewChatSearchRevealPending = false;

    if (clearQuery) {
      this.resetDesktopSecondaryChatSearchState();
    } else {
      this.desktopSecondaryChatSearchMode = false;
    }

    const searchBox = document.querySelector('.search-box');
    const searchInput = document.getElementById('searchInput');
    if (searchBox) searchBox.classList.remove('is-mobile-new-chat-mode');
    if (searchInput instanceof HTMLInputElement) {
      searchInput.value = '';
      searchInput.placeholder = 'Пошук чатів...';
    }

    if (render) {
      this.renderChatsList();
    }
  }

  renderMobileNewChatSearchResults(chatsList) {
    if (!(chatsList instanceof HTMLElement)) return;

    const listWrap = document.createElement('div');
    listWrap.className = 'desktop-secondary-menu-list desktop-secondary-menu-list--chats mobile-new-chat-results';
    listWrap.dataset.menuMode = 'chat-search';

    const contentEl = document.createElement('div');
    contentEl.className = 'desktop-secondary-chat-content';
    this.renderDesktopSecondaryChatSearchContent(contentEl, chatsList, 'navChats', {
      onUserSelected: () => {
        this.exitMobileNewChatMode({ clearQuery: true, render: false });
      }
    });

    listWrap.appendChild(contentEl);
    chatsList.appendChild(listWrap);

    if (this.mobileNewChatSearchRevealPending === true) {
      this.mobileNewChatSearchRevealPending = false;
      this.startDesktopSecondarySearchRevealAnimation(listWrap);
    }
  }

  positionDesktopRailAccountMenuForMobile(anchorEl) {
    const menu = document.getElementById('desktopRailAccountMenu');
    if (!menu || !(anchorEl instanceof HTMLElement) || window.innerWidth > 768) return;

    const rect = anchorEl.getBoundingClientRect();
    const estimatedWidth = 196;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const horizontalPadding = 12;
    const left = Math.min(
      Math.max(horizontalPadding, rect.right - estimatedWidth),
      Math.max(horizontalPadding, viewportWidth - estimatedWidth - horizontalPadding)
    );
    const top = Math.max(12, rect.top - 148);

    menu.classList.add('mobile-anchor');
    menu.style.left = `${Math.round(left)}px`;
    menu.style.right = 'auto';
    menu.style.top = `${Math.round(top)}px`;
    menu.style.bottom = 'auto';
  }

  toggleDesktopRailAccountMenu(forceOpen = null, options = {}) {
    const menu = document.getElementById('desktopRailAccountMenu');
    const button = document.getElementById('desktopRailAccountBtn');
    if (!menu || !button) return;
    const shouldOpen = typeof forceOpen === 'boolean'
      ? forceOpen
      : !menu.classList.contains('active');
    const triggerButton = options?.triggerButton instanceof HTMLElement
      ? options.triggerButton
      : null;
    if (shouldOpen && window.innerWidth <= 768 && triggerButton) {
      this.positionDesktopRailAccountMenuForMobile(triggerButton);
    } else if (!shouldOpen || window.innerWidth > 768) {
      menu.classList.remove('mobile-anchor');
      menu.style.left = '';
      menu.style.right = '';
      menu.style.top = '';
      menu.style.bottom = '';
    }
    menu.classList.toggle('active', shouldOpen);
    button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
  }

  async handleDesktopRailAccountMenuAction(action = '') {
    if (!action) return;

    if (action === 'profile') {
      const navProfile = document.getElementById('navProfile');
      if (navProfile) this.setActiveNavButton(navProfile);
      if (window.innerWidth > 768) {
        this.openDesktopSecondaryMenu('navProfile', { activateFirst: true });
      } else {
        this.showSettings('profile');
      }
      return;
    }

    if (action === 'switch-account') {
      const navProfile = document.getElementById('navProfile');
      if (navProfile) this.setActiveNavButton(navProfile);
      this.settingsParentSection = 'profile';
      this.showSettings('profile-settings');
      if (window.innerWidth > 768) {
        this.openDesktopSecondaryMenu('navProfile', { activateFirst: false });
      }
      return;
    }

    if (action === 'logout') {
      const confirmed = await this.showConfirm('Ви дійсно хочете вийти з акаунту?', 'Вихід з акаунту');
      if (!confirmed) return;

      try {
        clearAuthSession();
        localStorage.removeItem('orion_user');
      } catch {
        // Ignore storage failures and continue with in-memory reset.
      }
      redirectToAuthPage();
      return;
    }
  }

  setupEventListeners() {
    if (this.eventListenersBound) return;
    this.eventListenersBound = true;

    this.initDesktopSecondaryRainCanvas();

    const newChatBtn = document.getElementById('newChatBtn');
    const desktopSecondaryMenuNewChat = document.getElementById('desktopSecondaryMenuNewChat');
    const desktopSecondaryMenuBack = document.getElementById('desktopSecondaryMenuBack');
    const desktopSecondaryMenuSearch = document.getElementById('desktopSecondaryMenuSearch');
    const desktopSecondaryCreateMenu = document.getElementById('desktopSecondaryCreateMenu');
    const mobileNewChatCreateMenu = document.getElementById('mobileNewChatCreateMenu');
    const desktopSecondaryCreateActions = desktopSecondaryCreateMenu
      ? desktopSecondaryCreateMenu.querySelectorAll('[data-secondary-create-action]')
      : [];
    const mobileNewChatCreateActions = mobileNewChatCreateMenu
      ? mobileNewChatCreateMenu.querySelectorAll('[data-secondary-create-action]')
      : [];
    if (newChatBtn) {
      newChatBtn.addEventListener('click', (event) => {
        if (window.innerWidth > 768) {
          this.openNewChatModal();
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (!this.mobileNewChatModeActive) {
          this.enterMobileNewChatMode({ focusInput: false });
        }
        this.toggleMobileNewChatCreateMenu(null, newChatBtn);
      });
    }
    if (desktopSecondaryMenuNewChat) {
      desktopSecondaryMenuNewChat.addEventListener('click', (event) => {
        event.stopPropagation();
        this.toggleDesktopSecondaryCreateMenu();
      });
    }
    if (desktopSecondaryCreateMenu) {
      desktopSecondaryCreateMenu.addEventListener('click', (event) => {
        event.stopPropagation();
      });
    }
    if (mobileNewChatCreateMenu) {
      mobileNewChatCreateMenu.addEventListener('click', (event) => {
        event.stopPropagation();
      });
    }
    if (desktopSecondaryCreateActions.length) {
      desktopSecondaryCreateActions.forEach((item) => {
        item.addEventListener('click', async () => {
          const action = item.getAttribute('data-secondary-create-action') || '';
          this.closeDesktopSecondaryCreateMenu();
          await this.handleDesktopSecondaryCreateMenuAction(action);
        });
      });
    }
    if (mobileNewChatCreateActions.length) {
      mobileNewChatCreateActions.forEach((item) => {
        item.addEventListener('click', async () => {
          const action = item.getAttribute('data-secondary-create-action') || '';
          this.closeMobileNewChatCreateMenu();
          await this.handleDesktopSecondaryCreateMenuAction(action);
        });
      });
    }
    if (desktopSecondaryMenuSearch) {
      desktopSecondaryMenuSearch.addEventListener('click', () => {
        if (window.innerWidth <= 768) return;
        const menuRoot = document.getElementById('desktopSecondaryMenu');
        const listEl = document.getElementById('desktopSecondaryMenuList');
        if (!menuRoot || !listEl || menuRoot.dataset.menuRoot !== 'navChats') return;
        this.closeDesktopSecondaryCreateMenu();
        this.desktopSecondaryChatSearchMode = true;
        this.startDesktopSecondarySearchRevealAnimation(listEl);
        this.renderDesktopSecondaryChatsList(listEl, 'navChats');
        this.ensureDesktopSecondaryAllUsersLoaded(listEl, 'navChats');
        const input = listEl.querySelector('.desktop-secondary-chat-search-input');
        if (input instanceof HTMLInputElement) {
          window.requestAnimationFrame(() => {
            this.desktopSecondaryChatSearchRestoringFocus = true;
            input.focus({ preventScroll: true });
            input.select();
          });
        }
      });
    }
    if (desktopSecondaryMenuBack) {
      desktopSecondaryMenuBack.addEventListener('click', () => {
        if (window.innerWidth <= 768) return;
        this.closeDesktopSecondaryCreateMenu();
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        sidebar.classList.toggle('compact');
        if (this.currentChat) {
          this.syncDateSeparatorToChatInfo();
        }
      });
    }
    document.getElementById('closeModalBtn').addEventListener('click', () => this.closeNewChatModal());
    document.getElementById('cancelBtn').addEventListener('click', () => this.closeNewChatModal());
    document.getElementById('confirmBtn').addEventListener('click', () => this.createNewChat());
    const closeProfileQrBtn = document.getElementById('closeProfileQrBtn');
    if (closeProfileQrBtn) {
      closeProfileQrBtn.addEventListener('click', () => this.closeProfileQrModal());
    }
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', () => {
        const newChatModal = document.getElementById('newChatModal');
        const profileQrModal = document.getElementById('profileQrModal');
        const groupInfoModal = document.getElementById('groupInfoModal');
        const groupAppearanceModal = document.getElementById('groupAppearanceModal');
        const addToGroupModal = document.getElementById('addToGroupModal');
        if (newChatModal?.classList.contains('active')) this.closeNewChatModal();
        if (profileQrModal?.classList.contains('active')) this.closeProfileQrModal();
        if (groupInfoModal?.classList.contains('active')) this.closeGroupInfoModal();
        if (groupAppearanceModal?.classList.contains('active')) {
          this.closeGroupAppearanceModal({ restoreGroupInfo: false });
        }
        if (addToGroupModal?.classList.contains('active')) this.closeAddToGroupModal();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        const profileQrModal = document.getElementById('profileQrModal');
        if (profileQrModal?.classList.contains('active')) {
          this.closeProfileQrModal();
        }
      });
    }
    
    const navProfile = document.getElementById('navProfile');
    const navSettings = document.getElementById('navSettings');
    const navExplore = document.getElementById('navExplore');
    const navShop = document.getElementById('navShop');
    const navWallet = document.getElementById('navWallet');
    const navCalls = document.getElementById('navCalls');
    const navChats = document.getElementById('navChats');
    const navGames = document.getElementById('navGames');
    const desktopRailItems = document.querySelectorAll('.desktop-nav-rail-item[data-nav-target]');
    const desktopRailReload = document.getElementById('desktopRailReload');
    const desktopRailAccountBtn = document.getElementById('desktopRailAccountBtn');
    const desktopRailAccountMenu = document.getElementById('desktopRailAccountMenu');
    const desktopRailAccountActions = desktopRailAccountMenu
      ? desktopRailAccountMenu.querySelectorAll('[data-account-action]')
      : [];
    const isSettingsScreenActive = () => {
      const desktopSettings = document.getElementById('settingsContainer');
      const mobileSettings = document.getElementById('settingsContainerMobile');
      const desktopActive = desktopSettings?.classList.contains('active') && desktopSettings?.style.display !== 'none';
      const mobileActive = mobileSettings?.classList.contains('active') && mobileSettings?.style.display !== 'none';
      return Boolean(desktopActive || mobileActive);
    };

    if (desktopRailItems.length) {
      desktopRailItems.forEach((item) => {
        item.addEventListener('click', () => {
          this.closeDesktopRailAccountMenu();
          const targetId = item.dataset.navTarget;
          if (!targetId) return;
          if (window.innerWidth > 768) {
            this.openDesktopSecondaryMenu(targetId, { activateFirst: true, triggerButton: item });
            return;
          }
          const targetButton = document.getElementById(targetId);
          if (targetButton) targetButton.click();
        });
      });
    }

    if (desktopRailReload) {
      desktopRailReload.addEventListener('click', () => {
        this.closeDesktopRailAccountMenu();
        window.location.reload();
      });
    }

    if (desktopRailAccountBtn && desktopRailAccountMenu) {
      desktopRailAccountBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        this.toggleDesktopRailAccountMenu();
      });

      desktopRailAccountMenu.addEventListener('click', (event) => {
        event.stopPropagation();
      });

      desktopRailAccountActions.forEach((item) => {
        item.addEventListener('click', async () => {
          const action = item.getAttribute('data-account-action') || '';
          this.closeDesktopRailAccountMenu();
          await this.handleDesktopRailAccountMenuAction(action);
        });
      });

      document.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (!desktopRailAccountMenu.classList.contains('active')) return;
        if (
          desktopRailAccountBtn.contains(target)
          || desktopRailAccountMenu.contains(target)
          || navProfile?.contains(target)
        ) return;
        this.closeDesktopRailAccountMenu();
      });
    }

    if (desktopSecondaryMenuNewChat && desktopSecondaryCreateMenu) {
      document.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (!desktopSecondaryCreateMenu.classList.contains('active')) return;
        if (desktopSecondaryMenuNewChat.contains(target) || desktopSecondaryCreateMenu.contains(target)) return;
        this.closeDesktopSecondaryCreateMenu();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (!desktopSecondaryCreateMenu.classList.contains('active')) return;
        this.closeDesktopSecondaryCreateMenu();
      });
    }
    if (newChatBtn && mobileNewChatCreateMenu) {
      document.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (!mobileNewChatCreateMenu.classList.contains('active')) return;
        if (newChatBtn.contains(target) || mobileNewChatCreateMenu.contains(target)) return;
        this.closeMobileNewChatCreateMenu();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (!mobileNewChatCreateMenu.classList.contains('active')) return;
        this.closeMobileNewChatCreateMenu();
      });
    }
    
    if (navProfile) {
      navProfile.addEventListener('click', (event) => {
        if (this.mobileNavProfileLongPressTriggered) {
          this.mobileNavProfileLongPressTriggered = false;
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (window.innerWidth <= 768 && this.mobileNewChatModeActive) {
          this.exitMobileNewChatMode({ clearQuery: true, render: false });
        }
        if (navProfile.classList.contains('active') && this.currentChat === null && isSettingsScreenActive()) return;
        this.setActiveNavButton(navProfile);
        this.showSettings('profile');
      });

      let navProfileLongPressTimer = null;
      const clearNavProfileLongPressTimer = () => {
        if (!navProfileLongPressTimer) return;
        clearTimeout(navProfileLongPressTimer);
        navProfileLongPressTimer = null;
      };
      const startNavProfileLongPress = () => {
        if (window.innerWidth > 768) return;
        clearNavProfileLongPressTimer();
        navProfileLongPressTimer = window.setTimeout(() => {
          navProfileLongPressTimer = null;
          this.mobileNavProfileLongPressTriggered = true;
          this.toggleDesktopRailAccountMenu(true, { triggerButton: navProfile });
        }, 420);
      };
      navProfile.addEventListener('pointerdown', startNavProfileLongPress);
      navProfile.addEventListener('pointerup', clearNavProfileLongPressTimer);
      navProfile.addEventListener('pointercancel', clearNavProfileLongPressTimer);
      navProfile.addEventListener('pointermove', clearNavProfileLongPressTimer);
      navProfile.addEventListener('pointerleave', clearNavProfileLongPressTimer);
    }
    
    if (navExplore) {
      navExplore.addEventListener('click', () => {
        if (window.innerWidth <= 768 && this.mobileNewChatModeActive) {
          this.exitMobileNewChatMode({ clearQuery: true, render: false });
        }
        if (navExplore.classList.contains('active') && this.currentChat === null && isSettingsScreenActive()) return;
        this.setActiveNavButton(navExplore);
        this.settingsParentSection = 'mobile-sections';
        this.showSettings('mobile-sections');
      });
    }

    if (navShop) {
      navShop.addEventListener('click', () => {
        if (window.innerWidth <= 768 && this.mobileNewChatModeActive) {
          this.exitMobileNewChatMode({ clearQuery: true, render: false });
        }
        if (navShop.classList.contains('active') && this.currentChat === null && isSettingsScreenActive()) return;
        this.setActiveNavButton(navShop);
        this.settingsParentSection = 'messenger-settings';
        this.showSettings('messenger-settings');
      });
    }

    if (navWallet) {
      navWallet.addEventListener('click', () => {
        if (window.innerWidth <= 768 && this.mobileNewChatModeActive) {
          this.exitMobileNewChatMode({ clearQuery: true, render: false });
        }
        if (navWallet.classList.contains('active') && this.currentChat === null && isSettingsScreenActive()) return;
        this.setActiveNavButton(navWallet);
        this.showSettings('wallet');
      });
    }

    if (navSettings) {
      navSettings.addEventListener('click', () => {
        if (window.innerWidth <= 768 && this.mobileNewChatModeActive) {
          this.exitMobileNewChatMode({ clearQuery: true, render: false });
        }
        if (navSettings.classList.contains('active') && this.currentChat === null && isSettingsScreenActive()) return;
        this.setActiveNavButton(navSettings);
        this.settingsParentSection = 'settings-home';
        this.showSettings('settings-home');
      });
    }

    if (navGames) {
      navGames.addEventListener('click', () => {
        if (window.innerWidth <= 768 && this.mobileNewChatModeActive) {
          this.exitMobileNewChatMode({ clearQuery: true, render: false });
        }
        if (navGames.classList.contains('active') && this.currentChat === null && isSettingsScreenActive()) return;
        this.setActiveNavButton(navGames);
        this.pendingMiniGameView = 'tapper';
        this.showSettings('mini-games');
      });
    }
    
    if (navCalls) {
      navCalls.addEventListener('click', () => {
        if (window.innerWidth <= 768 && this.mobileNewChatModeActive) {
          this.exitMobileNewChatMode({ clearQuery: true, render: false });
        }
        if (navCalls.classList.contains('active') && this.currentChat === null && isSettingsScreenActive()) return;
        this.setActiveNavButton(navCalls);
        this.showSettings('calls');
      });
    }
    
    if (navChats) {
      navChats.addEventListener('click', () => {
        this.closeMobileNewChatCreateMenu();
        if (
          navChats.classList.contains('active')
          && this.currentChat === null
          && !isSettingsScreenActive()
          && !this.mobileNewChatModeActive
        ) return;
        this.setActiveNavButton(navChats);
        this.openChatsHomeView({ syncNav: false });
      });
    }

    if (typeof this.syncDesktopNavRailActive === 'function') {
      this.syncDesktopNavRailActive();
    }
    
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
      const keepComposerFocusMouse = (e) => {
        // Keep textarea focus on desktop click, but do not block touch events on mobile.
        if (window.innerWidth > 900) {
          e.preventDefault();
        }
      };
      const triggerPrimaryAction = (e) => {
        if (e?.cancelable) e.preventDefault();
        if (typeof e?.stopPropagation === 'function') e.stopPropagation();
        const now = Date.now();
        const source = String(e?.type || 'click');
        if (now - this.lastSendTriggerAt < 220) return;
        this.lastSendTriggerAt = now;
        this.lastSendTriggerSource = source;
        this.handleSendButtonAction();
      };
      sendBtn.addEventListener('mousedown', keepComposerFocusMouse);
      sendBtn.addEventListener('touchend', triggerPrimaryAction, { passive: false });
      sendBtn.addEventListener('click', triggerPrimaryAction);
    }
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
      this.setupMessageComposer(messageInput);
      messageInput.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
        if (this.settings?.enterToSend === false) return;
        e.preventDefault();
        this.handleSendButtonAction();
      });
    }
    this.setupMessagesScrollBottomButton();
    const attachBtn = document.querySelector('.btn-attach');
    const galleryPickerInput = document.getElementById('galleryPickerInput');
    const cameraPickerInput = document.getElementById('cameraPickerInput');
    const filePickerInput = document.getElementById('filePickerInput');
    const attachSheetOverlay = document.getElementById('attachSheetOverlay');
    const attachSheet = document.getElementById('attachSheet');
    const attachSheetCancelBtn = document.getElementById('attachSheetCancelBtn');
    const attachSheetItems = document.querySelectorAll('.attach-sheet-item');
    const cameraCloseBtn = document.getElementById('cameraCloseBtn');
    const cameraSwitchBtn = document.getElementById('cameraSwitchBtn');
    const cameraShutterBtn = document.getElementById('cameraShutterBtn');
    if (attachBtn) {
      attachBtn.addEventListener('click', () => this.openImagePicker());
    }
    if (galleryPickerInput) {
      galleryPickerInput.addEventListener('change', (e) => this.handleImageSelected(e));
    }
    if (cameraPickerInput) {
      cameraPickerInput.addEventListener('change', (e) => this.handleImageSelected(e));
    }
    if (filePickerInput) {
      filePickerInput.addEventListener('change', (e) => this.handleImageSelected(e));
    }
    if (attachSheetOverlay) {
      attachSheetOverlay.addEventListener('click', (e) => {
        if (e.target === attachSheetOverlay) this.closeAttachSheet();
      });
    }
    if (attachSheet) {
      attachSheet.addEventListener('touchstart', (e) => this.onAttachSheetTouchStart(e), { passive: true });
      attachSheet.addEventListener('touchmove', (e) => this.onAttachSheetTouchMove(e), { passive: false });
      attachSheet.addEventListener('touchend', () => this.onAttachSheetTouchEnd());
      attachSheet.addEventListener('touchcancel', () => this.onAttachSheetTouchEnd());
    }
    if (attachSheetCancelBtn) {
      attachSheetCancelBtn.addEventListener('click', () => this.closeAttachSheet());
    }
    if (attachSheetItems.length) {
      attachSheetItems.forEach((item) => {
        item.addEventListener('click', () => this.handleAttachSheetAction(item.dataset.attachAction || ''));
      });
    }
    if (cameraCloseBtn) {
      cameraCloseBtn.addEventListener('click', () => this.closeCameraCapture());
    }
    if (cameraSwitchBtn) {
      cameraSwitchBtn.addEventListener('click', () => this.toggleCameraFacingMode());
    }
    if (cameraShutterBtn) {
      cameraShutterBtn.addEventListener('click', () => this.capturePhotoFromCamera());
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeDesktopRailAccountMenu();
        this.closeMobileNewChatCreateMenu();
        this.closeAttachSheet();
        this.closeCameraCapture();
        this.closeContactProfileActionsMenu();
        if (window.innerWidth <= 768 && this.mobileNewChatModeActive && !this.currentChat) {
          this.exitMobileNewChatMode({ clearQuery: true, render: true });
        }
        if (this.isContactProfileSectionActive()) {
          this.closeContactProfileSection();
        }
      }
    });
    this.setupImageViewerEvents();
    this.setupMessageMediaRetryEvents();
    this.setupVoiceMessageEvents();

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('focus', () => {
        if (window.innerWidth <= 768 && !this.isMobileNewChatModeActive()) {
          this.enterMobileNewChatMode({ focusInput: false });
        }
        if (!this.isMobileNewChatModeActive()) return;
        this.closeMobileNewChatCreateMenu();
        const chatsList = document.getElementById('chatsList');
        this.ensureDesktopSecondaryAllUsersLoaded(chatsList, 'navChats', {
          onStateChange: () => this.renderChatsList()
        });
      });
      searchInput.addEventListener('keydown', (event) => {
        if (!this.isMobileNewChatModeActive()) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          this.exitMobileNewChatMode({ clearQuery: true, render: true });
          return;
        }
        if (this.isDesktopSecondarySearchEditingKey(event)) {
          this.desktopSecondaryChatSearchPendingKeyboardEdit = true;
        }
      });
      searchInput.addEventListener('input', (event) => {
        const value = event?.target?.value || '';
        if (this.isMobileNewChatModeActive()) {
          if (!event.isTrusted) return;
          const inputType = String(event.inputType || '').trim();
          const wasKeyboardEdit = this.desktopSecondaryChatSearchPendingKeyboardEdit === true;
          const isDirectUserEdit = Boolean(
            wasKeyboardEdit
            || inputType.startsWith('insert')
            || inputType.startsWith('delete')
            || inputType === 'historyUndo'
            || inputType === 'historyRedo'
            || inputType === ''
          );
          this.desktopSecondaryChatSearchPendingKeyboardEdit = false;
          if (!isDirectUserEdit) return;
          const chatsList = document.getElementById('chatsList');
          this.scheduleDesktopSecondaryUserSearch(value, chatsList, 'navChats', {
            onStateChange: () => this.renderChatsList()
          });
          return;
        }
        this.filterChats(value);
      });
    }

    document.getElementById('newContactInput').addEventListener('input', (e) => {
      if (this.newChatGroupMode) return;
      if (typeof this.scheduleUserSearch === 'function') {
        this.scheduleUserSearch(e.target.value || '');
      }
    });

    document.getElementById('newContactInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.createNewChat();
      }
    });

    const newChatGroupModeBtn = document.getElementById('newChatGroupModeBtn');
    if (newChatGroupModeBtn) {
      newChatGroupModeBtn.addEventListener('click', () => {
        if (typeof this.toggleNewChatGroupMode === 'function') {
          this.toggleNewChatGroupMode();
        }
      });
      if (typeof this.setNewChatGroupMode === 'function') {
        this.setNewChatGroupMode(false);
      }
    }

    const callBtn = document.getElementById('callBtn');
    const historyBtn = document.getElementById('historyBtn');

    if (callBtn) {
      callBtn.addEventListener('click', () => {
        if (!this.currentChat) {
          this.showAlert('Спочатку оберіть чат.');
          return;
        }
        this.showAlert(`Дзвінок з ${this.currentChat.name} поки недоступний.`, 'Дзвінок');
      });
    }
    const chatModalCallBtn = document.getElementById('chatModalCallBtn');
    if (chatModalCallBtn) {
      chatModalCallBtn.addEventListener('click', () => {
        if (!this.currentChat) {
          this.showAlert('Спочатку оберіть чат.');
          return;
        }
        this.showAlert(`Дзвінок з ${this.currentChat.name} поки недоступний.`, 'Дзвінок');
      });
    }

    if (historyBtn) {
      historyBtn.addEventListener('click', () => {
        if (!this.currentChat) {
          this.showAlert('Спочатку оберіть чат.');
          return;
        }
        this.showAlert(`Історія для ${this.currentChat.name} буде додана пізніше.`, 'Історія');
      });
    }
    const chatModalHistoryBtn = document.getElementById('chatModalHistoryBtn');
    if (chatModalHistoryBtn) {
      chatModalHistoryBtn.addEventListener('click', () => {
        if (!this.currentChat) {
          this.showAlert('Спочатку оберіть чат.');
          return;
        }
        this.showAlert(`Історія для ${this.currentChat.name} буде додана пізніше.`, 'Історія');
      });
    }

    const chatsList = document.getElementById('chatsList');
    if (chatsList) {
      chatsList.addEventListener('contextmenu', (e) => {
        const item = e.target.closest('.chat-item');
        if (!item) return;
        e.preventDefault();
        this.openChatListMenu(item, e.clientX, e.clientY);
      });

      let pressTimer = null;
      chatsList.addEventListener('touchstart', (e) => {
        const item = e.target.closest('.chat-item');
        if (!item) return;
        pressTimer = setTimeout(() => {
          const rect = item.getBoundingClientRect();
          this.openChatListMenu(item, rect.left + rect.width / 2, rect.bottom + 6);
        }, 450);
      }, { passive: true });

      chatsList.addEventListener('touchend', () => {
        if (pressTimer) clearTimeout(pressTimer);
        pressTimer = null;
      });

      chatsList.addEventListener('touchmove', () => {
        if (pressTimer) clearTimeout(pressTimer);
        pressTimer = null;
      });
    }

    const closeAddToGroupBtn = document.getElementById('closeAddToGroupBtn');
    const cancelAddToGroupBtn = document.getElementById('cancelAddToGroupBtn');
    const confirmAddToGroupBtn = document.getElementById('confirmAddToGroupBtn');
    if (closeAddToGroupBtn) closeAddToGroupBtn.addEventListener('click', () => this.closeAddToGroupModal());
    if (cancelAddToGroupBtn) cancelAddToGroupBtn.addEventListener('click', () => this.closeAddToGroupModal());
    if (confirmAddToGroupBtn) confirmAddToGroupBtn.addEventListener('click', () => this.confirmAddToGroup());

    const replyBarClose = document.getElementById('replyBarClose');
    if (replyBarClose) {
      replyBarClose.addEventListener('click', () => this.clearReplyTarget());
    }

    this.setupEmojiPicker();

    const chatMenuBtn = document.getElementById('chatMenuBtn');
    const chatMenu = document.getElementById('chatMenu');
    const chatModalMenuBtn = document.getElementById('chatModalMenuBtn');
    const chatModalMenu = document.getElementById('chatModalMenu');
    const closeChatMenu = () => {
      if (!chatMenu || !chatMenuBtn) return;
      chatMenu.classList.remove('active');
      chatMenuBtn.setAttribute('aria-expanded', 'false');
      if (chatModalMenu && chatModalMenuBtn) {
        chatModalMenu.classList.remove('active');
        chatModalMenuBtn.setAttribute('aria-expanded', 'false');
      }
    };

    if (chatMenuBtn && chatMenu) {
      chatMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.updateGroupInfoMenuVisibility();
        chatMenu.classList.toggle('active');
        chatMenuBtn.setAttribute('aria-expanded', chatMenu.classList.contains('active') ? 'true' : 'false');
      });

      chatMenu.addEventListener('click', (e) => {
        const item = e.target.closest('.chat-menu-item');
        if (!item) return;
        const action = item.dataset.action;
        if (!this.currentChat) {
          closeChatMenu();
          return;
        }

        if (action === 'clear') {
          this.showConfirm('Очистити всі повідомлення в цьому чаті?').then(ok => {
            if (!ok) return;
            this.currentChat.messages = [];
            this.saveChats();
            this.renderChat();
            this.renderChatsList();
          });
        }

        if (action === 'delete') {
          this.deleteChat(this.currentChat.id);
        }

        if (action === 'info') {
          const count = this.currentChat.messages?.length || 0;
          this.showAlert(`Чат: ${this.currentChat.name}\nПовідомлень: ${count}`);
        }

        if (action === 'group-info') {
          this.openGroupInfoModal();
        }

        closeChatMenu();
      });

      document.addEventListener('click', (e) => {
        if (!chatMenu.contains(e.target) && e.target !== chatMenuBtn) {
          closeChatMenu();
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeChatMenu();
        }
      });
    }
    if (chatModalMenuBtn && chatModalMenu) {
      chatModalMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.updateGroupInfoMenuVisibility();
        chatModalMenu.classList.toggle('active');
        chatModalMenuBtn.setAttribute('aria-expanded', chatModalMenu.classList.contains('active') ? 'true' : 'false');
      });

      chatModalMenu.addEventListener('click', (e) => {
        const item = e.target.closest('.chat-menu-item');
        if (!item) return;
        const action = item.dataset.action;
        if (!this.currentChat) {
          closeChatMenu();
          return;
        }

        if (action === 'clear') {
          this.showConfirm('Очистити всі повідомлення в цьому чаті?').then(ok => {
            if (!ok) return;
            this.currentChat.messages = [];
            this.saveChats();
            this.renderChat();
            this.renderChatsList();
          });
        }

        if (action === 'delete') {
          this.deleteChat(this.currentChat.id);
        }

        if (action === 'info') {
          const count = this.currentChat.messages?.length || 0;
          this.showAlert(`Чат: ${this.currentChat.name}\nПовідомлень: ${count}`);
        }

        if (action === 'group-info') {
          this.openGroupInfoModal();
        }

        closeChatMenu();
      });
    }

    const closeGroupInfoBtn = document.getElementById('closeGroupInfoBtn');
    const closeGroupInfoBtn2 = document.getElementById('closeGroupInfoBtn2');
    const saveGroupInfoBtn = document.getElementById('saveGroupInfoBtn');
    const openGroupAppearanceBtn = document.getElementById('openGroupAppearanceBtn');
    const closeGroupAppearanceBtn = document.getElementById('closeGroupAppearanceBtn');
    const cancelGroupAppearanceBtn = document.getElementById('cancelGroupAppearanceBtn');
    const saveGroupAppearanceBtn = document.getElementById('saveGroupAppearanceBtn');
    const groupAppearanceAvatarBtn = document.getElementById('groupAppearanceAvatarBtn');
    const groupAppearanceAvatarInput = document.getElementById('groupAppearanceAvatarInput');
    const groupAppearanceNameInput = document.getElementById('groupAppearanceNameInput');
    const groupAppearanceAvatarResetBtn = document.getElementById('groupAppearanceAvatarResetBtn');
    if (closeGroupInfoBtn) closeGroupInfoBtn.addEventListener('click', () => this.closeGroupInfoModal());
    if (closeGroupInfoBtn2) closeGroupInfoBtn2.addEventListener('click', () => this.closeGroupInfoModal());
    if (saveGroupInfoBtn) saveGroupInfoBtn.addEventListener('click', () => this.saveGroupInfo());
    if (openGroupAppearanceBtn) openGroupAppearanceBtn.addEventListener('click', () => this.openGroupAppearanceModal());
    if (closeGroupAppearanceBtn) closeGroupAppearanceBtn.addEventListener('click', () => this.closeGroupAppearanceModal());
    if (cancelGroupAppearanceBtn) cancelGroupAppearanceBtn.addEventListener('click', () => this.closeGroupAppearanceModal());
    if (saveGroupAppearanceBtn) saveGroupAppearanceBtn.addEventListener('click', () => this.saveGroupAppearance());
    if (groupAppearanceAvatarBtn && groupAppearanceAvatarInput) {
      groupAppearanceAvatarBtn.addEventListener('click', () => groupAppearanceAvatarInput.click());
    }
    if (groupAppearanceAvatarInput) {
      groupAppearanceAvatarInput.addEventListener('change', (event) => this.handleGroupAppearanceAvatarChange(event));
    }
    if (groupAppearanceNameInput) {
      groupAppearanceNameInput.addEventListener('input', () => this.renderGroupAppearanceAvatarPreview());
    }
    if (groupAppearanceAvatarResetBtn) {
      groupAppearanceAvatarResetBtn.addEventListener('click', () => this.resetGroupAppearanceAvatar());
    }

    const contactProfileBackBtn = document.getElementById('contactProfileBackBtn');
    const contactProfileCallBtn = document.getElementById('contactProfileCallBtn');
    const contactProfileMessageBtn = document.getElementById('contactProfileMessageBtn');
    const contactProfileMoreBtn = document.getElementById('contactProfileMoreBtn');
    const contactProfileMenu = document.getElementById('contactProfileMenu');
    const contactProfileMoreWrap = contactProfileMoreBtn?.closest('.contact-profile-more');

    if (contactProfileBackBtn) {
      contactProfileBackBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.closeContactProfileSection();
      });
    }
    if (contactProfileCallBtn) {
      contactProfileCallBtn.addEventListener('click', () => {
        if (!this.currentChat) {
          this.showAlert('Спочатку оберіть чат.');
          return;
        }
        this.showAlert(`Дзвінок з ${this.currentChat.name} поки недоступний.`, 'Дзвінок');
      });
    }
    if (contactProfileMessageBtn) {
      contactProfileMessageBtn.addEventListener('click', () => {
        this.closeContactProfileSection();
        const messageInput = document.getElementById('messageInput');
        if (messageInput && typeof messageInput.focus === 'function') {
          messageInput.focus({ preventScroll: true });
        }
      });
    }
    if (contactProfileMoreBtn) {
      contactProfileMoreBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        this.toggleContactProfileActionsMenu();
      });
    }
    if (contactProfileMenu) {
      contactProfileMenu.addEventListener('click', (event) => {
        const actionItem = event.target.closest('.contact-profile-menu-item');
        if (!actionItem) return;
        event.preventDefault();
        const action = actionItem.dataset.action || '';
        this.handleContactProfileMenuAction(action);
      });
    }
    const contactProfileMediaGrid = document.getElementById('contactProfileMediaGrid');
    if (contactProfileMediaGrid && contactProfileMediaGrid.dataset.bound !== 'true') {
      contactProfileMediaGrid.dataset.bound = 'true';
      contactProfileMediaGrid.addEventListener('click', (event) => {
        const playBtn = event.target.closest('.voice-play-btn');
        if (playBtn) {
          const voiceEl = playBtn.closest('.message-voice');
          if (!voiceEl) return;
          event.preventDefault();
          event.stopPropagation();
          this.toggleVoiceMessagePlayback(voiceEl);
          return;
        }

        const trackEl = event.target.closest('.voice-track');
        if (trackEl) {
          const voiceEl = trackEl.closest('.message-voice');
          if (!voiceEl) return;
          event.preventDefault();
          event.stopPropagation();
          const progress = this.getVoiceTrackProgressFromEvent(trackEl, event);
          this.seekVoiceMessageToProgress(voiceEl, progress);
          const targetAudioEl = voiceEl.querySelector('.voice-audio');
          const shouldStartTarget = Boolean(
            targetAudioEl
            && this.activeVoiceAudio
            && this.activeVoiceAudio !== targetAudioEl
          );
          if (shouldStartTarget) {
            this.playVoiceMessage(voiceEl, { showError: true });
          }
          this.updateVoiceTrackHoverPreview(voiceEl, progress);
          return;
        }

        const imageItem = event.target.closest('[data-contact-media-kind="image"]');
        if (!imageItem) return;
        const src = imageItem.dataset.mediaSrc || '';
        if (!src) return;
        event.preventDefault();
        this.openImageViewer(src, 'Фото з чату', {
          messageId: Number.parseInt(imageItem.dataset.messageId || '0', 10) || 0,
          messageFrom: imageItem.dataset.messageFrom || ''
        });
      });

      contactProfileMediaGrid.addEventListener('pointermove', (event) => {
        if (event.pointerType && event.pointerType !== 'mouse') return;
        const trackEl = event.target.closest('.voice-track');
        if (!trackEl) {
          if (this.hoveredVoiceMessageEl) {
            this.clearVoiceTrackHoverPreview(this.hoveredVoiceMessageEl);
            this.hoveredVoiceMessageEl = null;
          }
          return;
        }

        const voiceEl = trackEl.closest('.message-voice');
        if (!voiceEl) return;
        if (this.hoveredVoiceMessageEl && this.hoveredVoiceMessageEl !== voiceEl) {
          this.clearVoiceTrackHoverPreview(this.hoveredVoiceMessageEl);
        }
        this.hoveredVoiceMessageEl = voiceEl;
        const progress = this.getVoiceTrackProgressFromEvent(trackEl, event);
        this.updateVoiceTrackHoverPreview(voiceEl, progress);
      });

      contactProfileMediaGrid.addEventListener('pointerleave', () => {
        if (!this.hoveredVoiceMessageEl) return;
        this.clearVoiceTrackHoverPreview(this.hoveredVoiceMessageEl);
        this.hoveredVoiceMessageEl = null;
      });
    }
    const contactProfileMediaFilters = document.getElementById('contactProfileMediaFilters');
    if (contactProfileMediaFilters && contactProfileMediaFilters.dataset.bound !== 'true') {
      contactProfileMediaFilters.dataset.bound = 'true';
      contactProfileMediaFilters.addEventListener('click', (event) => {
        const filterBtn = event.target.closest('[data-media-filter]');
        if (!filterBtn) return;
        event.preventDefault();
        const nextFilter = String(filterBtn.dataset.mediaFilter || '').trim();
        this.contactProfileMediaFilter = nextFilter || 'media';
        this.renderContactProfileMedia();
      });
    }
    const findBackButtonAtPoint = (x, y) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      const topElement = document.elementFromPoint(x, y);
      if (!(topElement instanceof Element)) return null;
      const backButton = topElement.closest('.settings-subsection-back');
      if (!(backButton instanceof HTMLElement)) return null;
      const rect = backButton.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      const style = window.getComputedStyle(backButton);
      if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') return null;
      return backButton;
    };
    let isBackCursorForced = false;
    const setBackCursorByPoint = (x, y) => {
      const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
      if (!hasFinePointer) return;
      const shouldForce = Boolean(findBackButtonAtPoint(x, y));
      if (shouldForce === isBackCursorForced) return;
      isBackCursorForced = shouldForce;
      document.documentElement.style.cursor = shouldForce ? 'pointer' : '';
      document.body.style.cursor = shouldForce ? 'pointer' : '';
    };
    // Some browsers can miss button clicks when the pointer lands on SVG/path.
    // Capture icon clicks and route them to the same back action explicitly.
    document.addEventListener('click', (event) => {
      const targetEl = event.target instanceof Element ? event.target : null;
      if (!targetEl) return;
      const backIconEl = targetEl.closest('.settings-subsection-back svg, .settings-subsection-back svg *');
      if (!backIconEl) return;
      const backButton = backIconEl.closest('.settings-subsection-back');
      if (!backButton) return;
      event.preventDefault();
      event.stopPropagation();
      if (backButton.id === 'contactProfileBackBtn') {
        this.closeContactProfileSection();
        return;
      }
      this.showSettings(this.settingsParentSection || 'messenger-settings');
    }, true);
    // Fallback for hit-testing quirks: resolve click by pointer coordinates.
    document.addEventListener('click', (event) => {
      if (!isSettingsScreenActive()) return;
      const targetEl = event.target instanceof Element ? event.target : null;
      if (targetEl?.closest('.settings-subsection-back')) return;
      if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
      const backButton = findBackButtonAtPoint(event.clientX, event.clientY);
      if (!backButton) return;
      event.preventDefault();
      event.stopPropagation();
      if (backButton.id === 'contactProfileBackBtn') {
        this.closeContactProfileSection();
        return;
      }
      this.showSettings(this.settingsParentSection || 'messenger-settings');
    }, true);
    document.addEventListener('mousemove', (event) => {
      setBackCursorByPoint(event.clientX, event.clientY);
    }, true);
    document.addEventListener('mouseout', () => {
      if (!isBackCursorForced) return;
      isBackCursorForced = false;
      document.documentElement.style.cursor = '';
      document.body.style.cursor = '';
    }, true);
    window.addEventListener('blur', () => {
      if (!isBackCursorForced) return;
      isBackCursorForced = false;
      document.documentElement.style.cursor = '';
      document.body.style.cursor = '';
    });
    document.addEventListener('click', (event) => {
      const targetEl = event.target instanceof Element ? event.target : null;
      if (!targetEl) return;
      const backBtnEl = targetEl.closest('#contactProfileBackBtn');
      if (backBtnEl) {
        event.preventDefault();
        this.closeContactProfileSection(); 
        return;
      }
      if (!contactProfileMoreWrap) return;
      if (!contactProfileMoreWrap.contains(targetEl)) {
        this.closeContactProfileActionsMenu();
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.closeContactProfileActionsMenu();
      }
    });

    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebar = document.querySelector('.sidebar');
    
    if (menuToggleBtn && sidebarOverlay && sidebar) {
      menuToggleBtn.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          sidebar.classList.add('mobile-menu', 'active');
          sidebarOverlay.classList.add('active');
        }
      });
      
      sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
      });
    }
  }

  // Методи-обгортки для імпортованих UI функцій
  showAlert(message, title = 'Помилка') {
    return showAlert(message, title);
  }

  showNotice(message, title = 'Повідомлення') {
    return showNotice(message, title);
  }

  showConfirm(message, title = 'Підтвердження') {
    return showConfirm(message, title);
  }

  showConfirmWithOption(message, options = {}) {
    return showConfirmWithOption(message, options);
  }

  setupEmojiPicker() {
    setupEmojiPicker((input, text) => this.insertAtCursor(input, text));
  }

  insertAtCursor(input, text) {
    insertAtCursor(input, text);
  }

  isMessagesNearBottom(messagesEl, threshold = 80) {
    if (!messagesEl) return false;
    const remaining = messagesEl.scrollHeight - messagesEl.clientHeight - messagesEl.scrollTop;
    return remaining <= threshold;
  }

  updateMessagesScrollBottomButtonVisibility() {
    const messagesContainer = document.getElementById('messagesContainer');
    const scrollBottomBtn = document.getElementById('messagesScrollBottomBtn');
    if (!messagesContainer || !scrollBottomBtn) return;

    const hasContent = messagesContainer.classList.contains('has-content')
      && messagesContainer.scrollHeight > messagesContainer.clientHeight + 8;
    const shouldShow = Boolean(
      this.currentChat
      && hasContent
      && !this.isMessagesNearBottom(messagesContainer, 72)
    );

    scrollBottomBtn.classList.toggle('active', shouldShow);
    scrollBottomBtn.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
  }

  setupMessagesScrollBottomButton() {
    const messagesContainer = document.getElementById('messagesContainer');
    const scrollBottomBtn = document.getElementById('messagesScrollBottomBtn');
    if (!messagesContainer || !scrollBottomBtn) return;

    if (scrollBottomBtn.dataset.ready !== 'true') {
      scrollBottomBtn.dataset.ready = 'true';
      messagesContainer.addEventListener('scroll', () => {
        this.updateMessagesScrollBottomButtonVisibility();
        if (this.currentChat && !this.isMessagesNearBottom(messagesContainer, 96)) {
          if (typeof this.cancelPendingMessagesAutoScroll === 'function') {
            this.cancelPendingMessagesAutoScroll(messagesContainer, { suppressMs: 2200 });
          } else {
            delete messagesContainer.dataset.mediaAutoScroll;
            this.currentChatBottomPinUntil = 0;
          }
        }
        if (
          this.currentChat
          && messagesContainer.scrollTop <= 80
          && typeof this.loadOlderMessagesPage === 'function'
        ) {
          this.loadOlderMessagesPage(this.currentChat).catch(() => {});
        }
      }, { passive: true });
      scrollBottomBtn.addEventListener('click', () => {
        messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' });
        window.setTimeout(() => this.updateMessagesScrollBottomButtonVisibility(), 260);
      });
    }

    this.updateMessagesScrollBottomButtonVisibility();
  }

  resizeMessageInput(inputEl = null) {
    const input = inputEl || document.getElementById('messageInput');
    if (!input) return;
    const sendBtn = document.getElementById('sendBtn');
    const hasText = input.value.trim().length > 0;
    if (sendBtn) {
      sendBtn.classList.toggle('has-text', hasText);
    }
    if (typeof this.updateComposerPrimaryButtonState === 'function') {
      this.updateComposerPrimaryButtonState(hasText);
    }

    const isMobile = window.innerWidth <= 768;
    const minHeight = 36;
    const maxHeight = isMobile ? 132 : 36;

    // Keep desktop composer height static to avoid input-area jumps while typing,
    // but allow inner textarea scroll for long drafts.
    if (!isMobile) {
      input.style.height = `${minHeight}px`;
      input.style.overflowY = hasText && input.scrollHeight > minHeight ? 'auto' : 'hidden';
      return;
    }

    if (!hasText) {
      input.style.height = `${minHeight}px`;
      input.style.overflowY = 'hidden';
      return;
    }

    input.style.height = 'auto';
    const nextHeight = Math.min(maxHeight, Math.max(minHeight, input.scrollHeight));
    input.style.height = `${nextHeight}px`;
    input.style.overflowY = input.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }

  getMobileViewportMetrics(inputEl = null) {
    const viewport = window.visualViewport;
    const rawVisibleTop = viewport ? Math.max(0, Number(viewport.offsetTop || 0)) : 0;
    const visibleHeight = viewport
      ? Math.max(0, Number(viewport.height || 0))
      : Math.max(0, Number(window.innerHeight || 0));
    const visibleTop = rawVisibleTop;
    const visibleBottom = visibleTop + visibleHeight;
    const layoutHeight = Math.max(Number(window.innerHeight || 0), visibleBottom);
    const innerHeight = Math.max(0, Number(window.innerHeight || 0));
    const input = inputEl || document.getElementById('messageInput');
    const isInputFocused = Boolean(input && document.activeElement === input);
    const keyboardByInnerHeightRaw = innerHeight - visibleHeight - visibleTop;
    const keyboardByInnerHeight = Math.max(0, keyboardByInnerHeightRaw);
    const keyboardLikelyClosed = keyboardByInnerHeight < 18;

    if (!this.mobileViewportBaseHeight) {
      this.mobileViewportBaseHeight = Math.max(layoutHeight, innerHeight, visibleBottom);
    }

    // Do not overwrite baseline while keyboard is still animating/visible.
    if (!isInputFocused && keyboardLikelyClosed) {
      this.mobileViewportBaseHeight = Math.max(layoutHeight, innerHeight, visibleBottom);
    }

    const baselineHeight = Math.max(
      this.mobileViewportBaseHeight || 0,
      layoutHeight,
      innerHeight,
      visibleBottom
    );
    this.mobileViewportBaseHeight = baselineHeight;
    const keyboardByBaseline = baselineHeight - visibleBottom;
    const keyboardHeight = Math.min(
      460,
      Math.max(0, keyboardByBaseline, keyboardByInnerHeight)
    );

    return {
      hasVisualViewport: Boolean(viewport),
      rawVisibleTop,
      visibleTop,
      visibleHeight,
      visibleBottom,
      keyboardHeight,
      isInputFocused
    };
  }

  stickMobileMessagesToBottom(force = false) {
    if (window.innerWidth > 900) return;
    if (!force && !this.mobileKeyboardStickToBottom) return;
    const messages = document.getElementById('messagesContainer');
    if (!messages) return;
    const maxTop = Math.max(0, messages.scrollHeight - messages.clientHeight);
    messages.scrollTop = maxTop;
  }

  ensureMobileMessagesAnchoredToBottom() {
    if (window.innerWidth > 900) return;
    const messages = document.getElementById('messagesContainer');
    if (!messages) return;
    const hasMessageNodes = Boolean(messages.querySelector('.message'));
    const existingSpacer = messages.querySelector('.messages-bottom-spacer');

    if (!hasMessageNodes) {
      if (existingSpacer) existingSpacer.remove();
      return;
    }

    if (!messages.classList.contains('has-content')) {
      messages.classList.add('has-content');
      messages.classList.remove('no-content');
    }

    if (!existingSpacer) {
      const spacer = document.createElement('div');
      spacer.className = 'messages-bottom-spacer';
      spacer.setAttribute('aria-hidden', 'true');
      messages.prepend(spacer);
    }
  }

  stopMobileKeyboardSettleLoop() {
    if (this.mobileKeyboardSettleRaf) {
      window.cancelAnimationFrame(this.mobileKeyboardSettleRaf);
      this.mobileKeyboardSettleRaf = 0;
    }
    if (this.mobileKeyboardSettleTimeout) {
      window.clearTimeout(this.mobileKeyboardSettleTimeout);
      this.mobileKeyboardSettleTimeout = 0;
    }
    this.mobileKeyboardSettleUntil = 0;
  }

  startMobileKeyboardSettleLoop(inputEl = null, duration = 520) {
    if (window.innerWidth > 900) return;
    const input = inputEl || document.getElementById('messageInput');
    if (!input) return;

    const now = Date.now();
    this.mobileKeyboardSettleUntil = Math.max(
      this.mobileKeyboardSettleUntil || 0,
      now + Math.max(180, duration)
    );

    if (this.mobileKeyboardSettleRaf) return;

    const step = () => {
      const activeInput = inputEl || document.getElementById('messageInput');
      const shouldStop = (
        window.innerWidth > 900
        || !activeInput
        || document.activeElement !== activeInput
        || Date.now() > (this.mobileKeyboardSettleUntil || 0)
      );

      if (shouldStop) {
        this.stopMobileKeyboardSettleLoop();
        return;
      }

      this.syncMobileKeyboardState(activeInput);
      if (this.mobileKeyboardStickToBottom) {
        this.stickMobileMessagesToBottom(true);
      }
      this.mobileKeyboardSettleRaf = window.requestAnimationFrame(step);
    };

    this.mobileKeyboardSettleRaf = window.requestAnimationFrame(step);
    if (this.mobileKeyboardSettleTimeout) {
      window.clearTimeout(this.mobileKeyboardSettleTimeout);
    }
    this.mobileKeyboardSettleTimeout = window.setTimeout(() => {
      this.stopMobileKeyboardSettleLoop();
    }, Math.max(420, duration + 260));
  }

  configureComposerInputSuggestions(inputEl = null) {
    const input = inputEl || document.getElementById('messageInput');
    if (!(input instanceof HTMLTextAreaElement)) return;

    const isMobile = window.innerWidth <= 900;
    if (isMobile) {
      input.setAttribute('autocomplete', 'on');
      input.setAttribute('autocorrect', 'on');
      input.setAttribute('autocapitalize', 'sentences');
      input.setAttribute('spellcheck', 'true');
      input.autocomplete = 'on';
      input.spellcheck = true;
      return;
    }

    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('autocapitalize', 'none');
    input.setAttribute('spellcheck', 'false');
    input.autocomplete = 'off';
    input.spellcheck = false;
  }

  syncMobileKeyboardState(inputEl = null) {
    const appEl = document.querySelector('.orion-app');
    const input = inputEl || document.getElementById('messageInput');
    if (!appEl || !input) return;

    if (window.innerWidth > 900) {
      appEl.classList.remove('keyboard-open');
      appEl.style.setProperty('--keyboard-inset', '0px');
      this.setMobilePageScrollLock(false);
      return;
    }

    const viewportMetrics = this.getMobileViewportMetrics(input);
    if (!viewportMetrics.hasVisualViewport) {
      appEl.classList.remove('keyboard-open');
      appEl.style.setProperty('--keyboard-inset', '0px');
      this.setMobilePageScrollLock(false);
      return;
    }

    const keyboardHeight = viewportMetrics.keyboardHeight;
    const wasOpen = appEl.classList.contains('keyboard-open');
    // Low threshold prevents one-step jump when keyboard animation starts.
    const isOpen = viewportMetrics.isInputFocused && keyboardHeight > 8;

    appEl.classList.toggle('keyboard-open', isOpen);
    appEl.style.setProperty('--keyboard-inset', `${isOpen ? keyboardHeight : 0}px`);
    this.setMobilePageScrollLock(isOpen);

    if (isOpen) {
      // iOS can shift layout viewport on focus; lock page scroll and keep chat at latest message.
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }

    this.applyMobileChatViewportLayout(viewportMetrics);
    this.ensureMobileMessagesAnchoredToBottom();
    this.stickMobileMessagesToBottom(true);

    if (this.mobileKeyboardStickToBottom) {
      if (isOpen || wasOpen) {
        this.stickMobileMessagesToBottom(true);
      }
      window.requestAnimationFrame(() => this.stickMobileMessagesToBottom(true));
      window.setTimeout(() => this.stickMobileMessagesToBottom(true), 120);
    }
  }

  setMobilePageScrollLock(locked, forceTop = false) {
    if (window.innerWidth > 900) locked = false;
    const body = document.body;
    const html = document.documentElement;
    if (!body || !html) return;

    if (locked) {
      const nextY = forceTop ? 0 : (window.scrollY || window.pageYOffset || 0);
      if (this.mobileScrollLocked) {
        if (forceTop && this.mobileScrollLockY !== 0) {
          this.mobileScrollLockY = 0;
          body.style.top = '0px';
          window.scrollTo(0, 0);
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        }
        return;
      }
      this.mobileScrollLockY = nextY;
      body.style.position = 'fixed';
      body.style.top = `-${this.mobileScrollLockY}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
      body.style.overflow = 'hidden';
      html.style.overflow = 'hidden';
      this.mobileScrollLocked = true;
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      return;
    }

    if (!this.mobileScrollLocked) return;
    body.style.removeProperty('position');
    body.style.removeProperty('top');
    body.style.removeProperty('left');
    body.style.removeProperty('right');
    body.style.removeProperty('width');
    body.style.removeProperty('overflow');
    html.style.removeProperty('overflow');
    window.scrollTo(0, this.mobileScrollLockY || 0);
    this.mobileScrollLocked = false;
  }

  applyMobileChatViewportLayout(viewportMetrics = null) {
    const appEl = document.querySelector('.orion-app');
    const header = document.querySelector('.app-header');
    const chatArea = document.querySelector('.chat-area');
    const chatContainer = document.getElementById('chatContainer');
    const inputArea = document.querySelector('.message-input-area');
    const messages = document.getElementById('messagesContainer');
    if (!appEl || !header || !chatArea || !chatContainer || !inputArea) return;

    const isMobile = window.innerWidth <= 900;
    const isChatActive = isMobile
      && appEl.classList.contains('chat-active')
      && chatContainer.classList.contains('active');

    if (!isChatActive) {
      this.setMobilePageScrollLock(false);
      appEl.style.setProperty('--keyboard-inset', '0px');
      header.style.removeProperty('position');
      header.style.removeProperty('top');
      header.style.removeProperty('left');
      header.style.removeProperty('right');
      header.style.removeProperty('z-index');
      header.style.removeProperty('padding-top');
      header.style.removeProperty('height');
      header.style.removeProperty('min-height');

      chatArea.style.removeProperty('position');
      chatArea.style.removeProperty('top');
      chatArea.style.removeProperty('left');
      chatArea.style.removeProperty('right');
      chatArea.style.removeProperty('bottom');
      chatArea.style.removeProperty('height');

      chatContainer.style.removeProperty('padding-bottom');
      chatContainer.style.removeProperty('flex-direction');
      chatContainer.style.removeProperty('height');
      if (messages) {
        messages.style.removeProperty('padding-bottom');
      }
      inputArea.style.removeProperty('position');
      inputArea.style.removeProperty('bottom');
      inputArea.style.removeProperty('transform');
      inputArea.style.removeProperty('transition');
      return;
    }

    const metrics = viewportMetrics || this.getMobileViewportMetrics();
    const measuredBottom = Math.max(
      0,
      Number(metrics.visibleBottom || 0),
      Number(metrics.visibleTop || 0) + Number(metrics.visibleHeight || 0)
    );
    const viewportBottom = measuredBottom > 0
      ? measuredBottom
      : Math.max(0, Number(window.innerHeight || 0));
    // Keep chat pinned to the top edge and track only viewport bottom.
    // iOS can change visualViewport.offsetTop while typing, which caused a second "drop" jump.
    const viewportTop = 0;
    const viewportHeight = viewportBottom;
    const keyboardHeight = appEl.classList.contains('keyboard-open')
      ? metrics.keyboardHeight
      : 0;

    chatArea.style.setProperty('position', 'fixed', 'important');
    chatArea.style.setProperty('top', `${viewportTop}px`, 'important');
    chatArea.style.setProperty('left', '0');
    chatArea.style.setProperty('right', '0');
    chatArea.style.setProperty('bottom', 'auto');
    chatArea.style.setProperty('height', `${viewportHeight}px`);

    chatContainer.style.setProperty('display', 'flex', 'important');
    chatContainer.style.setProperty('flex-direction', 'column', 'important');
    chatContainer.style.setProperty('height', '100%', 'important');
    chatContainer.style.setProperty('padding-bottom', '0px', 'important');
    chatContainer.style.setProperty('background-color', 'var(--bg-color)', 'important');

    inputArea.style.setProperty('position', 'sticky');
    inputArea.style.setProperty('bottom', '0');
    inputArea.style.setProperty('transform', 'translateY(0)');
    appEl.style.setProperty('--keyboard-inset', `${keyboardHeight}px`);

    if (messages) {
      messages.style.setProperty('padding-bottom', '12px');
    }

    this.ensureMobileMessagesAnchoredToBottom();

  }

  setupMessageComposer(inputEl) {
    if (!inputEl || inputEl.dataset.composerReady === 'true') return;
    inputEl.dataset.composerReady = 'true';
    this.configureComposerInputSuggestions(inputEl);

    const appEl = document.querySelector('.orion-app');

    const updateHeight = () => {
      const messages = document.getElementById('messagesContainer');
      const keepPinnedToBottom = Boolean(
        messages
        && this.currentChat
        && this.isMessagesNearBottom(messages, 80)
      );
      this.resizeMessageInput(inputEl);
      if (messages && this.currentChat && keepPinnedToBottom) {
        messages.scrollTop = messages.scrollHeight;
      }
      this.updateMessagesScrollBottomButtonVisibility();
      if (window.innerWidth <= 900 && this.mobileKeyboardStickToBottom) {
        this.stickMobileMessagesToBottom(true);
      }
    };

    inputEl.addEventListener('input', () => {
      updateHeight();
      if (window.innerWidth <= 900 && document.activeElement === inputEl) {
        this.startMobileKeyboardSettleLoop(inputEl, 300);
      }
      if (typeof this.handleRealtimeComposerInput === 'function') {
        this.handleRealtimeComposerInput(inputEl.value);
      }
    });
    const forceComposerFocus = () => {
      if (this.nativePickerOpen || this.cameraCaptureOpen) return;
      this.forceComposerFocusUntil = Date.now() + 900;
      const focusSafely = () => {
        if (this.nativePickerOpen || this.cameraCaptureOpen) return;
        if (document.activeElement === inputEl) return;
        this.closeImagePickerMenu();
        try {
          inputEl.focus({ preventScroll: true });
        } catch (_) {
          inputEl.focus();
        }
      };
      focusSafely();
      window.setTimeout(focusSafely, 70);
      window.setTimeout(focusSafely, 160);
      window.setTimeout(focusSafely, 280);
    };
    const engageKeyboardGuard = () => {
      if (window.innerWidth > 900) return;
      this.closeAttachSheet();
      this.setMobilePageScrollLock(true, true);
    };
    inputEl.addEventListener('touchstart', (event) => {
      if (window.innerWidth > 900) return;
      if (this.attachSheetOpen) {
        event.preventDefault();
        this.closeAttachSheet();
        window.setTimeout(() => forceComposerFocus(), 40);
        return;
      }
      if (this.nativePickerOpen || this.cameraCaptureOpen) {
        event.preventDefault();
        this.forceComposerFocusUntil = 0;
        if (document.activeElement === inputEl) inputEl.blur();
        return;
      }
      this.closeImagePickerMenu();
      // Prevent iOS native viewport jump on textarea tap, then focus manually.
      event.preventDefault();
      engageKeyboardGuard();
      forceComposerFocus();
    }, { passive: false });
    inputEl.addEventListener('mousedown', (event) => {
      if (window.innerWidth > 900) return;
      if (this.attachSheetOpen) {
        event.preventDefault();
        this.closeAttachSheet();
        window.setTimeout(() => forceComposerFocus(), 40);
        return;
      }
      if (this.nativePickerOpen || this.cameraCaptureOpen) {
        event.preventDefault();
        this.forceComposerFocusUntil = 0;
        if (document.activeElement === inputEl) inputEl.blur();
        return;
      }
      this.closeImagePickerMenu();
      event.preventDefault();
      engageKeyboardGuard();
      forceComposerFocus();
    });
    inputEl.addEventListener('focus', () => {
      if (this.attachSheetOpen) {
        this.closeAttachSheet();
      }
      if (this.nativePickerOpen || this.cameraCaptureOpen) {
        this.forceComposerFocusUntil = 0;
        inputEl.blur();
        return;
      }
      this.closeImagePickerMenu();
      engageKeyboardGuard();
      if (appEl) appEl.classList.add('composer-focus');
      this.mobileKeyboardStickToBottom = true;
      this.stickMobileMessagesToBottom(true);
      this.syncMobileKeyboardState(inputEl);
      this.startMobileKeyboardSettleLoop(inputEl, 620);
      if (typeof this.handleRealtimeComposerInput === 'function' && inputEl.value.trim().length) {
        this.handleRealtimeComposerInput(inputEl.value);
      }
      if (inputEl.value.trim().length > 0) {
        requestAnimationFrame(updateHeight);
      }
      if (window.innerWidth > 900) {
        window.setTimeout(() => {
          inputEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }, 60);
      }
    });
    inputEl.addEventListener('blur', () => {
      window.setTimeout(() => {
        if (this.nativePickerOpen || this.cameraCaptureOpen) {
          if (appEl) appEl.classList.remove('composer-focus');
          this.syncMobileKeyboardState(inputEl);
          return;
        }
        if (window.innerWidth <= 900 && Date.now() < this.forceComposerFocusUntil) {
          forceComposerFocus();
          return;
        }
        if (appEl) appEl.classList.remove('composer-focus');
        this.stopMobileKeyboardSettleLoop();
        this.syncMobileKeyboardState(inputEl);
        window.setTimeout(() => {
          this.mobileKeyboardStickToBottom = false;
        }, 200);
        if (typeof this.stopRealtimeTyping === 'function') {
          this.stopRealtimeTyping({ emit: true });
        }
      }, 80);
    });

    if (window.visualViewport) {
      const sync = () => this.syncMobileKeyboardState(inputEl);
      window.visualViewport.addEventListener('resize', sync);
      window.visualViewport.addEventListener('scroll', sync);
    }

    window.addEventListener('resize', () => {
      this.configureComposerInputSuggestions(inputEl);
      this.syncMobileKeyboardState(inputEl);
    });
    updateHeight();
  }

  renderChatsList() {
    this.syncChatsNavUnreadIndicator();
    const chatsList = document.getElementById('chatsList');
    if (!chatsList) return;

    const appRoot = document.querySelector('.orion-app') || document.getElementById('app');
    const navWrapperInList = chatsList.querySelector(':scope > .profile-menu-wrapper');
    const navAnchorInList = chatsList.querySelector(':scope > .bottom-nav-home-anchor');
    if (appRoot && navAnchorInList) {
      appRoot.appendChild(navAnchorInList);
    }
    if (appRoot && navWrapperInList) {
      appRoot.appendChild(navWrapperInList);
    }
    
    // On mobile, show chats list when rendering
    chatsList.classList.remove('hidden-on-settings');
    
    chatsList.innerHTML = '';
    const isMobile = window.innerWidth <= 768;
    const searchBox = document.querySelector('.search-box');
    if (searchBox) {
      searchBox.classList.toggle('is-mobile-new-chat-mode', this.isMobileNewChatModeActive());
    }

    if (isMobile && this.mobileNewChatModeActive) {
      chatsList.classList.add('mobile-new-chat-results-mode');
      this.renderMobileNewChatSearchResults(chatsList);
      this.renderSidebarAvatarsStrip();
      return;
    }
    chatsList.classList.remove('mobile-new-chat-results-mode');

    const sortedChats = this.getSortedChats();
    
    if (sortedChats.length === 0) {
      const blockedCount = typeof this.getBlockedChatIds === 'function'
        ? this.getBlockedChatIds().length
        : 0;
      const allHiddenByBlock = this.chats.length > 0
        && blockedCount > 0
        && this.settings?.hideBlockedChats !== false;
      const emptyState = document.createElement('div');
      emptyState.className = 'chats-list-empty';
      emptyState.innerHTML = `
        <div class="empty-state-content">
          <div class="empty-state-emoji">💬</div>
          <div class="empty-state-text">${allHiddenByBlock ? 'Усі чати приховано' : 'Чатів ще немає'}</div>
          <div class="empty-state-hint">${allHiddenByBlock ? 'Вимкніть "Приховувати заблоковані чати" в налаштуваннях приватності' : 'Натисніть + щоб почати розмову'}</div>
        </div>
      `;
      chatsList.appendChild(emptyState);
      this.renderSidebarAvatarsStrip();
      this.refreshDesktopSecondaryChatsListIfVisible();
      return;
    }

    sortedChats.forEach(chat => {
      const lastMessage = chat.messages[chat.messages.length - 1];
      const previewText = this.getChatPreviewText(chat, lastMessage);
      const safePreviewText = this.escapeHtml(previewText || 'Немає повідомлень');
      const previewTypingClass = this.isChatTypingActive(chat) ? ' is-typing' : '';
      const unreadCount = Math.max(0, Number(chat?.unreadCount || 0));
      const unreadBadge = unreadCount > 99 ? '99+' : String(unreadCount);
      const chatItem = document.createElement('button');
      const pinnedClass = chat.isPinned ? ' pinned' : '';
      chatItem.className = `chat-item ${this.currentChat?.id === chat.id ? 'active' : ''}${pinnedClass}${unreadCount > 0 ? ' has-unread' : ''}`;
      chatItem.dataset.chatId = chat.id;
      chatItem.dataset.chatName = chat.name;
      chatItem.innerHTML = `
        ${this.getChatAvatarHtml(chat, 'chat-avatar')}
        <div class="chat-info">
          <span class="chat-name">${chat.name}</span>
          <span class="chat-preview${previewTypingClass}">${safePreviewText}</span>
        </div>
        <div class="chat-meta">
          <span class="chat-time">${lastMessage?.time || ''}</span>
          ${unreadCount > 0 ? `<span class="chat-unread">${unreadBadge}</span>` : ''}
        </div>
        <span class="chat-item-arrow" aria-hidden="true">›</span>
        ${chat.isPinned ? `
          <div class="chat-pin-badge">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M235.32,81.37,174.63,20.69a16,16,0,0,0-22.63,0L98.37,74.49c-10.66-3.34-35-7.37-60.4,13.14a16,16,0,0,0-1.29,23.78L85,159.71,42.34,202.34a8,8,0,0,0,11.32,11.32L96.29,171l48.29,48.29A16,16,0,0,0,155.9,224c.38,0,.75,0,1.13,0a15.93,15.93,0,0,0,11.64-6.33c19.64-26.1,17.75-47.32,13.19-60L235.33,104A16,16,0,0,0,235.32,81.37ZM224,92.69h0l-57.27,57.46a8,8,0,0,0-1.49,9.22c9.46,18.93-1.8,38.59-9.34,48.62L48,100.08c12.08-9.74,23.64-12.31,32.48-12.31A40.13,40.13,0,0,1,96.81,91a8,8,0,0,0,9.25-1.51L163.32,32,224,92.68Z"></path></svg>
          </div>
        ` : ''}
        <div class="chat-item-actions">
          <button class="btn-delete-chat" data-chat-id="${chat.id}" title="Видалити чат">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      `;
      chatItem.addEventListener('click', () => this.selectChat(chat.id));
      
      const deleteBtn = chatItem.querySelector('.btn-delete-chat');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteChat(chat.id);
      });
      
      chatsList.appendChild(chatItem);
    });

    this.renderSidebarAvatarsStrip();
    this.refreshDesktopSecondaryChatsListIfVisible();
  }

  getSortedChats() {
    const hideBlockedChats = this.settings?.hideBlockedChats !== false;
    const blockedIds = hideBlockedChats && typeof this.getBlockedChatIds === 'function'
      ? new Set(this.getBlockedChatIds())
      : new Set();
    const sourceChats = hideBlockedChats
      ? this.chats.filter((chat) => !blockedIds.has(Number(chat.id)))
      : this.chats;
    const pinned = [];
    const normal = [];
    sourceChats.forEach(c => (c.isPinned ? pinned : normal).push(c));
    pinned.sort((a, b) => (b.pinnedAt || 0) - (a.pinnedAt || 0));

    const getChatActivityTs = (chat) => {
      if (!chat || !Array.isArray(chat.messages) || chat.messages.length === 0) return 0;
      const last = chat.messages[chat.messages.length - 1];
      if (!last) return 0;
      const ts = Number(typeof this.getMessageTimestampValue === 'function'
        ? this.getMessageTimestampValue(last)
        : NaN);
      if (Number.isFinite(ts) && ts > 0) return ts;
      const fallback = Date.parse(String(last.createdAt || (last.date && last.time ? `${last.date}T${last.time}` : last.date || '')));
      return Number.isFinite(fallback) ? fallback : 0;
    };

    normal.sort((a, b) => {
      const aTs = getChatActivityTs(a);
      const bTs = getChatActivityTs(b);
      if (aTs !== bTs) return bTs - aTs;
      return Number(b.id || 0) - Number(a.id || 0);
    });

    return [...pinned, ...normal];
  }

  openChatListMenu(item, clientX, clientY) {
    const menu = document.getElementById('chatListMenu');
    const pinBtn = document.getElementById('chatListMenuPin');
    const delBtn = document.getElementById('chatListMenuDelete');
    const addBtn = document.getElementById('chatListMenuAddToGroup');
    if (!menu || !pinBtn || !delBtn || !addBtn) return;

    const chatId = Number(item.dataset.chatId);
    const chat = this.chats.find(c => c.id === chatId);
    if (!chat) return;

    const pinLabel = pinBtn.querySelector('.chat-list-menu-item-label');
    const pinIconPath = pinBtn.querySelector('svg path');
    const addLabel = addBtn.querySelector('.chat-list-menu-item-label');
    const delLabel = delBtn.querySelector('.chat-list-menu-item-label');
    const pinSvgPathPinned = 'M235.32,81.37,174.63,20.69a16,16,0,0,0-22.63,0L98.37,74.49c-10.66-3.34-35-7.37-60.4,13.14a16,16,0,0,0-1.29,23.78L85,159.71,42.34,202.34a8,8,0,0,0,11.32,11.32L96.29,171l48.29,48.29A16,16,0,0,0,155.9,224c.38,0,.75,0,1.13,0a15.93,15.93,0,0,0,11.64-6.33c19.64-26.1,17.75-47.32,13.19-60L235.33,104A16,16,0,0,0,235.32,81.37ZM224,92.69h0l-57.27,57.46a8,8,0,0,0-1.49,9.22c9.46,18.93-1.8,38.59-9.34,48.62L48,100.08c12.08-9.74,23.64-12.31,32.48-12.31A40.13,40.13,0,0,1,96.81,91a8,8,0,0,0,9.25-1.51L163.32,32,224,92.68Z';
    const pinSvgPathUnpinned = 'M53.92,34.62A8,8,0,1,0,42.08,45.38L67.37,73.2A69.82,69.82,0,0,0,38,87.63a16,16,0,0,0-1.29,23.78L85,159.71,42.34,202.34a8,8,0,0,0,11.32,11.32L96.29,171l48.29,48.29A16,16,0,0,0,155.9,224c.38,0,.75,0,1.13,0a15.93,15.93,0,0,0,11.64-6.33,89.75,89.75,0,0,0,11.58-20.27l21.84,24a8,8,0,1,0,11.84-10.76ZM155.9,208,48,100.08C58.23,91.83,69.2,87.72,80.66,87.81l87.16,95.88C165.59,193.56,160.24,202.23,155.9,208Zm79.42-104-44.64,44.79a8,8,0,1,1-11.33-11.3L224,92.7,163.32,32,122.1,73.35a8,8,0,0,1-11.33-11.29L152,20.7a16,16,0,0,1,22.63,0l60.69,60.68A16,16,0,0,1,235.32,104Z';
    const pinIsActive = Boolean(chat.isPinned);
    if (pinLabel) {
      pinLabel.textContent = pinIsActive ? 'Відкріпити' : 'Закріпити';
    } else {
      pinBtn.textContent = pinIsActive ? 'Відкріпити' : 'Закріпити';
    }
    if (pinIconPath) {
      pinIconPath.setAttribute('d', pinIsActive ? pinSvgPathUnpinned : pinSvgPathPinned);
    }
    if (addLabel) {
      addLabel.textContent = chat.isGroup ? 'Додати користувача' : 'Додати до групи';
    }
    if (delLabel) {
      delLabel.textContent = chat.isGroup ? 'Видалити групу' : 'Видалити чат';
    }

    if (this.chatListMenuCloseTimer) {
      clearTimeout(this.chatListMenuCloseTimer);
      this.chatListMenuCloseTimer = null;
    }

    const detachMenuListeners = () => {
      if (this.chatListMenuDocClickHandler) {
        document.removeEventListener('click', this.chatListMenuDocClickHandler);
        this.chatListMenuDocClickHandler = null;
      }
      if (this.chatListMenuEscHandler) {
        document.removeEventListener('keydown', this.chatListMenuEscHandler);
        this.chatListMenuEscHandler = null;
      }
      if (this.chatListMenuScrollHandler) {
        window.removeEventListener('scroll', this.chatListMenuScrollHandler);
        this.chatListMenuScrollHandler = null;
      }
      if (this.chatListMenuResizeHandler) {
        window.removeEventListener('resize', this.chatListMenuResizeHandler);
        this.chatListMenuResizeHandler = null;
      }
    };

    const finishCloseMenu = () => {
      menu.classList.remove('active', 'is-closing');
      menu.setAttribute('aria-hidden', 'true');
      this.chatListMenuState = { id: null, name: '' };
      detachMenuListeners();
    };

    const closeMenu = () => {
      if (this.chatListMenuCloseTimer) {
        clearTimeout(this.chatListMenuCloseTimer);
        this.chatListMenuCloseTimer = null;
      }

      const isVisible = menu.classList.contains('active') || menu.classList.contains('is-closing');
      if (!isVisible) {
        finishCloseMenu();
        return;
      }

      menu.classList.remove('active');
      menu.classList.add('is-closing');
      menu.setAttribute('aria-hidden', 'true');

      this.chatListMenuCloseTimer = window.setTimeout(() => {
        this.chatListMenuCloseTimer = null;
        finishCloseMenu();
      }, 170);
    };

    finishCloseMenu();
    this.chatListMenuState = { id: chatId, name: chat.name };
    this.chatListMenuOpenedAt = performance.now();

    menu.style.left = '0px';
    menu.style.top = '0px';
    menu.classList.add('active');
    menu.setAttribute('aria-hidden', 'false');

    const rect = menu.getBoundingClientRect();
    const x = Math.min(clientX, window.innerWidth - rect.width - 8);
    const y = Math.min(clientY, window.innerHeight - rect.height - 8);
    const left = Math.max(8, x);
    const top = Math.max(8, y);
    const originX = Math.max(0, Math.min(100, ((clientX - left) / Math.max(1, rect.width)) * 100));
    const originY = Math.max(0, Math.min(100, ((clientY - top) / Math.max(1, rect.height)) * 100));
    menu.style.setProperty('--chat-list-menu-origin-x', `${originX}%`);
    menu.style.setProperty('--chat-list-menu-origin-y', `${originY}%`);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;

    pinBtn.onclick = () => {
      chat.isPinned = !chat.isPinned;
      chat.pinnedAt = chat.isPinned ? Date.now() : null;
      this.saveChats();
      this.renderChatsList();
      closeMenu();
    };

    delBtn.onclick = () => {
      this.deleteChat(chatId);
      closeMenu();
    };

    addBtn.onclick = () => {
      if (chat.isGroup) {
        this.openAddToGroupModal({ mode: 'add-user-to-chat', chatId: chat.id });
      } else {
        this.openAddToGroupModal({ mode: 'direct-to-group', sourceChatId: chat.id });
      }
      closeMenu();
    };

    this.chatListMenuDocClickHandler = (e) => {
      const openedAgo = performance.now() - (this.chatListMenuOpenedAt || 0);
      if (openedAgo < 140) return;
      if (e instanceof MouseEvent && e.button !== 0) return;
      if (!menu.contains(e.target)) closeMenu();
    };
    this.chatListMenuEscHandler = (e) => {
      if (e.key === 'Escape') closeMenu();
    };
    this.chatListMenuScrollHandler = () => closeMenu();
    this.chatListMenuResizeHandler = () => closeMenu();

    document.addEventListener('click', this.chatListMenuDocClickHandler);
    document.addEventListener('keydown', this.chatListMenuEscHandler);
    window.addEventListener('scroll', this.chatListMenuScrollHandler, { passive: true });
    window.addEventListener('resize', this.chatListMenuResizeHandler);
  }

  openAddToGroupModal(target) {
    const modal = document.getElementById('addToGroupModal');
    const select = document.getElementById('addToGroupSelect');
    if (!modal || !select) return;
    const title = modal.querySelector('.modal-header h3');
    const caption = modal.querySelector('.group-modal-caption');
    const confirmBtn = document.getElementById('confirmAddToGroupBtn');

    const mode = target?.mode === 'add-user-to-chat' ? 'add-user-to-chat' : 'direct-to-group';
    select.innerHTML = '';

    if (mode === 'add-user-to-chat') {
      const chatId = Number(target?.chatId);
      const targetChat = this.chats.find((chat) => Number(chat?.id) === chatId);
      if (!targetChat || !targetChat.isGroup) {
        this.showAlert('Оберіть груповий чат.');
        return;
      }

      const candidates = typeof this.collectRelatedUsersForGroupChat === 'function'
        ? this.collectRelatedUsersForGroupChat()
        : [];
      const selfId = typeof this.getAuthUserId === 'function' ? String(this.getAuthUserId() || '').trim() : '';
      const existingIds = new Set();
      const existingNames = new Set();

      if (selfId) existingIds.add(selfId);
      if (Array.isArray(targetChat.groupParticipants)) {
        targetChat.groupParticipants.forEach((member) => {
          const memberId = String(member?.id || member?.userId || '').trim();
          const memberName = String(member?.name || '').trim().toLowerCase();
          if (memberId) existingIds.add(memberId);
          if (memberName) existingNames.add(memberName);
        });
      }
      if (Array.isArray(targetChat.members)) {
        targetChat.members.forEach((member) => {
          const name = String(member?.name || member || '').trim().toLowerCase();
          if (name) existingNames.add(name);
        });
      }

      const availableUsers = candidates.filter((user) => {
        const userId = String(user?.id || '').trim();
        const userName = String(user?.name || '').trim().toLowerCase();
        if (!userId) return false;
        if (existingIds.has(userId)) return false;
        if (userName && existingNames.has(userName)) return false;
        return true;
      });

      if (!availableUsers.length) {
        this.showAlert('Немає доступних користувачів для додавання в цю групу.');
        return;
      }

      availableUsers.forEach((user) => {
        const opt = document.createElement('option');
        opt.value = String(user.id);
        opt.textContent = user.tag
          ? `${user.name} (@${user.tag})`
          : user.name;
        select.appendChild(opt);
      });

      this.addToGroupTarget = {
        mode,
        chatId,
        users: availableUsers
      };
      if (title) title.textContent = 'Додати користувача';
      if (caption) caption.textContent = 'Користувач';
      if (confirmBtn) confirmBtn.textContent = 'Додати';
    } else {
      const sourceChatId = Number(target?.sourceChatId);
      const sourceChat = this.chats.find((chat) => Number(chat?.id) === sourceChatId);
      if (!sourceChat) return;

      const groups = this.chats.filter((chat) => chat.isGroup && chat.id !== sourceChatId);
      if (!groups.length) {
        this.showAlert('Спочатку створіть групу');
        return;
      }

      groups.forEach((group) => {
        const opt = document.createElement('option');
        opt.value = String(group.id);
        opt.textContent = group.name;
        select.appendChild(opt);
      });

      this.addToGroupTarget = {
        mode,
        sourceChatId
      };
      if (title) title.textContent = 'Додати до групи';
      if (caption) caption.textContent = 'Група';
      if (confirmBtn) confirmBtn.textContent = 'Додати';
    }

    modal.classList.add('active');
    this.syncSharedModalOverlayState();
  }

  closeAddToGroupModal() {
    const modal = document.getElementById('addToGroupModal');
    if (modal) modal.classList.remove('active');
    this.syncSharedModalOverlayState();
    this.addToGroupTarget = null;
  }

  syncSharedModalOverlayState() {
    const overlay = document.getElementById('modalOverlay');
    if (!overlay) return;
    const modalIds = ['newChatModal', 'profileQrModal', 'groupInfoModal', 'groupAppearanceModal', 'addToGroupModal'];
    const shouldShow = modalIds.some((id) => document.getElementById(id)?.classList.contains('active'));
    overlay.classList.toggle('active', shouldShow);
  }

  buildProfileQrHandle(name = '') {
    const normalized = String(name || '')
      .trim()
      .toLowerCase()
      .replace(/['`’]/g, '')
      .replace(/[^a-z0-9а-яіїєґ]+/gi, '.')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '');
    return `@${normalized || 'nymo.user'}`;
  }

  getProfileQrSnapshot() {
    const name = String(this.user?.name || 'Користувач Nymo').trim() || 'Користувач Nymo';
    const handle = this.buildProfileQrHandle(name);
    const userId = String(this.user?.id || '').trim();
    const profileUrl = this.buildProfileQrLink(userId, handle);
    const payload = {
      app: 'Nymo',
      type: 'profile',
      version: 1,
      userId,
      name,
      handle,
      profileUrl
    };

    return {
      name,
      handle,
      payload,
      payloadText: profileUrl
    };
  }

  buildProfileQrLink(userId = '', handle = '') {
    const safeUserId = String(userId || '').trim();
    const safeHandle = String(handle || '').replace(/^@+/, '').trim().toLowerCase();
    const url = new URL(window.location.href);
    url.hash = '';
    url.search = '';
    if (safeUserId) {
      url.searchParams.set('profile', safeUserId);
    }
    if (safeHandle) {
      url.searchParams.set('handle', safeHandle);
    }
    url.searchParams.set('via', 'qr');
    return url.toString();
  }

  clearProfileQrLinkParamsFromUrl() {
    const url = new URL(window.location.href);
    const keys = ['profile', 'handle', 'via'];
    let changed = false;
    keys.forEach((key) => {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    });
    if (!changed) return;
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, '', nextUrl);
  }

  async consumeProfileQrDeepLinkFromUrl() {
    if (this.profileQrDeepLinkHandled === true) return;
    this.profileQrDeepLinkHandled = true;

    const url = new URL(window.location.href);
    const profileId = String(url.searchParams.get('profile') || '').trim();
    const handleParam = String(url.searchParams.get('handle') || '').trim().replace(/^@+/, '');
    if (!profileId && !handleParam) return;

    const normalizedHandle = handleParam.toLowerCase();
    const selfId = String(this.getAuthUserId?.() || '').trim();
    if (profileId && selfId && profileId === selfId) {
      this.clearProfileQrLinkParamsFromUrl();
      const navProfile = document.getElementById('navProfile');
      if (navProfile) this.setActiveNavButton(navProfile);
      this.showSettings('profile');
      return;
    }

    try {
      let targetUser = null;
      if (typeof this.loadAllRegisteredUsers === 'function') {
        const users = await this.loadAllRegisteredUsers(true);
        if (Array.isArray(users)) {
          targetUser = users.find((user) => {
            const candidateId = String(user?.id || '').trim();
            const candidateHandle = String(user?.tag || '').trim().toLowerCase();
            if (profileId && candidateId === profileId) return true;
            if (!profileId && normalizedHandle && candidateHandle === normalizedHandle) return true;
            return false;
          }) || null;
        }
      }

      if (!targetUser && profileId) {
        const cached = typeof this.getCachedUserMeta === 'function'
          ? this.getCachedUserMeta(profileId)
          : {};
        targetUser = {
          id: profileId,
          name: String(cached?.name || handleParam || 'Користувач').trim() || 'Користувач',
          avatarImage: this.getAvatarImage(cached?.avatarImage || ''),
          avatarColor: String(cached?.avatarColor || '').trim()
        };
      }

      if (!targetUser) {
        await this.showAlert('Користувача з цього QR не знайдено.');
        this.clearProfileQrLinkParamsFromUrl();
        return;
      }

      const navChats = document.getElementById('navChats');
      if (navChats) this.setActiveNavButton(navChats);
      await this.openOrCreateDirectChatByUser(targetUser);
      this.closeContactProfileSection();
      this.openContactProfileSection();
      this.clearProfileQrLinkParamsFromUrl();
    } catch (error) {
      await this.showAlert(error?.message || 'Не вдалося відкрити профіль з QR.');
      this.clearProfileQrLinkParamsFromUrl();
    }
  }

  bindProfileQrCardMotion() {
    const card = document.getElementById('profileQrCard');
    if (!card || card.dataset.motionBound === 'true') return;
    card.dataset.motionBound = 'true';

    const supportsFinePointer = () => (
      window.matchMedia('(hover: hover)').matches
      && window.matchMedia('(pointer: fine)').matches
    );

    let rafId = 0;
    let pointerX = 0;
    let pointerY = 0;

    const applyMotion = () => {
      rafId = 0;
      const rotateY = pointerX * 8;
      const rotateX = -pointerY * 8;
      const moveX = pointerX * 3;
      const moveY = pointerY * 3;
      const glowX = (pointerX + 1) * 50;
      const glowY = (pointerY + 1) * 50;
      card.style.transform = `translate3d(${moveX}px, ${moveY}px, 0) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      card.style.setProperty('--qr-mx', `${glowX}%`);
      card.style.setProperty('--qr-my', `${glowY}%`);
    };

    const resetMotion = () => {
      pointerX = 0;
      pointerY = 0;
      card.style.transform = '';
      card.style.setProperty('--qr-mx', '50%');
      card.style.setProperty('--qr-my', '28%');
      card.classList.remove('is-active');
    };

    card.addEventListener('pointermove', (event) => {
      if (!supportsFinePointer()) return;
      const rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const relativeX = (event.clientX - rect.left) / rect.width;
      const relativeY = (event.clientY - rect.top) / rect.height;
      pointerX = Math.max(-1, Math.min(1, (relativeX - 0.5) * 2));
      pointerY = Math.max(-1, Math.min(1, (relativeY - 0.5) * 2));
      card.classList.add('is-active');
      if (!rafId) rafId = window.requestAnimationFrame(applyMotion);
    });
    card.addEventListener('pointerleave', resetMotion);
    card.addEventListener('pointercancel', resetMotion);
    card.addEventListener('mouseleave', resetMotion);
    resetMotion();
  }

  async openProfileQrModal() {
    const modal = document.getElementById('profileQrModal');
    const canvas = document.getElementById('profileQrCanvas');
    const nameEl = document.getElementById('profileQrName');
    const handleEl = document.getElementById('profileQrHandle');
    const card = document.getElementById('profileQrCard');
    if (!modal || !(canvas instanceof HTMLCanvasElement) || !nameEl || !handleEl || !card) return;

    const snapshot = this.getProfileQrSnapshot();
    nameEl.textContent = snapshot.name;
    handleEl.textContent = snapshot.handle;

    try {
      await QRCode.toCanvas(canvas, snapshot.payloadText, {
        width: 280,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#151515',
          light: '#ffffff'
        }
      });
    } catch (error) {
      await this.showAlert(error?.message || 'Не вдалося згенерувати QR код.');
      return;
    }

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    this.bindProfileQrCardMotion();
    card.style.transform = '';
    card.style.setProperty('--qr-mx', '50%');
    card.style.setProperty('--qr-my', '28%');
    card.classList.remove('is-active');
    this.syncSharedModalOverlayState();
  }

  closeProfileQrModal() {
    const modal = document.getElementById('profileQrModal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    this.syncSharedModalOverlayState();
  }

  async confirmAddToGroup() {
    const select = document.getElementById('addToGroupSelect');
    if (!select || !this.addToGroupTarget) return;
    const context = this.addToGroupTarget;

    if (context?.mode === 'add-user-to-chat') {
      const targetChat = this.chats.find((chat) => Number(chat?.id) === Number(context.chatId));
      if (!targetChat || !targetChat.isGroup) return;
      const userId = String(select.value || '').trim();
      const user = (Array.isArray(context.users) ? context.users : []).find((item) => String(item?.id || '') === userId);
      if (!user) return;

      const normalizedName = String(user.name || '').trim();
      targetChat.members = Array.isArray(targetChat.members) ? targetChat.members : [];
      targetChat.groupParticipants = Array.isArray(targetChat.groupParticipants) ? targetChat.groupParticipants : [];

      const existsById = targetChat.groupParticipants.some((member) => String(member?.id || member?.userId || '').trim() === userId);
      const existsByName = targetChat.members.some((member) => String(member?.name || member || '').trim().toLowerCase() === normalizedName.toLowerCase());
      if (existsById || existsByName) {
        await this.showAlert('Користувач вже є в цій групі');
        this.closeAddToGroupModal();
        return;
      }

      const targetServerId = typeof this.resolveChatServerId === 'function'
        ? this.resolveChatServerId(targetChat)
        : '';
      if (targetServerId && typeof this.joinChatOnServerAsUser === 'function') {
        const joined = await this.joinChatOnServerAsUser(targetServerId, userId);
        if (!joined) {
          await this.showAlert('Не вдалося додати користувача у групу на сервері.');
          return;
        }
      }

      targetChat.members.push(normalizedName);
      if (typeof this.mergeGroupParticipants === 'function') {
        targetChat.groupParticipants = this.mergeGroupParticipants(
          targetChat.groupParticipants,
          [{
            id: userId,
            name: normalizedName || 'Користувач',
            avatarImage: this.getAvatarImage(user.avatarImage),
            avatarColor: String(user.avatarColor || '').trim(),
            status: this.getPresenceStatusForUser(userId, 'offline')
          }]
        );
      }

      this.saveChats();
      this.renderChatsList();
      if (this.currentChat && Number(this.currentChat.id) === Number(targetChat.id)) {
        this.updateChatHeader();
        if (document.getElementById('groupInfoModal')?.classList.contains('active')) {
          this.openGroupInfoModal();
        }
      }
      await this.showAlert('Користувача додано до групи');
      this.closeAddToGroupModal();
      return;
    }

    if (context?.mode === 'direct-to-group') {
      const sourceChat = this.chats.find((chat) => Number(chat?.id) === Number(context.sourceChatId));
      const groupId = Number(select.value);
      const group = this.chats.find((chat) => Number(chat?.id) === groupId);
      if (!sourceChat || !group || !group.isGroup) return;

      const memberName = String(sourceChat.name || '').trim();
      const memberId = String(sourceChat.participantId || '').trim();
      group.members = Array.isArray(group.members) ? group.members : [];
      group.groupParticipants = Array.isArray(group.groupParticipants) ? group.groupParticipants : [];

      const existsByName = group.members.some((member) => String(member?.name || member || '').trim().toLowerCase() === memberName.toLowerCase());
      const existsById = memberId
        ? group.groupParticipants.some((member) => String(member?.id || member?.userId || '').trim() === memberId)
        : false;
      if (existsByName || existsById) {
        await this.showAlert('Користувач вже є в цій групі');
        this.closeAddToGroupModal();
        return;
      }

      const targetServerId = typeof this.resolveChatServerId === 'function'
        ? this.resolveChatServerId(group)
        : '';
      if (targetServerId && memberId && typeof this.joinChatOnServerAsUser === 'function') {
        const joined = await this.joinChatOnServerAsUser(targetServerId, memberId);
        if (!joined) {
          await this.showAlert('Не вдалося додати користувача у групу на сервері.');
          return;
        }
      }

      if (memberName) {
        group.members.push(memberName);
      }
      if (typeof this.mergeGroupParticipants === 'function') {
        group.groupParticipants = this.mergeGroupParticipants(
          group.groupParticipants,
          [{
            id: memberId || null,
            name: memberName || 'Користувач',
            avatarImage: this.getAvatarImage(sourceChat.avatarImage || sourceChat.avatarUrl),
            avatarColor: String(sourceChat.avatarColor || '').trim(),
            status: this.getPresenceStatusForUser(memberId, 'offline')
          }]
        );
      }

      this.saveChats();
      this.renderChatsList();
      if (this.currentChat && Number(this.currentChat.id) === Number(group.id)) {
        this.updateChatHeader();
        if (document.getElementById('groupInfoModal')?.classList.contains('active')) {
          this.openGroupInfoModal();
        }
      }
      await this.showAlert('Додано до групи');
      this.closeAddToGroupModal();
      return;
    }
  }

  filterChats(query) {
    const chatsList = document.getElementById('chatsList');
    if (!chatsList) return;
    const items = chatsList.querySelectorAll('.chat-item');

    items.forEach(item => {
      const nameEl = item.querySelector('.chat-name');
      if (!nameEl) return;
      const name = nameEl.textContent.toLowerCase();
      if (name.includes(query.toLowerCase())) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });
  }

  async selectChat(chatId) {
    this.closeContactProfileSection();
    if (window.innerWidth <= 768 && this.mobileNewChatModeActive) {
      this.exitMobileNewChatMode({ clearQuery: true, render: false });
    }
    if (typeof this.stopRealtimeTyping === 'function') {
      this.stopRealtimeTyping({ emit: true });
    }
    if (typeof this.stopVoiceRecording === 'function') {
      this.stopVoiceRecording({ discard: true, silent: true });
    }
    if (typeof this.stopActiveVoicePlayback === 'function') {
      this.stopActiveVoicePlayback();
    }
    this.currentChat = this.chats.find(c => c.id === chatId);
    if (this.currentChat && typeof this.primeRecentChatImageUrls === 'function') {
      this.primeRecentChatImageUrls(this.currentChat);
    }
    if (this.currentChat && typeof this.markChatAsRead === 'function') {
      this.markChatAsRead(this.currentChat, { persist: true });
    }
    if (this.currentChat && typeof this.emitRealtimeReadReceipts === 'function') {
      this.emitRealtimeReadReceipts(this.currentChat);
    }
    document.getElementById('newContactInput').value = '';
    
    // Hide settings sections completely
    const settingsContainer = document.getElementById('settingsContainer');
    const settingsContainerMobile = document.getElementById('settingsContainerMobile');
    if (settingsContainer) {
      settingsContainer.classList.remove('active');
      settingsContainer.style.display = 'none';
    }
    if (settingsContainerMobile) {
      settingsContainerMobile.classList.remove('active');
      settingsContainerMobile.style.display = 'none';
    }
    
    // Show chat container
    const chatContainer = document.getElementById('chatContainer');
    const inputArea = document.querySelector('.message-input-area');
    const messages = document.getElementById('messagesContainer');
    if (chatContainer) {
      chatContainer.classList.add('active');
      chatContainer.style.display = 'flex';
    }
    
    this.renderChatsList();
    this.updateChatHeader();
    if (typeof this.joinRealtimeChatRoom === 'function') {
      this.joinRealtimeChatRoom(this.currentChat);
    }
    this.enforcePlainChatModalHeader();
    this.hideWelcomeScreen();
    this.hideBottomNavForChat();
    const appEl = document.querySelector('.orion-app');
    if (appEl) {
      appEl.classList.add('chat-open');
      appEl.classList.add('chat-active');
    }
    this.mountBottomNavInSidebar();
    try {
      const sidebar = document.querySelector('.sidebar');
      const sidebarOverlay = document.getElementById('sidebarOverlay');
      const profileMenu = document.querySelector('.profile-menu-wrapper');
      
      if (window.innerWidth <= 768) {
        if (appEl) appEl.classList.add('mobile-chat-open');
        if (sidebar) {
          sidebar.classList.remove('hidden', 'active', 'mobile-menu', 'revealed');
          sidebar.style.removeProperty('--sidebar-reveal');
        }
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        if (profileMenu) profileMenu.style.display = '';
      }
    } catch (e) {
    }
    const selectedChat = this.currentChat;
    if (selectedChat && typeof this.warmChatImageDimensions === 'function') {
      await this.warmChatImageDimensions(selectedChat, { limit: 8, timeoutMs: 180 }).catch(() => {});
    }
    if (this.currentChat !== selectedChat) return;
    this.renderChat();
    this.triggerChatEnterAnimation();
    this.applyMobileChatViewportLayout();
    if (typeof this.pinCurrentChatToBottom === 'function') {
      this.pinCurrentChatToBottom(2600);
    } else {
      const messagesContainer = document.getElementById('messagesContainer');
      if (messagesContainer && typeof this.syncMessagesContainerToBottom === 'function') {
        this.syncMessagesContainerToBottom(messagesContainer);
      }
    }
    const hasLocalMessagesCache = Array.isArray(this.currentChat?.messages) && this.currentChat.messages.length > 0;
    if (!hasLocalMessagesCache && typeof this.syncCurrentChatMessagesFromServer === 'function') {
      this.syncCurrentChatMessagesFromServer({ forceScroll: true })
        .then(() => {
          if (this.currentChat && typeof this.emitRealtimeReadReceipts === 'function') {
            this.emitRealtimeReadReceipts(this.currentChat);
          }
        })
        .catch(() => {});
    }
    if (this.currentChat && typeof this.emitRealtimeReadReceipts === 'function') {
      window.setTimeout(() => this.emitRealtimeReadReceipts(this.currentChat), 80);
    }
  }

  triggerChatEnterAnimation() {
    const chatContainer = document.getElementById('chatContainer');
    if (!chatContainer) return;
    const isMobile = window.innerWidth <= 768;

    if (this.chatEnterAnimation) {
      this.chatEnterAnimation.cancel();
      this.chatEnterAnimation = null;
    }

    const distance = isMobile ? 30 : 22;
    const duration = isMobile ? 720 : 460;
    chatContainer.style.willChange = 'transform, opacity';

    if (isMobile) {
      chatContainer.style.removeProperty('transition');
      chatContainer.style.removeProperty('transform');
      chatContainer.style.removeProperty('opacity');
      chatContainer.classList.remove('chat-entering');
      void chatContainer.offsetWidth;
      chatContainer.classList.add('chat-entering');
      window.setTimeout(() => {
        chatContainer.classList.remove('chat-entering');
        chatContainer.style.removeProperty('will-change');
      }, duration + 40);
      return;
    }

    if (typeof chatContainer.animate === 'function') {
      this.chatEnterAnimation = chatContainer.animate(
        [
          { transform: `translate3d(${distance}px, 0, 0)`, opacity: 0.88 },
          { transform: 'translate3d(0, 0, 0)', opacity: 1 }
        ],
        {
          duration,
          easing: 'cubic-bezier(0.2, 0.82, 0.25, 1)',
          fill: 'both'
        }
      );

      this.chatEnterAnimation.onfinish = () => {
        chatContainer.style.removeProperty('will-change');
        chatContainer.style.removeProperty('transform');
        chatContainer.style.removeProperty('opacity');
        this.chatEnterAnimation = null;
      };
      this.chatEnterAnimation.oncancel = () => {
        chatContainer.style.removeProperty('will-change');
        chatContainer.style.removeProperty('transform');
        chatContainer.style.removeProperty('opacity');
        this.chatEnterAnimation = null;
      };
      return;
    }

    chatContainer.classList.remove('chat-entering');
    void chatContainer.offsetWidth;
    chatContainer.classList.add('chat-entering');
    window.setTimeout(() => {
      chatContainer.classList.remove('chat-entering');
      chatContainer.style.removeProperty('will-change');
    }, duration + 40);
  }

  finalizeCloseChatState() {
    this.closeContactProfileSection();
    if (typeof this.stopRealtimeTyping === 'function') {
      this.stopRealtimeTyping({ emit: true });
    }
    if (typeof this.leaveRealtimeChatRoom === 'function') {
      this.leaveRealtimeChatRoom();
    }
    if (typeof this.stopVoiceRecording === 'function') {
      this.stopVoiceRecording({ discard: true, silent: true });
    }
    if (typeof this.stopActiveVoicePlayback === 'function') {
      this.stopActiveVoicePlayback();
    }
    if (this.mobileBottomStickAnimationFrame) {
      cancelAnimationFrame(this.mobileBottomStickAnimationFrame);
      this.mobileBottomStickAnimationFrame = null;
    }
    const chatContainer = document.getElementById('chatContainer');
    const inputArea = document.querySelector('.message-input-area');
    const messages = document.getElementById('messagesContainer');
    if (chatContainer) {
      chatContainer.classList.remove('active', 'swiping');
      chatContainer.style.removeProperty('display');
      chatContainer.style.removeProperty('transition');
      chatContainer.style.removeProperty('transform');
      chatContainer.style.removeProperty('opacity');
      chatContainer.style.removeProperty('will-change');
      chatContainer.style.removeProperty('flex-direction');
      chatContainer.style.removeProperty('height');
      chatContainer.style.removeProperty('padding-bottom');
      chatContainer.style.removeProperty('background-color');
    }
    if (inputArea) {
      inputArea.style.removeProperty('transform');
      inputArea.style.removeProperty('transition');
    }
    if (messages) {
      messages.style.removeProperty('padding-bottom');
    }
    this.currentChat = null;
    document.getElementById('messageInput').value = '';
    this.resizeMessageInput();
    this.renderChatsList();
    this.updateChatHeader();
    this.showWelcomeScreen();
    this.clearMessages();
    this.showBottomNav();
    const appEl = document.querySelector('.orion-app');
    if (appEl) {
      appEl.classList.remove('chat-open');
      appEl.classList.remove('chat-active');
    }
    this.setMobilePageScrollLock(false);
    if (window.innerWidth > 768) {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) sidebar.classList.remove('compact');
    }
    this.restoreBottomNavToHome({ animate: false });
    try {
      const appEl = document.querySelector('.orion-app');
      const sidebar = document.querySelector('.sidebar');
      const profileMenu = document.querySelector('.profile-menu-wrapper');
      
      if (window.innerWidth <= 768) {
        if (appEl) appEl.classList.remove('mobile-chat-open');
        if (sidebar) {
          sidebar.classList.remove('hidden', 'revealed');
          sidebar.style.removeProperty('--sidebar-reveal');
        }
        if (profileMenu) profileMenu.style.display = '';
      }
    } catch (e) {}
    this.applyMobileChatViewportLayout();
  }

  closeChat(options = {}) {
    const { animate = true, startTranslateX = null, duration: customDuration = null } = options;
    const isMobile = window.innerWidth <= 768;
    const chatContainer = document.getElementById('chatContainer');

    if (!animate || !isMobile || !chatContainer || !this.currentChat) {
      this.finalizeCloseChatState();
      return;
    }

    if (this.chatCloseAnimation) {
      this.chatCloseAnimation.cancel();
      this.chatCloseAnimation = null;
    }

    chatContainer.style.willChange = 'transform, opacity';
    const distance = Math.max(window.innerWidth, 320);
    const duration = Number.isFinite(customDuration) ? customDuration : 360;
    const easing = 'cubic-bezier(0.18, 0.72, 0, 1)';
    const cleanupAnimationStyles = () => {
      chatContainer.style.removeProperty('will-change');
      chatContainer.style.removeProperty('transform');
      chatContainer.style.removeProperty('opacity');
    };

    if (Number.isFinite(startTranslateX)) {
      const clampedStart = Math.max(0, Math.min(distance, startTranslateX));
      chatContainer.style.transform = `translate3d(${clampedStart}px, 0, 0)`;
      chatContainer.style.opacity = '1';
    }

    // Force style flush so the transition starts from the current frame.
    void chatContainer.offsetWidth;
    chatContainer.style.setProperty(
      'transition',
      `transform ${duration}ms ${easing}, opacity ${duration}ms ${easing}`,
      'important'
    );
    chatContainer.style.transform = `translate3d(${distance}px, 0, 0)`;
    chatContainer.style.opacity = '0.98';

    window.setTimeout(() => {
      chatContainer.style.removeProperty('transition');
      cleanupAnimationStyles();
      this.finalizeCloseChatState();
    }, duration + 20);
  }

  async deleteChat(chatId) {
    const idx = this.chats.findIndex(c => c.id === chatId);
    if (idx === -1) return;
    const chat = this.chats[idx];
    const result = await this.showConfirmWithOption(
      'Видалити чат?',
      {
        title: 'Видалення чату',
        optionLabel: 'Видалити для всіх',
        optionChecked: false,
        confirmText: 'Видалити',
        cancelText: 'Скасувати'
      }
    );
    if (!result?.confirmed) return;
    const deleteScope = result.optionChecked ? 'all' : 'self';

    try {
      if (deleteScope === 'self') {
        if (typeof this.markChatDeletedForSelf === 'function') {
          this.markChatDeletedForSelf(chat);
        }
      } else if (typeof this.deleteChatOnServer === 'function') {
        await this.deleteChatOnServer(chat, { scope: deleteScope });
      }
    } catch (error) {
      const errorMessage = String(error?.message || '').toLowerCase();
      const canFallbackToSelfDelete = deleteScope === 'all'
        && (
          errorMessage.includes('creator')
          || errorMessage.includes('owner')
          || errorMessage.includes('forbidden')
          || errorMessage.includes('403')
          || errorMessage.includes('тільки')
          || errorMessage.includes('власник')
        );
      if (canFallbackToSelfDelete && typeof this.markChatDeletedForSelf === 'function') {
        this.markChatDeletedForSelf(chat);
      } else {
        await this.showAlert(error?.message || 'Не вдалося видалити чат на сервері.');
        return;
      }
    }

    this.chats.splice(idx, 1);
    this.saveChats();

    if (this.currentChat?.id === chatId) {
      this.closeChat();
    } else {
      this.renderChatsList();
    }
  }

  syncDateSeparatorToChatInfo(messagesContainer = null) {
    const container = messagesContainer || document.getElementById('messagesContainer');
    if (!container) return;

    container.style.setProperty('--date-separator-offset-x', '0px');
    this.syncChatInfoToMessagesCenter(container);
  }

  syncChatInfoToMessagesCenter(messagesContainer = null) {
    const container = messagesContainer || document.getElementById('messagesContainer');
    if (!container) return;

    const appInfo = document.getElementById('appChatInfo');
    const modalInfo = document.getElementById('chatModalInfo');
    const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;
    const infoEl = isMobileViewport ? modalInfo : appInfo;
    if (!infoEl) return;

    const infoRect = infoEl.getBoundingClientRect();
    const infoStyles = window.getComputedStyle(infoEl);
    const isInfoVisible = infoRect.width > 0
      && infoRect.height > 0
      && infoStyles.display !== 'none'
      && infoStyles.visibility !== 'hidden'
      && infoStyles.opacity !== '0';
    if (!isInfoVisible) {
      infoEl.style.setProperty('--app-chat-info-offset-x', '0px');
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const rawOffset = (containerRect.left + containerRect.width / 2) - (infoRect.left + infoRect.width / 2);
    const currentOffset = Number.parseFloat(
      infoEl.style.getPropertyValue('--app-chat-info-offset-x')
      || infoStyles.getPropertyValue('--app-chat-info-offset-x')
      || '0'
    );
    const baseOffset = Number.isFinite(currentOffset) ? currentOffset : 0;
    const nextOffset = baseOffset + rawOffset;
    const maxOffset = Math.max(0, containerRect.width * 0.2);
    const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, nextOffset));
    infoEl.style.setProperty('--app-chat-info-offset-x', `${Math.round(clampedOffset)}px`);
  }

  ensureMessagesBottomSpacer(messagesContainer = null) {
    const container = messagesContainer || document.getElementById('messagesContainer');
    if (!container) return;

    const existingSpacer = Array.from(container.children).find((node) => node.classList?.contains('messages-bottom-spacer')) || null;
    const hasMessageContent = container.classList.contains('has-content');

    if (!hasMessageContent) {
      if (existingSpacer) existingSpacer.remove();
      return;
    }

    const spacer = existingSpacer || document.createElement('div');
    spacer.className = 'messages-bottom-spacer';
    spacer.setAttribute('aria-hidden', 'true');
    if (container.firstElementChild !== spacer) {
      container.prepend(spacer);
    }
  }

  renderChat(highlightId = null) {
    if (typeof this.stopActiveVoicePlayback === 'function') {
      this.stopActiveVoicePlayback(true);
    }
    const messagesContainer = document.getElementById('messagesContainer');
    this.syncDateSeparatorToChatInfo(messagesContainer);
    messagesContainer.innerHTML = '';
    messagesContainer.classList.remove('has-content');
    messagesContainer.classList.add('no-content');
    this.updateMessagesScrollBottomButtonVisibility();

    if (!this.currentChat) return;

    if (!this.currentChat.messages || this.currentChat.messages.length === 0) {
      const emptyEl = document.createElement('div');
      emptyEl.className = 'chat-empty-state';
      emptyEl.innerHTML = `
        <div class="chat-empty-emoji" aria-hidden="true">💬</div>
        <div class="chat-empty-title">Повідомлень ще немає</div>
        <div class="chat-empty-subtitle">Напишіть перше повідомлення у цей чат</div>
      `;
      messagesContainer.appendChild(emptyEl);
      this.updateMessagesScrollBottomButtonVisibility();
      return;
    }

    messagesContainer.classList.remove('no-content');
    messagesContainer.classList.add('has-content');
    this.ensureMessagesBottomSpacer(messagesContainer);

    let lastDate = null;
    this.currentChat.messages.forEach((msg, index) => {
      const msgDateKey = msg.date || new Date().toISOString().slice(0,10);

      if (msgDateKey !== lastDate) {
        lastDate = msgDateKey;
        const dateObj = new Date(msgDateKey + 'T00:00:00');
        let dateLabel = new Intl.DateTimeFormat('uk-UA', { weekday: 'long', day: 'numeric' }).format(dateObj);
        dateLabel = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
        const sep = document.createElement('div');
        sep.className = 'date-separator';
        sep.innerHTML = `<span class="date-separator-text">${dateLabel}</span>`;
        messagesContainer.appendChild(sep);
      }

      const messageEl = document.createElement('div');
      const shouldHighlight = Boolean(
        highlightId
        && msg.id === highlightId
        && (
          typeof this.shouldAnimateMessageInsertion !== 'function'
          || this.shouldAnimateMessageInsertion(msg)
        )
      );
      const highlightClass = shouldHighlight
        ? (msg.from === 'own' ? ' new-message from-composer' : ' new-message')
        : '';
      messageEl.className = `message ${msg.from}${highlightClass}`;
      messageEl.dataset.id = msg.id;
      messageEl.dataset.from = msg.from;
      messageEl.dataset.type = msg.type || 'text';
      messageEl.dataset.text = this.getMessageContextText(msg);
      messageEl.dataset.date = msg.date || '';
      messageEl.dataset.time = msg.time || '';
      messageEl.dataset.editable = String(this.isTextMessageEditable(msg));
      messageEl.dataset.pending = msg?.pending === true ? 'true' : 'false';
      messageEl.dataset.failed = msg?.failed === true ? 'true' : 'false';
      messageEl.dataset.senderId = String(msg?.senderId || '');
      messageEl.dataset.senderName = String(msg?.senderName || '');
      messageEl.dataset.senderAvatarImage = String(msg?.senderAvatarImage || '');
      messageEl.dataset.senderAvatarColor = String(msg?.senderAvatarColor || '');
      
      let avatarHtml = '';
      let senderNameHtml = '';
      
      if (msg.from === 'other') {
        const senderMeta = this.getMessageSenderDisplayMeta(msg, this.currentChat);
        avatarHtml = this.getChatAvatarHtml(senderMeta, 'message-avatar');
        if (this.currentChat?.isGroup && senderMeta.name) {
          senderNameHtml = `<div class="message-sender-name">${this.escapeHtml(senderMeta.name)}</div>`;
        }
      } else {
        avatarHtml = this.getUserAvatarHtml();
      }
      
      const editedLabel = msg.edited ? '<span class="message-edited">редаговано</span>' : '';
      const deliveryStatus = typeof this.getMessageDeliveryStatusHtml === 'function'
        ? this.getMessageDeliveryStatusHtml(msg)
        : '';
      const editedClass = msg.edited ? ' edited' : '';
      const imageClass = msg.type === 'image' && msg.imageUrl ? ' has-image' : '';
      const voiceClass = msg.type === 'voice' && msg.audioUrl ? ' has-voice' : '';
      const fileClass = msg.type === 'file' && (msg.fileUrl || msg.attachmentUrl || msg.documentUrl || msg.fileName) ? ' has-file' : '';
      const hasInlineMeta = this.shouldInlineMessageMeta(msg);
      const inlineMetaClass = hasInlineMeta ? ' inline-meta' : '';
      const tailClass = typeof this.shouldShowMessageTail === 'function' && this.shouldShowMessageTail(msg, {
        messages: this.currentChat.messages,
        index
      })
        ? ' with-tail'
        : '';
      const replyHtml = msg.replyTo
        ? `<div class="message-reply">
            <div class="message-reply-name">${msg.replyTo.from === 'own' ? this.user.name : this.currentChat.name}</div>
            <div class="message-reply-text">${this.formatMessageText(msg.replyTo.text || '')}</div>
          </div>`
        : '';

      messageEl.innerHTML = `
        ${avatarHtml}
        <div class="message-bubble">
          ${senderNameHtml}
          <div class="message-content${editedClass}${imageClass}${voiceClass}${fileClass}${inlineMetaClass}${tailClass}">
            ${replyHtml}
            ${this.buildMessageBodyHtml(msg)}
            <span class="message-meta"><span class="message-time">${msg.time || ''}</span>${editedLabel}${deliveryStatus}</span>
          </div>
        </div>
      `;
      messagesContainer.appendChild(messageEl);
    });

    this.bindMessageContextMenu();
    this.initMessageImageTransitions(messagesContainer);
    this.initVoiceMessageElements(messagesContainer);
    this.syncDateSeparatorToChatInfo(messagesContainer);

    const shouldAutoScroll = this.skipNextRenderChatAutoScroll !== true;
    this.skipNextRenderChatAutoScroll = false;

    if (shouldAutoScroll) {
      if (typeof this.enableMessagesMediaAutoScroll === 'function') {
        this.enableMessagesMediaAutoScroll(messagesContainer);
      }
      // Auto-scroll to bottom
      setTimeout(() => {
        if (typeof this.syncMessagesContainerToBottom === 'function') {
          this.syncMessagesContainerToBottom(messagesContainer);
        } else {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
          this.updateMessagesScrollBottomButtonVisibility();
        }
      }, 0);
      return;
    }

    this.updateMessagesScrollBottomButtonVisibility();
  }

  bindMessageContextMenu() {
    if (this.messageContextMenuBound) return;
    const messagesContainer = document.getElementById('messagesContainer');
    const backdrop = document.getElementById('messageMenuBackdrop');
    const menu = document.getElementById('messageMenu');
    const menuDate = document.getElementById('messageMenuDate');
    const btnReply = document.getElementById('messageMenuReply');
    const btnEdit = document.getElementById('messageMenuEdit');
    const btnDelete = document.getElementById('messageMenuDelete');
    const btnCopy = document.getElementById('messageMenuCopy');

    if (!messagesContainer || !menu || !menuDate || !btnReply || !btnEdit || !btnDelete || !btnCopy || !backdrop) return;
    this.messageContextMenuBound = true;

    let activeMenuMessageId = null;
    let menuCloseTimer = null;
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const finishCloseMenu = () => {
      backdrop.classList.remove('active', 'is-closing');
      backdrop.setAttribute('aria-hidden', 'true');
      menu.classList.remove('active', 'is-closing');
      menu.setAttribute('aria-hidden', 'true');
      this.messageMenuState = { id: null, from: null, text: '' };
      activeMenuMessageId = null;
    };

    const closeMenu = (immediate = false) => {
      if (menuCloseTimer) {
        clearTimeout(menuCloseTimer);
        menuCloseTimer = null;
      }

      const isMenuVisible = menu.classList.contains('active') || menu.classList.contains('is-closing');
      if (!isMenuVisible) {
        finishCloseMenu();
        return;
      }

      if (immediate) {
        finishCloseMenu();
        return;
      }

      backdrop.classList.remove('active');
      backdrop.classList.add('is-closing');
      backdrop.setAttribute('aria-hidden', 'true');
      menu.classList.remove('active');
      menu.classList.add('is-closing');
      menu.setAttribute('aria-hidden', 'true');

      menuCloseTimer = window.setTimeout(() => {
        menuCloseTimer = null;
        finishCloseMenu();
      }, 180);
    };

    const openMenu = (messageEl, clientX, clientY) => {
      const id = Number(messageEl.dataset.id);
      closeMenu(true);
      const from = messageEl.dataset.from;
      const text = messageEl.dataset.text || '';
      const isEditable = messageEl.dataset.editable === 'true';
      const date = messageEl.dataset.date || new Date().toISOString().slice(0,10);
      const time = messageEl.dataset.time || '';

      this.messageMenuState = { id, from, text };
      activeMenuMessageId = id;

      const formatted = this.formatMessageDateTime(date, time);
      menuDate.textContent = formatted;

      if (from === 'own' && isEditable) {
        btnEdit.classList.remove('disabled');
      } else {
        btnEdit.classList.add('disabled');
      }

      menu.style.left = '0px';
      menu.style.top = '0px';
      backdrop.classList.remove('active', 'is-closing');
      backdrop.setAttribute('aria-hidden', 'true');
      menu.classList.remove('is-closing');
      menu.classList.add('active');
      menu.setAttribute('aria-hidden', 'false');

      const menuRect = menu.getBoundingClientRect();
      const msgRect = messageEl.getBoundingClientRect();
      const pointerX = Number.isFinite(clientX)
        ? clientX
        : (from === 'own' ? msgRect.right : msgRect.left);
      const pointerY = Number.isFinite(clientY)
        ? clientY
        : (msgRect.top + Math.min(48, msgRect.height));

      const x = clamp(pointerX, 8, window.innerWidth - menuRect.width - 8);
      let y = pointerY + 8;
      if (y + menuRect.height > window.innerHeight - 8) {
        y = pointerY - menuRect.height - 8;
      }
      y = clamp(y, 8, window.innerHeight - menuRect.height - 8);
      const originX = clamp(((pointerX - x) / Math.max(1, menuRect.width)) * 100, 0, 100);
      const originY = clamp(((pointerY - y) / Math.max(1, menuRect.height)) * 100, 0, 100);
      menu.style.setProperty('--menu-origin-x', `${originX}%`);
      menu.style.setProperty('--menu-origin-y', `${originY}%`);
      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;
    };

    messagesContainer.addEventListener('contextmenu', (e) => {
      const messageEl = e.target.closest('.message');
      if (!messageEl) return;
      e.preventDefault();
      openMenu(messageEl, e.clientX, e.clientY);
    });

    let pressTimer = null;
    let activePressMessage = null;
    let activePressPoint = null;
    messagesContainer.addEventListener('touchstart', (e) => {
      const messageEl = e.target.closest('.message');
      if (!messageEl) return;
      activePressMessage = messageEl;
      const touch = e.touches && e.touches[0];
      activePressPoint = touch
        ? { x: touch.clientX, y: touch.clientY }
        : null;
      pressTimer = setTimeout(() => {
        openMenu(
          messageEl,
          activePressPoint?.x,
          activePressPoint?.y
        );
      }, 450);
    }, { passive: true });

    messagesContainer.addEventListener('touchend', () => {
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = null;
      if (activePressMessage) {
        activePressMessage = null;
      }
      activePressPoint = null;
    });

    messagesContainer.addEventListener('touchmove', () => {
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = null;
      if (activePressMessage) {
        activePressMessage = null;
      }
      activePressPoint = null;
    });

    btnEdit.addEventListener('click', () => {
      if (btnEdit.classList.contains('disabled')) return;
      if (this.messageMenuState.id != null) {
        this.beginEditMessage(this.messageMenuState.id);
      }
      closeMenu();
    });

    btnReply.addEventListener('click', () => {
      if (this.messageMenuState.id == null) return;
      this.setReplyTarget(this.messageMenuState);
      closeMenu();
    });

    btnDelete.addEventListener('click', async () => {
      if (this.messageMenuState.id == null) return;
      const messageId = this.messageMenuState.id;
      const targetMessage = Array.isArray(this.currentChat?.messages)
        ? this.currentChat.messages.find((item) => Number(item?.id) === Number(messageId))
        : null;
      const canDeleteForAll = Boolean(
        targetMessage
        && targetMessage.from === 'own'
        && String(targetMessage.serverId || '').trim()
      );
      closeMenu();
      const result = await this.showConfirmWithOption('Видалити це повідомлення?', {
        title: 'Видалення повідомлення',
        optionLabel: canDeleteForAll ? 'Видалити для всіх' : '',
        optionChecked: false,
        confirmText: 'Видалити',
        cancelText: 'Скасувати'
      });
      if (!result?.confirmed) return;
      const scope = result.optionChecked && canDeleteForAll ? 'all' : 'self';
      try {
        await this.deleteMessageWithScope(messageId, { scope });
      } catch (error) {
        await this.showAlert(error?.message || 'Не вдалося видалити повідомлення.');
      }
    });

    btnCopy.addEventListener('click', async () => {
      const text = this.messageMenuState.text || '';
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        this.showAlert('Скопійовано');
      } catch (e) {
        this.showAlert('Не вдалося скопіювати');
      }
      closeMenu();
    });

    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target)) closeMenu();
    });
    backdrop.addEventListener('click', closeMenu);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });

    window.addEventListener('scroll', closeMenu, { passive: true });
    window.addEventListener('resize', closeMenu);
  }

  buildContactHandle(name = '') {
    const cleanName = String(name || '')
      .trim()
      .toLowerCase()
      .replace(/['`’]/g, '')
      .replace(/[^a-z0-9а-яіїєґ]+/gi, '.')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '');
    return `@${cleanName || 'contact'}`;
  }

  formatContactBirthDate(rawDate = '') {
    const value = String(rawDate || '').trim();
    if (!value) return 'Не вказано';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const date = new Date(`${value}T00:00:00`);
      if (!Number.isNaN(date.getTime())) {
        return new Intl.DateTimeFormat('uk-UA', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }).format(date);
      }
    }
    return value;
  }

  isContactProfileSectionActive() {
    const chatContainer = document.getElementById('chatContainer');
    return Boolean(chatContainer?.classList.contains('profile-view-active'));
  }

  updateCurrentContactProfileStatusLabel() {
    if (!this.isContactProfileSectionActive() || !this.currentChat || this.currentChat.isGroup) return;
    const statusEl = document.getElementById('contactProfileStatus');
    if (!statusEl) return;

    const isTyping = Boolean(
      typeof this.isChatTypingActive === 'function'
      && this.isChatTypingActive(this.currentChat)
    );
    if (isTyping) {
      statusEl.textContent = 'Друкує...';
      return;
    }

    const isOnline = (this.currentChat.status || 'offline') !== 'offline';
    statusEl.textContent = isOnline ? 'Онлайн' : 'Не в мережі';
  }

  syncContactProfileMediaFiltersOffset() {
    const filtersWrap = document.getElementById('contactProfileMediaFilters');
    const actionsWrap = document.querySelector('#contactProfileView .contact-profile-actions');
    if (!filtersWrap || !actionsWrap) return;

    if (window.innerWidth > 768) {
      filtersWrap.style.removeProperty('--contact-profile-media-offset');
      return;
    }

    const actionButtons = Array.from(actionsWrap.children).filter((child) => {
      return child instanceof HTMLElement && child.offsetParent !== null;
    });

    if (!actionButtons.length) {
      filtersWrap.style.removeProperty('--contact-profile-media-offset');
      return;
    }

    const firstActionLeft = Math.min(
      ...actionButtons.map((button) => button.getBoundingClientRect().left)
    );
    const filtersLeft = filtersWrap.getBoundingClientRect().left;
    const offset = Math.max(0, Math.round(firstActionLeft - filtersLeft));
    filtersWrap.style.setProperty('--contact-profile-media-offset', `${offset}px`);
  }

  formatContactMediaMeta(message = {}, { includeTime = true } = {}) {
    const parts = [];
    if (includeTime && message.time) {
      parts.push(String(message.time));
    }
    if (message.date) {
      const dateObj = new Date(`${message.date}T00:00:00`);
      if (!Number.isNaN(dateObj.getTime())) {
        const dateParts = new Intl.DateTimeFormat('uk-UA', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }).formatToParts(dateObj);
        const day = dateParts.find((part) => part.type === 'day')?.value || '';
        const month = dateParts.find((part) => part.type === 'month')?.value || '';
        const year = dateParts.find((part) => part.type === 'year')?.value || '';
        const longDate = [day, month, year].filter(Boolean).join(' ');
        if (longDate) parts.push(longDate);
      }
    }
    return parts.join(' • ');
  }

  renderContactProfileMedia() {
    const grid = document.getElementById('contactProfileMediaGrid');
    const emptyEl = document.getElementById('contactProfileMediaEmpty');
    const filtersWrap = document.getElementById('contactProfileMediaFilters');
    if (!grid || !emptyEl || !filtersWrap) return;

    const messages = Array.isArray(this.currentChat?.messages) ? this.currentChat.messages : [];
    const mediaItems = [];

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (!message || typeof message !== 'object') continue;

      const hasImage = Boolean(message.imageUrl);
      const hasVoice = Boolean(message.audioUrl);
      const fileUrl = message.fileUrl || message.attachmentUrl || message.documentUrl || '';
      const hasFile = Boolean(fileUrl)
        || (message.type === 'file' && Boolean(message.fileName || message.name || message.text));

      if (hasImage) mediaItems.push({ group: 'media', kind: 'image', message });
      if (hasVoice) mediaItems.push({ group: 'voice', kind: 'voice', message });
      if (hasFile) mediaItems.push({ group: 'files', kind: 'file', message });
    }

    const filterOrder = ['media', 'voice', 'files'];
    const counts = {
      media: mediaItems.filter(item => item.group === 'media').length,
      voice: mediaItems.filter(item => item.group === 'voice').length,
      files: mediaItems.filter(item => item.group === 'files').length
    };

    const firstNonEmptyFilter = filterOrder.find((key) => (counts[key] ?? 0) > 0) || 'media';
    const activeFilter = filterOrder.includes(this.contactProfileMediaFilter)
      ? this.contactProfileMediaFilter
      : firstNonEmptyFilter;
    this.contactProfileMediaFilter = activeFilter;

    const filterButtons = filtersWrap.querySelectorAll('[data-media-filter]');
    filterButtons.forEach((button) => {
      const key = button.dataset.mediaFilter || '';
      const baseLabel = button.dataset.label || button.textContent || '';
      const count = counts[key] ?? 0;
      button.textContent = `${baseLabel} (${count})`;
      const isActive = key === activeFilter;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    const visibleItems = mediaItems.filter(item => item.group === activeFilter);

    if (!visibleItems.length) {
      grid.innerHTML = '';
      emptyEl.textContent = 'Немає елементів у цьому розділі.';
      emptyEl.style.display = '';
      requestAnimationFrame(() => this.syncContactProfileMediaFiltersOffset());
      return;
    }

    emptyEl.style.display = 'none';
    grid.innerHTML = visibleItems.map(({ kind, message }) => {
      const messageId = Number.isFinite(Number(message.id)) ? Number(message.id) : 0;
      const messageFrom = this.escapeAttr(String(message.from || ''));
      const defaultMeta = this.formatContactMediaMeta(message);
      const defaultMetaHtml = defaultMeta ? `<span class="contact-profile-media-meta">${this.escapeHtml(defaultMeta)}</span>` : '';

      if (kind === 'image') {
        const safeSrc = this.escapeAttr(String(message.imageUrl || ''));
        const caption = String(message.text || '').trim();
        const captionHtml = caption
          ? `<span class="contact-profile-media-caption">${this.escapeHtml(caption)}</span>`
          : '';

        return `
          <button
            type="button"
            class="contact-profile-media-item contact-profile-media-item--image"
            data-contact-media-kind="image"
            data-media-src="${safeSrc}"
            data-message-id="${messageId}"
            data-message-from="${messageFrom}"
            aria-label="Відкрити фото"
          >
            <img src="${safeSrc}" alt="Фото з чату" loading="lazy" />
            ${captionHtml}
            ${defaultMetaHtml}
          </button>
        `;
      }

      if (kind === 'file') {
        const fileSrcRaw = message.fileUrl || message.attachmentUrl || message.documentUrl || '';
        const safeSrc = this.escapeAttr(String(fileSrcRaw));
        const fileName = String(
          message.fileName
          || message.name
          || message.text
          || 'Файл'
        ).trim();
        const safeName = this.escapeHtml(fileName || 'Файл');

        return `
          <a
            class="contact-profile-media-item contact-profile-media-item--file"
            href="${safeSrc}"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Відкрити файл ${safeName}"
          >
            <span class="contact-profile-media-file-icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
                <path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"></path>
              </svg>
            </span>
            <span class="contact-profile-media-file-meta">
              <span class="contact-profile-media-file-name">${safeName}</span>
              ${defaultMetaHtml}
            </span>
          </a>
        `;
      }

      const safeAudio = this.escapeAttr(String(message.audioUrl || ''));
      const durationValue = Number.isFinite(Number(message.audioDuration))
        ? Number(message.audioDuration)
        : 0;
      const voiceMeta = this.formatContactMediaMeta(message, { includeTime: false });
      const voiceMetaHtml = voiceMeta ? `<span class="contact-profile-media-meta">${this.escapeHtml(voiceMeta)}</span>` : '';
      return `
        <article class="contact-profile-media-item contact-profile-media-item--voice">
          <div class="message-content has-voice contact-profile-voice-shell">
            <div class="message-voice" data-duration="${durationValue}">
              <button type="button" class="voice-play-btn" aria-label="Відтворити голосове повідомлення">
                <span class="voice-play-icon voice-play-icon--play" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256">
                    <path d="M232.4,114.49,88.32,26.35a16,16,0,0,0-16.2-.3A15.86,15.86,0,0,0,64,39.87V216.13A15.94,15.94,0,0,0,80,232a16.07,16.07,0,0,0,8.36-2.35L232.4,141.51a15.81,15.81,0,0,0,0-27ZM80,215.94V40l143.83,88Z"></path>
                  </svg>
                </span>
                <span class="voice-play-icon voice-play-icon--pause" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#000000" viewBox="0 0 256 256">
                    <path d="M200,32H160a16,16,0,0,0-16,16V208a16,16,0,0,0,16,16h40a16,16,0,0,0,16-16V48A16,16,0,0,0,200,32Zm0,176H160V48h40ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Zm0,176H56V48H96Z"></path>
                  </svg>
                </span>
              </button>
              <div class="voice-track" aria-hidden="true">
                <span class="voice-track-progress"></span>
                ${this.buildVoiceWaveBarsHtml()}
              </div>
              <span class="voice-duration">${this.formatVoiceDuration(durationValue)}</span>
              <audio class="voice-audio" preload="metadata" src="${safeAudio}"></audio>
            </div>
          </div>
          ${voiceMetaHtml}
        </article>
      `;
    }).join('');
    this.initVoiceMessageElements(grid);
    requestAnimationFrame(() => this.syncContactProfileMediaFiltersOffset());
  }

  renderCurrentContactProfileView() {
    if (!this.currentChat || this.currentChat.isGroup) return;

    const heroCard = document.getElementById('contactProfileHeroCard');
    const avatar = document.getElementById('contactProfileAvatar');
    const avatarImage = document.getElementById('contactProfileAvatarImage');
    const initials = document.getElementById('contactProfileInitials');
    const name = document.getElementById('contactProfileName');
    const handle = document.getElementById('contactProfileHandle');
    const bio = document.getElementById('contactProfileBio');
    const dob = document.getElementById('contactProfileDob');
    const status = document.getElementById('contactProfileStatus');
    if (!avatar || !name || !handle || !bio || !dob || !status || !initials) return;

    const participantId = String(this.currentChat.participantId || '').trim();
    const cachedMeta = participantId && typeof this.getCachedUserMeta === 'function'
      ? this.getCachedUserMeta(participantId)
      : {};
    const cachedName = participantId && typeof this.getCachedUserName === 'function'
      ? this.getCachedUserName(participantId)
      : '';
    const cachedAvatar = participantId && typeof this.getCachedUserAvatar === 'function'
      ? this.getCachedUserAvatar(participantId)
      : '';

    const chatName = String(cachedName || this.currentChat.name || 'Контакт').trim() || 'Контакт';
    const chatStatus = this.currentChat.status || cachedMeta?.status || 'offline';
    const isOnline = chatStatus !== 'offline';
    const chatDob = this.currentChat.dob || this.currentChat.birthDate || this.currentChat.dateOfBirth || '';
    const resolvedAvatarColor = String(
      this.currentChat.avatarColor
      || cachedMeta?.avatarColor
      || this.getContactColor(chatName)
    ).trim();
    const resolvedAvatarImage = this.getAvatarImage(
      cachedAvatar
      || this.currentChat.avatarImage
      || this.currentChat.avatarUrl
    );
    const hasCustomAvatar = resolvedAvatarImage.length > 0;

    name.textContent = chatName;
    handle.textContent = this.currentChat.handle || this.buildContactHandle(chatName);
    bio.textContent = this.currentChat.bio || 'Опис профілю відсутній.';
    dob.textContent = this.formatContactBirthDate(chatDob);
    status.textContent = isOnline ? 'Онлайн' : 'Не в мережі';

    avatar.style.background = hasCustomAvatar ? 'transparent' : resolvedAvatarColor;
    avatar.style.boxShadow = hasCustomAvatar ? 'none' : '';
    if (avatarImage) {
      avatarImage.onerror = () => {
        avatarImage.hidden = true;
        avatarImage.removeAttribute('src');
        avatar.style.background = resolvedAvatarColor;
        avatar.style.boxShadow = '';
        initials.hidden = false;
      };
      avatarImage.onload = () => {
        initials.hidden = !avatarImage.hidden;
      };
      if (hasCustomAvatar) {
        if (avatarImage.getAttribute('src') !== resolvedAvatarImage) {
          avatarImage.src = resolvedAvatarImage;
        }
        avatarImage.hidden = false;
      } else {
        avatarImage.hidden = true;
        avatarImage.removeAttribute('src');
      }
    }

    initials.textContent = this.getInitials(chatName);
    initials.hidden = hasCustomAvatar;
    avatar.dataset.avatarFrame = '';
    avatar.classList.remove('has-avatar-frame');

    if (heroCard && typeof this.applyProfileAura === 'function') {
      this.applyProfileAura(heroCard);
    }
    if (heroCard && typeof this.applyProfileMotion === 'function') {
      this.applyProfileMotion(heroCard);
    }
  }

  openContactProfileSection() {
    if (!this.currentChat || this.currentChat.isGroup) {
      this.showAlert('Картка контакту доступна лише для особистого чату');
      return;
    }

    const section = document.getElementById('contactProfileView');
    const chatContainer = document.getElementById('chatContainer');
    if (!section || !chatContainer) return;

    this.renderCurrentContactProfileView();
    chatContainer.classList.add('profile-view-active');
    section.setAttribute('aria-hidden', 'false');
    this.contactProfileMediaFilter = '';
    this.renderContactProfileMedia();
    this.updateCurrentContactProfileStatusLabel();
    requestAnimationFrame(() => this.syncContactProfileMediaFiltersOffset());
    this.closeContactProfileActionsMenu(true);
  }

  closeContactProfileSection() {
    const section = document.getElementById('contactProfileView');
    const chatContainer = document.getElementById('chatContainer');
    if (section) section.setAttribute('aria-hidden', 'true');
    if (chatContainer) {
      chatContainer.classList.remove('profile-view-active');
      chatContainer.classList.remove('profile-view-peek');
    }
    this.closeContactProfileActionsMenu(true);
  }

  toggleContactProfileActionsMenu(forceOpen = null, immediate = false) {
    const menu = document.getElementById('contactProfileMenu');
    const button = document.getElementById('contactProfileMoreBtn');
    if (!menu || !button) return;
    const isVisible = menu.classList.contains('active') || menu.classList.contains('is-closing');
    const shouldOpen = forceOpen == null ? !menu.classList.contains('active') : Boolean(forceOpen);

    if (this.contactProfileMenuCloseTimer) {
      clearTimeout(this.contactProfileMenuCloseTimer);
      this.contactProfileMenuCloseTimer = null;
    }

    if (shouldOpen) {
      menu.classList.remove('is-closing');
      menu.classList.add('active');
      menu.setAttribute('aria-hidden', 'false');
      button.setAttribute('aria-expanded', 'true');
      return;
    }

    button.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');

    if (immediate || !isVisible) {
      menu.classList.remove('active', 'is-closing');
      return;
    }

    menu.classList.remove('active');
    menu.classList.add('is-closing');
    this.contactProfileMenuCloseTimer = window.setTimeout(() => {
      this.contactProfileMenuCloseTimer = null;
      menu.classList.remove('is-closing');
    }, 180);
  }

  closeContactProfileActionsMenu(immediate = false) {
    this.toggleContactProfileActionsMenu(false, immediate);
  }

  async handleContactProfileMenuAction(action) {
    if (!this.currentChat) return;

    const contactName = this.currentChat.name || 'контакту';
    if (action === 'mute') {
      await this.showNotice(`Сповіщення для ${contactName} вимкнено (демо).`, 'Профіль контакту');
    } else if (action === 'hide') {
      await this.showNotice(`Чат з ${contactName} приховано (демо).`, 'Профіль контакту');
    } else if (action === 'block') {
      const ok = await this.showConfirm(`Заблокувати ${contactName}?`, 'Профіль контакту');
      if (ok) {
        await this.showNotice(`${contactName} заблоковано (демо).`, 'Профіль контакту');
      }
    }

    this.closeContactProfileActionsMenu();
  }

  getGroupMemberDataFromChat(chat) {
    const currentChat = chat && typeof chat === 'object' ? chat : this.currentChat;
    if (!currentChat || !currentChat.isGroup) return [];

    const selfId = typeof this.getAuthUserId === 'function' ? String(this.getAuthUserId() || '').trim() : '';
    const selfName = String(this.user?.name || 'Ви').trim() || 'Ви';
    const selfAvatarImage = this.getAvatarImage(this.user?.avatarImage || this.user?.avatarUrl);
    const selfAvatarColor = String(this.user?.avatarColor || '').trim();
    const byKey = new Map();

    const appendMember = ({
      id = '',
      name = '',
      avatarImage = '',
      avatarColor = '',
      status = '',
      isSelf = false
    } = {}) => {
      const safeId = String(id || '').trim();
      const safeName = String(name || '').trim();
      const key = safeId || (safeName ? `name:${safeName.toLowerCase()}` : '');
      if (!key) return;

      const previous = byKey.get(key) || {};
      const resolvedName = String(
        safeName
        || previous.name
        || (safeId && typeof this.getCachedUserName === 'function' ? this.getCachedUserName(safeId) : '')
        || 'Користувач'
      ).trim() || 'Користувач';
      const resolvedAvatarImage = this.getAvatarImage(
        avatarImage
        || previous.avatarImage
        || (safeId && typeof this.getCachedUserAvatar === 'function' ? this.getCachedUserAvatar(safeId) : '')
      );
      const cachedMeta = safeId && typeof this.getCachedUserMeta === 'function'
        ? this.getCachedUserMeta(safeId)
        : {};
      const resolvedAvatarColor = String(
        avatarColor
        || previous.avatarColor
        || cachedMeta?.avatarColor
        || this.getContactColor(resolvedName)
      ).trim();
      const resolvedStatus = this.normalizePresenceStatus(
        status
        || previous.status
        || cachedMeta?.status
      );
      const shouldMarkSelf = Boolean(isSelf || previous.isSelf || (safeId && selfId && safeId === selfId));

      byKey.set(key, {
        id: safeId || String(previous.id || '').trim() || null,
        name: resolvedName,
        avatarImage: resolvedAvatarImage,
        avatarColor: resolvedAvatarColor,
        status: resolvedStatus,
        isSelf: shouldMarkSelf
      });
    };

    appendMember({
      id: selfId,
      name: selfName,
      avatarImage: selfAvatarImage,
      avatarColor: selfAvatarColor,
      status: 'online',
      isSelf: true
    });

    const explicitParticipants = Array.isArray(currentChat.groupParticipants) ? currentChat.groupParticipants : [];
    explicitParticipants.forEach((member) => {
      appendMember({
        id: member?.id,
        name: member?.name,
        avatarImage: member?.avatarImage || member?.avatarUrl,
        avatarColor: member?.avatarColor,
        status: member?.status
      });
    });

    const legacyMembers = Array.isArray(currentChat.members) ? currentChat.members : [];
    legacyMembers.forEach((member) => {
      if (member && typeof member === 'object') {
        appendMember({
          id: member.id || member.userId,
          name: member.name || member.nickname || member.mobile,
          avatarImage: member.avatarImage || member.avatarUrl,
          avatarColor: member.avatarColor,
          status: member.status
        });
        return;
      }
      appendMember({ name: String(member || '').trim() });
    });

    const messages = Array.isArray(currentChat.messages) ? currentChat.messages : [];
    messages.forEach((message) => {
      if (!message || typeof message !== 'object') return;
      const senderId = String(message.senderId || '').trim();
      const senderName = String(message.senderName || '').trim()
        || (message.from === 'own' ? selfName : '');
      appendMember({
        id: senderId,
        name: senderName,
        avatarImage: message.senderAvatarImage || message.senderAvatar || '',
        avatarColor: message.senderAvatarColor || '',
        status: senderId ? this.getPresenceStatusForUser(senderId, 'offline') : ''
      });
    });

    return Array.from(byKey.values())
      .filter((member) => member && (member.id || member.name))
      .sort((a, b) => {
        if (a.isSelf && !b.isSelf) return -1;
        if (!a.isSelf && b.isSelf) return 1;
        const aOnline = this.normalizePresenceStatus(a.status) === 'online';
        const bOnline = this.normalizePresenceStatus(b.status) === 'online';
        if (aOnline !== bOnline) return aOnline ? -1 : 1;
        return String(a.name || '').localeCompare(String(b.name || ''), 'uk', { sensitivity: 'base' });
      });
  }

  renderGroupInfoMembersList(members = []) {
    const membersList = document.getElementById('groupInfoMembers');
    if (!membersList) return;
    membersList.innerHTML = '';
    members.forEach((member) => {
      const li = document.createElement('li');
      const safeName = this.escapeHtml(String(member.name || 'Користувач'));
      const isOnline = this.normalizePresenceStatus(member.status) === 'online';
      const avatarImage = this.getAvatarImage(member.avatarImage || '');
      const initials = this.getInitials(member.name || 'Користувач');
      const avatarHtml = avatarImage
        ? `<div class="group-member-avatar is-image" style="background-image: url(&quot;${this.escapeAttr(avatarImage)}&quot;);" aria-hidden="true"></div>`
        : `<div class="group-member-avatar" style="background: ${member.avatarColor || this.getContactColor(member.name || 'Користувач')}" aria-hidden="true">${this.escapeHtml(initials)}</div>`;

      li.innerHTML = `
        ${avatarHtml}
        <div class="group-member-name">
          <span>${safeName}${member.isSelf ? ' <span class="group-member-self">(Ви)</span>' : ''}</span>
          <span class="group-member-role">${isOnline ? 'онлайн' : 'офлайн'}</span>
        </div>
      `;
      membersList.appendChild(li);
    });
  }

  openGroupInfoModal() {
    if (!this.currentChat || !this.currentChat.isGroup) {
      this.showAlert('Це не груповий чат');
      return;
    }
    const modal = document.getElementById('groupInfoModal');
    const avatar = document.getElementById('groupInfoAvatar');
    const name = document.getElementById('groupInfoName');
    const count = document.getElementById('groupInfoCount');
    const membersList = document.getElementById('groupInfoMembers');

    if (!modal || !avatar || !name || !count || !membersList) return;

    const avatarImage = this.getAvatarImage(this.currentChat.avatarImage || this.currentChat.avatarUrl);
    const initials = this.getInitials(this.currentChat.name || 'Група');
    avatar.classList.toggle('is-image', Boolean(avatarImage));
    if (avatarImage) {
      avatar.textContent = '';
      avatar.style.backgroundImage = `url("${this.escapeAttr(avatarImage)}")`;
      avatar.style.backgroundColor = 'transparent';
    } else {
      avatar.textContent = initials;
      avatar.style.backgroundImage = '';
      avatar.style.backgroundColor = '';
      avatar.style.background = this.currentChat.avatarColor || this.getContactColor(this.currentChat.name || 'Група');
    }
    name.textContent = this.currentChat.name;

    const members = this.getGroupMemberDataFromChat(this.currentChat);
    count.textContent = `${members.length} учасників`;
    this.renderGroupInfoMembersList(members);

    const membersNeedingResolve = members.filter((member) =>
      member?.id
      && (!member.name || member.name === 'Користувач')
      && typeof this.resolveUserNameById === 'function'
    );
    if (membersNeedingResolve.length) {
      const activeChatId = this.currentChat.id;
      Promise.all(
        membersNeedingResolve.map(async (member) => {
          const resolvedName = await this.resolveUserNameById(member.id);
          return { member, resolvedName };
        })
      ).then((resolvedItems) => {
        let changed = false;
        resolvedItems.forEach(({ member, resolvedName }) => {
          const safeName = String(resolvedName || '').trim();
          if (!safeName || safeName === 'Користувач') return;
          member.name = safeName;
          changed = true;
        });
        if (!changed) return;
        if (!document.getElementById('groupInfoModal')?.classList.contains('active')) return;
        if (!this.currentChat || this.currentChat.id !== activeChatId) return;
        this.renderGroupInfoMembersList(members);
      }).catch(() => {
        // Ignore optional name resolution failures.
      });
    }

    modal.classList.add('active');
    this.syncSharedModalOverlayState();
  }

  closeGroupInfoModal() {
    const modal = document.getElementById('groupInfoModal');
    if (modal) modal.classList.remove('active');
    this.syncSharedModalOverlayState();
  }

  async saveGroupInfo() {
    if (!this.currentChat || !this.currentChat.isGroup) return;
    this.closeGroupInfoModal();
  }

  openGroupAppearanceModal() {
    if (!this.currentChat || !this.currentChat.isGroup) return;
    const modal = document.getElementById('groupAppearanceModal');
    const groupInfoModal = document.getElementById('groupInfoModal');
    const nameInput = document.getElementById('groupAppearanceNameInput');
    if (!modal || !nameInput) return;

    const shouldReturnToInfo = Boolean(groupInfoModal?.classList.contains('active'));
    this.groupAppearanceReturnToInfo = shouldReturnToInfo;
    if (shouldReturnToInfo) {
      groupInfoModal.classList.remove('active');
    }

    this.groupAppearanceDraft = {
      name: String(this.currentChat.name || '').trim() || 'Нова група',
      avatarImage: this.getAvatarImage(this.currentChat.avatarImage || this.currentChat.avatarUrl),
      avatarColor: String(this.currentChat.avatarColor || '').trim()
    };

    nameInput.value = this.groupAppearanceDraft.name;
    this.renderGroupAppearanceAvatarPreview();
    modal.classList.add('active');
    this.syncSharedModalOverlayState();
    window.setTimeout(() => {
      nameInput.focus();
      nameInput.select();
    }, 0);
  }

  closeGroupAppearanceModal(options = {}) {
    const restoreGroupInfo = options?.restoreGroupInfo !== false;
    const modal = document.getElementById('groupAppearanceModal');
    const shouldReturnToInfo = Boolean(restoreGroupInfo && this.groupAppearanceReturnToInfo);
    this.groupAppearanceReturnToInfo = false;
    if (modal) modal.classList.remove('active');
    const input = document.getElementById('groupAppearanceAvatarInput');
    if (input) input.value = '';
    if (shouldReturnToInfo && this.currentChat?.isGroup) {
      this.openGroupInfoModal();
      return;
    }
    this.syncSharedModalOverlayState();
  }

  renderGroupAppearanceAvatarPreview() {
    const preview = document.getElementById('groupAppearanceAvatarPreview');
    if (!preview) return;
    const nameInput = document.getElementById('groupAppearanceNameInput');
    const draft = this.groupAppearanceDraft && typeof this.groupAppearanceDraft === 'object'
      ? this.groupAppearanceDraft
      : {};
    const draftName = String(nameInput?.value || draft.name || this.currentChat?.name || 'Нова група').trim() || 'Нова група';
    const avatarImage = this.getAvatarImage(draft.avatarImage || '');
    const avatarColor = String(draft.avatarColor || this.currentChat?.avatarColor || this.getContactColor(draftName)).trim();
    const initials = this.getInitials(draftName);

    preview.classList.toggle('is-image', Boolean(avatarImage));
    if (avatarImage) {
      preview.textContent = '';
      preview.style.backgroundImage = `url("${this.escapeAttr(avatarImage)}")`;
      preview.style.backgroundColor = 'transparent';
    } else {
      preview.textContent = initials;
      preview.style.backgroundImage = '';
      preview.style.backgroundColor = '';
      preview.style.background = avatarColor || this.getContactColor(draftName);
    }
  }

  async handleGroupAppearanceAvatarChange(event) {
    const input = event?.target;
    const file = input?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.showAlert('Оберіть файл зображення');
      input.value = '';
      return;
    }

    try {
      let dataUrl = '';
      if (typeof this.buildProfileAvatarDataUrl === 'function') {
        dataUrl = await this.buildProfileAvatarDataUrl(file);
      } else {
        dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Не вдалося прочитати зображення'));
          reader.readAsDataURL(file);
        });
      }
      if (!dataUrl) {
        throw new Error('Не вдалося обробити зображення');
      }
      if (!this.groupAppearanceDraft || typeof this.groupAppearanceDraft !== 'object') {
        this.groupAppearanceDraft = {};
      }
      this.groupAppearanceDraft.avatarImage = dataUrl;
      this.renderGroupAppearanceAvatarPreview();
    } catch (error) {
      await this.showAlert(error?.message || 'Не вдалося обробити зображення групи');
    } finally {
      input.value = '';
    }
  }

  resetGroupAppearanceAvatar() {
    if (!this.groupAppearanceDraft || typeof this.groupAppearanceDraft !== 'object') {
      this.groupAppearanceDraft = {};
    }
    this.groupAppearanceDraft.avatarImage = '';
    this.renderGroupAppearanceAvatarPreview();
  }

  async saveGroupAppearance() {
    if (!this.currentChat || !this.currentChat.isGroup) return;
    const nameInput = document.getElementById('groupAppearanceNameInput');
    const nextName = String(nameInput?.value || '').trim();
    if (!nextName) {
      await this.showAlert('Введіть назву групи');
      return;
    }

    const draft = this.groupAppearanceDraft && typeof this.groupAppearanceDraft === 'object'
      ? this.groupAppearanceDraft
      : {};
    const draftAvatarImage = this.getAvatarImage(draft.avatarImage || '');
    const nextAvatarImage = await this.resolveGroupAvatarImageForServer(draftAvatarImage, {
      fileName: `group-${Date.now()}.jpg`
    });
    if (draftAvatarImage && !nextAvatarImage) {
      await this.showAlert('Не вдалося завантажити аватар групи на сервер. Спробуйте інше зображення.');
      return;
    }
    const nextAvatarColor = String(
      draft.avatarColor
      || this.currentChat.avatarColor
      || this.getContactColor(nextName)
    ).trim();

    try {
      await this.updateChatOnServer(this.currentChat, {
        ...this.buildChatAppearancePayload({
          name: nextName,
          avatarImage: nextAvatarImage,
          avatarColor: nextAvatarColor
        })
      });
    } catch (error) {
      await this.showAlert(error?.message || 'Не вдалося оновити вигляд групи на сервері.');
      return;
    }

    this.currentChat.name = nextName;
    this.currentChat.avatarImage = nextAvatarImage;
    this.currentChat.avatarUrl = nextAvatarImage;
    this.currentChat.avatarColor = nextAvatarColor;
    this.currentChat.localGroupAppearanceUpdatedAt = Date.now();
    try {
      await this.sendGroupMetaMessageToServer(this.currentChat, {
        name: nextName,
        avatarImage: nextAvatarImage,
        avatarColor: nextAvatarColor,
        participants: Array.isArray(this.currentChat.groupParticipants)
          ? this.currentChat.groupParticipants
          : []
      });
    } catch {}

    this.saveChats();
    this.renderChatsList();
    this.updateChatHeader();
    this.closeGroupAppearanceModal();
    if (document.getElementById('groupInfoModal')?.classList.contains('active')) {
      this.openGroupInfoModal();
    }
    await this.showNotice('Вигляд групи оновлено', 'Група');
  }

  getNextMessageId(chat) {
    if (!chat || !Array.isArray(chat.messages) || chat.messages.length === 0) return 1;
    const numericIds = chat.messages
      .map((m) => Number(m?.id))
      .filter((id) => Number.isFinite(id) && id > 0);
    const maxId = numericIds.length ? Math.max(...numericIds) : 0;
    return maxId + 1;
  }

  setReplyTarget(messageState) {
    const replyBar = document.getElementById('replyBar');
    const replyBarText = document.getElementById('replyBarText');
    if (!replyBar || !replyBarText) return;
    const name = messageState.from === 'own' ? this.user.name : (this.currentChat?.name || '');
    this.replyTarget = {
      id: messageState.id,
      text: messageState.text || '',
      from: messageState.from,
      name
    };
    replyBarText.textContent = `${name}: ${this.replyTarget.text}`;
    replyBar.classList.add('active');
  }

  clearReplyTarget() {
    const replyBar = document.getElementById('replyBar');
    const replyBarText = document.getElementById('replyBarText');
    this.replyTarget = null;
    if (replyBarText) replyBarText.textContent = '';
    if (replyBar) replyBar.classList.remove('active');
  }

  deleteMessageById(messageId) {
    if (!this.currentChat) return;
    const idx = this.currentChat.messages.findIndex(m => m.id === messageId);
    if (idx === -1) return;
    if (typeof this.releaseMediaRetryDraft === 'function') {
      this.releaseMediaRetryDraft(messageId, { revokePreview: true });
    }
    this.currentChat.messages.splice(idx, 1);
    this.saveChats();
    this.renderChat();
    this.renderChatsList();
    if (this.isContactProfileSectionActive()) {
      this.renderContactProfileMedia();
    }
  }

  async deleteMessageWithScope(messageId, { scope = 'self' } = {}) {
    if (!this.currentChat) return false;
    const idx = this.currentChat.messages.findIndex((m) => Number(m?.id) === Number(messageId));
    if (idx === -1) return false;
    const targetMessage = this.currentChat.messages[idx];
    const safeScope = scope === 'all' ? 'all' : 'self';

    if (safeScope === 'all') {
      if (targetMessage?.from !== 'own') {
        throw new Error('Видалити для всіх можна лише власне повідомлення.');
      }
      if (typeof this.deleteMessageOnServer === 'function') {
        await this.deleteMessageOnServer(this.currentChat, targetMessage, { scope: 'all' });
      }
      if (typeof this.unmarkMessageDeletedForSelf === 'function') {
        this.unmarkMessageDeletedForSelf(
          this.resolveChatServerId(this.currentChat),
          targetMessage?.serverId
        );
      }
    } else if (typeof this.markMessageDeletedForSelf === 'function') {
      this.markMessageDeletedForSelf(this.currentChat, targetMessage);
    }

    if (typeof this.releaseMediaRetryDraft === 'function') {
      this.releaseMediaRetryDraft(messageId, { revokePreview: true });
    }
    this.currentChat.messages.splice(idx, 1);
    if (Number(this.editingMessageId) === Number(messageId)) {
      this.editingMessageId = null;
    }
    this.saveChats();
    this.renderChat();
    this.renderChatsList();
    if (this.isContactProfileSectionActive()) {
      this.renderContactProfileMedia();
    }
    return true;
  }

  formatMessageDateTime(dateStr, timeStr) {
    const dateObj = new Date((dateStr || new Date().toISOString().slice(0,10)) + 'T00:00:00');
    const dateText = new Intl.DateTimeFormat('uk-UA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(dateObj);
    const timeText = timeStr ? ` ${timeStr}` : '';
    return `${dateText.charAt(0).toUpperCase() + dateText.slice(1)}${timeText}`;
  }

  updateGroupInfoMenuVisibility() {
    const isGroupChat = Boolean(this.currentChat && this.currentChat.isGroup);
    const menus = [
      document.getElementById('chatMenu'),
      document.getElementById('chatModalMenu')
    ];

    menus.forEach((menu) => {
      if (!menu) return;
      const groupInfoItem = menu.querySelector('.chat-menu-item[data-action="group-info"]');
      if (!groupInfoItem) return;
      groupInfoItem.hidden = !isGroupChat;
      groupInfoItem.setAttribute('aria-hidden', (!isGroupChat).toString());
    });
  }

  updateChatHeader() {
    const headerTargets = [
      {
        contactName: document.getElementById('contactName'),
        contactStatus: document.getElementById('contactStatus'),
        contactTyping: document.getElementById('contactTyping'),
        avatar: document.getElementById('appChatAvatar'),
        contactDetails: document.getElementById('appChatInfo')
      },
      {
        contactName: document.getElementById('chatModalName'),
        contactStatus: document.getElementById('chatModalStatus'),
        contactTyping: document.getElementById('chatModalTyping'),
        avatar: document.getElementById('chatModalAvatar'),
        contactDetails: document.getElementById('chatModalInfo')
      }
    ];

    headerTargets.forEach(({ contactName, contactStatus, contactTyping, avatar, contactDetails }) => {
      if (this.currentChat && contactName && contactStatus) {
        contactName.textContent = this.currentChat.name;
        const isTyping = Boolean(
          !this.currentChat.isGroup
          && typeof this.isChatTypingActive === 'function'
          && this.isChatTypingActive(this.currentChat)
        );

        if (isTyping) {
          if (contactTyping) {
            contactTyping.textContent = 'друкує...';
            contactTyping.classList.add('active');
          }
        } else if (contactTyping) {
          contactTyping.textContent = '';
          contactTyping.classList.remove('active');
        }

        if (!this.currentChat.isGroup) {
          const isOnline = (this.currentChat.status || 'offline') !== 'offline';
          contactStatus.classList.toggle('online', isOnline);
          contactStatus.classList.toggle('offline', !isOnline);
          contactStatus.classList.remove('hidden');
        } else {
          contactStatus.classList.remove('online', 'offline');
          contactStatus.classList.add('hidden');
        }
        if (avatar) {
          this.applyChatAvatarToElement(avatar, this.currentChat);
        }
        if (this.isContactProfileSectionActive()) {
          this.renderCurrentContactProfileView();
        }

        if (contactDetails) {
          contactDetails.style.cursor = 'pointer';
          contactDetails.onclick = this.currentChat.isGroup
            ? () => this.openGroupInfoModal()
            : () => this.openContactProfileSection();
        }
        this.enforcePlainChatModalHeader();
      } else {
        this.closeContactProfileSection();
        if (contactName) contactName.textContent = 'Виберіть контакт';
        if (contactStatus) {
          contactStatus.classList.remove('online', 'offline');
          contactStatus.classList.add('hidden');
        }
        if (contactTyping) {
          contactTyping.textContent = '';
          contactTyping.classList.remove('active');
        }
        if (avatar) {
          avatar.textContent = '';
          avatar.style.backgroundImage = '';
          avatar.style.backgroundColor = '';
          avatar.style.background = '';
        }
        if (contactDetails) {
          contactDetails.style.cursor = 'default';
          contactDetails.onclick = null;
        }
        this.enforcePlainChatModalHeader();
        }
    });
    this.updateGroupInfoMenuVisibility();
    this.updateCurrentContactProfileStatusLabel();
  }

  clearMessages() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
    messagesContainer.innerHTML = '';
    messagesContainer.classList.remove('has-content');
    messagesContainer.classList.add('no-content');
    this.updateMessagesScrollBottomButtonVisibility();
  }

}
