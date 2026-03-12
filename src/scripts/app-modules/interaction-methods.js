import {
  showAlert,
  showNotice,
  showConfirm,
  setupEmojiPicker,
  insertAtCursor,
  formatMessageDateTime
} from '../ui-helpers.js';

export class ChatAppInteractionMethods {
  enforcePlainChatModalHeader() {
    const header = document.querySelector('#chatContainer .chat-modal-header');
    if (!header) return;

    const styleTargets = [
      header,
      header.querySelector('#chatBackBtn'),
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

  setupEventListeners() {
    document.getElementById('newChatBtn').addEventListener('click', () => this.openNewChatModal());
    document.getElementById('closeModalBtn').addEventListener('click', () => this.closeNewChatModal());
    document.getElementById('cancelBtn').addEventListener('click', () => this.closeNewChatModal());
    document.getElementById('confirmBtn').addEventListener('click', () => this.createNewChat());
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', () => {
        const newChatModal = document.getElementById('newChatModal');
        const groupInfoModal = document.getElementById('groupInfoModal');
        const addToGroupModal = document.getElementById('addToGroupModal');
        if (newChatModal?.classList.contains('active')) this.closeNewChatModal();
        if (groupInfoModal?.classList.contains('active')) this.closeGroupInfoModal();
        if (addToGroupModal?.classList.contains('active')) this.closeAddToGroupModal();
      });
    }
    
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
      const triggerPrimaryAction = (e) => {
        e.preventDefault();
        const now = Date.now();
        if (now - this.lastSendTriggerAt < 220) return;
        this.lastSendTriggerAt = now;
        this.handleSendButtonAction();
      };
      sendBtn.addEventListener('mousedown', keepComposerFocus);
      sendBtn.addEventListener('touchstart', keepComposerFocus, { passive: false });
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
        this.closeContactProfileActionsMenu();
        if (this.isContactProfileSectionActive()) {
          this.closeContactProfileSection();
        }
      }
    });
    this.setupImageViewerEvents();
    this.setupVoiceMessageEvents();

    document.getElementById('searchInput').addEventListener('input', (e) => this.filterChats(e.target.value));

    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (this.isContactProfileSectionActive()) {
          this.closeContactProfileSection();
          return;
        }
        this.closeChat();
      });
    }
    const chatBackBtn = document.getElementById('chatBackBtn');
    if (chatBackBtn) {
      chatBackBtn.addEventListener('click', () => {
        if (this.isContactProfileSectionActive()) {
          this.closeContactProfileSection();
          return;
        }
        this.closeChat();
      });
    }

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
      const buttons = Array.from(document.querySelectorAll('.settings-subsection-back'));
      for (const button of buttons) {
        if (!(button instanceof HTMLElement)) continue;
        const rect = button.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        const style = window.getComputedStyle(button);
        if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') continue;
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          return button;
        }
      }
      return null;
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

  setupEmojiPicker() {
    setupEmojiPicker((input, text) => this.insertAtCursor(input, text));
  }

  insertAtCursor(input, text) {
    insertAtCursor(input, text);
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

    // Keep desktop composer height static to avoid input-area jumps while typing.
    if (!isMobile) {
      input.style.height = `${minHeight}px`;
      input.style.overflowY = 'hidden';
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
    const preservedNavWrapper = chatsList?.querySelector?.(':scope > .profile-menu-wrapper') || null;
    const preservedNavAnchor = (
      this.bottomNavHomeAnchor && this.bottomNavHomeAnchor.parentNode === chatsList
    )
      ? this.bottomNavHomeAnchor
      : (chatsList?.querySelector?.(':scope > .bottom-nav-home-anchor') || null);
    const restoreChatsListNav = () => {
      if (!chatsList) return;
      if (preservedNavAnchor) {
        chatsList.appendChild(preservedNavAnchor);
      }
      if (preservedNavWrapper) {
        chatsList.appendChild(preservedNavWrapper);
      }
    };
    
    // On mobile, show chats list when rendering
    chatsList.classList.remove('hidden-on-settings');
    
    chatsList.innerHTML = '';

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
      restoreChatsListNav();
      this.renderSidebarAvatarsStrip();
      return;
    }

    sortedChats.forEach(chat => {
      const lastMessage = chat.messages[chat.messages.length - 1];
      const previewText = this.getMessagePreviewText(lastMessage);
      const safePreviewText = this.escapeHtml(previewText || 'Немає повідомлень');
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
          <span class="chat-preview">${safePreviewText}</span>
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

    restoreChatsListNav();
    this.renderSidebarAvatarsStrip();
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
    this.closeContactProfileSection();
    if (typeof this.stopVoiceRecording === 'function') {
      this.stopVoiceRecording({ discard: true, silent: true });
    }
    if (typeof this.stopActiveVoicePlayback === 'function') {
      this.stopActiveVoicePlayback();
    }
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
    this.enforcePlainChatModalHeader();
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
    this.closeContactProfileSection();
    if (typeof this.stopVoiceRecording === 'function') {
      this.stopVoiceRecording({ discard: true, silent: true });
    }
    if (typeof this.stopActiveVoicePlayback === 'function') {
      this.stopActiveVoicePlayback();
    }
    const chatContainer = document.getElementById('chatContainer');
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
    if (typeof this.stopActiveVoicePlayback === 'function') {
      this.stopActiveVoicePlayback(true);
    }
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
      messageEl.dataset.type = msg.type || 'text';
      messageEl.dataset.text = this.getMessageContextText(msg);
      messageEl.dataset.date = msg.date || '';
      messageEl.dataset.time = msg.time || '';
      messageEl.dataset.editable = String(this.isTextMessageEditable(msg));
      
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
      const voiceClass = msg.type === 'voice' && msg.audioUrl ? ' has-voice' : '';
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
          <div class="message-content${editedClass}${imageClass}${voiceClass}">
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
    this.initVoiceMessageElements(messagesContainer);

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

  openContactProfileSection() {
    if (!this.currentChat || this.currentChat.isGroup) {
      this.showAlert('Картка контакту доступна лише для особистого чату');
      return;
    }

    const section = document.getElementById('contactProfileView');
    const chatContainer = document.getElementById('chatContainer');
    const heroCard = document.getElementById('contactProfileHeroCard');
    const avatar = document.getElementById('contactProfileAvatar');
    const avatarImage = document.getElementById('contactProfileAvatarImage');
    const initials = document.getElementById('contactProfileInitials');
    const name = document.getElementById('contactProfileName');
    const handle = document.getElementById('contactProfileHandle');
    const bio = document.getElementById('contactProfileBio');
    const dob = document.getElementById('contactProfileDob');
    const status = document.getElementById('contactProfileStatus');

    if (!section || !chatContainer || !avatar || !name || !handle || !bio || !dob || !status || !initials) return;

    const chatName = this.currentChat.name || 'Контакт';
    const chatStatus = this.currentChat.status || 'online';
    const isOnline = chatStatus !== 'offline';
    const chatDob = this.currentChat.dob || this.currentChat.birthDate || this.currentChat.dateOfBirth || '';

    name.textContent = chatName;
    handle.textContent = this.currentChat.handle || this.buildContactHandle(chatName);
    bio.textContent = this.currentChat.bio || 'Опис профілю відсутній.';
    dob.textContent = this.formatContactBirthDate(chatDob);
    status.textContent = isOnline ? 'Онлайн' : 'Не в мережі';

    avatar.style.background = this.currentChat.avatarColor || this.getContactColor(chatName);
    const customAvatarSrc = typeof this.currentChat.avatarImage === 'string'
      ? this.currentChat.avatarImage.trim()
      : '';
    const hasCustomAvatar = customAvatarSrc.length > 0;
    if (avatarImage) {
      avatarImage.onerror = () => {
        avatarImage.hidden = true;
        avatarImage.removeAttribute('src');
        initials.hidden = false;
      };
      avatarImage.onload = () => {
        initials.hidden = false;
        if (hasCustomAvatar) {
          initials.hidden = true;
        }
      };
      if (hasCustomAvatar) {
        avatarImage.src = customAvatarSrc;
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
    chatContainer.classList.add('profile-view-active');
    section.setAttribute('aria-hidden', 'false');
    this.contactProfileMediaFilter = '';
    this.renderContactProfileMedia();
    requestAnimationFrame(() => this.syncContactProfileMediaFiltersOffset());
    this.closeContactProfileActionsMenu();
  }

  closeContactProfileSection() {
    const section = document.getElementById('contactProfileView');
    const chatContainer = document.getElementById('chatContainer');
    if (section) section.setAttribute('aria-hidden', 'true');
    if (chatContainer) {
      chatContainer.classList.remove('profile-view-active');
      chatContainer.classList.remove('profile-view-peek');
    }
    this.closeContactProfileActionsMenu();
  }

  toggleContactProfileActionsMenu(forceOpen = null) {
    const menu = document.getElementById('contactProfileMenu');
    const button = document.getElementById('contactProfileMoreBtn');
    if (!menu || !button) return;
    const shouldOpen = forceOpen == null ? !menu.classList.contains('active') : Boolean(forceOpen);
    menu.classList.toggle('active', shouldOpen);
    menu.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
    button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
  }

  closeContactProfileActionsMenu() {
    this.toggleContactProfileActionsMenu(false);
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
    if (this.isContactProfileSectionActive()) {
      this.renderContactProfileMedia();
    }
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
        this.enforcePlainChatModalHeader();
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

}
