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
import { ChatAppInteractionEventComposerMethods } from './interaction-event-composer-methods.js';

export class ChatAppInteractionChatProfileMethods extends ChatAppInteractionEventComposerMethods {
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
    if (typeof this.stopTapAutoMiningRuntime === 'function') {
      this.stopTapAutoMiningRuntime({ markAway: true });
    }
    
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

}
