// Імпорти модулів
import { getSettingsTemplate } from './templates.js';
import { setupMobileSwipeBack, setupSettingsSwipeBack } from './swipe-handlers.js';
import { 
  showAlert, 
  showConfirm, 
  setupEmojiPicker, 
  insertAtCursor, 
  escapeHtml, 
  getContactColor,
  formatMessageDateTime 
} from './ui-helpers.js';

class ChatApp {
  constructor() {
    this.chats = this.loadChats();
    this.currentChat = null;
    this.user = this.loadUserProfile();
    this.settings = this.loadSettings();
    this.editingMessageId = null;
    this.replyTarget = null;
    this.messageMenuState = { id: null, from: null, text: '' };
    this.chatListMenuState = { id: null, name: '' };
    this.addToGroupTarget = null;
    this.bottomNavHidden = false;
    this.navRevealTimeout = null;
    this.lastSendTriggerAt = 0;
    this.forceComposerFocusUntil = 0;
    this.attachSheetOpen = false;
    this.nativePickerOpen = false;
    this.nativePickerResetTimer = null;
    this.cameraCaptureOpen = false;
    this.cameraStream = null;
    this.cameraFacingMode = 'environment';
    this.chatEnterAnimation = null;
    this.chatCloseAnimation = null;
    this.attachSheetTouchStartY = 0;
    this.attachSheetTouchCurrentY = 0;
    this.attachSheetTouchDragging = false;
    this.mobileScrollLockY = 0;
    this.mobileScrollLocked = false;
    this.mobileTouchMoveLockHandler = null;
    this.bottomNavHomeAnchor = null;
    this.bottomNavInSidebarTop = false;
    this.settingsParentSection = 'messenger-settings';
    this.loadTheme();
    this.profileMenuPlaceholder = null;
    this.init();
  }

  readJsonStorage(key, fallback) {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) return fallback;

