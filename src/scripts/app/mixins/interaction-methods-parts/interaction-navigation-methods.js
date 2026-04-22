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

export class ChatAppInteractionNavigationMethods {
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


  getDesktopSecondaryMenuConfig(targetNavId) {
    return getDesktopSecondaryMenuConfigByNav(targetNavId, this.settings?.language || 'uk');
  }


  getDesktopSecondaryMenuItemIcon(iconName = 'gear') {
    return getDesktopSecondaryMenuIconSvg(iconName);
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
      const emptySearchMessage = this.desktopSecondaryUserSearchError
        || `${this.translateUiText('Немає користувачів за запитом')} "${query}".`;
      emptyEl.textContent = this.desktopSecondaryUserSearchLoading
        ? this.translateUiText('Шукаємо користувачів...')
        : emptySearchMessage;
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
    input.placeholder = this.translateUiText('Пошук або новий чат');
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
    if (typeof this.stopTapAutoMiningRuntime === 'function') {
      this.stopTapAutoMiningRuntime({ markAway: true });
    }

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
    this.pendingWalletView = item.section === 'wallet'
      ? (item.walletView || 'ledger')
      : null;
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
      searchInput.placeholder = this.translateUiText('Пошук або новий чат');
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
      searchInput.placeholder = this.translateUiText('Пошук чатів...');
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

}
