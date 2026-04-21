import { getSettingsTemplate } from '../../../ui/templates/settings-templates.js';
import { escapeHtml } from '../../../shared/helpers/ui-helpers.js';
import { buildApiUrl } from '../../../shared/api/api-url.js';
import { getAuthSession } from '../../../shared/auth/auth-session.js';
import {
  SELF_DELETED_CHATS_STORAGE_KEY,
  SELF_DELETED_MESSAGES_STORAGE_KEY
} from '../messaging-parts/index.js';
import { ChatAppMessagingUserMetaMethods } from './messaging-user-meta-methods.js';

export class ChatAppMessagingGroupCreateMethods extends ChatAppMessagingUserMetaMethods {
  renderNewChatGroupSelectedUsers() {
    const selectedWrap = document.getElementById('newChatGroupSelectedUsers');
    const countEl = document.getElementById('newChatGroupCount');
    const membersInput = document.getElementById('groupMembersInput');
    const selectedUsers = Array.isArray(this.newChatGroupSelectedUsers)
      ? this.newChatGroupSelectedUsers
      : [];

    if (countEl) {
      countEl.textContent = String(selectedUsers.length);
    }

    if (membersInput) {
      membersInput.value = selectedUsers.map((user) => String(user?.name || '').trim()).filter(Boolean).join(', ');
    }

    if (!selectedWrap) return;
    if (!selectedUsers.length) {
      selectedWrap.innerHTML = '<span class="new-chat-group-selected-empty">Ще нікого не вибрано.</span>';
      return;
    }

    selectedWrap.innerHTML = selectedUsers.map((user) => {
      const avatarHtml = this.getChatAvatarHtml({
        name: user?.name || 'Користувач',
        avatarImage: user?.avatarImage || '',
        avatarColor: user?.avatarColor || ''
      }, 'new-chat-group-chip-avatar');
      return `
        <button type="button" class="new-chat-group-chip" data-group-user-id="${this.escapeHtml(String(user?.id || ''))}">
          ${avatarHtml}
          <span class="new-chat-group-chip-name">${this.escapeHtml(user?.name || 'Користувач')}</span>
          <span class="new-chat-group-chip-remove" aria-hidden="true">×</span>
        </button>
      `;
    }).join('');

    selectedWrap.querySelectorAll('.new-chat-group-chip').forEach((button) => {
      button.addEventListener('click', () => {
        const userId = String(button.getAttribute('data-group-user-id') || '').trim();
        if (!userId) return;
        this.toggleNewChatGroupUser(userId);
      });
    });
  }