    try {
      return JSON.parse(rawValue);
    } catch (error) {
      console.warn(`Invalid JSON in localStorage for key "${key}", resetting value.`);
      localStorage.removeItem(key);
      return fallback;
    }
  }

  loadUserProfile() {
    const data = this.readJsonStorage('bridge_user', null);
    if (data && typeof data === 'object') {
      return {
        name: data.name || 'Користувач Orion',
        email: data.email || 'user@example.com',
        status: data.status || 'online',
        bio: data.bio || 'Вітаю!',
        birthDate: data.birthDate || '',
        avatarColor: data.avatarColor || '',
        avatarImage: data.avatarImage || '',
        equippedAvatarFrame: data.equippedAvatarFrame || '',
        equippedProfileAura: data.equippedProfileAura || '',
        equippedProfileMotion: data.equippedProfileMotion || '',
        equippedProfileBadge: data.equippedProfileBadge || ''
      };
    }
    return {
      name: 'Користувач Orion',
      email: 'user@example.com',
      status: 'online',
      bio: 'Вітаю!',
      birthDate: '',
      avatarColor: 'linear-gradient(135deg, #ff9500, #ff6b6b)',
      avatarImage: '',
      equippedAvatarFrame: '',
      equippedProfileAura: '',
      equippedProfileMotion: '',
      equippedProfileBadge: ''
    };
  }

  saveUserProfile(userData) {
    this.user = userData;
    localStorage.setItem('bridge_user', JSON.stringify(userData));
    this.updateProfileMenuButton();
    this.updateProfileDisplay();
  }

  formatCoinBalance(value, wholeDigits = 8) {
    const cents = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
    const whole = String(Math.floor(cents / 100)).padStart(wholeDigits, '0');
    const fraction = String(cents % 100).padStart(2, '0');
    return `${whole},${fraction}`;
  }

  formatShopIslandBalance(value) {
    const cents = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
    const wholeNumber = Math.floor(cents / 100);
    const whole = wholeNumber === 0 ? '0' : `0${wholeNumber}`;
    const fraction = String(cents % 100).padStart(2, '0');
    return `${whole},${fraction}`;
  }

  getTapBalanceCents() {
    try {
      const raw = window.localStorage.getItem('orionTapBalanceCents');
      const value = Number.parseInt(raw || '0', 10);
      return Number.isFinite(value) && value >= 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  setTapBalanceCents(value) {
    const safeValue = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
    this.tapBalanceCents = safeValue;
    try {
      window.localStorage.setItem('orionTapBalanceCents', String(safeValue));
    } catch {
      // Ignore storage failures and keep the in-memory value.
    }
    const balanceTargets = document.querySelectorAll('#coinTapBalance, #shopBalanceValue');
    balanceTargets.forEach(el => {
      el.textContent = this.formatCoinBalance(safeValue);
    });
    document.querySelectorAll('#shopIslandBalance').forEach(el => {
      el.textContent = this.formatShopIslandBalance(safeValue);
    });
  }

  getShopCatalog() {
    return [
      {
        id: 'frame_solar',
        type: 'frame',
        effect: 'solar',
        title: 'Solar Ring',
        description: 'Тепла золота рамка навколо аватарки.',
        price: 250
      },
      {
        id: 'frame_neon',
        type: 'frame',
        effect: 'neon',
        title: 'Neon Pulse',
        description: 'Світловий контур із холодним акцентом.',
        price: 420
      },
      {
        id: 'frame_crystal',
        type: 'frame',
        effect: 'crystal',
        title: 'Crystal Edge',
        description: 'Світлий кристалічний обідок для аватара.',
        price: 560
      },
      {
        id: 'frame_ember',
        type: 'frame',
        effect: 'ember',
        title: 'Ember Loop',
        description: 'Теплий вогняний акцент для яскравого профілю.',
        price: 640
      },
      {
        id: 'frame_mint',
        type: 'frame',
        effect: 'mint',
        title: 'Mint Orbit',
        description: 'Свіжий м’ятний обідок з м’яким сяйвом.',
        price: 720
      },
      {
        id: 'frame_shadow',
        type: 'frame',
        effect: 'shadow',
        title: 'Shadow Loop',
        description: 'Глибокий темний контур для стриманого стилю.',
        price: 810
      },
      {
        id: 'aura_aurora',
        type: 'aura',
        effect: 'aurora',
        title: 'Aurora Glow',
        description: 'М’яке сяйво для картки профілю.',
        price: 680
      },
      {
        id: 'aura_cosmic',
        type: 'aura',
        effect: 'cosmic',
        title: 'Cosmic Wave',
        description: 'Космічний перелив у фоні профілю.',
        price: 860
      },
      {
        id: 'aura_sunset',
        type: 'aura',
        effect: 'sunset',
        title: 'Sunset Mist',
        description: 'Тепла помаранчева аура для hero-блоку.',
        price: 990
      },
      {
        id: 'aura_frost',
        type: 'aura',
        effect: 'frost',
        title: 'Frost Veil',
        description: 'Холодний скляний серпанок для спокійного вигляду.',
        price: 1080
      },
      {
        id: 'aura_sunbeam',
        type: 'aura',
        effect: 'sunbeam',
        title: 'Sunbeam Dust',
        description: 'Теплий золотий підсвіт із м’яким світлом.',
        price: 1190
      },
      {
        id: 'aura_midnight',
        type: 'aura',
        effect: 'midnight',
        title: 'Midnight Flow',
        description: 'Глибокий нічний перелив з темним акцентом.',
        price: 1320
      },
      {
        id: 'motion_glint',
        type: 'motion',
        effect: 'glint',
        title: 'Silver Drift',
        description: 'Світловий перелив, що м’яко проходить по картці профілю.',
        price: 940
      },
      {
        id: 'motion_orbit',
        type: 'motion',
        effect: 'orbit',
        title: 'Orbit Pulse',
        description: 'Плаваючі світлові хвилі для живого фону hero-блоку.',
        price: 1180
      },
      {
        id: 'motion_prism',
        type: 'motion',
        effect: 'prism',
        title: 'Prism Flow',
        description: 'Повільний призматичний рух із переливом по всій картці.',
        price: 1410
      },
      {
        id: 'badge_spark',
        type: 'badge',
        effect: 'spark',
        title: 'Spark Dot',
        description: 'Яскравий акцент-іскра, що з’являється після імені.',
        price: 360
      },
      {
        id: 'badge_comet',
        type: 'badge',
        effect: 'comet',
        title: 'Comet Tag',
        description: 'Мініатюрна комета праворуч від ніка в стилі Orion.',
        price: 430
      },
      {
        id: 'badge_crown',
        type: 'badge',
        effect: 'crown',
        title: 'Crown Mark',
        description: 'Стримана корона, яка додає статусу біля імені.',
        price: 540
      },
      {
        id: 'badge_orbit',
        type: 'badge',
        effect: 'orbit',
        title: 'Orbit Mark',
        description: 'Планетарний значок для впізнаваного вигляду профілю.',
        price: 620
      }
    ];
  }

  loadShopInventory() {
    const stored = this.readJsonStorage('orion_shop_inventory', []);
    return Array.isArray(stored) ? stored : [];
  }

  saveShopInventory(items) {
    const uniqueItems = [...new Set(Array.isArray(items) ? items : [])];
    localStorage.setItem('orion_shop_inventory', JSON.stringify(uniqueItems));
    return uniqueItems;
  }

  getShopItem(itemId) {
    return this.getShopCatalog().find(item => item.id === itemId) || null;
  }

  applyAvatarDecoration(avatarEl) {
    if (!avatarEl) return;
    const frame = this.user?.equippedAvatarFrame || '';
    avatarEl.dataset.avatarFrame = frame;
    avatarEl.classList.toggle('has-avatar-frame', Boolean(frame));
  }

  applyProfileAura(cardEl) {
    if (!cardEl) return;
    const aura = this.user?.equippedProfileAura || '';
    cardEl.dataset.profileAura = aura;
    cardEl.classList.toggle('has-profile-aura', Boolean(aura));
  }

  applyProfileMotion(cardEl) {
    if (!cardEl) return;
    const motion = this.user?.equippedProfileMotion || '';
    cardEl.dataset.profileMotion = motion;
    cardEl.classList.toggle('has-profile-motion', Boolean(motion));
  }

  getProfileBadgeDefinition(effect) {
    const definitions = {
      spark: {
        label: 'Spark',
        path: 'M144 24l14 50 50 14-50 14-14 50-14-50-50-14 50-14 14-50zm-72 120l9 31 31 9-31 9-9 31-9-31-31-9 31-9 9-31z'
      },
      comet: {
        label: 'Comet',
        path: 'M208 112a72 72 0 11-72-72 8 8 0 010 16 56 56 0 1056 56 8 8 0 0116 0zM48 208l44-12-32-32-12 44zm54.34-65.66l11.32 11.32 82.34-82.34a8 8 0 00-11.32-11.32z'
      },
      crown: {
        label: 'Crown',
        path: 'M40 184l16-96 48 40 24-56 24 56 48-40 16 96H40zm18.88-16h138.24l-8.77-52.6-42.23 35.2a8 8 0 01-12.31-2.6L128 99.75 122.19 148a8 8 0 01-12.31 2.6l-42.23-35.2z'
      },
      orbit: {
        label: 'Orbit',
        path: 'M128 56a40 40 0 110 80 40 40 0 010-80zm0 16a24 24 0 100 48 24 24 0 000-48zm0-40c55.23 0 100 17.91 100 40s-44.77 40-100 40-100-17.91-100-40 44.77-40 100-40zm0 16c-51.34 0-84 16.18-84 24s32.66 24 84 24 84-16.18 84-24-32.66-24-84-24zm56 88c24.3 7.31 40 19.1 40 32 0 22.09-44.77 40-100 40s-100-17.91-100-40c0-12.9 15.7-24.69 40-32a8 8 0 114.61 15.32C51.14 156.58 40 162.66 40 168c0 7.82 32.66 24 84 24s84-16.18 84-24c0-5.34-11.14-11.42-28.61-16.68A8 8 0 11184 136z'
      }
    };
    return definitions[effect] || null;
  }

  getProfileBadgeMarkup(effect, extraClass = '') {
    const badge = this.getProfileBadgeDefinition(effect);
    if (!badge) return '';
    const className = ['profile-badge-chip', extraClass].filter(Boolean).join(' ');
    const safeLabel = this.escapeAttr(badge.label);
    return `
      <span class="${className}" data-profile-badge="${this.escapeAttr(effect)}" title="${safeLabel}" aria-label="${safeLabel}">
        <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
          <path d="${badge.path}"></path>
        </svg>
      </span>
    `.trim();
  }

  applyProfileBadge(containerEl) {
    if (!containerEl) return;
    const badge = this.user?.equippedProfileBadge || '';
    containerEl.innerHTML = badge ? this.getProfileBadgeMarkup(badge) : '';
    containerEl.classList.toggle('has-badge', Boolean(badge));
    containerEl.toggleAttribute('hidden', !badge);
  }

  syncProfileCosmetics(root = document) {
    root.querySelectorAll('.profile-avatar-large').forEach(avatarEl => {
      this.applyAvatarDecoration(avatarEl);
    });
    root.querySelectorAll('#profile .profile-hero-card').forEach(cardEl => {
      this.applyProfileAura(cardEl);
      this.applyProfileMotion(cardEl);
    });
    root.querySelectorAll('#profile .profile-name-badges').forEach(containerEl => {
      this.applyProfileBadge(containerEl);
    });
  }

  updateProfileMenuButton() {
    const navProfile = document.getElementById('navProfile');
    if (!navProfile) return;

    const avatarEl = navProfile.querySelector('.nav-avatar');

    const name = this.user?.name || 'Користувач Orion';

    this.applyUserAvatarToElement(avatarEl, name);
  }

  getInitials(name) {
    return name
      .split(' ')
      .filter(Boolean)
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getRandomAvatarGradient() {
    const colors = [
      'linear-gradient(135deg, #ff9500, #ff6b6b)',
      'linear-gradient(135deg, #667eea, #764ba2)',
      'linear-gradient(135deg, #f093fb, #f5576c)',
      'linear-gradient(135deg, #4facfe, #00f2fe)',
      'linear-gradient(135deg, #43e97b, #38f9d7)',
      'linear-gradient(135deg, #fa709a, #fee140)',
      'linear-gradient(135deg, #30cfd0, #330867)',
      'linear-gradient(135deg, #a8edea, #fed6e3)'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  escapeAttr(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  applyUserAvatarToElement(avatarEl, name = '') {
    if (!avatarEl) return;
    const displayName = name || this.user?.name || 'Користувач Orion';
    if (!this.user?.avatarColor) {
      this.user.avatarColor = this.getRandomAvatarGradient();
    }

    if (this.user?.avatarImage) {
      avatarEl.textContent = '';
      avatarEl.style.backgroundImage = `url("${this.escapeAttr(this.user.avatarImage)}")`;
      avatarEl.style.backgroundColor = 'transparent';
    } else {
      avatarEl.style.backgroundImage = '';
      avatarEl.textContent = this.getInitials(displayName);
      avatarEl.style.background = this.user.avatarColor || this.getContactColor(displayName);
    }
  }

  getUserAvatarHtml() {
    if (this.user?.avatarImage) {
      const safeUrl = this.escapeAttr(this.user.avatarImage);
      return `<div class="message-avatar is-image" style="background-image: url(&quot;${safeUrl}&quot;);"></div>`;
    }
    const initials = this.getInitials(this.user?.name || 'Користувач Orion');
    return `<div class="message-avatar" style="background: ${this.user.avatarColor}">${initials}</div>`;
  }

  renderProfileAvatar(avatarEl) {
    if (!avatarEl) return;
    const name = this.user?.name || 'Користувач Orion';
    if (!this.user?.avatarColor) {
      this.user.avatarColor = this.getRandomAvatarGradient();
    }
    const imageEl = avatarEl.querySelector('.profile-avatar-image');
    const initialsEl = avatarEl.querySelector('.profile-avatar-initials');

    if (this.user?.avatarImage) {
      if (imageEl) {
        imageEl.src = this.user.avatarImage;
        imageEl.style.display = 'block';
      }
      if (initialsEl) initialsEl.style.display = 'none';
      avatarEl.style.background = 'transparent';
    } else {
      if (imageEl) imageEl.style.display = 'none';
      if (initialsEl) {
        initialsEl.textContent = this.getInitials(name);
        initialsEl.style.display = 'flex';
      }
      avatarEl.style.background = this.user.avatarColor;
    }

    this.applyAvatarDecoration(avatarEl);
  }

  updateProfileDisplay() {
    const profileSection = document.getElementById('profile');
    if (!profileSection) return;

    const profileName = profileSection.querySelector('#profileDisplayName');
    const profileBio = profileSection.querySelector('#profileDisplayBio');
    const profileEmail = profileSection.querySelector('#profileDisplayEmail');
    const profileDob = profileSection.querySelector('#profileDisplayDob');
    const avatarDiv = profileSection.querySelector('.profile-avatar-large');

    if (profileName) profileName.textContent = this.user.name;
    if (profileBio) profileBio.textContent = this.user.bio || '';
    if (profileEmail) profileEmail.textContent = this.user.email || '';
    if (profileDob) profileDob.textContent = this.formatBirthDate(this.user.birthDate);

    this.renderProfileAvatar(avatarDiv);
    this.applyProfileAura(profileSection.querySelector('.profile-hero-card'));
    this.applyProfileMotion(profileSection.querySelector('.profile-hero-card'));
    this.applyProfileBadge(profileSection.querySelector('#profileNameBadges'));
  }

  formatBirthDate(value) {
    if (!value) return '—';
    const dateObj = new Date(`${value}T00:00:00`);
    if (Number.isNaN(dateObj.getTime())) return '—';
    return new Intl.DateTimeFormat('uk-UA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(dateObj);
  }

  loadSettings() {
    const saved = this.readJsonStorage('bridge_settings', null);
    if (saved && typeof saved === 'object') {
      return saved;
    }
    return {
      soundNotifications: true,
      desktopNotifications: true,
      showOnlineStatus: true,
      showTypingIndicator: true,
      vibrationEnabled: true,
      messagePreview: true,
      readReceipts: true,
      lastSeen: true,
      enterToSend: true,
      autoPlayMedia: true,
      autoSaveMedia: false,
      animationsEnabled: true,
      compactMode: false,
      language: 'uk',
      fontSize: 'medium',
      theme: 'light'
    };
  }

  saveSettings(settingsData) {
    this.settings = settingsData;
    localStorage.setItem('bridge_settings', JSON.stringify(settingsData));
  }

  applySettingsToUI() {
    const root = document.documentElement;
    const settings = this.settings || {};
    root.classList.toggle('no-animations', settings.animationsEnabled === false);
    root.classList.toggle('compact-mode', settings.compactMode === true);
    root.classList.toggle('no-message-preview', settings.messagePreview === false);
    this.updateProfileDisplay();
  }

  // Метод-обгортка для імпортованої функції
  getContactColor(name) {
    return getContactColor(name);
  }

  loadTheme() {
    const savedTheme = localStorage.getItem('bridge_theme');
    if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark-theme');
      localStorage.setItem('bridge_theme', 'light');
    } else {
      document.documentElement.classList.add('dark-theme');
      localStorage.setItem('bridge_theme', 'dark');
    }
  }

  toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark-theme');
    localStorage.setItem('bridge_theme', isDark ? 'dark' : 'light');
    if (!this.currentChat && window.innerWidth > 768) {
      this.restoreBottomNavToHome({ animate: false });
    }
  }

  loadChats() {
    const stored = this.readJsonStorage('bridge_chats', null);
    if (Array.isArray(stored)) {
      return stored;
    }
    return [];
  }

  saveChats() {
    localStorage.setItem('bridge_chats', JSON.stringify(this.chats));
  }

  setupModalEnterHandlers() {
    const newChatModal = document.getElementById('newChatModal');
    if (newChatModal) {
      newChatModal.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && newChatModal.classList.contains('active')) {
          const input = e.target;
          if (input.id === 'newContactInput' || input.id === 'groupMembersInput') {
            e.preventDefault();
            this.createNewChat();
          }
        }
      });
    }

    const groupInfoModal = document.getElementById('groupInfoModal');
    if (groupInfoModal) {
      groupInfoModal.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey && groupInfoModal.classList.contains('active')) {
          e.preventDefault();
          this.saveGroupInfo();
        }
      });
    }

    const addToGroupModal = document.getElementById('addToGroupModal');
    if (addToGroupModal) {
      addToGroupModal.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && addToGroupModal.classList.contains('active')) {
          e.preventDefault();
          this.confirmAddToGroup();
        }
      });
    }
  }

  init() {
    this.setupEventListeners();
    this.setupModalEnterHandlers();
    this.ensureBottomNavHomeAnchor();
    this.restoreBottomNavToHome({ animate: false });
    this.setupDesktopChatWheelScroll();
    this.renderChatsList();
    this.applyFontSize(this.settings.fontSize);
    this.applySettingsToUI();
    this.updateProfileMenuButton();
    this.updateBottomNavIndicator();
    this.setupMobileSwipeBack();
    this.setupBottomNavReveal();
    this.setMobilePageScrollLock(false);
    if (window.innerWidth <= 768) {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    window.addEventListener('resize', () => {
      this.updateBottomNavIndicator();
      this.handleBottomNavResize();
      this.applyMobileChatViewportLayout();
    });

    this.mobileTouchMoveLockHandler = (event) => {
      if (window.innerWidth > 900) return;
      const appEl = document.querySelector('.bridge-app');
      if (!appEl || !appEl.classList.contains('chat-active')) return;
      const messages = document.getElementById('messagesContainer');
      const chatsList = document.getElementById('chatsList');
      const sidebar = document.querySelector('.sidebar');
      if (!messages) return;
      const target = event.target;
      const withinMessages = target instanceof Node && messages.contains(target);
      const withinChatsList = target instanceof Node && chatsList?.contains(target);
      const withinSidebar = target instanceof Node && sidebar?.contains(target);
      if (!withinMessages && !withinChatsList && !withinSidebar) {
        event.preventDefault();
      }
    };
    document.addEventListener('touchmove', this.mobileTouchMoveLockHandler, { passive: false });

  }

  setupDesktopChatWheelScroll() {
    const messagesContainer = document.getElementById('messagesContainer');
    const chatContainer = document.getElementById('chatContainer');
    if (!messagesContainer || !chatContainer) return;

    chatContainer.addEventListener('wheel', (event) => {
      if (window.innerWidth <= 900) return;
      if (messagesContainer.scrollHeight <= messagesContainer.clientHeight) return;

      const target = event.target instanceof Element ? event.target : null;
      const shouldSkip = target?.closest('textarea, input, .message-input-area, .chat-menu, .message-context-menu, .modal, .emoji-picker');
      if (shouldSkip) return;

      messagesContainer.scrollTop += event.deltaY;
      event.preventDefault();
    }, { passive: false });

    document.addEventListener('wheel', (event) => {
      if (window.innerWidth <= 900) return;
      if (!this.currentChat) return;
      if (!chatContainer.classList.contains('active')) return;
      if (messagesContainer.scrollHeight <= messagesContainer.clientHeight) return;
      if (event.ctrlKey) return;

      const target = event.target instanceof Element ? event.target : null;
      if (!target || !chatContainer.contains(target)) return;

      const shouldSkip = target.closest('textarea, input, .message-input-area, .chat-menu, .message-context-menu, .modal, .emoji-picker');
      if (shouldSkip) return;

      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (Math.abs(delta) < 0.1) return;

      messagesContainer.scrollTop += delta;
      event.preventDefault();
    }, { passive: false, capture: true });
  }

  // Метод-обгортка для імпортованої функції setupMobileSwipeBack
  setupMobileSwipeBack() {
    setupMobileSwipeBack(this);
  }

  setupEventListeners() {
    document.getElementById('newChatBtn').addEventListener('click', () => this.openNewChatModal());
    document.getElementById('closeModalBtn').addEventListener('click', () => this.closeNewChatModal());
    document.getElementById('cancelBtn').addEventListener('click', () => this.closeNewChatModal());
    document.getElementById('confirmBtn').addEventListener('click', () => this.createNewChat());
    document.getElementById('modalOverlay').addEventListener('click', () => this.closeNewChatModal());
    
    const navProfile = document.getElementById('navProfile');
    const navSettings = document.getElementById('navSettings');
    const navCalls = document.getElementById('navCalls');
    const navChats = document.getElementById('navChats');
    const navGames = document.getElementById('navGames');
    const isSettingsScreenActive = () => {
      const desktopSettings = document.getElementById('settingsContainer');
      const mobileSettings = document.getElementById('settingsContainerMobile');
      const desktopActive = desktopSettings?.classList.contains('active') && desktopSettings?.style.display !== 'none';
      const mobileActive = mobileSettings?.classList.contains('active') && mobileSettings?.style.display !== 'none';
      return Boolean(desktopActive || mobileActive);
    };
    
    if (navProfile) {
      navProfile.addEventListener('click', () => {
        if (navProfile.classList.contains('active') && this.currentChat === null && isSettingsScreenActive()) return;
        this.setActiveNavButton(navProfile);
        this.showSettings('profile');
      });
    }
    
    if (navSettings) {
      navSettings.addEventListener('click', () => {
        if (navSettings.classList.contains('active') && this.currentChat === null && isSettingsScreenActive()) return;
        this.setActiveNavButton(navSettings);
        this.showSettings('messenger-settings');
      });
    }

    if (navGames) {
      navGames.addEventListener('click', () => {
        if (navGames.classList.contains('active') && this.currentChat === null && isSettingsScreenActive()) return;
        this.setActiveNavButton(navGames);
        this.showSettings('mini-games');
      });
    }
    
    if (navCalls) {
      navCalls.addEventListener('click', () => {
        if (navCalls.classList.contains('active') && this.currentChat === null && isSettingsScreenActive()) return;
        this.setActiveNavButton(navCalls);
        this.showSettings('calls');
      });
    }
    
    if (navChats) {
      navChats.addEventListener('click', () => {
        if (navChats.classList.contains('active') && this.currentChat === null && !isSettingsScreenActive()) return;
        this.setActiveNavButton(navChats);
        this.showBottomNav();
        // Show chats list and hide settings
        const settingsContainer = document.getElementById('settingsContainer');
        const settingsContainerMobile = document.getElementById('settingsContainerMobile');
        const chatsList = document.getElementById('chatsList');
        const chatContainer = document.getElementById('chatContainer');
        const welcomeScreen = document.getElementById('welcomeScreen');
        const chatsListHeader = document.querySelector('.chats-list-header');
        const sidebar = document.querySelector('.sidebar');
        const profileMenu = document.querySelector('.profile-menu-wrapper');
        const appEl = document.querySelector('.bridge-app');
        
        if (settingsContainer) {
          settingsContainer.classList.remove('active');
          settingsContainer.style.display = 'none';
        }
        if (settingsContainerMobile) {
          settingsContainerMobile.classList.remove('active');
          settingsContainerMobile.style.display = 'none';
        }
        if (chatsList) chatsList.classList.remove('hidden');
        
        // Show chats list header
        if (chatsListHeader) chatsListHeader.style.display = '';
        
        // Show search box back
        const searchBox = document.querySelector('.search-box');
        if (searchBox) searchBox.style.display = '';

        if (sidebar) {
          sidebar.style.display = '';
          sidebar.classList.remove('compact');
        }
        if (profileMenu) profileMenu.classList.remove('floating-nav');
        
        // Clear current chat and show welcome screen
        this.currentChat = null;
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
        if (welcomeScreen) welcomeScreen.classList.remove('hidden');
        this.restoreBottomNavToHome({ animate: false });
        this.renderChatsList();
      });
    }
    
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
      const keepComposerFocus = (e) => {
        e.preventDefault();
      };
      const triggerSend = (e) => {
        e.preventDefault();
        const now = Date.now();
        if (now - this.lastSendTriggerAt < 220) return;
        this.lastSendTriggerAt = now;
        this.sendMessage();
      };
      sendBtn.addEventListener('mousedown', keepComposerFocus);
      sendBtn.addEventListener('touchstart', keepComposerFocus, { passive: false });
      sendBtn.addEventListener('touchend', triggerSend, { passive: false });
      sendBtn.addEventListener('click', triggerSend);
    }
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
      this.setupMessageComposer(messageInput);
      messageInput.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
        if (this.settings?.enterToSend === false) return;
        e.preventDefault();
        this.sendMessage();
      });
    }
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
        this.closeAttachSheet();
        this.closeCameraCapture();
      }
    });

    document.getElementById('searchInput').addEventListener('input', (e) => this.filterChats(e.target.value));

    const backBtn = document.getElementById('backBtn');
    if (backBtn) backBtn.addEventListener('click', () => this.closeChat());
    const chatBackBtn = document.getElementById('chatBackBtn');
    if (chatBackBtn) chatBackBtn.addEventListener('click', () => this.closeChat());

    document.getElementById('newContactInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.createNewChat();
      }
    });

    const isGroupToggle = document.getElementById('isGroupToggle');
    const groupFields = document.getElementById('groupFields');
    if (isGroupToggle && groupFields) {
      const toggleGroupFields = () => {
        if (isGroupToggle.checked) {
          groupFields.classList.add('active');
        } else {
          groupFields.classList.remove('active');
        }
      };
      isGroupToggle.addEventListener('change', toggleGroupFields);
      toggleGroupFields();
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
    if (closeGroupInfoBtn) closeGroupInfoBtn.addEventListener('click', () => this.closeGroupInfoModal());
    if (closeGroupInfoBtn2) closeGroupInfoBtn2.addEventListener('click', () => this.closeGroupInfoModal());
    if (saveGroupInfoBtn) saveGroupInfoBtn.addEventListener('click', () => this.saveGroupInfo());

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
  showAlert(message, title = 'Повідомлення') {
    return showAlert(message, title);
  }

  showConfirm(message, title = 'Підтвердження') {
    return showConfirm(message, title);
  }

  setupEmojiPicker() {
    setupEmojiPicker((input, text) => this.insertAtCursor(input, text));
  }

  insertAtCursor(input, text) {
    insertAtCursor(input, text);
  }

  resizeMessageInput(inputEl = null) {
    const input = inputEl || document.getElementById('messageInput');
    if (!input) return;

    if (window.innerWidth > 900) {
      input.style.height = '36px';
      input.style.overflowY = 'hidden';
      return;
    }

    const minHeight = window.innerWidth <= 768 ? 40 : 34;
    const maxHeight = 132;
    input.style.height = 'auto';
    const nextHeight = Math.min(maxHeight, Math.max(minHeight, input.scrollHeight));
    input.style.height = `${nextHeight}px`;
    input.style.overflowY = input.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }

  syncMobileKeyboardState(inputEl = null) {
    const appEl = document.querySelector('.bridge-app');
    const input = inputEl || document.getElementById('messageInput');
    if (!appEl || !input) return;

    if (window.innerWidth > 900) {
      appEl.classList.remove('keyboard-open');
      appEl.style.setProperty('--keyboard-inset', '0px');
      this.setMobilePageScrollLock(false);
      return;
    }

    const viewport = window.visualViewport;
    if (!viewport) {
      appEl.classList.remove('keyboard-open');
      appEl.style.setProperty('--keyboard-inset', '0px');
      this.setMobilePageScrollLock(false);
      return;
    }

    const keyboardHeightRaw = window.innerHeight - viewport.height - viewport.offsetTop;
    const keyboardHeight = Math.min(420, Math.max(0, keyboardHeightRaw));
    const isInputFocused = document.activeElement === input;
    const isOpen = isInputFocused && keyboardHeight > 70;

    appEl.classList.toggle('keyboard-open', isOpen);
    appEl.style.setProperty('--keyboard-inset', `${isOpen ? keyboardHeight : 0}px`);
    this.setMobilePageScrollLock(isOpen);

    if (isOpen) {
      // iOS can shift layout viewport on focus; lock page scroll and keep chat at latest message.
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      const messages = document.getElementById('messagesContainer');
      if (messages) {
        messages.scrollTop = messages.scrollHeight;
      }
    }

    this.applyMobileChatViewportLayout();
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

  applyMobileChatViewportLayout() {
    const appEl = document.querySelector('.bridge-app');
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
      inputArea.style.removeProperty('position');
      inputArea.style.removeProperty('bottom');
      return;
    }

    const viewport = window.visualViewport;
    const keyboardHeight = viewport
      ? Math.max(0, Math.min(420, window.innerHeight - viewport.height - viewport.offsetTop))
      : 0;

    chatArea.style.setProperty('position', 'fixed', 'important');
    chatArea.style.setProperty('top', '0', 'important');
    chatArea.style.setProperty('left', '0');
    chatArea.style.setProperty('right', '0');
    chatArea.style.setProperty('bottom', '0');
    chatArea.style.setProperty('height', 'auto');

    chatContainer.style.setProperty('display', 'flex', 'important');
    chatContainer.style.setProperty('flex-direction', 'column', 'important');
    chatContainer.style.setProperty('height', '100%', 'important');
    chatContainer.style.setProperty('padding-bottom', `${keyboardHeight}px`, 'important');
    chatContainer.style.setProperty('background-color', 'var(--bg-color)', 'important');

    inputArea.style.setProperty('position', 'sticky');
    inputArea.style.setProperty('bottom', '0');
    appEl.style.setProperty('--keyboard-inset', `${keyboardHeight}px`);

    if (keyboardHeight > 0 && messages) {
      messages.scrollTop = messages.scrollHeight;
    }
  }

  setupMessageComposer(inputEl) {
    if (!inputEl || inputEl.dataset.composerReady === 'true') return;
    inputEl.dataset.composerReady = 'true';

    const appEl = document.querySelector('.bridge-app');

    const updateHeight = () => {
      this.resizeMessageInput(inputEl);
      const messages = document.getElementById('messagesContainer');
      if (messages && this.currentChat) {
        messages.scrollTop = messages.scrollHeight;
      }
    };

    inputEl.addEventListener('input', updateHeight);
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
      const messages = document.getElementById('messagesContainer');
      if (messages) messages.scrollTop = messages.scrollHeight;
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
      this.syncMobileKeyboardState(inputEl);
      requestAnimationFrame(updateHeight);
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
        this.syncMobileKeyboardState(inputEl);
      }, 80);
    });

    if (window.visualViewport) {
      const sync = () => this.syncMobileKeyboardState(inputEl);
      window.visualViewport.addEventListener('resize', sync);
      window.visualViewport.addEventListener('scroll', sync);
    }

    window.addEventListener('resize', () => this.syncMobileKeyboardState(inputEl));
    updateHeight();
  }

  renderChatsList() {
    const chatsList = document.getElementById('chatsList');
    
    // On mobile, show chats list when rendering
    chatsList.classList.remove('hidden-on-settings');
    
    chatsList.innerHTML = '';

    const sortedChats = this.getSortedChats();
    
    if (sortedChats.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'chats-list-empty';
      emptyState.innerHTML = `
        <div class="empty-state-content">
          <div class="empty-state-emoji">💬</div>
          <div class="empty-state-text">Чатів ще немає</div>
          <div class="empty-state-hint">Натисніть + щоб почати розмову</div>
        </div>
      `;
      chatsList.appendChild(emptyState);
      this.renderSidebarAvatarsStrip();
      return;
    }

    sortedChats.forEach(chat => {
      const lastMessage = chat.messages[chat.messages.length - 1];
      const chatItem = document.createElement('button');
      const pinnedClass = chat.isPinned ? ' pinned' : '';
      chatItem.className = `chat-item ${this.currentChat?.id === chat.id ? 'active' : ''}${pinnedClass}`;
      chatItem.dataset.chatId = chat.id;
      chatItem.dataset.chatName = chat.name;
      const initials = chat.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
      const color = this.getContactColor(chat.name);
      chatItem.innerHTML = `
        <div class="chat-avatar" style="background: ${color}">${initials}</div>
        <div class="chat-info">
          <span class="chat-name">${chat.name}</span>
          <span class="chat-preview">${lastMessage?.text || 'Немає повідомлень'}</span>
        </div>
        <span class="chat-time">${lastMessage?.time || ''}</span>
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
  }

  getSortedChats() {
    const pinned = [];
    const normal = [];
    this.chats.forEach(c => (c.isPinned ? pinned : normal).push(c));
    pinned.sort((a, b) => (b.pinnedAt || 0) - (a.pinnedAt || 0));
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
    this.chatListMenuState = { id: chatId, name: chat.name };

    pinBtn.textContent = chat.isPinned ? 'Відкріпити' : 'Закріпити';

    const closeMenu = () => {
      menu.classList.remove('active');
      menu.setAttribute('aria-hidden', 'true');
      this.chatListMenuState = { id: null, name: '' };
    };

    menu.classList.add('active');
    menu.setAttribute('aria-hidden', 'false');
    const rect = menu.getBoundingClientRect();
    const x = Math.min(clientX, window.innerWidth - rect.width - 8);
    const y = Math.min(clientY, window.innerHeight - rect.height - 8);
    menu.style.left = `${Math.max(8, x)}px`;
    menu.style.top = `${Math.max(8, y)}px`;

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
      this.openAddToGroupModal(chat.name);
      closeMenu();
    };

    document.addEventListener('click', function onDocClick(e) {
      if (!menu.contains(e.target)) {
        closeMenu();
        document.removeEventListener('click', onDocClick);
      }
    });

    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') {
        closeMenu();
        document.removeEventListener('keydown', onEsc);
      }
    });
  }

  openAddToGroupModal(memberName) {
    const groups = this.chats.filter(c => c.isGroup);
    if (!groups.length) {
      this.showAlert('Спочатку створіть групу');
      return;
    }
    const modal = document.getElementById('addToGroupModal');
    const select = document.getElementById('addToGroupSelect');
    if (!modal || !select) return;

    select.innerHTML = '';
    groups.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = g.name;
      select.appendChild(opt);
    });

    this.addToGroupTarget = memberName;
    modal.classList.add('active');
    document.getElementById('modalOverlay').classList.add('active');
  }

  closeAddToGroupModal() {
    const modal = document.getElementById('addToGroupModal');
    if (modal) modal.classList.remove('active');
    document.getElementById('modalOverlay').classList.remove('active');
    this.addToGroupTarget = null;
  }

  async confirmAddToGroup() {
    const select = document.getElementById('addToGroupSelect');
    if (!select || !this.addToGroupTarget) return;
    const groupId = Number(select.value);
    const group = this.chats.find(c => c.id === groupId);
    if (!group || !group.isGroup) return;

    const memberName = this.addToGroupTarget;
    group.members = Array.isArray(group.members) ? group.members : [];
    const exists = group.members.some(m => m.toLowerCase().trim() === memberName.toLowerCase().trim());
    if (exists) {
      await this.showAlert('Користувач вже є в цій групі');
      this.closeAddToGroupModal();
      return;
    }

    group.members.push(memberName);
    this.saveChats();
    await this.showAlert('Додано до групи');
    this.closeAddToGroupModal();
  }

  filterChats(query) {
    const chatsList = document.getElementById('chatsList');
    const items = chatsList.querySelectorAll('.chat-item');

    items.forEach(item => {
      const name = item.querySelector('.chat-name').textContent.toLowerCase();
      if (name.includes(query.toLowerCase())) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });
  }

  selectChat(chatId) {
    this.currentChat = this.chats.find(c => c.id === chatId);
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
    if (chatContainer) {
      chatContainer.classList.add('active');
      chatContainer.style.display = 'flex';
    }
    
    this.renderChatsList();
    this.renderChat();
    this.updateChatHeader();
    this.hideWelcomeScreen();
    this.hideBottomNavForChat();
    const appEl = document.querySelector('.bridge-app');
    if (appEl) {
      appEl.classList.add('chat-open');
      appEl.classList.add('chat-active');
    }
    if (window.innerWidth > 768) {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) sidebar.classList.add('compact');
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
    this.triggerChatEnterAnimation();
    this.applyMobileChatViewportLayout();
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
    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer) {
      chatContainer.classList.remove('active', 'swiping');
      chatContainer.style.removeProperty('transition');
      chatContainer.style.removeProperty('transform');
      chatContainer.style.removeProperty('opacity');
      chatContainer.style.removeProperty('will-change');
    }
    this.currentChat = null;
    document.getElementById('messageInput').value = '';
    this.resizeMessageInput();
    this.renderChatsList();
    this.updateChatHeader();
    this.showWelcomeScreen();
    this.clearMessages();
    this.showBottomNav();
    const appEl = document.querySelector('.bridge-app');
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
      const appEl = document.querySelector('.bridge-app');
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
    const ok = await this.showConfirm('Ви впевнені, що хочете видалити цей чат?');
    if (!ok) return;

    const idx = this.chats.findIndex(c => c.id === chatId);
    if (idx === -1) return;

    this.chats.splice(idx, 1);
    this.saveChats();

    if (this.currentChat?.id === chatId) {
      this.closeChat();
    } else {
      this.renderChatsList();
    }
  }

  renderChat(highlightId = null) {
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.innerHTML = '';
    messagesContainer.classList.remove('has-content');
    messagesContainer.classList.add('no-content');

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
      return;
    }

    messagesContainer.classList.remove('no-content');
    messagesContainer.classList.add('has-content');

    let lastDate = null;
    this.currentChat.messages.forEach(msg => {
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
      const highlightClass = highlightId && msg.id === highlightId ? ' new-message' : '';
      messageEl.className = `message ${msg.from}${highlightClass}`;
      messageEl.dataset.id = msg.id;
      messageEl.dataset.from = msg.from;
      messageEl.dataset.text = (msg.type === 'image' && msg.imageUrl) ? (msg.text || 'Фото') : (msg.text || '');
      messageEl.dataset.date = msg.date || '';
      messageEl.dataset.time = msg.time || '';
      
      let avatarHtml = '';
      let senderNameHtml = '';
      
      if (msg.from === 'other') {
        const initials = this.currentChat.name.split(' ').map(w => w[0]).join('').toUpperCase();
        const color = this.getContactColor(this.currentChat.name);
        avatarHtml = `<div class="message-avatar" style="background: ${color}">${initials}</div>`;
    } else {
      avatarHtml = this.getUserAvatarHtml();
    }
      
      const editedLabel = msg.edited ? '<span class="message-edited">• редаговано</span>' : '';
      const editedClass = msg.edited ? ' edited' : '';
      const imageClass = msg.type === 'image' && msg.imageUrl ? ' has-image' : '';
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
          <div class="message-content${editedClass}${imageClass}">
            ${replyHtml}
            ${this.buildMessageBodyHtml(msg)}
            <span class="message-meta"><span class="message-time">${msg.time || ''}</span>${editedLabel}</span>
          </div>
        </div>
      `;
      messagesContainer.appendChild(messageEl);
    });

    this.bindMessageContextMenu();
    this.initMessageImageTransitions(messagesContainer);

    // Auto-scroll to bottom
    setTimeout(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 0);
  }

  bindMessageContextMenu() {
    const messagesContainer = document.getElementById('messagesContainer');
    const backdrop = document.getElementById('messageMenuBackdrop');
    const menu = document.getElementById('messageMenu');
    const menuDate = document.getElementById('messageMenuDate');
    const btnReply = document.getElementById('messageMenuReply');
    const btnEdit = document.getElementById('messageMenuEdit');
    const btnDelete = document.getElementById('messageMenuDelete');
    const btnCopy = document.getElementById('messageMenuCopy');

    if (!messagesContainer || !menu || !menuDate || !btnReply || !btnEdit || !btnDelete || !btnCopy || !backdrop) return;

    let focusedMessageClone = null;
    let focusedMessageSource = null;
    let activeMenuMessageId = null;

    const clearFocusedMessage = () => {
      if (focusedMessageSource) {
        focusedMessageSource.style.removeProperty('visibility');
        focusedMessageSource = null;
      }
      if (focusedMessageClone) {
        focusedMessageClone.remove();
        focusedMessageClone = null;
      }
      activeMenuMessageId = null;
    };

    const focusMessageAboveOverlay = (messageEl) => {
      clearFocusedMessage();
      if (!messageEl) return;

      const rect = messageEl.getBoundingClientRect();
      const clone = messageEl.cloneNode(true);
      clone.classList.add('message-menu-focus-clone');
      clone.classList.remove('longpress-pulse');
      clone.style.left = `${rect.left}px`;
      clone.style.top = `${rect.top}px`;
      clone.style.width = `${rect.width}px`;

      focusedMessageSource = messageEl;
      focusedMessageSource.style.visibility = 'hidden';
      focusedMessageClone = clone;
      document.body.appendChild(clone);
      window.requestAnimationFrame(() => {
        if (focusedMessageClone) focusedMessageClone.classList.add('show');
      });
    };

    const closeMenu = () => {
      backdrop.classList.remove('active');
      backdrop.setAttribute('aria-hidden', 'true');
      menu.classList.remove('active');
      menu.setAttribute('aria-hidden', 'true');
      this.messageMenuState = { id: null, from: null, text: '' };
      clearFocusedMessage();
    };

    const runLongPressPulse = (messageEl) => {
      if (!messageEl) return;
      messageEl.classList.remove('longpress-pulse');
      void messageEl.offsetWidth;
      messageEl.classList.add('longpress-pulse');
      window.setTimeout(() => {
        messageEl.classList.remove('longpress-pulse');
      }, 280);
    };

    const openMenu = (messageEl) => {
      const id = Number(messageEl.dataset.id);
      if (menu.classList.contains('active') && activeMenuMessageId === id) {
        return;
      }
      const from = messageEl.dataset.from;
      const text = messageEl.dataset.text || '';
      const date = messageEl.dataset.date || new Date().toISOString().slice(0,10);
      const time = messageEl.dataset.time || '';

      this.messageMenuState = { id, from, text };
      activeMenuMessageId = id;

      const formatted = this.formatMessageDateTime(date, time);
      menuDate.textContent = formatted;

      if (from === 'own') {
        btnEdit.classList.remove('disabled');
      } else {
        btnEdit.classList.add('disabled');
      }

      menu.style.left = '0px';
      menu.style.top = '0px';
      focusMessageAboveOverlay(messageEl);
      backdrop.classList.add('active');
      backdrop.setAttribute('aria-hidden', 'false');
      menu.classList.add('active');
      menu.setAttribute('aria-hidden', 'false');

      const menuRect = menu.getBoundingClientRect();
      const msgRect = messageEl.getBoundingClientRect();
      const desiredX = from === 'own'
        ? msgRect.right - menuRect.width
        : msgRect.left;
      const x = Math.min(Math.max(8, desiredX), window.innerWidth - menuRect.width - 8);
      let y = msgRect.bottom + 6;
      if (y + menuRect.height > window.innerHeight - 8) {
        y = msgRect.top - menuRect.height - 6;
      }
      y = Math.max(8, Math.min(y, window.innerHeight - menuRect.height - 8));
      menu.style.left = `${Math.max(8, x)}px`;
      menu.style.top = `${Math.max(8, y)}px`;
    };

    messagesContainer.addEventListener('contextmenu', (e) => {
      const messageEl = e.target.closest('.message');
      if (!messageEl) return;
      e.preventDefault();
      openMenu(messageEl);
    });

    let pressTimer = null;
    let activePressMessage = null;
    messagesContainer.addEventListener('touchstart', (e) => {
      const messageEl = e.target.closest('.message');
      if (!messageEl) return;
      activePressMessage = messageEl;
      pressTimer = setTimeout(() => {
        runLongPressPulse(messageEl);
        window.setTimeout(() => {
          openMenu(messageEl);
        }, 110);
      }, 450);
    }, { passive: true });

    messagesContainer.addEventListener('touchend', () => {
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = null;
      if (activePressMessage) {
        activePressMessage.classList.remove('longpress-pulse');
        activePressMessage = null;
      }
    });

    messagesContainer.addEventListener('touchmove', () => {
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = null;
      if (activePressMessage) {
        activePressMessage.classList.remove('longpress-pulse');
        activePressMessage = null;
      }
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

    btnDelete.addEventListener('click', () => {
      if (this.messageMenuState.id == null) return;
      const messageId = this.messageMenuState.id;
      this.showConfirm('Видалити це повідомлення?').then(ok => {
        if (!ok) return;
        this.deleteMessageById(messageId);
      });
      closeMenu();
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

  openGroupInfoModal() {
    if (!this.currentChat || !this.currentChat.isGroup) {
      this.showAlert('Це не груповий чат');
      return;
    }
    const modal = document.getElementById('groupInfoModal');
    const avatar = document.getElementById('groupInfoAvatar');
    const name = document.getElementById('groupInfoName');
    const count = document.getElementById('groupInfoCount');
    const desc = document.getElementById('groupInfoDescription');
    const membersList = document.getElementById('groupInfoMembers');

    if (!modal || !avatar || !name || !count || !desc || !membersList) return;

    const initials = this.currentChat.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
    avatar.textContent = initials;
    avatar.style.background = this.getContactColor(this.currentChat.name);
    name.textContent = this.currentChat.name;

    const members = Array.isArray(this.currentChat.members) ? this.currentChat.members : [];
    const total = members.length + 1;
    count.textContent = `учасників: ${total}`;
    desc.value = this.currentChat.description || '';

    membersList.innerHTML = '';
    const allMembers = [this.user.name, ...members];
    allMembers.forEach((m, index) => {
      const initials = m.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="group-member-avatar" style="background: ${this.getContactColor(m)}">${initials}</div>
        <div class="group-member-name">
          <span>${m}</span>
          ${index === 0 ? '<span class="group-member-self">(Ви)</span>' : ''}
        </div>
      `;
      membersList.appendChild(li);
    });

    modal.classList.add('active');
    document.getElementById('modalOverlay').classList.add('active');
  }

  closeGroupInfoModal() {
    const modal = document.getElementById('groupInfoModal');
    if (modal) modal.classList.remove('active');
    document.getElementById('modalOverlay').classList.remove('active');
  }

  async saveGroupInfo() {
    if (!this.currentChat || !this.currentChat.isGroup) return;
    const desc = document.getElementById('groupInfoDescription');
    if (desc) {
      this.currentChat.description = desc.value.trim();
      this.saveChats();
      await this.showAlert('Деталі групи збережено');
    }
    this.closeGroupInfoModal();
  }

  getNextMessageId(chat) {
    if (!chat || !Array.isArray(chat.messages) || chat.messages.length === 0) return 1;
    const maxId = Math.max(...chat.messages.map(m => m.id || 0));
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
    this.currentChat.messages.splice(idx, 1);
    this.saveChats();
    this.renderChat();
    this.renderChatsList();
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

  updateChatHeader() {
    const headerTargets = [
      {
        contactName: document.getElementById('contactName'),
        contactStatus: document.getElementById('contactStatus'),
        avatar: document.getElementById('appChatAvatar'),
        contactDetails: document.getElementById('appChatInfo')
      },
      {
        contactName: document.getElementById('chatModalName'),
        contactStatus: document.getElementById('chatModalStatus'),
        avatar: document.getElementById('chatModalAvatar'),
        contactDetails: document.getElementById('chatModalInfo')
      }
    ];

    headerTargets.forEach(({ contactName, contactStatus, avatar, contactDetails }) => {
      if (this.currentChat && contactName && contactStatus) {
        contactName.textContent = this.currentChat.name;
        contactStatus.textContent = '';
        const isOnline = this.currentChat.isGroup
          ? false
          : (this.currentChat.status || 'online') !== 'offline';
        contactStatus.classList.toggle('online', isOnline);
        contactStatus.classList.toggle('offline', !isOnline);
        if (avatar) {
          const initials = this.currentChat.name.split(' ').map(w => w[0]).join('').toUpperCase();
          const color = this.getContactColor(this.currentChat.name);
          avatar.textContent = initials;
          avatar.style.background = color;
        }

        if (contactDetails) {
          contactDetails.style.cursor = this.currentChat.isGroup ? 'pointer' : 'default';
          contactDetails.onclick = this.currentChat.isGroup
            ? () => this.openGroupInfoModal()
            : null;
        }
      } else {
        if (contactName) contactName.textContent = 'Виберіть контакт';
        if (contactStatus) {
          contactStatus.textContent = '';
          contactStatus.classList.remove('online', 'offline');
        }
        if (avatar) {
          avatar.textContent = '';
          avatar.style.background = '';
        }
        if (contactDetails) {
          contactDetails.style.cursor = 'default';
          contactDetails.onclick = null;
        }
      }
    });
  }

  clearMessages() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
    messagesContainer.innerHTML = '';
    messagesContainer.classList.remove('has-content');
    messagesContainer.classList.add('no-content');
  }

  appendMessage(msg, highlightClass = '') {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer || !this.currentChat) return;
    messagesContainer.classList.remove('no-content');
    messagesContainer.classList.add('has-content');

    const messageEl = document.createElement('div');
    messageEl.className = `message ${msg.from}${highlightClass}`;
    messageEl.dataset.id = msg.id;
    messageEl.dataset.from = msg.from;
    messageEl.dataset.text = (msg.type === 'image' && msg.imageUrl) ? (msg.text || 'Фото') : (msg.text || '');
    messageEl.dataset.date = msg.date || '';
    messageEl.dataset.time = msg.time || '';
    
    let avatarHtml = '';
    let senderNameHtml = '';
    
    if (msg.from === 'other') {
      const initials = this.currentChat.name.split(' ').map(w => w[0]).join('').toUpperCase();
      const color = this.getContactColor(this.currentChat.name);
      avatarHtml = `<div class="message-avatar" style="background: ${color}">${initials}</div>`;
    } else {
      avatarHtml = this.getUserAvatarHtml();
    }
    
    const editedLabel = msg.edited ? '<span class="message-edited">• редаговано</span>' : '';
    const editedClass = msg.edited ? ' edited' : '';
    const imageClass = msg.type === 'image' && msg.imageUrl ? ' has-image' : '';
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
        <div class="message-content${editedClass}${imageClass}">
          ${replyHtml}
          ${this.buildMessageBodyHtml(msg)}
          <span class="message-meta"><span class="message-time">${msg.time || ''}</span>${editedLabel}</span>
        </div>
      </div>
    `;
    messagesContainer.appendChild(messageEl);
    this.initMessageImageTransitions(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();

    if (!message || !this.currentChat) return;

    if (this.editingMessageId) {
      const msg = this.currentChat.messages.find(m => m.id === this.editingMessageId);
      if (!msg) {
        this.editingMessageId = null;
        return;
      }
      msg.text = message;
      msg.edited = true;
      this.saveChats();
      input.value = '';
      this.resizeMessageInput(input);
      this.editingMessageId = null;
      this.renderChat();
      this.renderChatsList();
      if (window.innerWidth <= 900) {
        input.focus({ preventScroll: true });
      }
      return;
    }

    const now = new Date();
    const time = now.getHours().toString().padStart(2, '0') + ':' + 
                 now.getMinutes().toString().padStart(2, '0');

    const newMessage = {
      id: this.getNextMessageId(this.currentChat),
      text: message,
      from: 'own',
      time: time,
      date: now.toISOString().slice(0,10),
      replyTo: this.replyTarget
        ? { id: this.replyTarget.id, text: this.replyTarget.text, from: this.replyTarget.from }
        : null
    };

    this.currentChat.messages.push(newMessage);
    this.saveChats();
    input.value = '';
    this.resizeMessageInput(input);
    this.clearReplyTarget();
    if (this.currentChat.messages.length === 1) {
      this.renderChat(newMessage.id);
    } else {
      this.appendMessage(newMessage, ' new-message');
    }
    this.renderChatsList();
    if (window.innerWidth <= 900) {
      input.focus({ preventScroll: true });
    }
  }

  openImagePicker() {
    this.forceComposerFocusUntil = 0;
    if (window.innerWidth > 900) {
      this.launchNativePicker(document.getElementById('galleryPickerInput'));
      return;
    }
    this.openAttachSheet();
  }

  closeImagePickerMenu() {
    this.closeAttachSheet();
  }

  openAttachSheet() {
    const overlay = document.getElementById('attachSheetOverlay');
    const sheet = document.getElementById('attachSheet');
    if (!overlay) return;
    if (sheet) {
      sheet.style.removeProperty('transform');
      sheet.style.removeProperty('opacity');
    }
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    this.attachSheetOpen = true;
  }

  closeAttachSheet() {
    const overlay = document.getElementById('attachSheetOverlay');
    const sheet = document.getElementById('attachSheet');
    if (sheet) {
      sheet.style.removeProperty('transform');
      sheet.style.removeProperty('opacity');
    }
    if (!overlay) {
      this.attachSheetOpen = false;
      return;
    }
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    this.attachSheetOpen = false;
  }

  onAttachSheetTouchStart(event) {
    if (!this.attachSheetOpen) return;
    if (!event.touches || !event.touches.length) return;
    this.attachSheetTouchDragging = true;
    this.attachSheetTouchStartY = event.touches[0].clientY;
    this.attachSheetTouchCurrentY = this.attachSheetTouchStartY;
  }

  onAttachSheetTouchMove(event) {
    if (!this.attachSheetOpen || !this.attachSheetTouchDragging) return;
    if (!event.touches || !event.touches.length) return;
    const sheet = document.getElementById('attachSheet');
    if (!sheet) return;
    this.attachSheetTouchCurrentY = event.touches[0].clientY;
    const deltaY = Math.max(0, this.attachSheetTouchCurrentY - this.attachSheetTouchStartY);
    if (deltaY <= 0) return;
    event.preventDefault();
    const opacity = Math.max(0.75, 1 - deltaY / 360);
    sheet.style.transform = `translateY(${deltaY}px)`;
    sheet.style.opacity = `${opacity}`;
  }

  onAttachSheetTouchEnd() {
    if (!this.attachSheetTouchDragging) return;
    this.attachSheetTouchDragging = false;
    const sheet = document.getElementById('attachSheet');
    const deltaY = Math.max(0, this.attachSheetTouchCurrentY - this.attachSheetTouchStartY);
    this.attachSheetTouchStartY = 0;
    this.attachSheetTouchCurrentY = 0;

    if (!sheet) return;
    if (deltaY > 90) {
      this.closeAttachSheet();
      return;
    }
    sheet.style.removeProperty('transform');
    sheet.style.removeProperty('opacity');
  }

  handleAttachSheetAction(action) {
    if (!action) return;
    if (action === 'gallery') {
      this.launchNativePicker(document.getElementById('galleryPickerInput'));
      return;
    }
    if (action === 'camera') {
      this.openCameraCapture();
      return;
    }
    if (action === 'file') {
      this.launchNativePicker(document.getElementById('filePickerInput'));
      return;
    }
    if (action === 'location') {
      this.closeAttachSheet();
      this.showAlert('Надсилання локації буде доступне незабаром.');
    }
  }

  launchNativePicker(input) {
    if (!input) return;
    this.nativePickerOpen = true;
    this.setComposerInputInteractionLocked(true);

    const cleanup = () => {
      this.nativePickerOpen = false;
      this.setComposerInputInteractionLocked(false);
      window.removeEventListener('focus', onFocus, true);
      document.removeEventListener('visibilitychange', onVisibility, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
      if (this.nativePickerResetTimer) {
        window.clearTimeout(this.nativePickerResetTimer);
        this.nativePickerResetTimer = null;
      }
    };
    const onFocus = () => window.setTimeout(cleanup, 80);
    const onVisibility = () => {
      if (!document.hidden) window.setTimeout(cleanup, 80);
    };
    const onPointerDown = () => {
      if (this.nativePickerOpen) cleanup();
    };

    window.addEventListener('focus', onFocus, true);
    document.addEventListener('visibilitychange', onVisibility, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    input.addEventListener('change', cleanup, { once: true });
    this.nativePickerResetTimer = window.setTimeout(cleanup, 1200);
    input.value = '';
    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
      } else {
        input.click();
      }
    } catch (_) {
      input.click();
    }
    this.closeAttachSheet();
  }

  setComposerInputInteractionLocked(locked) {
    const input = document.getElementById('messageInput');
    const appEl = document.querySelector('.bridge-app');
    if (!input) return;
    input.readOnly = !!locked;
    if (locked) {
      input.blur();
      if (appEl) appEl.classList.add('composer-locked');
    } else if (appEl) {
      appEl.classList.remove('composer-locked');
    }
  }

  async openCameraCapture() {
    this.closeAttachSheet();
    const overlay = document.getElementById('cameraCaptureOverlay');
    const video = document.getElementById('cameraCaptureVideo');
    if (!overlay || !video) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.showAlert('Камера недоступна у цьому браузері.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: this.cameraFacingMode } },
        audio: false
      });
      this.stopCameraStream();
      this.cameraStream = stream;
      video.srcObject = stream;
      overlay.classList.add('active');
      overlay.setAttribute('aria-hidden', 'false');
      this.cameraCaptureOpen = true;
    } catch (error) {
      this.showAlert('Не вдалося відкрити камеру. Перевірте дозволи браузера.');
    }
  }

  closeCameraCapture() {
    const overlay = document.getElementById('cameraCaptureOverlay');
    const video = document.getElementById('cameraCaptureVideo');
    if (overlay) {
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
    }
    if (video) {
      video.srcObject = null;
    }
    this.cameraCaptureOpen = false;
    this.stopCameraStream();
  }

  stopCameraStream() {
    if (!this.cameraStream) return;
    this.cameraStream.getTracks().forEach((track) => track.stop());
    this.cameraStream = null;
  }

  async toggleCameraFacingMode() {
    this.cameraFacingMode = this.cameraFacingMode === 'environment' ? 'user' : 'environment';
    if (!this.cameraCaptureOpen) return;
    await this.openCameraCapture();
  }

  capturePhotoFromCamera() {
    const video = document.getElementById('cameraCaptureVideo');
    if (!video || !this.currentChat) return;
    const width = video.videoWidth || 1080;
    const height = video.videoHeight || 1920;
    if (!width || !height) return;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    this.sendImageMessage(dataUrl);
    this.closeCameraCapture();
  }

  handleImageSelected(event) {
    const input = event?.target;
    const file = input?.files?.[0];
    if (!file || !this.currentChat) return;
    if (!file.type.startsWith('image/')) {
      this.showAlert('Оберіть файл зображення');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (result) {
        this.sendImageMessage(result);
      }
      input.value = '';
    };
    reader.onerror = () => {
      this.showAlert('Не вдалося прочитати зображення');
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  sendImageMessage(imageUrl) {
    if (!imageUrl || !this.currentChat) return;
    const input = document.getElementById('messageInput');
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newMessage = {
      id: this.getNextMessageId(this.currentChat),
      text: '',
      type: 'image',
      imageUrl,
      from: 'own',
      time,
      date: now.toISOString().slice(0, 10),
      replyTo: this.replyTarget
        ? { id: this.replyTarget.id, text: this.replyTarget.text, from: this.replyTarget.from }
        : null
    };

    this.currentChat.messages.push(newMessage);
    this.saveChats();
    this.clearReplyTarget();
    if (this.currentChat.messages.length === 1) {
      this.renderChat(newMessage.id);
    } else {
      this.appendMessage(newMessage, ' new-message');
    }
    this.renderChatsList();

    if (input && window.innerWidth <= 900) {
      input.focus({ preventScroll: true });
    }
  }

  openNewChatModal() {
    document.getElementById('newChatModal').classList.add('active');
    document.getElementById('modalOverlay').classList.add('active');
    document.getElementById('newContactInput').focus();
  }

  closeNewChatModal() {
    document.getElementById('newChatModal').classList.remove('active');
    document.getElementById('modalOverlay').classList.remove('active');
    document.getElementById('newContactInput').value = '';
    const isGroupToggle = document.getElementById('isGroupToggle');
    const groupMembersInput = document.getElementById('groupMembersInput');
    const groupFields = document.getElementById('groupFields');
    if (isGroupToggle) isGroupToggle.checked = false;
    if (groupMembersInput) groupMembersInput.value = '';
    if (groupFields) groupFields.classList.remove('active');
  }

  async createNewChat() {
    const input = document.getElementById('newContactInput');
    const isGroupToggle = document.getElementById('isGroupToggle');
    const groupMembersInput = document.getElementById('groupMembersInput');
    const raw = input.value || '';
    const name = raw.trim();

    if (!name) {
      await this.showAlert('Будь ласка, введіть ім\'я контакту');
      return;
    }

    const isGroup = !!isGroupToggle?.checked;
    let members = [];
    if (isGroup) {
      const rawMembers = groupMembersInput?.value || '';
      members = rawMembers
        .split(',')
        .map(m => m.trim())
        .filter(Boolean);
      if (members.length === 0) {
        await this.showAlert('Додайте хоча б одного учасника групи');
        return;
      }
    }

    const normalized = name.toLowerCase();
    console.log('createNewChat:', { name, normalized, chats: this.chats });
    const existing = this.chats.find(c => (c.name || '').toLowerCase().trim() === normalized);
    console.log('createNewChat existing:', existing);
    if (existing) {
      await this.showAlert('Цей контакт вже існує!');
      return;
    }

    const newChat = {
      id: Math.max(...this.chats.map(c => c.id), 0) + 1,
      name: name,
      messages: [],
      isGroup,
      members
    };

    this.chats.push(newChat);
    this.saveChats();
    this.renderChatsList();
    this.closeNewChatModal();
    this.selectChat(newChat.id);
  }

  beginEditMessage(messageId) {
    if (!this.currentChat) return;
    const msg = this.currentChat.messages.find(m => m.id === messageId);
    if (!msg || msg.from !== 'own') return;

    const input = document.getElementById('messageInput');
    if (!input) return;
    this.editingMessageId = messageId;
    input.value = msg.text;
    this.resizeMessageInput(input);
    input.focus();
  }

  hideWelcomeScreen() {
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('chatContainer').classList.add('active');
  }

  showWelcomeScreen() {
    document.getElementById('welcomeScreen').classList.remove('hidden');
    document.getElementById('chatContainer').classList.remove('active');
  }

  // Метод-обгортка для імпортованої функції escapeHtml
  escapeHtml(text) {
    return escapeHtml(text);
  }

  formatMessageText(text) {
    return this.escapeHtml(text || '').replace(/\r?\n/g, '<br>');
  }

  buildMessageBodyHtml(msg) {
    if (msg?.type === 'image' && msg.imageUrl) {
      const safeUrl = this.escapeAttr(msg.imageUrl);
      const caption = (msg.text || '').trim();
      const captionHtml = caption ? `<div class="message-image-caption">${this.formatMessageText(caption)}</div>` : '';
      return `<img class="message-image" src="${safeUrl}" alt="Надіслане фото" loading="lazy" />${captionHtml}`;
    }
    return this.formatMessageText(msg?.text || '');
  }

  initMessageImageTransitions(rootEl) {
    if (!rootEl) return;
    const images = rootEl.querySelectorAll ? rootEl.querySelectorAll('.message-image') : [];
    images.forEach((img) => {
      if (img.dataset.ready === 'true') return;
      const markLoaded = () => {
        img.classList.add('is-loaded');
        img.dataset.ready = 'true';
      };
      if (img.complete && img.naturalWidth > 0) {
        markLoaded();
        return;
      }
      img.addEventListener('load', markLoaded, { once: true });
      img.addEventListener('error', markLoaded, { once: true });
    });
  }

  // Метод-обгортка для імпортованої функції getSettingsTemplate
  getSettingsTemplate(sectionName) {
    return getSettingsTemplate(sectionName);
  }

  setActiveNavButton(btn) {
    if (btn && btn.classList.contains('active')) {
      return;
    }

    document.querySelectorAll('.bottom-nav-item').forEach(item => {
      item.classList.remove('active');
    });
    if (btn) {
      btn.classList.add('active');
    }
    this.updateBottomNavIndicator(btn);
  }

  setupBottomNavReveal() {
    const revealHandle = document.getElementById('navRevealHandle');
    const hideHandle = document.getElementById('navHideHandle');
    if (revealHandle) {
      revealHandle.style.display = 'none';
    }
    if (hideHandle) {
      hideHandle.style.display = 'none';
    }

    this.renderSidebarAvatarsStrip();
  }

  handleBottomNavResize() {
    if (window.innerWidth <= 768) {
      this.restoreBottomNavToHome({ animate: false });
      return;
    }
    if (this.currentChat) {
      this.mountBottomNavInSidebar();
    } else {
      this.restoreBottomNavToHome({ animate: false });
    }
  }

  hideBottomNavForChat() {
    if (window.innerWidth <= 768) return;
    this.mountBottomNavInSidebar();
  }

  showBottomNav() {
    if (window.innerWidth > 768 && this.currentChat) {
      this.mountBottomNavInSidebar();
      return;
    }
    if (window.innerWidth <= 768) {
      this.restoreBottomNavToHome({ animate: false });
      this.bottomNavHidden = false;
      return;
    }
    this.restoreBottomNavToHome({ animate: true });
    this.bottomNavHidden = false;
  }

  ensureBottomNavHomeAnchor() {
    const profileMenu = document.querySelector('.profile-menu-wrapper');
    const appRoot = document.querySelector('.bridge-app') || document.getElementById('app');
    if (!profileMenu || !appRoot) return;

    if (!this.bottomNavHomeAnchor) {
      const anchor = document.createElement('span');
      anchor.className = 'bottom-nav-home-anchor';
      appRoot.appendChild(anchor);
      this.bottomNavHomeAnchor = anchor;
      return;
    }

    if (this.bottomNavHomeAnchor.parentNode !== appRoot) {
      appRoot.appendChild(this.bottomNavHomeAnchor);
    }
  }

  mountBottomNavInSidebar() {
    if (window.innerWidth <= 768) return;
    if (!this.currentChat) return;
    const profileMenu = document.querySelector('.profile-menu-wrapper');
    const navSlot = document.getElementById('sidebarNavSlot');
    const sidebar = document.querySelector('.sidebar');
    if (!profileMenu || !navSlot) return;
    if (profileMenu.parentElement !== navSlot) {
      navSlot.appendChild(profileMenu);
    }
    profileMenu.classList.remove('in-sidebar-top');
    profileMenu.classList.add('in-sidebar-slot');
    profileMenu.setAttribute('data-nav-mode', 'sidebar-vertical');
    profileMenu.style.display = '';
    if (sidebar) sidebar.classList.add('nav-menu-vertical');
    this.bottomNavInSidebarTop = false;
    this.syncBottomNavVisualState();
  }

  renderSidebarAvatarsStrip() {
    const avatarsStrip = document.getElementById('sidebarAvatarsStrip');
    if (!avatarsStrip) return;

    avatarsStrip.innerHTML = '';
    const sorted = this.getSortedChats().slice(0, 40);
    if (sorted.length === 0) {
      avatarsStrip.classList.add('is-empty');
      return;
    }

    avatarsStrip.classList.remove('is-empty');
    sorted.forEach((chat) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `sidebar-avatar-chip${this.currentChat?.id === chat.id ? ' active' : ''}`;
      button.dataset.chatId = String(chat.id);
      button.title = chat.name;

      const initials = chat.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      button.innerHTML = `
        <span class="sidebar-avatar-chip-circle" style="background: ${this.getContactColor(chat.name)}">${initials}</span>
      `;
      button.addEventListener('click', () => this.selectChat(chat.id));
      avatarsStrip.appendChild(button);
    });
  }

  moveBottomNavToSidebarTop({ animate = true } = {}) {
    if (window.innerWidth <= 768) return;
    this.ensureBottomNavHomeAnchor();

    const profileMenu = document.querySelector('.profile-menu-wrapper');
    const navSlot = document.getElementById('sidebarNavSlot');
    if (!profileMenu || !navSlot) return;
    if (profileMenu.parentElement === navSlot && this.bottomNavInSidebarTop) return;

    const startRect = profileMenu.getBoundingClientRect();
    navSlot.appendChild(profileMenu);
    profileMenu.classList.add('in-sidebar-top');
    const endRect = profileMenu.getBoundingClientRect();
    this.bottomNavInSidebarTop = true;

    if (!animate || document.documentElement.classList.contains('no-animations')) return;
    const dx = startRect.left - endRect.left;
    const dy = startRect.top - endRect.top;

    profileMenu.animate(
      [
        { transform: `translate(${dx}px, ${dy}px)`, opacity: 0.92 },
        { transform: 'translate(0, 0)', opacity: 1 }
      ],
      {
        duration: 420,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        fill: 'both'
      }
    );
  }

  restoreBottomNavToHome({ animate = true } = {}) {
    this.ensureBottomNavHomeAnchor();
    const profileMenu = document.querySelector('.profile-menu-wrapper');
    const homeAnchor = this.bottomNavHomeAnchor;
    const sidebar = document.querySelector('.sidebar');
    if (!profileMenu || !homeAnchor || !homeAnchor.parentNode) return;
    if (profileMenu.parentNode === homeAnchor.parentNode && profileMenu.previousElementSibling === homeAnchor) {
      profileMenu.classList.remove('in-sidebar-slot');
      profileMenu.classList.remove('in-sidebar-top');
      profileMenu.removeAttribute('data-nav-mode');
      if (sidebar) sidebar.classList.remove('nav-menu-vertical');
      this.bottomNavInSidebarTop = false;
      this.syncBottomNavVisualState();
      return;
    }

    const startRect = profileMenu.getBoundingClientRect();
    homeAnchor.parentNode.insertBefore(profileMenu, homeAnchor.nextSibling);
    profileMenu.classList.remove('in-sidebar-slot');
    profileMenu.classList.remove('in-sidebar-top');
    profileMenu.removeAttribute('data-nav-mode');
    if (sidebar) sidebar.classList.remove('nav-menu-vertical');
    const endRect = profileMenu.getBoundingClientRect();
    this.bottomNavInSidebarTop = false;
    this.syncBottomNavVisualState();

    if (!animate || document.documentElement.classList.contains('no-animations')) return;
    const dx = startRect.left - endRect.left;
    const dy = startRect.top - endRect.top;
    profileMenu.animate(
      [
        { transform: `translate(${dx}px, ${dy}px)`, opacity: 0.92 },
        { transform: 'translate(0, 0)', opacity: 1 }
      ],
      {
        duration: 360,
        easing: 'cubic-bezier(0.22, 0.82, 0.25, 1)',
        fill: 'both'
      }
    );
  }

  syncBottomNavVisualState() {
    const nav = document.querySelector('.bottom-nav');
    const indicator = nav?.querySelector('.bottom-nav-indicator');
    if (!nav || !indicator) return;
    if (window.getComputedStyle(indicator).display === 'none') return;
    const activeBtn = nav.querySelector('.bottom-nav-item.active');
    if (!activeBtn) return;

    // Re-anchor indicator to the currently active button without "jump from start".
    const navRect = nav.getBoundingClientRect();
    const targetRect = activeBtn.getBoundingClientRect();
    const indicatorWidth = indicator.offsetWidth || Number(indicator.dataset.w || 0) || 56;
    if (indicator.offsetWidth > 0) indicator.dataset.w = String(indicator.offsetWidth);
    const maxX = Math.max(0, navRect.width - indicatorWidth);
    const offsetX = targetRect.left - navRect.left + (targetRect.width - indicatorWidth) / 2;
    const nextX = Math.min(maxX, Math.max(0, offsetX));

    indicator.style.transition = 'none';
    indicator.style.transform = `translateX(${nextX}px)`;
    indicator.dataset.x = String(nextX);

    window.requestAnimationFrame(() => {
      indicator.style.removeProperty('transition');
    });
  }

  updateBottomNavIndicator(activeBtn = null) {
    const nav = document.querySelector('.bottom-nav');
    const indicator = nav?.querySelector('.bottom-nav-indicator');
    const target = activeBtn || nav?.querySelector('.bottom-nav-item.active');
    if (!nav || !indicator || !target) return;
    if (window.getComputedStyle(indicator).display === 'none') return;

    const navRect = nav.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const indicatorWidth = indicator.offsetWidth || Number(indicator.dataset.w || 0) || 56;
    if (indicator.offsetWidth > 0) indicator.dataset.w = String(indicator.offsetWidth);
    const maxX = Math.max(0, navRect.width - indicatorWidth);
    const offsetX = targetRect.left - navRect.left + (targetRect.width - indicatorWidth) / 2;
    const nextX = Math.min(maxX, Math.max(0, offsetX));
    let currentX = Number(indicator.dataset.x ?? nextX);
    const noAnimations = document.documentElement.classList.contains('no-animations');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const computedTransform = window.getComputedStyle(indicator).transform;
    if (computedTransform && computedTransform !== 'none') {
      const matrix = new DOMMatrixReadOnly(computedTransform);
      if (Number.isFinite(matrix.m41)) {
        currentX = matrix.m41;
      }
    }

    if (!Number.isFinite(currentX) || Math.abs(nextX - currentX) < 1) {
      indicator.style.transform = `translateX(${nextX}px)`;
      indicator.dataset.x = String(nextX);
      return;
    }

    const distance = Math.abs(nextX - currentX);
    const duration = Math.min(320, Math.max(140, 120 + distance * 0.9));

    if (noAnimations || reducedMotion) {
      indicator.style.transition = 'none';
      indicator.style.transform = `translateX(${nextX}px)`;
      indicator.dataset.x = String(nextX);
      return;
    }

    // Lock the bubble at the current visual position first, then start a new transition.
    // This prevents animation drop/jump when users switch tabs very quickly.
    indicator.style.transition = 'none';
    indicator.style.transform = `translateX(${currentX}px)`;
    void indicator.offsetWidth;
    indicator.style.transition = `transform ${Math.round(duration)}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    window.requestAnimationFrame(() => {
      indicator.style.transform = `translateX(${nextX}px)`;
    });
    indicator.dataset.x = String(nextX);
  }

  triggerGameEnd(panel, message) {
    if (!panel) return;
    panel.dataset.endMessage = message || 'Гру завершено';
    const canvas = panel.querySelector('.mini-game-canvas');
    if (canvas) canvas.setAttribute('data-end-message', panel.dataset.endMessage);
    panel.classList.add('game-over');
    setTimeout(() => {
      panel.classList.remove('game-over');
    }, 1200);
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
    const catalog = this.getShopCatalog();
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

    const createPreview = (item) => {
      if (item.type === 'frame') {
        return `
          <div class="shop-item-preview-avatar" data-avatar-frame="${item.effect}">
            <span>${this.getInitials(this.user?.name || 'Користувач Orion')}</span>
          </div>
        `;
      }

      if (item.type === 'badge') {
        return `
          <div class="shop-item-preview-badges">
            <span class="shop-item-preview-name">${escapeHtml(this.user?.name || 'Orion')}</span>
            ${this.getProfileBadgeMarkup(item.effect, 'shop-item-preview-badge-chip')}
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
      return false;
    };

    const getFilterSummary = () => {
      const parts = [];
      if (filterState.category === 'frame') parts.push('Аватар');
      if (filterState.category === 'aura') parts.push('Профіль');
      if (filterState.category === 'motion') parts.push('Анімація');
      if (filterState.category === 'badge') parts.push('Значки');
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

    const setFilterPanelOpen = (isOpen) => {
      if (!filterPanelEl || !filterToggleEl) return;
      filterPanelEl.classList.toggle('is-open', isOpen);
      filterToggleEl.classList.toggle('is-open', isOpen);
      filterToggleEl.setAttribute('aria-expanded', String(isOpen));
      if (isOpen && filterPanelScrollEl) {
        filterPanelScrollEl.scrollTop = 0;
      }
    };

    const syncShopFloatingIslands = () => {
      const currentScrollTop = shopContentEl.scrollTop || 0;
      const balanceCardReached = balanceCardEl
        ? currentScrollTop >= Math.max(0, balanceCardEl.offsetTop - 18)
        : false;

      if (shopHeaderEl) {
        shopHeaderEl.classList.toggle('is-hidden', balanceCardReached);
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
          : `Купити за ${this.formatCoinBalance(item.price, 1)}`;
        const stateClass = owned
          ? (equipped ? 'is-equipped' : 'is-owned')
          : (canAfford ? 'can-buy' : 'is-locked');

        return `
          <article class="shop-item-card ${owned ? 'owned' : ''} ${equipped ? 'equipped' : ''}">
            <div class="shop-item-top">
              <span class="shop-item-type">Предмет</span>
              <span class="shop-item-price">${this.formatCoinBalance(item.price, 1)}</span>
            </div>
            <div class="shop-item-preview">
              ${createPreview(item)}
            </div>
            <h3 class="shop-item-title">${item.title}</h3>
            <p class="shop-item-description">${item.description}</p>
            <button
              type="button"
              class="shop-item-action ${stateClass}"
              data-shop-item="${item.id}"
              ${!owned && !canAfford ? 'disabled' : ''}
            >${stateLabel}</button>
          </article>
        `;
      }).join('');
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

    if (filterToggleEl && filterToggleEl.dataset.bound !== 'true') {
      filterToggleEl.dataset.bound = 'true';
      filterToggleEl.addEventListener('click', () => {
        const shouldOpen = !filterPanelEl?.classList.contains('is-open');
        setFilterPanelOpen(shouldOpen);
      });
    }

    if (filterPanelEl && filterPanelEl.dataset.bound !== 'true') {
      filterPanelEl.dataset.bound = 'true';
      filterPanelEl.addEventListener('click', (event) => {
        const filterBtn = event.target.closest('[data-shop-filter-group]');
        if (!filterBtn) return;
        const group = filterBtn.dataset.shopFilterGroup;
        const value = filterBtn.dataset.shopFilterValue;
        if (!group || !value) return;
        filterState[group] = value;
        syncFilterControls();
      });
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
      filterCloseEl.addEventListener('click', () => {
        setFilterPanelOpen(false);
      });
    }

    if (gridEl.dataset.bound === 'true') return;
    gridEl.dataset.bound = 'true';

    gridEl.addEventListener('click', async (event) => {
      const actionBtn = event.target.closest('[data-shop-item]');
      if (!actionBtn) return;

      const item = this.getShopItem(actionBtn.dataset.shopItem);
      if (!item) return;

      if (!inventory.has(item.id)) {
        const balance = this.getTapBalanceCents();
        if (balance < item.price) return;
        this.setTapBalanceCents(balance - item.price);
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
      }

      this.saveUserProfile({
        ...this.user,
        equippedAvatarFrame: this.user.equippedAvatarFrame || '',
        equippedProfileAura: this.user.equippedProfileAura || '',
        equippedProfileMotion: this.user.equippedProfileMotion || '',
        equippedProfileBadge: this.user.equippedProfileBadge || ''
      });
      this.syncProfileCosmetics();
      renderShop();
    });
  }

  initMiniGames(settingsContainer) {
    const balanceEl = settingsContainer.querySelector('#coinTapBalance');
    const tapBtn = settingsContainer.querySelector('#coinTapBtn');
    if (!balanceEl || !tapBtn) return;
    this.setTapBalanceCents(this.getTapBalanceCents());
    if (tapBtn.dataset.bound === 'true') return;
    tapBtn.dataset.bound = 'true';

    let tapAnimationTimer = null;
    tapBtn.addEventListener('click', () => {
      const currentBalance = this.getTapBalanceCents();
      this.setTapBalanceCents(currentBalance + 1);
      balanceEl.textContent = this.formatCoinBalance(this.tapBalanceCents);

      tapBtn.classList.remove('is-tapping');
      void tapBtn.offsetWidth;
      tapBtn.classList.add('is-tapping');

      if (tapAnimationTimer) window.clearTimeout(tapAnimationTimer);
      tapAnimationTimer = window.setTimeout(() => {
        tapBtn.classList.remove('is-tapping');
      }, 180);
    });
  }

  initSnake(settingsContainer) {
    const boardEl = settingsContainer.querySelector('#snakeBoard');
    const startBtn = settingsContainer.querySelector('#snakeStart');
    const scoreEl = settingsContainer.querySelector('#snakeScore');
    const panel = settingsContainer.querySelector('.mini-game-panel[data-game="snake"]');
    if (!boardEl || !startBtn || !scoreEl) return;
    if (boardEl.dataset.bound === 'true') return;
    boardEl.dataset.bound = 'true';

    const size = 12;
    let direction = { x: 1, y: 0 };
    let snake = [{ x: 5, y: 5 }];
    let food = { x: 8, y: 5 };
    let score = 0;
    let timer = null;

    const buildGrid = () => {
      boardEl.innerHTML = '';
      boardEl.style.display = 'grid';
      boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
      boardEl.style.gridTemplateRows = `repeat(${size}, 1fr)`;
      for (let i = 0; i < size * size; i += 1) {
        const cell = document.createElement('div');
        cell.className = 'snake-cell';
        boardEl.appendChild(cell);
      }
    };

    const indexOf = (x, y) => y * size + x;

    const draw = () => {
      const cells = boardEl.querySelectorAll('.snake-cell');
      cells.forEach(cell => {
        cell.classList.remove('snake', 'food');
      });
      snake.forEach(part => {
        const idx = indexOf(part.x, part.y);
        cells[idx]?.classList.add('snake');
      });
      const foodIdx = indexOf(food.x, food.y);
      cells[foodIdx]?.classList.add('food');
      scoreEl.textContent = String(score);
      this.updateMiniGameMax('snake', score);
    };

    const spawnFood = () => {
      let x = Math.floor(Math.random() * size);
      let y = Math.floor(Math.random() * size);
      while (snake.some(p => p.x === x && p.y === y)) {
        x = Math.floor(Math.random() * size);
        y = Math.floor(Math.random() * size);
      }
      food = { x, y };
    };

    const setDirection = (next) => {
      if (direction.x === -next.x && direction.y === -next.y) return;
      direction = next;
    };

    const step = () => {
      const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
      if (head.x < 0 || head.y < 0 || head.x >= size || head.y >= size) {
        clearInterval(timer);
        timer = null;
        this.triggerGameEnd(panel, 'Гру завершено');
        return;
      }
      if (snake.some(p => p.x === head.x && p.y === head.y)) {
        clearInterval(timer);
        timer = null;
        this.triggerGameEnd(panel, 'Гру завершено');
        return;
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score += 1;
        spawnFood();
      } else {
        snake.pop();
      }
      draw();
    };

    const reset = () => {
      direction = { x: 1, y: 0 };
      snake = [{ x: 5, y: 5 }];
      score = 0;
      spawnFood();
      draw();
      panel?.classList.remove('game-over');
    };

    buildGrid();
    reset();

    startBtn.addEventListener('click', () => {
      reset();
      if (timer) clearInterval(timer);
      timer = setInterval(step, 140);
    });

    const onKey = (e) => {
      const key = (e.key || '').toLowerCase();
      if (key === 'arrowup' || key === 'w') setDirection({ x: 0, y: -1 });
      if (key === 'arrowdown' || key === 's') setDirection({ x: 0, y: 1 });
      if (key === 'arrowleft' || key === 'a') setDirection({ x: -1, y: 0 });
      if (key === 'arrowright' || key === 'd') setDirection({ x: 1, y: 0 });
    };

    document.addEventListener('keydown', onKey);

    let touchStartX = 0;
    let touchStartY = 0;

    boardEl.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }, { passive: true });

    boardEl.addEventListener('touchend', (e) => {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        setDirection(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
      } else {
        setDirection(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
      }
    });
  }

  init2048(settingsContainer) {
    const boardEl = settingsContainer.querySelector('#g2048Board');
    const startBtn = settingsContainer.querySelector('#g2048Start');
    const scoreEl = settingsContainer.querySelector('#g2048Score');
    const panel = settingsContainer.querySelector('.mini-game-panel[data-game="g2048"]');
    if (!boardEl || !startBtn || !scoreEl) return;

    const size = 4;
    let score = 0;
    let grid = Array.from({ length: size }, () => Array(size).fill(0));

    const draw = () => {
      boardEl.innerHTML = '';
      grid.flat().forEach(value => {
        const tile = document.createElement('div');
        tile.className = `tile value-${value || 0}`;
        tile.textContent = value ? String(value) : '';
        boardEl.appendChild(tile);
      });
      scoreEl.textContent = String(score);
      this.updateMiniGameMax('g2048', score);
    };

    const addRandom = () => {
      const empty = [];
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          if (grid[y][x] === 0) empty.push({ x, y });
        }
      }
      if (!empty.length) return;
      const spot = empty[Math.floor(Math.random() * empty.length)];
      grid[spot.y][spot.x] = Math.random() < 0.9 ? 2 : 4;
    };

    const slide = (row) => {
      const filtered = row.filter(n => n !== 0);
      for (let i = 0; i < filtered.length - 1; i += 1) {
        if (filtered[i] === filtered[i + 1]) {
          filtered[i] *= 2;
          score += filtered[i];
          filtered[i + 1] = 0;
        }
      }
      const merged = filtered.filter(n => n !== 0);
      while (merged.length < size) merged.push(0);
      return merged;
    };

    const moveLeft = () => {
      const old = JSON.stringify(grid);
      grid = grid.map(row => slide(row));
      if (JSON.stringify(grid) !== old) addRandom();
      draw();
      checkGameOver();
    };

    const moveRight = () => {
      const old = JSON.stringify(grid);
      grid = grid.map(row => slide([...row].reverse()).reverse());
      if (JSON.stringify(grid) !== old) addRandom();
      draw();
      checkGameOver();
    };

    const moveUp = () => {
      const old = JSON.stringify(grid);
      const transposed = grid[0].map((_, i) => grid.map(r => r[i]));
      const moved = transposed.map(row => slide(row));
      grid = moved[0].map((_, i) => moved.map(r => r[i]));
      if (JSON.stringify(grid) !== old) addRandom();
      draw();
      checkGameOver();
    };

    const moveDown = () => {
      const old = JSON.stringify(grid);
      const transposed = grid[0].map((_, i) => grid.map(r => r[i]));
      const moved = transposed.map(row => slide([...row].reverse()).reverse());
      grid = moved[0].map((_, i) => moved.map(r => r[i]));
      if (JSON.stringify(grid) !== old) addRandom();
      draw();
      checkGameOver();
    };

    const reset = () => {
      grid = Array.from({ length: size }, () => Array(size).fill(0));
      score = 0;
      addRandom();
      addRandom();
      draw();
      panel?.classList.remove('game-over');
    };

    const checkGameOver = () => {
      const hasEmpty = grid.some(row => row.some(v => v === 0));
      if (hasEmpty) return;
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const v = grid[y][x];
          if ((grid[y + 1] && grid[y + 1][x] === v) || (grid[y][x + 1] === v)) {
            return;
          }
        }
      }
      this.triggerGameEnd(panel, 'Ходів більше немає');
    };

    if (boardEl.dataset.bound === 'true') return;
    boardEl.dataset.bound = 'true';
    reset();
    startBtn.addEventListener('click', reset);

    const onKey = (e) => {
      const key = e.key.toLowerCase();
      if (key === 'arrowleft' || key === 'a') moveLeft();
      if (key === 'arrowright' || key === 'd') moveRight();
      if (key === 'arrowup' || key === 'w') moveUp();
      if (key === 'arrowdown' || key === 's') moveDown();
    };
    window.addEventListener('keydown', onKey);
  }

  initMemory(settingsContainer) {
    const boardEl = settingsContainer.querySelector('#memoryBoard');
    const startBtn = settingsContainer.querySelector('#memoryStart');
    const scoreEl = settingsContainer.querySelector('#memoryScore');
    const panel = settingsContainer.querySelector('.mini-game-panel[data-game="memory"]');
    if (!boardEl || !startBtn || !scoreEl) return;

    const icons = ['🚀', '🛰️', '🌕', '⭐', '🪐', '☄️', '🌌', '🧠'];
    let deck = [];
    let open = [];
    let matched = 0;

    const draw = () => {
      boardEl.innerHTML = '';
      deck.forEach((card, index) => {
        const cell = document.createElement('button');
        cell.className = 'memory-card' + (card.revealed ? ' revealed' : '');
        cell.textContent = card.revealed ? card.icon : '';
        cell.addEventListener('click', () => flip(index));
        boardEl.appendChild(cell);
      });
      scoreEl.textContent = String(matched);
      this.updateMiniGameMax('memory', matched);
    };

    const reset = () => {
      deck = [...icons, ...icons]
        .map(icon => ({ icon, revealed: false }))
        .sort(() => Math.random() - 0.5);
      open = [];
      matched = 0;
      draw();
      panel?.classList.remove('game-over');
    };

    const flip = (idx) => {
      if (open.length === 2) return;
      if (deck[idx].revealed) return;
      deck[idx].revealed = true;
      open.push(idx);
      draw();
      if (open.length === 2) {
        const [a, b] = open;
        if (deck[a].icon === deck[b].icon) {
          matched += 1;
          open = [];
          draw();
          if (matched === icons.length) {
            this.triggerGameEnd(panel, 'Перемога!');
          }
        } else {
          setTimeout(() => {
            deck[a].revealed = false;
            deck[b].revealed = false;
            open = [];
            draw();
          }, 600);
        }
      }
    };

    if (boardEl.dataset.bound === 'true') return;
    boardEl.dataset.bound = 'true';
    startBtn.addEventListener('click', reset);
    reset();
  }

  getMiniGameMax(game) {
    const raw = localStorage.getItem(`bridge_game_max_${game}`);
    return raw ? parseInt(raw, 10) || 0 : 0;
  }

  updateMiniGameMax(game, value) {
    const current = this.getMiniGameMax(game);
    if (value <= current) return;
    localStorage.setItem(`bridge_game_max_${game}`, String(value));
    if (this.currentMiniGame === game) {
      const scoreLabel = document.getElementById('miniGameScoreLabel');
      if (scoreLabel) scoreLabel.textContent = `Рекорд: ${value}`;
    }
  }



  showSettingsSubsection(subsectionName, settingsContainerId, sourceSection = null) {
    const sectionMap = {
      'notifications': 'notifications-settings',
      'privacy': 'privacy-settings',
      'messages': 'messages-settings',
      'appearance': 'appearance-settings',
      'language': 'language-settings'
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

  // Метод-обгортка для імпортованої функції setupSettingsSwipeBack
  setupSettingsSwipeBack(settingsContainer) {
    setupSettingsSwipeBack(settingsContainer, this);
  }

  async showSettings(sectionName) {
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
    const appEl = document.querySelector('.bridge-app');
    this.currentChat = null;
    this.updateChatHeader();
    if (appEl) {
      appEl.classList.remove('chat-open');
      appEl.classList.remove('chat-active');
    }
    
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
        const profileNameInput = settingsContainer.querySelector('#profileName');
        const profileEmailInput = settingsContainer.querySelector('#profileEmail');
        const profileBioInput = settingsContainer.querySelector('#profileBio');
        const profileDobInput = settingsContainer.querySelector('#profileDob');
        const avatarDiv = settingsContainer.querySelector('.profile-avatar-large');
        
        if (profileNameInput) profileNameInput.value = this.user.name;
        if (profileEmailInput) profileEmailInput.value = this.user.email;
        if (profileBioInput) profileBioInput.value = this.user.bio;
        if (profileDobInput) profileDobInput.value = this.user.birthDate || '';
        
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
            const reader = new FileReader();
            reader.onload = () => {
              this.user.avatarImage = reader.result?.toString() || '';
              this.saveUserProfile(this.user);
              this.renderProfileAvatar(avatarDiv);
            };
            reader.readAsDataURL(file);
          });
        }
        
        const changeAvatarBtn = settingsContainer.querySelector('.btn-change-avatar');
        if (changeAvatarBtn) {
          changeAvatarBtn.addEventListener('click', () => this.handleAvatarChange(settingsContainer));
        }
      }

      if (sectionName === 'profile') {
        this.settingsParentSection = 'profile';
        const profileName = settingsContainer.querySelector('#profileDisplayName');
        const profileBio = settingsContainer.querySelector('#profileDisplayBio');
        const profileEmail = settingsContainer.querySelector('#profileDisplayEmail');
        const profileDob = settingsContainer.querySelector('#profileDisplayDob');
        const avatarDiv = settingsContainer.querySelector('.profile-avatar-large');
        const editBtn = settingsContainer.querySelector('.profile-edit-btn');
        const inlineEditBtn = settingsContainer.querySelector('.profile-edit-inline');
        const menuItems = settingsContainer.querySelectorAll('.settings-menu-item');

        if (profileName) profileName.textContent = this.user.name;
        if (profileBio) profileBio.textContent = this.user.bio || '';
        if (profileEmail) profileEmail.textContent = this.user.email || '';
        if (profileDob) profileDob.textContent = this.formatBirthDate(this.user.birthDate);

        this.renderProfileAvatar(avatarDiv);
        this.applyProfileAura(settingsContainer.querySelector('.profile-hero-card'));
        this.applyProfileMotion(settingsContainer.querySelector('.profile-hero-card'));
        this.applyProfileBadge(settingsContainer.querySelector('#profileNameBadges'));
        this.updateProfileMenuButton();

        const openProfileSettings = () => this.showSettings('profile-settings');
        if (editBtn) editBtn.addEventListener('click', openProfileSettings);
        if (inlineEditBtn) inlineEditBtn.addEventListener('click', openProfileSettings);

        menuItems.forEach(item => {
          item.addEventListener('click', () => {
            const subsection = item.getAttribute('data-section');
            if (subsection) {
              this.showSettingsSubsection(subsection, settingsContainerId, 'profile');
            }
          });
        });
      }

      if (sectionName === 'mini-games') {
        this.initMiniGames(settingsContainer);
      }

      if (sectionName === 'messenger-settings') {
        this.settingsParentSection = 'messenger-settings';
        this.initShop(settingsContainer);
      }
      
      // Завантаження значень для підрозділів
      if (sectionName === 'notifications-settings') {
        const soundNotif = settingsContainer.querySelector('#soundNotifications');
        const desktopNotif = settingsContainer.querySelector('#desktopNotifications');
        const vibrationEnabled = settingsContainer.querySelector('#vibrationEnabled');
        const messagePreview = settingsContainer.querySelector('#messagePreview');
        
        if (soundNotif) soundNotif.checked = this.settings.soundNotifications ?? true;
        if (desktopNotif) desktopNotif.checked = this.settings.desktopNotifications ?? true;
        if (vibrationEnabled) vibrationEnabled.checked = this.settings.vibrationEnabled ?? true;
        if (messagePreview) messagePreview.checked = this.settings.messagePreview ?? true;
      }
      
      if (sectionName === 'privacy-settings') {
        const onlineStatus = settingsContainer.querySelector('#showOnlineStatus');
        const typingIndic = settingsContainer.querySelector('#showTypingIndicator');
        const readReceipts = settingsContainer.querySelector('#readReceipts');
        const lastSeen = settingsContainer.querySelector('#lastSeen');
        
        if (onlineStatus) onlineStatus.checked = this.settings.showOnlineStatus ?? true;
        if (typingIndic) typingIndic.checked = this.settings.showTypingIndicator ?? true;
        if (readReceipts) readReceipts.checked = this.settings.readReceipts ?? true;
        if (lastSeen) lastSeen.checked = this.settings.lastSeen ?? true;
      }
      
      if (sectionName === 'messages-settings') {
        const enterToSend = settingsContainer.querySelector('#enterToSend');
        const autoPlayMedia = settingsContainer.querySelector('#autoPlayMedia');
        const autoSaveMedia = settingsContainer.querySelector('#autoSaveMedia');
        
        if (enterToSend) enterToSend.checked = this.settings.enterToSend ?? true;
        if (autoPlayMedia) autoPlayMedia.checked = this.settings.autoPlayMedia ?? true;
        if (autoSaveMedia) autoSaveMedia.checked = this.settings.autoSaveMedia ?? false;
      }
      
      if (sectionName === 'appearance-settings') {
        const fontSizeSlider = settingsContainer.querySelector('#fontSizeSlider');
        const fontSizeDisplay = settingsContainer.querySelector('#fontSizeDisplay');
        const fontPreview = settingsContainer.querySelector('#fontPreview');
        const animationsEnabled = settingsContainer.querySelector('#animationsEnabled');
        const compactMode = settingsContainer.querySelector('#compactMode');
        
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
          });
        }
        
        if (animationsEnabled) animationsEnabled.checked = this.settings.animationsEnabled ?? true;
        if (compactMode) compactMode.checked = this.settings.compactMode ?? false;
      }
      
      if (sectionName === 'language-settings') {
        const language = settingsContainer.querySelector('#language');
        if (language) language.value = this.settings.language || 'uk';
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
          const chatContainer = document.getElementById('chatContainer');
          const welcomeScreen = document.getElementById('welcomeScreen');
          if (chatContainer) chatContainer.style.display = '';
          if (welcomeScreen) welcomeScreen.classList.remove('hidden');
          // Set nav back to chats
          const navChats = document.getElementById('navChats');
          if (navChats) this.setActiveNavButton(navChats);
        });
      }
      
      // Додаємо свайп для повернення назад в підрозділах
      if (sectionName !== 'messenger-settings' && sectionName !== 'profile' && sectionName !== 'calls' && sectionName !== 'mini-games') {
        this.setupSettingsSwipeBack(settingsContainer);
      }
      
      const themeToggleCheckbox = settingsContainer.querySelector('#themeToggleCheckbox');
      if (themeToggleCheckbox) {
        const isDark = document.documentElement.classList.contains('dark-theme');
        themeToggleCheckbox.checked = isDark;
        
        themeToggleCheckbox.addEventListener('change', () => {
          this.toggleTheme();
          themeToggleCheckbox.checked = document.documentElement.classList.contains('dark-theme');
        });
      }
      
      const closeButtons = settingsContainer.querySelectorAll('.btn-secondary:not(.btn-change-avatar)');
      closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          if (sectionName === 'profile-settings' && btn.closest('.settings-buttons')) {
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
    const email = container?.querySelector('#profileEmail')?.value;
    const bio = container?.querySelector('#profileBio')?.value;
    const birthDate = container?.querySelector('#profileDob')?.value;
    
    if (!name) {
      await this.showAlert('Будь ласка, введіть ім\'я');
      return;
    }
    
    const profileData = {
      ...this.user,
      name: name.trim(),
      email: email?.trim() || '',
      status: this.user.status || 'online',
      bio: bio?.trim() || '',
      birthDate: birthDate?.trim() || '',
      avatarColor: this.user.avatarColor,
      avatarImage: this.user.avatarImage || '',
      equippedAvatarFrame: this.user.equippedAvatarFrame || '',
      equippedProfileAura: this.user.equippedProfileAura || '',
      equippedProfileMotion: this.user.equippedProfileMotion || '',
      equippedProfileBadge: this.user.equippedProfileBadge || ''
    };
    
    this.saveUserProfile(profileData);
    await this.showAlert('Налаштування профілю збережено!');
    
    if (this.currentChat) {
      this.renderChat();
    }
  }

  async saveMessengerSettings() {
    const soundNotifications = document.getElementById('soundNotifications')?.checked ?? true;
    const desktopNotifications = document.getElementById('desktopNotifications')?.checked ?? true;
    const showOnlineStatus = document.getElementById('showOnlineStatus')?.checked ?? true;
    const showTypingIndicator = document.getElementById('showTypingIndicator')?.checked ?? true;
    const vibrationEnabled = document.getElementById('vibrationEnabled')?.checked ?? true;
    const messagePreview = document.getElementById('messagePreview')?.checked ?? true;
    const readReceipts = document.getElementById('readReceipts')?.checked ?? true;
    const lastSeen = document.getElementById('lastSeen')?.checked ?? true;
    const enterToSend = document.getElementById('enterToSend')?.checked ?? true;
    const autoPlayMedia = document.getElementById('autoPlayMedia')?.checked ?? true;
    const autoSaveMedia = document.getElementById('autoSaveMedia')?.checked ?? false;
    const animationsEnabled = document.getElementById('animationsEnabled')?.checked ?? true;
    const compactMode = document.getElementById('compactMode')?.checked ?? false;
    const language = document.getElementById('language')?.value || 'uk';
    
    // Отримуємо розмір шрифту з slider
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    let fontSize = 'medium';
    if (fontSizeSlider) {
      const sliderValue = parseInt(fontSizeSlider.value);
      if (sliderValue <= 14) fontSize = 'small';
      else if (sliderValue <= 16) fontSize = 'medium';
      else fontSize = 'large';
    } else {
      fontSize = document.getElementById('fontSize')?.value || 'medium';
    }
    
    const settings = {
      soundNotifications,
      desktopNotifications,
      showOnlineStatus,
      showTypingIndicator,
      vibrationEnabled,
      messagePreview,
      readReceipts,
      lastSeen,
      enterToSend,
      autoPlayMedia,
      autoSaveMedia,
      animationsEnabled,
      compactMode,
      language,
      fontSize
    };
    
    this.saveSettings(settings);
    
    this.applyFontSize(fontSize);
    this.applySettingsToUI();
    
    await this.showAlert('Налаштування месенджера збережено!');
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

  handleAvatarChange(settingsContainer) {
    const colors = [
      'linear-gradient(135deg, #ff9500, #ff6b6b)',
      'linear-gradient(135deg, #667eea, #764ba2)',
      'linear-gradient(135deg, #f093fb, #f5576c)',
      'linear-gradient(135deg, #4facfe, #00f2fe)',
      'linear-gradient(135deg, #43e97b, #38f9d7)',
      'linear-gradient(135deg, #fa709a, #fee140)',
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

    if (avatarDiv) {
      this.renderProfileAvatar(avatarDiv);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new ChatApp();
});
