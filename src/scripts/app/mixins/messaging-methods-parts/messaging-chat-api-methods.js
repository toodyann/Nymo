import { getSettingsTemplate } from '../../../ui/templates/settings-templates.js';
import { escapeHtml } from '../../../shared/helpers/ui-helpers.js';
import { buildApiUrl } from '../../../shared/api/api-url.js';
import { getAuthSession } from '../../../shared/auth/auth-session.js';
import {
  SELF_DELETED_CHATS_STORAGE_KEY,
  SELF_DELETED_MESSAGES_STORAGE_KEY
} from '../messaging-parts/index.js';
import { ChatAppMessagingGroupCreateMethods } from './messaging-group-create-methods.js';

export class ChatAppMessagingChatApiMethods extends ChatAppMessagingGroupCreateMethods {
  setNewChatGroupMode(isGroup = false) {
    const nextIsGroup = Boolean(isGroup);
    const toggle = document.getElementById('isGroupToggle');
    const groupFields = document.getElementById('groupFields');
    const userSearchWrap = document.getElementById('newChatUserSearch');
    const modeBtn = document.getElementById('newChatGroupModeBtn');
    const input = document.getElementById('newContactInput');
    const fieldLabel = document.querySelector('#newChatModal .new-chat-field-label');
    const titleEl = document.querySelector('#newChatModal .new-chat-heading-copy h3');
    const kickerEl = document.querySelector('#newChatModal .new-chat-kicker');
    const confirmCopy = document.querySelector('#confirmBtn span');

    this.newChatGroupMode = nextIsGroup;
    if (toggle) toggle.checked = nextIsGroup;
    if (groupFields) groupFields.classList.toggle('active', nextIsGroup);
    if (userSearchWrap) userSearchWrap.classList.toggle('hidden', nextIsGroup);
    if (modeBtn) {
      modeBtn.classList.toggle('active', nextIsGroup);
      modeBtn.setAttribute('aria-expanded', nextIsGroup ? 'true' : 'false');
    }
    if (fieldLabel) fieldLabel.textContent = nextIsGroup ? 'Назва групи' : 'Назва чату';
    if (input) input.placeholder = nextIsGroup ? 'Назва групи' : "Тег, ім'я або номер користувача";
    if (titleEl) titleEl.textContent = nextIsGroup ? 'Створити групу' : 'Створити новий чат';
    if (kickerEl) kickerEl.textContent = nextIsGroup ? 'Групова розмова' : 'Швидкий старт';
    if (confirmCopy) confirmCopy.textContent = nextIsGroup ? 'Створити групу' : 'Створити чат';

    if (nextIsGroup) {
      this.renderNewChatGroupSelectedUsers();
      this.ensureNewChatGroupCandidatesLoaded().catch(() => {
        this.renderNewChatGroupUserList([]);
      });
    }
  }


  toggleNewChatGroupMode() {
    this.setNewChatGroupMode(!this.newChatGroupMode);
  }


