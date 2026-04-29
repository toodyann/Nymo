import { setupSettingsSwipeBack } from '../../../shared/gestures/swipe-handlers.js';
import { buildApiUrl } from '../../../shared/api/api-url.js';
import {
  getAuthSession,
  setAuthSession,
  syncLegacyUserProfile
} from '../../../shared/auth/auth-session.js';
import { ChatAppFeaturesProfileWalletMethods } from './features-profile-wallet-methods.js';

export class ChatAppFeaturesSettingsAvatarMethods extends ChatAppFeaturesProfileWalletMethods {
  setupSettingsSwipeBack(settingsContainer) {
    setupSettingsSwipeBack(settingsContainer, this);
  }


  async showSettings(sectionName) {
    this.disposeShopGarageViewer();
    if (sectionName !== 'mini-games') {
      this.stopTapAutoMiningRuntime({ markAway: true });
    } else {
      this.stopTapAutoMiningRuntime({ markAway: false });
    }

    const appRootEl = document.querySelector('.orion-app');
    if (appRootEl && sectionName !== 'mini-games') {
      appRootEl.classList.remove('mobile-game-fullscreen');
    }

    // На мобільному всі налаштування відкриваємо через профіль
    const isMobile = window.innerWidth <= 768;
    if (isMobile && sectionName === 'settings-home') {
      sectionName = 'profile';
    }

    // На мобільному використовуємо settingsContainerMobile, на ПК - settingsContainer
    if (isMobile) {
      this.showBottomNav();
    } else {
      this.restoreBottomNavToHome({ animate: false });
    }
    const settingsContainerId = isMobile ? 'settingsContainerMobile' : 'settingsContainer';
    const settingsContainer = document.getElementById(settingsContainerId);

    const forceHideGlobalOverlay = (overlayEl, { ariaHidden = true } = {}) => {
      if (!(overlayEl instanceof HTMLElement)) return;
      overlayEl.classList.remove('active', 'is-open');
      if (ariaHidden) overlayEl.setAttribute('aria-hidden', 'true');
    };

    const forceHideWalletTransferModal = (modalEl) => {
      if (!(modalEl instanceof HTMLElement)) return;
      const closeTimerId = Number(modalEl.dataset.closeTimerId || 0);
      const openRafId = Number(modalEl.dataset.openRafId || 0);
      if (closeTimerId > 0) window.clearTimeout(closeTimerId);
      if (openRafId > 0) window.cancelAnimationFrame(openRafId);
      modalEl.dataset.closeTimerId = '';
      modalEl.dataset.openRafId = '';
      modalEl.classList.remove('is-open');
      modalEl.hidden = true;
      modalEl.setAttribute('aria-hidden', 'true');
    };

    // Safety cleanup: ensure no stale transparent overlays block interactions.
    forceHideGlobalOverlay(document.getElementById('modalOverlay'), { ariaHidden: false });
    forceHideGlobalOverlay(document.getElementById('alertOverlay'));
    forceHideGlobalOverlay(document.getElementById('attachSheetOverlay'));
    forceHideGlobalOverlay(document.getElementById('cameraCaptureOverlay'));
    forceHideGlobalOverlay(document.getElementById('imageViewerOverlay'));
    document.querySelectorAll('#walletTransferModal, #walletReceiveModal').forEach(forceHideWalletTransferModal);
    document.body.classList.remove('image-viewer-open', 'tap-auto-menu-open');
    
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
        if (typeof this.syncDesktopSecondaryMenuBackButtonIcon === 'function') {
          this.syncDesktopSecondaryMenuBackButtonIcon();
        }
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
        const profileQrBtn = settingsContainer.querySelector('#profileQrBtn');
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
        if (profileQrBtn) {
          profileQrBtn.addEventListener('click', () => {
            this.openProfileQrModal();
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

      if (sectionName === 'mini-games') {
        this.settingsParentSection = 'mini-games';
        await this.initMiniGames(settingsContainer);
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
        await this.initShop(settingsContainer);
      }

      if (sectionName === 'orion-drive-garage') {
        this.settingsParentSection = 'messenger-settings';
        await this.initOrionDriveGarage(settingsContainer);
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
    const languageChanged = (settings.language || 'uk') !== (previousSettings.language || 'uk');

    if ((settings.theme || 'system') !== (previousSettings.theme || 'system')) {
      this.loadTheme();
    }

    if ((settings.hideBlockedChats ?? true) !== (previousSettings.hideBlockedChats ?? true)) {
      this.renderChatsList();
    }

    if (languageChanged) {
      window.location.reload();
      return;
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
