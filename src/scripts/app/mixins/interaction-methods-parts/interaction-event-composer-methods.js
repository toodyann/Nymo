import {
  showAlert,
  showNotice,
  showConfirm,
  showConfirmWithOption,
  setupEmojiPicker,
  insertAtCursor,
  formatMessageDateTime
} from '../../../shared/helpers/ui-helpers.js';
import { clearAuthSession, redirectToAuthPage } from '../../../shared/auth/auth-session.js';
import QRCode from 'qrcode';
import {
  getDesktopSecondaryMenuConfigByNav,
  getDesktopSecondaryMenuIconSvg
} from '../interaction-parts/index.js';
import { ChatAppInteractionNavigationMethods } from './interaction-navigation-methods.js';

export class ChatAppInteractionEventComposerMethods extends ChatAppInteractionNavigationMethods {
  setupEventListeners() {
    if (this.eventListenersBound) return;
    this.eventListenersBound = true;
    this.syncDesktopSecondaryMenuBackButtonIcon();

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
        this.syncDesktopSecondaryMenuBackButtonIcon();
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
        if (window.innerWidth <= 768) {
          if (navProfile?.classList.contains('active') && this.currentChat === null && isSettingsScreenActive()) return;
          if (navProfile) {
            this.setActiveNavButton(navProfile);
          } else {
            this.setActiveNavButton(navSettings);
          }
          this.showSettings('profile');
          return;
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

  showAlert(message, title = 'Помилка', options = {}) {
    return showAlert(message, title, options);
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

}