  renderNewChatGroupUserList(users = []) {
    const listEl = document.getElementById('newChatGroupUsersList');
    if (!listEl) return;

    const sourceUsers = Array.isArray(users) ? users : [];
    if (!sourceUsers.length) {
      listEl.innerHTML = '<div class="new-chat-group-users-empty">Ще немає контактів для створення групи.</div>';
      return;
    }

    const selectedIds = new Set(
      (Array.isArray(this.newChatGroupSelectedUsers) ? this.newChatGroupSelectedUsers : [])
        .map((user) => String(user?.id || '').trim())
        .filter(Boolean)
    );

    listEl.innerHTML = sourceUsers.map((user) => {
      const safeId = String(user?.id || '').trim();
      const isActive = selectedIds.has(safeId);
      const avatarHtml = this.getChatAvatarHtml({
        name: user?.name || 'Користувач',
        avatarImage: user?.avatarImage || '',
        avatarColor: user?.avatarColor || ''
      }, 'new-chat-user-result-avatar');
      const secondary = [
        user?.tag ? `@${user.tag}` : '',
        user?.mobile || user?.email || ''
      ].filter(Boolean).join(' · ');

      return `
        <button type="button" class="new-chat-user-result new-chat-group-user${isActive ? ' active' : ''}" data-group-user-id="${this.escapeHtml(safeId)}">
          ${avatarHtml}
          <span class="new-chat-user-result-copy">
            <span class="new-chat-user-result-main">${this.escapeHtml(user?.name || 'Користувач')}</span>
            <span class="new-chat-user-result-secondary">${this.escapeHtml(secondary || 'Додати до групи')}</span>
          </span>
          <span class="new-chat-group-user-indicator" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256"><path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"></path></svg>
          </span>
        </button>
      `;
    }).join('');

    listEl.querySelectorAll('[data-group-user-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const userId = String(button.getAttribute('data-group-user-id') || '').trim();
        if (!userId) return;
        this.toggleNewChatGroupUser(userId);
      });
    });
  }


  toggleNewChatGroupUser(userId) {
    const safeId = String(userId || '').trim();
    if (!safeId) return;

    const candidates = Array.isArray(this.newChatGroupCandidateUsers)
      ? this.newChatGroupCandidateUsers
      : [];
    const targetUser = candidates.find((user) => String(user?.id || '').trim() === safeId);
    if (!targetUser) return;

    const selectedUsers = Array.isArray(this.newChatGroupSelectedUsers)
      ? [...this.newChatGroupSelectedUsers]
      : [];
    const existingIndex = selectedUsers.findIndex((user) => String(user?.id || '').trim() === safeId);

    if (existingIndex >= 0) {
      selectedUsers.splice(existingIndex, 1);
    } else {
      selectedUsers.push(targetUser);
    }

    this.newChatGroupSelectedUsers = selectedUsers;
    this.renderNewChatGroupSelectedUsers();
    this.renderNewChatGroupUserList(candidates);
  }


  async ensureNewChatGroupCandidatesLoaded() {
    const listEl = document.getElementById('newChatGroupUsersList');
    if (listEl) {
      listEl.innerHTML = '<div class="new-chat-group-users-empty">Завантажуємо користувачів...</div>';
    }

    const users = typeof this.fetchAllRegisteredUsers === 'function'
      ? await this.fetchAllRegisteredUsers()
      : [];
    this.newChatGroupCandidateUsers = Array.isArray(users) ? users : [];
    this.renderNewChatGroupUserList(this.newChatGroupCandidateUsers);
  }


  resetChatAreaGroupCreateState() {
    this.chatAreaGroupCreateStep = 'members';
    this.chatAreaGroupSelectedUsers = [];
    this.chatAreaGroupCandidateUsers = [];
    this.chatAreaGroupAvatarImage = '';
  }


  renderChatAreaGroupAvatarPreview() {
    const preview = document.getElementById('groupCreateAvatarPreview');
    if (!(preview instanceof HTMLElement)) return;

    const nameInput = document.getElementById('groupCreateNameInput');
    const draftName = String(nameInput?.value || 'Нова група').trim() || 'Нова група';
    const avatarImage = this.getAvatarImage(this.chatAreaGroupAvatarImage || '');
    const avatarColor = this.getContactColor(draftName);
    const initials = this.getInitials(draftName);

    preview.classList.toggle('is-image', Boolean(avatarImage));
    if (avatarImage) {
      preview.textContent = '';
      preview.style.backgroundImage = `url("${this.escapeAttr(avatarImage)}")`;
      preview.style.backgroundColor = 'transparent';
      return;
    }

    preview.textContent = initials;
    preview.style.backgroundImage = '';
    preview.style.backgroundColor = '';
    preview.style.background = avatarColor;
  }


  async handleChatAreaGroupAvatarChange(event) {
    const input = event?.target;
    const file = input?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      await this.showAlert('Оберіть файл зображення.');
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
          reader.onerror = () => reject(new Error('Не вдалося прочитати зображення.'));
          reader.readAsDataURL(file);
        });
      }
      if (!dataUrl) {
        throw new Error('Не вдалося обробити зображення.');
      }
      this.chatAreaGroupAvatarImage = dataUrl;
      this.renderChatAreaGroupAvatarPreview();
    } catch (error) {
      await this.showAlert(error?.message || 'Не вдалося обробити аватар групи.');
    } finally {
      input.value = '';
    }
  }


  resetChatAreaGroupAvatar() {
    this.chatAreaGroupAvatarImage = '';
    this.renderChatAreaGroupAvatarPreview();
  }


  renderChatAreaGroupSelectedUsers() {
    const selectedUsers = Array.isArray(this.chatAreaGroupSelectedUsers)
      ? this.chatAreaGroupSelectedUsers
      : [];
    const selectedHtml = selectedUsers.map((user) => {
      const avatarHtml = this.getChatAvatarHtml({
        name: user?.name || 'Користувач',
        avatarImage: user?.avatarImage || '',
        avatarColor: user?.avatarColor || ''
      }, 'new-chat-group-chip-avatar');
      return `
        <button type="button" class="new-chat-group-chip" data-chat-area-group-user-id="${this.escapeHtml(String(user?.id || ''))}">
          ${avatarHtml}
          <span class="new-chat-group-chip-name">${this.escapeHtml(user?.name || 'Користувач')}</span>
          <span class="new-chat-group-chip-remove" aria-hidden="true">×</span>
        </button>
      `;
    }).join('');

    document.querySelectorAll('[data-group-create-selected-count]').forEach((countEl) => {
      countEl.textContent = String(selectedUsers.length);
    });

    document.querySelectorAll('[data-group-create-selected-slot]').forEach((slot) => {
      if (!(slot instanceof HTMLElement)) return;
      const emptyMessage = String(slot.dataset.emptyMessage || 'Ще нікого не вибрано.').trim() || 'Ще нікого не вибрано.';
      slot.innerHTML = selectedUsers.length
        ? selectedHtml
        : `<span class="new-chat-group-selected-empty">${this.escapeHtml(emptyMessage)}</span>`;

      slot.querySelectorAll('[data-chat-area-group-user-id]').forEach((button) => {
        button.addEventListener('click', () => {
          const userId = String(button.getAttribute('data-chat-area-group-user-id') || '').trim();
          if (!userId) return;
          this.toggleChatAreaGroupUser(userId);
        });
      });
    });

    const nextBtn = document.getElementById('groupCreateNextBtn');
    if (nextBtn instanceof HTMLButtonElement) {
      nextBtn.disabled = selectedUsers.length === 0;
    }
  }


  renderChatAreaGroupUserList(users = []) {
    const listEl = document.getElementById('groupCreateUsersList');
    if (!listEl) return;

    const sourceUsers = Array.isArray(users) ? users : [];
    if (!sourceUsers.length) {
      listEl.innerHTML = '<div class="new-chat-group-users-empty">Ще немає контактів для створення групи.</div>';
      return;
    }

    const selectedIds = new Set(
      (Array.isArray(this.chatAreaGroupSelectedUsers) ? this.chatAreaGroupSelectedUsers : [])
        .map((user) => String(user?.id || '').trim())
        .filter(Boolean)
    );

    listEl.innerHTML = sourceUsers.map((user) => {
      const safeId = String(user?.id || '').trim();
      const isActive = selectedIds.has(safeId);
      const avatarHtml = this.getChatAvatarHtml({
        name: user?.name || 'Користувач',
        avatarImage: user?.avatarImage || '',
        avatarColor: user?.avatarColor || ''
      }, 'chat-avatar');
      const secondary = [
        user?.tag ? `@${user.tag}` : '',
        user?.mobile || user?.email || ''
      ].filter(Boolean).join(' · ');

      return `
        <button type="button" class="settings-item group-create-contact-row new-chat-group-user${isActive ? ' active' : ''}" data-chat-area-group-user-id="${this.escapeHtml(safeId)}">
          ${avatarHtml}
          <span class="chat-info">
            <span class="chat-name">${this.escapeHtml(user?.name || 'Користувач')}</span>
            <span class="chat-preview">${this.escapeHtml(secondary || 'Додати до групи')}</span>
          </span>
          <span class="new-chat-group-user-indicator" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256"><path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"></path></svg>
          </span>
        </button>
      `;
    }).join('');

    listEl.querySelectorAll('[data-chat-area-group-user-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const userId = String(button.getAttribute('data-chat-area-group-user-id') || '').trim();
        if (!userId) return;
        this.toggleChatAreaGroupUser(userId);
      });
    });
  }


  toggleChatAreaGroupUser(userId) {
    const safeId = String(userId || '').trim();
    if (!safeId) return;

    const candidates = Array.isArray(this.chatAreaGroupCandidateUsers)
      ? this.chatAreaGroupCandidateUsers
      : [];
    const targetUser = candidates.find((user) => String(user?.id || '').trim() === safeId);
    if (!targetUser) return;

    const selectedUsers = Array.isArray(this.chatAreaGroupSelectedUsers)
      ? [...this.chatAreaGroupSelectedUsers]
      : [];
    const existingIndex = selectedUsers.findIndex((user) => String(user?.id || '').trim() === safeId);

    if (existingIndex >= 0) {
      selectedUsers.splice(existingIndex, 1);
    } else {
      selectedUsers.push(targetUser);
    }

    this.chatAreaGroupSelectedUsers = selectedUsers;
    this.renderChatAreaGroupSelectedUsers();
    this.renderChatAreaGroupUserList(candidates);
  }


  async ensureChatAreaGroupCandidatesLoaded() {
    const listEl = document.getElementById('groupCreateUsersList');
    if (listEl) {
      listEl.innerHTML = '<div class="new-chat-group-users-empty">Завантажуємо користувачів...</div>';
    }

    const users = typeof this.collectKnownUsersForSearch === 'function'
      ? this.collectKnownUsersForSearch()
      : [];
    this.chatAreaGroupCandidateUsers = Array.isArray(users) ? users : [];
    this.renderChatAreaGroupUserList(this.chatAreaGroupCandidateUsers);
  }


  closeChatAreaGroupCreate() {
    const returnChatId = String(this.pendingGroupCreateReturnChatId || '').trim();
    this.pendingGroupCreateReturnChatId = null;
    this.resetChatAreaGroupCreateState();
    if (returnChatId) {
      this.selectChat(returnChatId);
      return;
    }
    if (typeof this.openChatsHomeView === 'function') {
      this.openChatsHomeView({ syncNav: false });
      return;
    }
    if (typeof this.showWelcomeScreen === 'function') {
      this.showWelcomeScreen();
    }
  }


  initChatAreaGroupCreate(settingsContainer) {
    if (!(settingsContainer instanceof HTMLElement)) return;

    this.resetChatAreaGroupCreateState();
    this.setChatAreaGroupCreateStep('members');
    this.renderChatAreaGroupSelectedUsers();
    this.renderChatAreaGroupUserList([]);

    const nameInput = settingsContainer.querySelector('#groupCreateNameInput');
    const avatarInput = settingsContainer.querySelector('#groupCreateAvatarInput');
    const avatarBtn = settingsContainer.querySelector('#groupCreateAvatarBtn');
    const avatarResetBtn = settingsContainer.querySelector('#groupCreateAvatarResetBtn');
    const submitBtn = settingsContainer.querySelector('#groupCreateSubmitBtn');
    const membersBackBtn = settingsContainer.querySelector('#groupCreateMembersBackBtn');
    const nextBtn = settingsContainer.querySelector('#groupCreateNextBtn');
    const detailsBackBtn = settingsContainer.querySelector('#groupCreateDetailsBackBtn');

    if (membersBackBtn instanceof HTMLButtonElement) {
      membersBackBtn.addEventListener('click', () => this.closeChatAreaGroupCreate());
    }

    if (nextBtn instanceof HTMLButtonElement) {
      nextBtn.addEventListener('click', async () => {
        if (!Array.isArray(this.chatAreaGroupSelectedUsers) || !this.chatAreaGroupSelectedUsers.length) {
          await this.showAlert('Оберіть хоча б одного користувача для групи.');
          return;
        }
        this.setChatAreaGroupCreateStep('details');
      });
    }

    if (detailsBackBtn instanceof HTMLButtonElement) {
      detailsBackBtn.addEventListener('click', () => {
        this.setChatAreaGroupCreateStep('members');
      });
    }

    if (submitBtn instanceof HTMLButtonElement) {
      submitBtn.addEventListener('click', () => {
        this.createChatAreaGroupChat();
      });
    }

    if (avatarBtn instanceof HTMLButtonElement && avatarInput instanceof HTMLInputElement) {
      avatarBtn.addEventListener('click', () => avatarInput.click());
    }

    if (avatarInput instanceof HTMLInputElement) {
      avatarInput.addEventListener('change', (event) => {
        this.handleChatAreaGroupAvatarChange(event);
      });
    }

    if (avatarResetBtn instanceof HTMLButtonElement) {
      avatarResetBtn.addEventListener('click', () => this.resetChatAreaGroupAvatar());
    }

    if (nameInput instanceof HTMLInputElement) {
      nameInput.addEventListener('input', () => this.renderChatAreaGroupAvatarPreview());
      nameInput.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        this.createChatAreaGroupChat();
      });
    }

    this.ensureChatAreaGroupCandidatesLoaded().catch(() => {
      this.renderChatAreaGroupUserList([]);
    });
    this.renderChatAreaGroupAvatarPreview();
  }


  setChatAreaGroupCreateStep(step = 'members') {
    const safeStep = step === 'details' ? 'details' : 'members';
    this.chatAreaGroupCreateStep = safeStep;

    document.querySelectorAll('[data-group-create-step]').forEach((section) => {
      if (!(section instanceof HTMLElement)) return;
      section.classList.toggle('active', section.dataset.groupCreateStep === safeStep);
    });

    if (safeStep === 'details') {
      const nameInput = document.getElementById('groupCreateNameInput');
      if (nameInput instanceof HTMLInputElement) {
        window.requestAnimationFrame(() => {
          nameInput.focus({ preventScroll: true });
        });
      }
    }
  }


  async createChatAreaGroupChat() {
    const input = document.getElementById('groupCreateNameInput');
    const submitBtn = document.getElementById('groupCreateSubmitBtn');
    const rawName = input?.value || '';
    const name = rawName.trim();
    const selectedUsers = Array.isArray(this.chatAreaGroupSelectedUsers)
      ? this.chatAreaGroupSelectedUsers
      : [];

    if (!name) {
      await this.showAlert('Будь ласка, введіть назву групи.');
      if (input && typeof input.focus === 'function') {
        input.focus();
      }
      return;
    }

    if (!selectedUsers.length) {
      await this.showAlert('Додайте хоча б одного учасника групи.');
      return;
    }

    const selfId = this.getAuthUserId();
    const selfSession = getAuthSession();
    const selfUser = selfSession?.user && typeof selfSession.user === 'object'
      ? selfSession.user
      : {};
    const members = selectedUsers
      .map((user) => String(user?.name || '').trim())
      .filter(Boolean);
    const groupParticipants = selectedUsers.map((user) => ({
      id: String(user?.id || '').trim(),
      name: String(user?.name || '').trim() || 'Користувач',
      avatarImage: this.getAvatarImage(user?.avatarImage || ''),
      avatarColor: String(user?.avatarColor || this.getContactColor(user?.name || 'Користувач')).trim(),
      status: this.getPresenceStatusForUser(String(user?.id || '').trim(), 'offline')
    }));
    if (selfId && !groupParticipants.some((user) => String(user?.id || '').trim() === selfId)) {
      const selfName = this.getUserDisplayName(selfUser) || this.getCurrentUserDisplayName() || 'Користувач';
      const selfAvatarImage = this.getUserAvatarImage(selfUser) || this.getCachedUserAvatar(selfId);
      const selfAvatarColor = String(
        this.getUserAvatarColor(selfUser)
        || this.getCachedUserMeta(selfId)?.avatarColor
        || this.getContactColor(selfName)
      ).trim();
      groupParticipants.unshift({
        id: selfId,
        name: selfName,
        avatarImage: this.getAvatarImage(selfAvatarImage),
        avatarColor: selfAvatarColor,
        status: this.getPresenceStatusForUser(selfId, 'online')
      });
    }

    if (submitBtn instanceof HTMLButtonElement) {
      submitBtn.disabled = true;
    }

    let newChat;
    try {
      const draftAvatarImage = this.getAvatarImage(this.chatAreaGroupAvatarImage || '');
      const safeAvatarImage = await this.resolveGroupAvatarImageForServer(draftAvatarImage, {
        fileName: `group-${Date.now()}.jpg`
      });
      if (draftAvatarImage && !safeAvatarImage) {
        throw new Error('Не вдалося завантажити аватар групи. Спробуйте інше зображення.');
      }
      const safeAvatarColor = this.getContactColor(name);
      const payload = {
        name,
        isPrivate: false,
        isGroup: true,
        ...this.buildChatAppearancePayload({
          name,
          avatarImage: safeAvatarImage,
          avatarColor: safeAvatarColor
        })
      };
      let serverChat;
      try {
        serverChat = await this.createChatOnServer(payload);
      } catch (error) {
        if (!safeAvatarImage) throw error;
        serverChat = await this.createChatOnServer({
          name,
          isPrivate: false,
          isGroup: true,
          ...this.buildChatAppearancePayload({
            name,
            avatarImage: '',
            avatarColor: safeAvatarColor
          })
        });
      }
      const createdChatId = this.extractServerChatId(serverChat);

      if (!createdChatId) {
        throw new Error('Сервер не повернув ідентифікатор чату.');
      }

      for (const user of selectedUsers) {
        const memberId = String(user?.id || '').trim();
        if (!memberId) continue;
        const joined = await this.joinChatOnServerAsUser(createdChatId, memberId);
        if (!joined) {
          throw new Error('Не вдалося додати одного з учасників до групи.');
        }
      }

      if (safeAvatarImage) {
        try {
          await this.updateChatOnServer(createdChatId, {
            ...this.buildChatAppearancePayload({
              name,
              avatarImage: safeAvatarImage,
              avatarColor: safeAvatarColor
            })
          });
        } catch {}
      }

      newChat = this.buildLocalChatFromServer(serverChat, {
        name,
        isGroup: true,
        members,
        groupParticipants,
        avatarImage: safeAvatarImage,
        avatarColor: safeAvatarColor
      });
    } catch (error) {
      await this.showAlert(error?.message || 'Не вдалося створити групу.');
      if (submitBtn instanceof HTMLButtonElement) {
        submitBtn.disabled = false;
      }
      return;
    }

    this.chats.push(newChat);
    this.saveChats();
    this.renderChatsList();
    try {
      await this.sendGroupMetaMessageToServer(newChat, {
        name,
        avatarImage: newChat.avatarImage || '',
        avatarColor: newChat.avatarColor || '',
        participants: groupParticipants
      });
    } catch {}
    this.pendingGroupCreateReturnChatId = null;
    this.resetChatAreaGroupCreateState();
    this.selectChat(newChat.id);
    this.runServerChatSync({ forceScroll: true });

    if (submitBtn instanceof HTMLButtonElement) {
      submitBtn.disabled = false;
    }
  }

}