  renderNewChatSearchState({
    loading = false,
    message = '',
    users = [],
    selectedUserId = ''
  } = {}) {
    const statusEl = document.getElementById('newChatUserSearchStatus');
    const listEl = document.getElementById('newChatUserSearchResults');
    if (!statusEl || !listEl) return;

    if (loading) {
      statusEl.textContent = 'Пошук користувачів...';
      listEl.innerHTML = '';
      return;
    }

    if (!users.length) {
      statusEl.textContent = message || 'Користувачів не знайдено.';
      listEl.innerHTML = '';
      return;
    }

    statusEl.textContent = '';
    listEl.innerHTML = users.map((user) => {
      const tagText = user.tag ? `@${user.tag}` : '';
      const secondary = [tagText, user.mobile || user.email || ''].filter(Boolean).join(' · ');
      const activeClass = selectedUserId && selectedUserId === user.id ? ' active' : '';
      const avatarHtml = this.getChatAvatarHtml(
        {
          name: user.name,
          avatarImage: user.avatarImage,
          avatarColor: user.avatarColor
        },
        'new-chat-user-result-avatar'
      );
      return `
        <button type="button" class="new-chat-user-result${activeClass}" data-user-id="${this.escapeHtml(user.id)}">
          ${avatarHtml}
          <span class="new-chat-user-result-copy">
            <span class="new-chat-user-result-main">${this.escapeHtml(user.name)}</span>
            <span class="new-chat-user-result-secondary">${this.escapeHtml(secondary)}</span>
          </span>
        </button>
      `;
    }).join('');

    listEl.querySelectorAll('.new-chat-user-result').forEach((btn) => {
      btn.addEventListener('click', () => {
        const userId = btn.getAttribute('data-user-id');
        const user = (this.newChatUserResults || []).find((item) => item.id === userId);
        if (!user) return;
        this.newChatSelectedUser = user;
        const input = document.getElementById('newContactInput');
        if (input) input.value = user.name;
        this.renderNewChatSearchState({
          users: this.newChatUserResults,
          selectedUserId: user.id
        });
      });
    });
  }


  async fetchRegisteredUsers(query) {
    const trimmedQuery = String(query || '').trim();
    if (trimmedQuery.length < 2) {
      return [];
    }

    const encoded = encodeURIComponent(trimmedQuery);
    const endpoints = [
      `/users?search=${encoded}`,
      `/users?query=${encoded}`,
      `/users/search?search=${encoded}`,
      `/users/search?query=${encoded}`
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(buildApiUrl(endpoint), {
          headers: this.getApiHeaders()
        });
        if (response.status === 404 || response.status === 405) {
          continue;
        }
        const data = await this.readJsonSafe(response);
        if (!response.ok) {
          continue;
        }
        const users = this.rankUsersByQuery(this.normalizeUserList(data), trimmedQuery);
        return users;
      } catch {
        // Try next endpoint variant.
      }
    }

    try {
      const response = await fetch(buildApiUrl('/users'), {
        headers: this.getApiHeaders()
      });
      if (response.ok) {
        const data = await this.readJsonSafe(response);
        const users = this.rankUsersByQuery(this.normalizeUserList(data), trimmedQuery);
        if (users.length > 0) return users;
      }
    } catch {
      // No generic users list endpoint, keep graceful empty result.
    }

    return [];
  }


  scheduleUserSearch(query) {
    if (this.newChatUserSearchTimer) {
      clearTimeout(this.newChatUserSearchTimer);
      this.newChatUserSearchTimer = null;
    }

    const value = String(query || '').trim();
    if (value.length < 2) {
      this.newChatUserResults = [];
      this.newChatSelectedUser = null;
      this.renderNewChatSearchState({
        message: 'Введіть щонайменше 2 символи тегу, імені або номера.'
      });
      return;
    }

    const requestId = (this.newChatUserSearchRequestId || 0) + 1;
    this.newChatUserSearchRequestId = requestId;
    this.renderNewChatSearchState({ loading: true });

    this.newChatUserSearchTimer = window.setTimeout(async () => {
      try {
        const users = await this.fetchRegisteredUsers(value);
        if (this.newChatUserSearchRequestId !== requestId) return;
        this.newChatUserResults = users;
        if (this.newChatSelectedUser && !users.some((u) => u.id === this.newChatSelectedUser.id)) {
          this.newChatSelectedUser = null;
        }
        this.renderNewChatSearchState({
          users,
          selectedUserId: this.newChatSelectedUser?.id || '',
          message: `Не знайдено користувачів за запитом "${value}".`
        });
      } catch {
        if (this.newChatUserSearchRequestId !== requestId) return;
        this.newChatUserResults = [];
        this.newChatSelectedUser = null;
        this.renderNewChatSearchState({
          message: 'Не вдалося виконати пошук користувачів.'
        });
      }
    }, 260);
  }


  async updateCurrentUserProfileOnServer(payload = {}) {
    const userId = this.getAuthUserId();
    if (!userId) {
      throw new Error('Не знайдено X-User-Id у сесії. Увійдіть у акаунт ще раз.');
    }
    const response = await fetch(buildApiUrl('/users/me'), {
      method: 'PATCH',
      headers: this.getApiHeaders({ json: true }),
      body: JSON.stringify(payload)
    });
    const data = await this.readJsonSafe(response);
    if (!response.ok) {
      throw new Error(this.getRequestErrorMessage(data, 'Не вдалося оновити профіль.'));
    }
    return data && typeof data === 'object' ? data : {};
  }


  async createChatOnServer(payload) {
    const userId = this.getAuthUserId();
    if (!userId) {
      throw new Error('Не знайдено ідентифікатор користувача для створення чату.');
    }

    const response = await fetch(buildApiUrl('/chats'), {
      method: 'POST',
      headers: this.getApiHeaders({ json: true }),
      body: JSON.stringify(payload)
    });
    const data = await this.readJsonSafe(response);
    if (!response.ok) {
      throw new Error(this.getRequestErrorMessage(data, 'Не вдалося створити чат.'));
    }
    return data || {};
  }


  async updateChatOnServer(chatOrId, payload = {}) {
    const userId = this.getAuthUserId();
    if (!userId) {
      throw new Error('Не знайдено ідентифікатор користувача для оновлення чату.');
    }

    const chatServerId = typeof chatOrId === 'string'
      ? String(chatOrId || '').trim()
      : this.resolveChatServerId(chatOrId);
    if (!chatServerId) {
      throw new Error('Не знайдено ідентифікатор чату для оновлення.');
    }

    const safePayload = payload && typeof payload === 'object'
      ? { ...payload }
      : {};
    const attempts = [
      {
        endpoint: `/chats/${encodeURIComponent(chatServerId)}`,
        method: 'PATCH',
        payload: safePayload
      },
      {
        endpoint: `/chats/${encodeURIComponent(chatServerId)}`,
        method: 'PUT',
        payload: safePayload
      },
      {
        endpoint: `/chats/${encodeURIComponent(chatServerId)}/update`,
        method: 'POST',
        payload: safePayload
      },
      {
        endpoint: '/chats/update',
        method: 'PATCH',
        payload: { chatId: chatServerId, ...safePayload }
      },
      {
        endpoint: '/chats/update',
        method: 'POST',
        payload: { chatId: chatServerId, ...safePayload }
      },
      {
        endpoint: '/chats',
        method: 'PATCH',
        payload: { id: chatServerId, ...safePayload }
      }
    ];

    let lastError = 'Не вдалося оновити чат на сервері.';
    let bestError = '';

    for (const attempt of attempts) {
      const response = await fetch(buildApiUrl(attempt.endpoint), {
        method: attempt.method,
        headers: this.getApiHeaders({ json: true }),
        body: JSON.stringify(attempt.payload)
      });
      const data = await this.readJsonSafe(response);

      if (response.ok) {
        return data || {};
      }

      const message = this.getRequestErrorMessage(data, lastError);
      lastError = `HTTP ${response.status}: ${message}`;
      if (!bestError || (response.status !== 404 && response.status !== 405)) {
        bestError = lastError;
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error(bestError || lastError);
      }

      if (response.status === 404 || response.status === 405) {
        continue;
      }
    }

    throw new Error(bestError || lastError);
  }


  async deleteChatOnServer(chat, { scope = 'all' } = {}) {
    const userId = this.getAuthUserId();
    if (!userId) {
      throw new Error('Не знайдено ідентифікатор користувача для видалення чату.');
    }

    const chatServerId = this.resolveChatServerId(chat);
    if (!chatServerId) {
      return { skipped: true };
    }

    const safeScope = scope === 'self' ? 'self' : 'all';
    const attempts = safeScope === 'self'
      ? [
          {
            endpoint: `/chats/${encodeURIComponent(chatServerId)}/leave`,
            method: 'POST'
          },
          {
            endpoint: '/chats/leave',
            method: 'POST',
            payload: { chatId: chatServerId }
          },
          {
            endpoint: '/chats/leave',
            method: 'POST',
            payload: { id: chatServerId }
          }
        ]
      : [
          {
            endpoint: `/chats/${encodeURIComponent(chatServerId)}`,
            method: 'DELETE'
          },
          {
            endpoint: `/chats/${encodeURIComponent(chatServerId)}/delete`,
            method: 'POST',
            payload: { chatId: chatServerId }
          },
          {
            endpoint: '/chats/delete',
            method: 'POST',
            payload: { chatId: chatServerId }
          },
          {
            endpoint: `/chats?chatId=${encodeURIComponent(chatServerId)}`,
            method: 'DELETE'
          }
        ];

    let lastError = 'Не вдалося видалити чат на сервері.';
    let bestError = '';

    for (const attempt of attempts) {
      const hasPayload = attempt.payload && typeof attempt.payload === 'object';
      const response = await fetch(buildApiUrl(attempt.endpoint), {
        method: attempt.method,
        headers: this.getApiHeaders({ json: hasPayload }),
        ...(hasPayload ? { body: JSON.stringify(attempt.payload) } : {})
      });
      const data = await this.readJsonSafe(response);

      if (response.ok) {
        if (safeScope === 'all') {
          this.unmarkChatDeletedForSelf(chatServerId);
        }
        return data || {};
      }

      const message = this.getRequestErrorMessage(data, lastError);
      lastError = `HTTP ${response.status}: ${message}`;
      if (!bestError || (response.status !== 404 && response.status !== 405)) {
        bestError = lastError;
      }

      const alreadyHandled = /already|вже|not found|не знайдено|does not exist|не існує/i.test(message);
      if (alreadyHandled) {
        return {};
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error(bestError || lastError);
      }

      if (response.status === 404 || response.status === 405) {
        continue;
      }
    }

    if (safeScope === 'self') {
      throw new Error('Сервер не підтримує видалення чату тільки для вас.');
    }
    throw new Error(bestError || lastError);
  }


  extractServerChatId(data) {
    const payload = data?.chat && typeof data.chat === 'object' ? data.chat : data;
    const id = String(payload?.id ?? payload?.chatId ?? payload?._id ?? '').trim();
    return id;
  }


  async joinChatOnServerAsUser(chatServerId, userId) {
    const safeChatId = String(chatServerId || '').trim();
    const safeUserId = String(userId || '').trim();
    if (!safeChatId || !safeUserId) return false;

    const attempts = [
      {
        endpoint: `/chats/${encodeURIComponent(safeChatId)}/join`,
        options: {
          method: 'POST',
          headers: { 'X-User-Id': safeUserId }
        }
      },
      {
        endpoint: '/chats/join',
        options: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': safeUserId
          },
          body: JSON.stringify({ chatId: safeChatId })
        }
      },
      {
        endpoint: '/chats/join',
        options: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': safeUserId
          },
          body: JSON.stringify({ id: safeChatId })
        }
      }
    ];

    for (const attempt of attempts) {
      const response = await fetch(buildApiUrl(attempt.endpoint), attempt.options);
      if (response.ok) return true;

      // Some backends can return "already joined" as non-2xx text.
      const data = await this.readJsonSafe(response);
      const message = this.getRequestErrorMessage(data, '');
      if (/already|вже|exists|учасник/i.test(message)) {
        return true;
      }

      if (response.status === 404 || response.status === 405) {
        continue;
      }
    }

    return false;
  }


  async ensurePrivateChatParticipantJoined(chat) {
    if (!chat || chat.isGroup || !chat.participantId) return true;
    if (chat.participantJoinedVerified) return true;

    const chatServerId = this.resolveChatServerId(chat);
    if (!chatServerId) return false;

    const joined = await this.joinChatOnServerAsUser(chatServerId, chat.participantId);
    if (joined) {
      chat.participantJoinedVerified = true;
      this.saveChats();
    }
    return joined;
  }


  buildLocalChatFromServer(data, fallback = {}) {
    const payload = data?.chat && typeof data.chat === 'object' ? data.chat : data;
    const name = String(payload?.name || fallback?.name || 'Новий чат').trim();
    const avatarImage = this.getAvatarImage(
      fallback?.avatarImage
      || fallback?.avatarUrl
      || this.getUserAvatarImage(payload)
    );
    const avatarColor = String(
      fallback?.avatarColor
      || payload?.avatarColor
      || this.getUserAvatarColor(payload)
      || ''
    ).trim();
    const nextId = Math.max(0, ...this.chats.map((chat) => Number(chat.id) || 0)) + 1;
    return {
      id: nextId,
      serverId: String(payload?.id ?? payload?.chatId ?? '').trim() || null,
      participantId: String(fallback?.participantId || '').trim() || null,
      name,
      avatarImage,
      avatarUrl: avatarImage,
      avatarColor,
      status: 'offline',
      messages: [],
      isGroup: Boolean(payload?.isGroup ?? fallback?.isGroup),
      members: Array.isArray(fallback?.members) ? fallback.members : [],
      groupParticipants: Array.isArray(fallback?.groupParticipants)
        ? fallback.groupParticipants
        : []
    };
  }


  getSocketIoFactory() {
    if (typeof window === 'undefined') return null;
    if (typeof window.io === 'function') return window.io;
    return null;
  }


  getRealtimeSocketUrl() {
    if (typeof window === 'undefined') return '';
    const explicit = String(window.__ORION_SOCKET_URL || '').trim();
    if (explicit) return explicit.replace(/\/+$/, '');
    return String(buildApiUrl('/')).replace(/\/+$/, '');
  }


  extractRealtimeUserId(payload) {
    if (!payload || typeof payload !== 'object') return '';
    const nestedUser = payload.user && typeof payload.user === 'object' ? payload.user : null;
    const nestedMessage = payload.message && typeof payload.message === 'object' ? payload.message : null;
    const nestedMessageUser = nestedMessage?.user && typeof nestedMessage.user === 'object' ? nestedMessage.user : null;
    const nestedMessageSender = nestedMessage?.sender && typeof nestedMessage.sender === 'object' ? nestedMessage.sender : null;
    const nestedMessageAuthor = nestedMessage?.author && typeof nestedMessage.author === 'object' ? nestedMessage.author : null;
    return String(
      payload.senderId
        ?? payload.fromUserId
        ?? payload.authorId
        ?? nestedMessage?.senderId
        ?? nestedMessage?.fromUserId
        ?? nestedMessage?.authorId
        ?? nestedMessageSender?.id
        ?? nestedMessageSender?.userId
        ?? nestedMessageAuthor?.id
        ?? nestedMessageAuthor?.userId
        ?? nestedMessageUser?.id
        ?? nestedMessageUser?.userId
        ?? payload.userId
        ?? nestedUser?.id
        ?? nestedUser?.userId
        ?? ''
    ).trim();
  }


  extractRealtimeChatId(payload) {
    if (!payload || typeof payload !== 'object') return '';
    const nestedChat = payload.chat && typeof payload.chat === 'object' ? payload.chat : null;
    const nestedMessage = payload.message && typeof payload.message === 'object' ? payload.message : null;
    return String(
      payload.chatId
        ?? payload.roomId
        ?? payload.conversationId
        ?? nestedMessage?.chatId
        ?? nestedMessage?.roomId
        ?? nestedMessage?.conversationId
        ?? nestedChat?.id
        ?? nestedChat?.chatId
        ?? payload.id
        ?? ''
    ).trim();
  }


  getRealtimeMessageRecord(payload = {}) {
    if (!payload || typeof payload !== 'object') return null;
    const nestedMessage = payload.message && typeof payload.message === 'object'
      ? payload.message
      : null;
    const source = nestedMessage || payload;
    if (!source || typeof source !== 'object') return null;

    return {
      ...source,
      id: source.id ?? source.messageId ?? payload.messageId ?? payload.id,
      messageId: source.messageId ?? payload.messageId ?? source.id ?? payload.id,
      chatId: source.chatId ?? payload.chatId ?? payload.roomId ?? payload.conversationId,
      createdAt: source.createdAt ?? payload.createdAt ?? source.timestamp ?? payload.timestamp,
      senderId: source.senderId ?? payload.senderId ?? source.fromUserId ?? payload.fromUserId ?? source.authorId ?? payload.authorId,
      userId: source.userId ?? payload.userId
    };
  }


  buildLocalMessageFromRealtimePayload(payload = {}, chat = null) {
    const record = this.getRealtimeMessageRecord(payload);
    if (!record) return null;
    const realtimeSenderId = this.extractRealtimeUserId(payload);
    const selfId = this.getAuthUserId();
    const mapped = this.mapServerMessagesToLocal(
      { ...(chat || {}), messages: [] },
      [record]
    );
    const nextMessage = Array.isArray(mapped) && mapped.length ? mapped[0] : null;
    if (!nextMessage) return null;
    if (realtimeSenderId) {
      nextMessage.senderId = realtimeSenderId;
      if (selfId && realtimeSenderId !== selfId) {
        nextMessage.from = 'other';
      } else if (selfId && realtimeSenderId === selfId) {
        nextMessage.from = 'own';
      }
    }
    return nextMessage;
  }


  applyRealtimeIncomingChatPreview(payload = {}, { eventName = '' } = {}) {
    const normalizedEventName = String(eventName || '').trim();
    if (normalizedEventName !== 'messageCreated' && normalizedEventName !== 'messageSent') {
      return false;
    }

    const eventChatId = this.extractRealtimeChatId(payload);
    const senderId = this.extractRealtimeUserId(payload);
    const selfId = this.getAuthUserId();
    const isOwnEvent = Boolean(senderId && selfId && senderId === selfId);
    if (isOwnEvent) {
      return false;
    }

    const targetChat = this.findChatByServerId(eventChatId) || this.findDirectChatByParticipantId(senderId);
    if (!targetChat) return false;

    const nextMessage = this.buildLocalMessageFromRealtimePayload(payload, targetChat);
    if (!nextMessage) return false;
    nextMessage.from = 'other';
    if (senderId) {
      nextMessage.senderId = senderId;
    }
    this.notifyDesktopIncomingMessage(targetChat, nextMessage);

    const currentChatServerId = this.resolveChatServerId(this.currentChat);
    const targetChatServerId = this.resolveChatServerId(targetChat);
    if (currentChatServerId && targetChatServerId && String(currentChatServerId) === String(targetChatServerId)) {
      return false;
    }

    const nextServerId = String(nextMessage.serverId || '').trim();
    const nextComparableKey = this.getComparableMessageKey(nextMessage);
    const nextTs = this.getMessageTimestampValue(nextMessage);
    const existingMessages = Array.isArray(targetChat.messages) ? targetChat.messages : [];

    const alreadyExists = existingMessages.some((message) => {
      const existingServerId = String(message?.serverId || '').trim();
      if (nextServerId && existingServerId && existingServerId === nextServerId) {
        return true;
      }
      if (!nextComparableKey) return false;
      if (this.getComparableMessageKey(message) !== nextComparableKey) return false;
      const existingTs = this.getMessageTimestampValue(message);
      if (!Number.isFinite(nextTs) || !Number.isFinite(existingTs)) return false;
      return Math.abs(existingTs - nextTs) <= 2000;
    });
    if (alreadyExists) return false;

    targetChat.messages = [...existingMessages, nextMessage];

    const nextActivityAt = this.getMessageTimestampValue(nextMessage);
    if (Number.isFinite(nextActivityAt) && nextActivityAt > 0) {
      targetChat.activityAt = nextActivityAt;
    }
    targetChat.readTrackingInitialized = true;
    targetChat.unreadCount = Math.max(0, Number(targetChat.unreadCount || 0)) + 1;

    this.saveChats();
    this.renderChatsList();
    if (typeof this.refreshDesktopSecondaryChatsListIfVisible === 'function') {
      this.refreshDesktopSecondaryChatsListIfVisible();
    }
    return true;
  }


  findChatByServerId(chatServerId) {
    const safeId = String(chatServerId || '').trim();
    if (!safeId || !Array.isArray(this.chats)) return null;
    return this.chats.find((chat) => this.resolveChatServerId(chat) === safeId) || null;
  }


  findDirectChatByParticipantId(participantId) {
    const safeId = String(participantId || '').trim();
    if (!safeId || !Array.isArray(this.chats)) return null;
    return this.chats.find((chat) => !chat?.isGroup && String(chat?.participantId || '').trim() === safeId) || null;
  }


  getPresenceStatusForUser(userId, fallback = 'offline') {
    const safeId = String(userId || '').trim();
    if (!safeId) return fallback;
    if (this.realtimeOnlineUserIds instanceof Set && this.realtimeOnlineUserIds.has(safeId)) {
      return 'online';
    }
    return fallback;
  }


  isOwnOnlineVisibilityEnabled() {
    return this.settings?.showOnlineStatus !== false;
  }


  isOwnTypingVisibilityEnabled() {
    return this.settings?.showTypingIndicator !== false;
  }


  updateRealtimePrivacyState() {
    const onlineVisible = this.isOwnOnlineVisibilityEnabled();
    const typingVisible = this.isOwnTypingVisibilityEnabled();

    if (!onlineVisible) {
      this.stopRealtimeTyping({ emit: true });
      if (this.realtimeMessageSyncTimer) {
        clearTimeout(this.realtimeMessageSyncTimer);
        this.realtimeMessageSyncTimer = null;
      }
      if (this.realtimeSocket) {
        try {
          this.realtimeSocket.removeAllListeners();
          this.realtimeSocket.disconnect();
        } catch {
          // Ignore transient websocket shutdown failures.
        }
      }
      this.realtimeSocket = null;
      this.realtimeSocketConnected = false;
      this.realtimeJoinedChatId = '';
      if (typeof this.refreshServerChatSyncTimer === 'function') {
        this.refreshServerChatSyncTimer();
      }
      return;
    }

    if (!typingVisible) {
      this.stopRealtimeTyping({ emit: true });
    }

    this.connectRealtimeSocket();
    if (typeof this.refreshServerChatSyncTimer === 'function') {
      this.refreshServerChatSyncTimer();
    }
  }


  isLikelyNetworkPolicyError(error) {
    const message = String(error?.message || error || '').trim().toLowerCase();
    if (!message) return false;
    return (
      message.includes('failed to fetch') ||
      message.includes('networkerror') ||
      message.includes('load failed') ||
      message.includes('network request failed') ||
      message.includes('cors') ||
      message.includes('preflight')
    );
  }


  applyServerSyncBackoff(ms = 180_000) {
    const safeMs = Math.max(30_000, Number(ms) || 0);
    const untilTs = Date.now() + safeMs;
    this.serverChatSyncBackoffUntilTs = untilTs;
    this.realtimeSocketRetryAfterTs = Math.max(
      Number(this.realtimeSocketRetryAfterTs || 0),
      untilTs
    );
  }

}
