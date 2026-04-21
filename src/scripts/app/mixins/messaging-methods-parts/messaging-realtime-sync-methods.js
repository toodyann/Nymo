import { getSettingsTemplate } from '../../../ui/templates/settings-templates.js';
import { escapeHtml } from '../../../shared/helpers/ui-helpers.js';
import { buildApiUrl } from '../../../shared/api/api-url.js';
import { getAuthSession } from '../../../shared/auth/auth-session.js';
import {
  SELF_DELETED_CHATS_STORAGE_KEY,
  SELF_DELETED_MESSAGES_STORAGE_KEY
} from '../messaging-parts/index.js';
import { ChatAppMessagingChatApiMethods } from './messaging-chat-api-methods.js';

export class ChatAppMessagingRealtimeSyncMethods extends ChatAppMessagingChatApiMethods {
  initializeRealtimeSocket() {
    if (this.realtimeSocketInitialized) return;
    this.realtimeSocketInitialized = true;
    this.updateRealtimePrivacyState();

    if (this.realtimeVisibilityHandler) {
      document.removeEventListener('visibilitychange', this.realtimeVisibilityHandler);
    }
    this.realtimeVisibilityHandler = () => {
      if (document.visibilityState !== 'visible') return;
      if (!this.realtimeSocketConnected) {
        this.updateRealtimePrivacyState();
      }
    };
    document.addEventListener('visibilitychange', this.realtimeVisibilityHandler);

    if (this.realtimeBeforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.realtimeBeforeUnloadHandler);
    }
    this.realtimeBeforeUnloadHandler = () => {
      this.stopRealtimeTyping({ emit: true });
      if (this.realtimeSocket) {
        try {
          this.realtimeSocket.disconnect();
        } catch {
          // Ignore disconnect failures on page unload.
        }
      }
    };
    window.addEventListener('beforeunload', this.realtimeBeforeUnloadHandler);
  }


  connectRealtimeSocket() {
    const ioFactory = this.getSocketIoFactory();
    const userId = this.getAuthUserId();
    const socketUrl = this.getRealtimeSocketUrl();
    if (!this.isOwnOnlineVisibilityEnabled() || !ioFactory || !userId || !socketUrl) return;
    const retryAfter = Number(this.realtimeSocketRetryAfterTs || 0);
    if (retryAfter > Date.now()) return;

    if (this.realtimeSocket && (this.realtimeSocket.connected || this.realtimeSocket.active)) {
      return;
    }

    if (this.realtimeSocket) {
      try {
        this.realtimeSocket.removeAllListeners();
        this.realtimeSocket.disconnect();
      } catch {
        // Ignore stale socket cleanup failures.
      }
      this.realtimeSocket = null;
    }

    const socket = ioFactory(socketUrl, {
      transports: ['websocket', 'polling'],
      query: { userId },
      reconnection: true
    });
    this.realtimeSocket = socket;
    this.bindRealtimeSocketEvents(socket);
  }


  getRealtimeJoinedChatIdsSet() {
    if (!(this.realtimeJoinedChatIds instanceof Set)) {
      this.realtimeJoinedChatIds = new Set();
    }
    return this.realtimeJoinedChatIds;
  }


  syncRealtimeChatRooms(chats = this.chats) {
    if (!this.realtimeSocketConnected || !this.realtimeSocket) return;

    const nextIds = new Set(
      (Array.isArray(chats) ? chats : [])
        .map((chat) => this.resolveChatServerId(chat))
        .filter(Boolean)
    );
    const joinedIds = this.getRealtimeJoinedChatIdsSet();

    joinedIds.forEach((chatId) => {
      if (nextIds.has(chatId)) return;
      try {
        this.realtimeSocket.emit('leaveChat', { chatId });
        this.realtimeSocket.emit('leaveRoom', { chatId });
      } catch {
        // Ignore transient websocket errors.
      }
      joinedIds.delete(chatId);
    });

    nextIds.forEach((chatId) => {
      if (joinedIds.has(chatId)) return;
      try {
        this.realtimeSocket.emit('joinChat', { chatId });
        this.realtimeSocket.emit('joinRoom', { chatId });
        joinedIds.add(chatId);
      } catch {
        // Ignore transient websocket errors.
      }
    });
  }


  leaveAllRealtimeChatRooms() {
    if (!this.realtimeSocket) {
      this.realtimeJoinedChatId = '';
      if (this.realtimeJoinedChatIds instanceof Set) {
        this.realtimeJoinedChatIds.clear();
      }
      return;
    }

    const joinedIds = this.getRealtimeJoinedChatIdsSet();
    joinedIds.forEach((chatId) => {
      try {
        this.realtimeSocket.emit('leaveChat', { chatId });
        this.realtimeSocket.emit('leaveRoom', { chatId });
      } catch {
        // Ignore transient websocket errors.
      }
    });
    joinedIds.clear();
    this.realtimeJoinedChatId = '';
  }


  bindRealtimeSocketEvents(socket) {
    if (!socket || socket.__orionBound === true) return;
    socket.__orionBound = true;

    socket.on('connect', () => {
      this.realtimeSocketConnected = true;
      this.syncRealtimeChatRooms(this.chats);
      this.joinRealtimeChatRoom(this.currentChat);
      if (typeof this.refreshServerChatSyncTimer === 'function') {
        this.refreshServerChatSyncTimer();
      }
      if (typeof this.runServerChatSync === 'function') {
        this.runServerChatSync({ forceScroll: false });
      }
    });

    socket.on('disconnect', () => {
      this.realtimeSocketConnected = false;
      this.realtimeJoinedChatId = '';
      if (this.realtimeJoinedChatIds instanceof Set) {
        this.realtimeJoinedChatIds.clear();
      }
      this.stopRealtimeTyping({ emit: false });
      if (this.realtimeMessageSyncTimer) {
        clearTimeout(this.realtimeMessageSyncTimer);
        this.realtimeMessageSyncTimer = null;
      }
      if (typeof this.refreshServerChatSyncTimer === 'function') {
        this.refreshServerChatSyncTimer();
      }
    });

    socket.on('connect_error', (error) => {
      this.realtimeSocketConnected = false;
      if (this.isLikelyNetworkPolicyError(error)) {
        this.applyServerSyncBackoff(180_000);
      }
    });

    socket.on('userOnline', (payload) => this.handleRealtimePresenceEvent(payload, true));
    socket.on('userOffline', (payload) => this.handleRealtimePresenceEvent(payload, false));

    socket.on('userTyping', (payload) => this.handleRealtimeTypingEvent(payload));
    socket.on('typingStart', (payload) => this.handleRealtimeTypingEvent(payload, true));
    socket.on('typingStop', (payload) => this.handleRealtimeTypingEvent(payload, false));

    socket.on('messageCreated', (payload) => this.handleRealtimeMessageEvent(payload, 'messageCreated'));
    socket.on('messageSent', (payload) => this.handleRealtimeMessageEvent(payload, 'messageSent'));
    socket.on('messageUpdated', (payload) => this.handleRealtimeMessageEvent(payload, 'messageUpdated'));
    socket.on('messageEdited', (payload) => this.handleRealtimeMessageEvent(payload, 'messageEdited'));
    socket.on('messageDeleted', (payload) => this.handleRealtimeMessageEvent(payload, 'messageDeleted'));
    socket.on('messagesRead', (payload) => this.handleRealtimeReadReceiptsEvent(payload));
    socket.on('messageRead', (payload) => this.handleRealtimeReadReceiptsEvent(payload));
  }


  joinRealtimeChatRoom(chat) {
    const chatServerId = this.resolveChatServerId(chat);
    if (!chatServerId) {
      this.realtimeJoinedChatId = '';
      return;
    }
    if (!this.realtimeSocketConnected || !this.realtimeSocket) return;
    this.syncRealtimeChatRooms(this.chats);
    this.realtimeJoinedChatId = chatServerId;
  }


  leaveRealtimeChatRoom() {
    this.realtimeJoinedChatId = '';
  }


  handleRealtimePresenceEvent(payload, isOnline) {
    const userId = this.extractRealtimeUserId(payload);
    if (!userId) return;

    if (!(this.realtimeOnlineUserIds instanceof Set)) {
      this.realtimeOnlineUserIds = new Set();
    }

    if (isOnline) {
      this.realtimeOnlineUserIds.add(userId);
    } else {
      this.realtimeOnlineUserIds.delete(userId);
    }

    let changed = false;
    const nextStatus = isOnline ? 'online' : 'offline';
    this.cacheKnownUserMeta(userId, { status: nextStatus });
    const chats = Array.isArray(this.chats) ? this.chats : [];
    chats.forEach((chat) => {
      if (!chat || chat.isGroup) return;
      const participantId = String(chat.participantId || '').trim();
      if (!participantId || participantId !== userId) return;
      if (chat.status !== nextStatus) {
        chat.status = nextStatus;
        changed = true;
      }
    });

    if (!changed) return;
    this.saveChats();
    this.updateChatHeader();
    this.renderChatsList();
  }


  setRealtimeTypingState(chatServerId, active, userId = '') {
    const safeChatId = String(chatServerId || '').trim();
    if (!safeChatId) return;
    if (!(this.realtimeTypingByChatId instanceof Map)) {
      this.realtimeTypingByChatId = new Map();
    }

    const existing = this.realtimeTypingByChatId.get(safeChatId);
    const safeUserId = String(userId || '').trim();

    if (!active) {
      if (!existing) return;
      if (existing.timerId) {
        clearTimeout(existing.timerId);
      }
      this.realtimeTypingByChatId.delete(safeChatId);
      this.updateChatHeader();
      this.renderChatsList();
      return;
    }

    if (existing?.timerId) {
      clearTimeout(existing.timerId);
    }

    const timerId = window.setTimeout(() => {
      this.setRealtimeTypingState(safeChatId, false);
    }, 2200);

    const hasChanged = !existing
      || existing.active !== true
      || String(existing.userId || '') !== safeUserId;

    this.realtimeTypingByChatId.set(safeChatId, {
      active: true,
      userId: safeUserId,
      timerId
    });

    if (hasChanged) {
      this.updateChatHeader();
      this.renderChatsList();
    }
  }


  isChatTypingActive(chat) {
    const chatServerId = this.resolveChatServerId(chat);
    if (!chatServerId || !(this.realtimeTypingByChatId instanceof Map)) return false;
    const state = this.realtimeTypingByChatId.get(chatServerId);
    return Boolean(state?.active);
  }


  getChatPreviewText(chat, lastMessage) {
    if (!chat) return this.getMessagePreviewText(lastMessage);
    if (this.isChatTypingActive(chat)) {
      return 'Друкує...';
    }
    return this.getMessagePreviewText(lastMessage);
  }


  handleRealtimeTypingEvent(payload, forcedTyping = null) {
    const senderId = this.extractRealtimeUserId(payload);
    const selfId = this.getAuthUserId();
    if (senderId && selfId && senderId === selfId) return;

    let chatServerId = this.extractRealtimeChatId(payload);
    if (!chatServerId && this.currentChat && senderId) {
      const currentParticipantId = String(this.currentChat.participantId || '').trim();
      if (currentParticipantId && currentParticipantId === senderId) {
        chatServerId = this.resolveChatServerId(this.currentChat);
      }
    }
    if (!chatServerId) return;

    const payloadTyping = payload?.isTyping ?? payload?.typing ?? payload?.active;
    const isTyping = forcedTyping == null
      ? payloadTyping !== false
      : Boolean(forcedTyping);

    this.setRealtimeTypingState(chatServerId, isTyping, senderId);
    if (senderId && isTyping) {
      this.handleRealtimePresenceEvent({ userId: senderId }, true);
    }
  }


  handleRealtimeMessageEvent(payload = {}, eventName = '') {
    const eventChatId = this.extractRealtimeChatId(payload);
    const currentChatServerId = this.resolveChatServerId(this.currentChat);
    const senderId = this.extractRealtimeUserId(payload);
    const selfId = this.getAuthUserId();
    this.applyRealtimeIncomingChatPreview(payload, { eventName });
    const shouldPrioritizeCurrent = Boolean(
      eventChatId
      && currentChatServerId
      && String(eventChatId).trim() === String(currentChatServerId).trim()
    );
    const messagesContainer = document.getElementById('messagesContainer');
    const shouldForceScroll = Boolean(
      shouldPrioritizeCurrent
      && (
        (senderId && selfId && senderId === selfId)
        || this.shouldKeepCurrentChatPinnedToBottom()
        || (
          messagesContainer
          && typeof this.isMessagesNearBottom === 'function'
          && this.isMessagesNearBottom(messagesContainer, 180)
        )
      )
    );
    this.scheduleServerChatSyncFromRealtime({
      forceScroll: shouldForceScroll,
      urgent: shouldPrioritizeCurrent
    });
  }


  scheduleServerChatSyncFromRealtime({ forceScroll = false, urgent = false } = {}) {
    if (this.realtimeMessageSyncTimer) {
      clearTimeout(this.realtimeMessageSyncTimer);
      this.realtimeMessageSyncTimer = null;
    }
    const delayMs = urgent ? 40 : 140;
    this.realtimeMessageSyncTimer = window.setTimeout(() => {
      this.realtimeMessageSyncTimer = null;
      this.runServerChatSync({ forceScroll }).catch(() => {});
    }, delayMs);
  }


  emitRealtimeTypingState(isTyping) {
    if (!this.isOwnTypingVisibilityEnabled()) return;
    const socket = this.realtimeSocket;
    const chatServerId = this.resolveChatServerId(this.currentChat);
    if (!socket || !this.realtimeSocketConnected || !chatServerId) return;
    try {
      if (isTyping) {
        socket.emit('typingStart', { chatId: chatServerId });
      } else {
        socket.emit('typingStop', { chatId: chatServerId });
      }
      socket.emit('typing', { chatId: chatServerId, isTyping: Boolean(isTyping) });
    } catch {
      // Ignore transient websocket emit errors.
    }
  }


  handleRealtimeComposerInput(textValue = '') {
    if (!this.isOwnOnlineVisibilityEnabled() || !this.isOwnTypingVisibilityEnabled()) {
      this.stopRealtimeTyping({ emit: true });
      return;
    }

    const hasText = Boolean(String(textValue || '').trim().length);
    if (!this.currentChat || !hasText) {
      this.stopRealtimeTyping({ emit: true });
      return;
    }

    const currentChatServerId = this.resolveChatServerId(this.currentChat);
    if (!currentChatServerId) return;

    if (this.realtimeTypingActiveChatId !== currentChatServerId) {
      this.stopRealtimeTyping({ emit: true });
      this.realtimeTypingActiveChatId = currentChatServerId;
      this.emitRealtimeTypingState(true);
    } else if (!this.realtimeTypingEmitTimer) {
      this.emitRealtimeTypingState(true);
    }

    if (this.realtimeTypingEmitTimer) {
      clearTimeout(this.realtimeTypingEmitTimer);
    }
    this.realtimeTypingEmitTimer = window.setTimeout(() => {
      this.stopRealtimeTyping({ emit: true });
    }, this.realtimeTypingInputDebounceMs || 1400);
  }


  stopRealtimeTyping({ emit = true } = {}) {
    if (this.realtimeTypingEmitTimer) {
      clearTimeout(this.realtimeTypingEmitTimer);
      this.realtimeTypingEmitTimer = null;
    }
    const hadActiveTyping = Boolean(this.realtimeTypingActiveChatId);
    if (emit && hadActiveTyping) {
      this.emitRealtimeTypingState(false);
    }
    this.realtimeTypingActiveChatId = '';
  }


  initializeServerChatSync() {
    if (this.serverChatSyncInitialized) return;
    this.serverChatSyncInitialized = true;
    this.serverChatSyncInFlight = false;
    this.serverChatSyncLastRunAt = 0;
    this.serverChatSyncMinIntervalMs = 900;
    this.initializeRealtimeSocket();

    this.runServerChatSync({ forceScroll: false });
    this.refreshServerChatSyncTimer();

    if (this.serverChatVisibilityHandler) {
      document.removeEventListener('visibilitychange', this.serverChatVisibilityHandler);
    }
    this.serverChatVisibilityHandler = () => {
      this.refreshServerChatSyncTimer();
      if (document.visibilityState === 'visible') {
        this.runServerChatSync({ forceScroll: false });
      }
    };
    document.addEventListener('visibilitychange', this.serverChatVisibilityHandler);
  }


  refreshServerChatSyncTimer() {
    if (this.serverChatSyncTimer) {
      window.clearInterval(this.serverChatSyncTimer);
      this.serverChatSyncTimer = null;
    }
    // Keep low-frequency HTTP polling only as fallback when realtime socket is down.
    if (this.realtimeSocketConnected) return;
    this.serverChatSyncTimer = window.setInterval(() => {
      this.runServerChatSync({ forceScroll: false, skipWhenHidden: true });
    }, 12000);
  }


  async runServerChatSync({ forceScroll = false, skipWhenHidden = false } = {}) {
    const effectiveForceScroll = forceScroll || this.shouldKeepCurrentChatPinnedToBottom();
    if (skipWhenHidden && document.visibilityState === 'hidden') return;
    if (this.serverChatSyncInFlight) return;
    const nowTs = Date.now();
    const syncBackoffUntil = Number(this.serverChatSyncBackoffUntilTs || 0);
    if (syncBackoffUntil > nowTs) return;
    if (!effectiveForceScroll) {
      const cooldownMs = Math.max(250, Number(this.serverChatSyncMinIntervalMs) || 0);
      const lastRunAt = Number(this.serverChatSyncLastRunAt || 0);
      if (lastRunAt > 0 && nowTs - lastRunAt < cooldownMs) return;
    }
    this.serverChatSyncLastRunAt = nowTs;
    this.serverChatSyncInFlight = true;
    try {
      await this.syncChatsFromServer({ preserveSelection: true, renderIfChanged: true });
      await this.syncCurrentChatMessagesFromServer({ forceScroll: effectiveForceScroll, highlightOwn: false });
      this.serverChatSyncBackoffUntilTs = 0;
    } catch (error) {
      if (this.isLikelyNetworkPolicyError(error)) {
        this.applyServerSyncBackoff(180_000);
      }
      // Keep UI responsive if backend is temporarily unavailable.
    } finally {
      this.serverChatSyncInFlight = false;
    }
  }


  resolveChatServerId(chat) {
    if (!chat) return '';
    const direct = String(chat.serverId ?? '').trim();
    if (direct) return direct;
    if (typeof chat.id === 'string' && chat.id.trim() && !/^\d+$/.test(chat.id.trim())) {
      return chat.id.trim();
    }
    return '';
  }


  formatLocalMessageDateParts(value) {
    const date = value ? new Date(value) : new Date();
    const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
    const hh = String(safeDate.getHours()).padStart(2, '0');
    const mm = String(safeDate.getMinutes()).padStart(2, '0');
    return {
      date: safeDate.toISOString().slice(0, 10),
      time: `${hh}:${mm}`
    };
  }


  normalizeServerChatsPayload(payload) {
    const candidates = [payload, payload?.chats, payload?.data, payload?.items, payload?.results];
    const source = candidates.find(Array.isArray);
    if (!source) return [];
    const selfId = this.getAuthUserId();

    return source
      .filter((item) => item && typeof item === 'object')
      .map((item) => {
        const serverId = String(item.id ?? item.chatId ?? item._id ?? '').trim();
        if (!serverId) return null;

        const participants = Array.isArray(item.participants)
          ? item.participants
          : Array.isArray(item.members)
            ? item.members
            : Array.isArray(item.users)
              ? item.users
              : [];
        const ownerParticipant = this.normalizeParticipantRecord(
          item.owner && typeof item.owner === 'object'
            ? { ...item.owner, id: item.owner.id ?? item.owner.userId ?? item.ownerId ?? item.createdById ?? '' }
            : (
              item.createdBy && typeof item.createdBy === 'object'
                ? { ...item.createdBy, id: item.createdBy.id ?? item.createdBy.userId ?? item.createdById ?? '' }
                : null
            )
        );
        const normalizedParticipants = participants
          .map((member) => this.normalizeParticipantRecord(member))
          .filter(Boolean);
        if (ownerParticipant?.id && !normalizedParticipants.some((member) => member.id === ownerParticipant.id)) {
          normalizedParticipants.unshift(ownerParticipant);
        }
        normalizedParticipants.forEach((member) => {
          this.cacheKnownUserMeta(member.id, {
            name: member.name,
            avatarImage: member.avatarImage,
            avatarColor: member.avatarColor,
            status: member.status
          });
        });
        const otherParticipant = normalizedParticipants.find((member) => member.id !== selfId) || null;
        let participantConfidence = 0;
        let participantIdRaw = '';

        if (otherParticipant?.id) {
          participantIdRaw = String(otherParticipant.id).trim();
          participantConfidence = 2; // from explicit participants list
        } else {
          const fieldParticipantId = String(item.participantId ?? '').trim();
          const fieldTargetUserId = String(item.targetUserId ?? '').trim();
          const fieldOwnerId = String(item.ownerId ?? item.createdById ?? item.owner?.id ?? item.createdBy?.id ?? '').trim();
          if (fieldParticipantId && fieldParticipantId !== selfId) {
            participantIdRaw = fieldParticipantId;
            participantConfidence = 1; // from dedicated participant field
          } else if (fieldTargetUserId && fieldTargetUserId !== selfId) {
            participantIdRaw = fieldTargetUserId;
            participantConfidence = 1;
          } else if (fieldOwnerId && fieldOwnerId !== selfId) {
            participantIdRaw = fieldOwnerId;
            participantConfidence = 1;
          }
        }

        const participantId = participantIdRaw && participantIdRaw !== selfId ? participantIdRaw : '';

        const participantName = String(otherParticipant?.name || '').trim();
        const participantAvatarImage = this.getAvatarImage(otherParticipant?.avatarImage || otherParticipant?.avatarUrl);
        const participantAvatarColor = String(otherParticipant?.avatarColor || '').trim();
        const participantStatus = this.normalizePresenceStatus(otherParticipant?.status);
        this.cacheKnownUserMeta(participantId, {
          name: participantName,
          avatarImage: participantAvatarImage,
          avatarColor: participantAvatarColor,
          status: participantStatus
        });
        const isGroup = Boolean(item.isGroup ?? item.group ?? item.type === 'group');
        const fallbackName = String(item.name ?? item.title ?? '').trim();
        const cachedParticipant = this.getCachedUserMeta(participantId);
        const cachedParticipantName = String(cachedParticipant?.name || '').trim();
        const cachedParticipantAvatar = this.getAvatarImage(cachedParticipant?.avatarImage);
        const effectiveParticipantName = participantName || cachedParticipantName;
        const shouldUseParticipantName = !isGroup
          && effectiveParticipantName
          && effectiveParticipantName !== 'Користувач';
        const fallbackLooksLikeSelf = !isGroup && this.isNameMatchingCurrentUser(fallbackName);
        const name = shouldUseParticipantName
          ? effectiveParticipantName
          : ((fallbackLooksLikeSelf ? '' : fallbackName) || effectiveParticipantName || 'Новий чат');
        const fallbackAvatarImage = this.getAvatarImage(
          item.chatAvatarImage
          || item.chatAvatarUrl
          || item.groupAvatarImage
          || item.groupAvatarUrl
          || item.coverImage
          || item.coverUrl
          || this.getUserAvatarImage(item)
        );
        const avatarImage = isGroup
          ? this.getAvatarImage(fallbackAvatarImage)
          : this.getAvatarImage(participantAvatarImage || cachedParticipantAvatar || fallbackAvatarImage);
        const fallbackAvatarColor = this.getUserAvatarColor(item);
        const avatarColor = String(
          isGroup
            ? (fallbackAvatarColor || '')
            : (participantAvatarColor || cachedParticipant?.avatarColor || fallbackAvatarColor || '')
        ).trim();
        const status = this.normalizePresenceStatus(
          participantStatus
          || cachedParticipant?.status
          || item.status
          || item.presence
          || item.isOnline
          || item.online
        );
        const activityAt = this.getChatActivityTimestampValue(item);

        return {
          serverId,
          name,
          isGroup,
          participantId: participantId || null,
          participantConfidence,
          avatarImage,
          avatarUrl: avatarImage,
          avatarColor,
          status,
          activityAt,
          groupParticipants: isGroup ? normalizedParticipants : []
        };
      })
      .filter(Boolean);
  }


  normalizeServerMessagesPayload(payload) {
    const candidates = [payload, payload?.messages, payload?.data, payload?.items, payload?.results];
    const source = candidates.find(Array.isArray);
    if (!source) return [];
    return source.filter((item) => item && typeof item === 'object');
  }


  normalizeServerMessagesPagePayload(payload) {
    const items = this.normalizeServerMessagesPayload(payload);
    const directNextCursor = String(
      payload?.nextCursor
      ?? payload?.cursor
      ?? payload?.next
      ?? payload?.data?.nextCursor
      ?? ''
    ).trim();
    return {
      items,
      nextCursor: directNextCursor || null
    };
  }


  getChatMessagesPageSize() {
    return 50;
  }


  getMessageStableKey(msg) {
    if (!msg || typeof msg !== 'object') return '';
    const serverId = String(msg.serverId || '').trim();
    if (serverId) return `server:${serverId}`;
    const localId = Number(msg.id);
    return Number.isFinite(localId) && localId > 0 ? `local:${localId}` : '';
  }


  getPreservedOlderMessages(prevMessages = [], nextMessages = []) {
    const safePrev = Array.isArray(prevMessages) ? prevMessages : [];
    const safeNext = Array.isArray(nextMessages) ? nextMessages : [];
    if (!safePrev.length || !safeNext.length) return [];

    const nextKeys = new Set(safeNext.map((msg) => this.getMessageStableKey(msg)).filter(Boolean));
    let earliestNextIndex = -1;
    for (let index = 0; index < safePrev.length; index += 1) {
      const key = this.getMessageStableKey(safePrev[index]);
      if (key && nextKeys.has(key)) {
        earliestNextIndex = index;
        break;
      }
    }

    if (earliestNextIndex > 0) {
      return safePrev
        .slice(0, earliestNextIndex)
        .filter((msg) => !nextKeys.has(this.getMessageStableKey(msg)));
    }

    const oldestNextTs = this.getMessageTimestampValue(safeNext[0]);
    if (!Number.isFinite(oldestNextTs)) return [];
    return safePrev.filter((msg) => {
      const key = this.getMessageStableKey(msg);
      if (!key || nextKeys.has(key)) return false;
      const ts = this.getMessageTimestampValue(msg);
      return Number.isFinite(ts) && ts < oldestNextTs;
    });
  }


  getChatActivityTimestampValue(chat) {
    if (!chat || typeof chat !== 'object') return 0;
    const parseCandidate = (value) => {
      if (value == null || value === '') return NaN;
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      const parsed = Date.parse(String(value));
      return Number.isFinite(parsed) ? parsed : NaN;
    };

    const lastMessage = chat.lastMessage && typeof chat.lastMessage === 'object'
      ? chat.lastMessage
      : null;
    const candidates = [
      chat.activityAt,
      chat.lastActivityAt,
      chat.lastMessageAt,
      chat.updatedAt,
      lastMessage?.createdAt,
      lastMessage?.timestamp,
      lastMessage?.date,
      chat.createdAt
    ];

    for (const candidate of candidates) {
      const ts = parseCandidate(candidate);
      if (Number.isFinite(ts) && ts > 0) return ts;
    }
    return 0;
  }


  getNormalizedChatDedupScore(chat) {
    if (!chat || typeof chat !== 'object') return 0;
    let score = 0;
    if (chat.participantId) score += 4;
    score += Math.max(0, Number(chat.participantConfidence || 0));
    const safeName = String(chat.name || '').trim();
    if (safeName && !this.isGenericOrInvalidChatName(safeName, { isGroup: Boolean(chat.isGroup) })) {
      score += 2;
    }
    if (this.getAvatarImage(chat.avatarImage || chat.avatarUrl)) score += 1;
    if (String(chat.avatarColor || '').trim()) score += 0.4;
    if (this.normalizePresenceStatus(chat.status) === 'online') score += 0.2;
    return score;
  }


  mergeNormalizedServerChat(primary, secondary) {
    const primaryName = String(primary?.name || '').trim();
    const secondaryName = String(secondary?.name || '').trim();
    const primaryNameValid = primaryName && !this.isGenericOrInvalidChatName(primaryName, { isGroup: Boolean(primary?.isGroup) });
    const secondaryNameValid = secondaryName && !this.isGenericOrInvalidChatName(secondaryName, { isGroup: Boolean(secondary?.isGroup) });
    const resolvedName = primaryNameValid
      ? primaryName
      : (secondaryNameValid ? secondaryName : (primaryName || secondaryName || 'Новий чат'));

    const primaryAvatar = this.getAvatarImage(primary?.avatarImage || primary?.avatarUrl);
    const secondaryAvatar = this.getAvatarImage(secondary?.avatarImage || secondary?.avatarUrl);
    const mergedStatus = this.normalizePresenceStatus(primary?.status)
      || this.normalizePresenceStatus(secondary?.status)
      || '';

    return {
      ...secondary,
      ...primary,
      name: resolvedName,
      participantId: String(primary?.participantId || secondary?.participantId || '').trim() || null,
      participantConfidence: Math.max(
        Number(primary?.participantConfidence || 0),
        Number(secondary?.participantConfidence || 0)
      ),
      avatarImage: primaryAvatar || secondaryAvatar,
      avatarUrl: primaryAvatar || secondaryAvatar,
      avatarColor: String(primary?.avatarColor || secondary?.avatarColor || '').trim(),
      status: mergedStatus,
      activityAt: Math.max(
        this.getChatActivityTimestampValue(primary),
        this.getChatActivityTimestampValue(secondary)
      )
    };
  }


  pickPreferredNormalizedServerChat(a, b) {
    const aActivity = this.getChatActivityTimestampValue(a);
    const bActivity = this.getChatActivityTimestampValue(b);
    if (aActivity !== bActivity) {
      return aActivity >= bActivity ? this.mergeNormalizedServerChat(a, b) : this.mergeNormalizedServerChat(b, a);
    }

    const aScore = this.getNormalizedChatDedupScore(a);
    const bScore = this.getNormalizedChatDedupScore(b);
    if (aScore !== bScore) {
      return aScore >= bScore ? this.mergeNormalizedServerChat(a, b) : this.mergeNormalizedServerChat(b, a);
    }

    return this.mergeNormalizedServerChat(a, b);
  }


  deduplicateNormalizedServerChats(chats = []) {
    const source = Array.isArray(chats) ? chats : [];
    if (source.length <= 1) return source;

    // 1) Hard dedupe by server chat id.
    const byServerId = new Map();
    source.forEach((chat) => {
      const serverId = String(chat?.serverId || '').trim();
      if (!serverId) return;
      const existing = byServerId.get(serverId);
      if (!existing) {
        byServerId.set(serverId, chat);
        return;
      }
      byServerId.set(serverId, this.pickPreferredNormalizedServerChat(existing, chat));
    });
    const uniqueByServer = [...byServerId.values()];

    // 2) Collapse duplicate direct chats to one per participant.
    const deduped = [];
    const directIndexByParticipant = new Map();
    uniqueByServer.forEach((chat) => {
      const participantId = String(chat?.participantId || '').trim();
      const isDirect = !chat?.isGroup && Boolean(participantId);
      if (!isDirect) {
        deduped.push(chat);
        return;
      }

      const existingIndex = directIndexByParticipant.get(participantId);
      if (existingIndex == null) {
        directIndexByParticipant.set(participantId, deduped.length);
        deduped.push(chat);
        return;
      }

      const existing = deduped[existingIndex];
      deduped[existingIndex] = this.pickPreferredNormalizedServerChat(existing, chat);
    });

    return deduped;
  }


  getComparableMessageKey(message) {
    if (!message || typeof message !== 'object') return '';
    const type = String(message.type || 'text');
    const text = String(message.text || '').trim();
    const attachmentUrl = String(message.attachmentUrl || message.fileUrl || '').trim();
    const imageUrl = String(message.imageUrl || '').trim();
    const audioUrl = String(message.audioUrl || '').trim();
    const fileUrl = String(message.fileUrl || message.attachmentUrl || '').trim();
    const comparableImageUrl = type === 'image' ? (attachmentUrl || imageUrl) : imageUrl;
    const comparableAudioUrl = type === 'voice' ? (attachmentUrl || audioUrl) : audioUrl;
    const comparableFileUrl = type === 'file' ? (fileUrl || attachmentUrl) : fileUrl;
    return [type, text, comparableImageUrl, comparableAudioUrl, comparableFileUrl].join('|');
  }


  getMessagesVisualSignature(messages = []) {
    const source = Array.isArray(messages) ? messages : [];
    return source
      .map((msg) => {
        const from = String(msg?.from || '');
        const includeTime = from !== 'own';
        return [
          from,
          String(msg?.type || 'text'),
          String(msg?.text || ''),
          includeTime ? String(msg?.time || '') : '',
          includeTime ? String(msg?.date || '') : '',
          msg?.edited ? '1' : '0',
          String(msg?.imageUrl || ''),
          String(msg?.audioUrl || ''),
          String(msg?.fileUrl || msg?.attachmentUrl || ''),
          String(msg?.replyTo?.from || ''),
          String(msg?.replyTo?.text || '')
        ].join(':');
      })
      .join('|');
  }


  isRecentOwnUnsyncedMessage(message, { ttlMs = 45000 } = {}) {
    if (!message || typeof message !== 'object') return false;
    if (message.from !== 'own') return false;
    if (String(message.serverId || '').trim()) return false;
    const timestamp = this.getMessageTimestampValue(message);
    if (!Number.isFinite(timestamp)) return false;
    const safeTtl = Number.isFinite(Number(ttlMs)) ? Math.max(1000, Number(ttlMs)) : 45000;
    return Date.now() - timestamp <= safeTtl;
  }


  mergeRecentPendingOwnMessages(baseMessages = [], liveMessages = [], { ttlMs = 45000 } = {}) {
    const safeBase = Array.isArray(baseMessages) ? baseMessages : [];
    const safeLive = Array.isArray(liveMessages) ? liveMessages : [];
    if (!safeLive.length) return safeBase;

    const nowTs = Date.now();
    const safeTtl = Number.isFinite(Number(ttlMs)) ? Math.max(1000, Number(ttlMs)) : 45000;

    const merged = [...safeBase];
    const serverOwnPool = [];
    const usedServerIds = new Set();
    const usedLocalIds = new Set();

    merged.forEach((message) => {
      const serverId = String(message?.serverId || '').trim();
      if (serverId) usedServerIds.add(serverId);
      const localId = Number(message?.id);
      if (Number.isFinite(localId) && localId > 0) usedLocalIds.add(localId);
      if (message?.from !== 'own') return;
      const key = this.getComparableMessageKey(message);
      serverOwnPool.push({
        key,
        ts: this.getMessageTimestampValue(message)
      });
    });

    let nextLocalId = Math.max(0, ...Array.from(usedLocalIds)) + 1;

    safeLive.forEach((liveMessage) => {
      if (!this.isRecentOwnUnsyncedMessage(liveMessage, { ttlMs: safeTtl })) return;

      const liveServerId = String(liveMessage.serverId || '').trim();
      if (liveServerId && usedServerIds.has(liveServerId)) return;

      const key = this.getComparableMessageKey(liveMessage);
      const liveTs = this.getMessageTimestampValue(liveMessage);
      let matchedServerIndex = -1;
      let bestDelta = Number.POSITIVE_INFINITY;

      for (let i = 0; i < serverOwnPool.length; i += 1) {
        const candidate = serverOwnPool[i];
        if (!candidate || candidate.key !== key) continue;
        if (!Number.isFinite(liveTs) || !Number.isFinite(candidate.ts)) {
          matchedServerIndex = i;
          break;
        }
        const delta = Math.abs(candidate.ts - liveTs);
        if (delta <= 45000 && delta < bestDelta) {
          bestDelta = delta;
          matchedServerIndex = i;
        }
      }

      if (matchedServerIndex >= 0) {
        serverOwnPool.splice(matchedServerIndex, 1);
        return;
      }

      if (!Number.isFinite(liveTs) || nowTs - liveTs > safeTtl) return;

      let localId = Number(liveMessage.id);
      if (Number.isFinite(localId) && localId > 0 && usedLocalIds.has(localId)) {
        // This optimistic message has already been replaced by a server-mapped
        // message with the same local id, so do not append a duplicate.
        return;
      }
      if (!Number.isFinite(localId) || localId <= 0) {
        localId = nextLocalId;
        nextLocalId += 1;
      }
      usedLocalIds.add(localId);
      if (liveServerId) usedServerIds.add(liveServerId);

      merged.push({
        ...liveMessage,
        id: localId,
        pending: liveMessage.pending === true
      });
    });

    return merged
      .map((message, index) => ({
        message,
        index,
        ts: this.getMessageTimestampValue(message)
      }))
      .sort((a, b) => {
        const aTs = Number.isFinite(a.ts) ? a.ts : Number.MAX_SAFE_INTEGER;
        const bTs = Number.isFinite(b.ts) ? b.ts : Number.MAX_SAFE_INTEGER;
        if (aTs !== bTs) return aTs - bTs;
        return a.index - b.index;
      })
      .map((entry) => entry.message);
  }


  mapServerMessagesToLocal(chat, serverMessages = []) {
    const selfId = this.getAuthUserId();
    const visibleServerMessages = this.filterSelfDeletedServerMessages(chat, serverMessages);
    const existingMessages = Array.isArray(chat?.messages) ? chat.messages : [];
    const existingByServerId = new Map();
    const existingMessageByServerId = new Map();
    const existingMessageByLocalId = new Map();
    const existingLocalOrderById = new Map();
    const existingLocalIds = [];
    const usedIds = new Set();

    existingMessages.forEach((msg, existingIndex) => {
      const localId = Number(msg?.id);
      if (Number.isFinite(localId) && localId > 0) {
        existingLocalIds.push(localId);
        existingMessageByLocalId.set(localId, msg);
        existingLocalOrderById.set(localId, existingIndex);
      }
      const serverId = String(msg?.serverId ?? '').trim();
      if (serverId && Number.isFinite(localId) && localId > 0) {
        existingByServerId.set(serverId, localId);
        existingMessageByServerId.set(serverId, msg);
      }
    });

    const pendingOwnCandidatesByKey = new Map();
    existingMessages.forEach((msg) => {
      if (!this.isRecentOwnUnsyncedMessage(msg)) return;
      const serverId = String(msg.serverId ?? '').trim();
      if (serverId) return;
      const localId = Number(msg.id);
      if (!Number.isFinite(localId) || localId <= 0) return;
      const key = this.getComparableMessageKey(msg);
      if (!key) return;
      const candidate = {
        localId,
        ts: this.getMessageTimestampValue(msg),
        used: false
      };
      if (!pendingOwnCandidatesByKey.has(key)) {
        pendingOwnCandidatesByKey.set(key, [candidate]);
      } else {
        pendingOwnCandidatesByKey.get(key).push(candidate);
      }
    });

    let nextLocalId = Math.max(0, ...existingLocalIds) + 1;
    let groupMetaChanged = false;

    const serverMappedMessages = visibleServerMessages
      .map((item, index) => {
        const serverId = String(item.id ?? item.messageId ?? item._id ?? '').trim();
        let localId = serverId ? existingByServerId.get(serverId) : null;
        const existingLocalMessage = serverId ? existingMessageByServerId.get(serverId) : null;
        if (!Number.isFinite(localId) || localId <= 0 || usedIds.has(localId)) {
          localId = nextLocalId;
          nextLocalId += 1;
        }

        const createdAt = item.createdAt ?? item.timestamp ?? item.date ?? new Date().toISOString();
        const createdAtTs = new Date(createdAt).getTime();
        const { date, time } = this.formatLocalMessageDateParts(createdAt);
        // Some APIs use `userId` as "current viewer id" in response mapping.
        // Prefer explicit sender/author keys first.
        const senderId = String(
          item.senderId
            ?? item.fromUserId
            ?? item.authorId
            ?? item.ownerId
            ?? item.createdById
            ?? item.sender?.id
            ?? item.author?.id
            ?? item.fromUser?.id
            ?? item.createdBy?.id
            ?? item.user?.id
            ?? item.userId
            ?? ''
        ).trim();
        const participantMeta = senderId
          ? this.getChatParticipantMetaById(chat, senderId)
          : null;
        const cachedSenderMeta = senderId && typeof this.getCachedUserMeta === 'function'
          ? (this.getCachedUserMeta(senderId) || {})
          : {};
        const senderName = String(
          this.extractMessageSenderName(item)
          || participantMeta?.name
          || cachedSenderMeta?.name
          || ''
        ).trim();
        const senderAvatarImage = this.getAvatarImage(
          this.extractMessageSenderAvatar(item)
          || participantMeta?.avatarImage
          || cachedSenderMeta?.avatarImage
          || ''
        );
        const senderAvatarColor = String(
          this.extractMessageSenderAvatarColor(item)
          || participantMeta?.avatarColor
          || cachedSenderMeta?.avatarColor
          || ''
        ).trim();
        this.cacheKnownUserMeta(senderId, {
          name: senderName,
          avatarImage: senderAvatarImage,
          avatarColor: senderAvatarColor
        });

        const fromFlag = String(item.from ?? '').trim().toLowerCase();
        let from = 'other';
        if (senderId) {
          from = senderId === selfId ? 'own' : 'other';
        } else if (fromFlag) {
          const ownFlags = new Set(['own', 'me', 'self', 'mine']);
          from = ownFlags.has(fromFlag) ? 'own' : 'other';
        }
        if (existingLocalMessage?.from === 'own') {
          from = 'own';
        }

        const content = item.content ?? item.text ?? item.message ?? '';
        const text = String(content ?? '');
        const parsedGroupMeta = chat?.isGroup
          ? this.parseGroupMetaMessageText(text)
          : null;
        if (parsedGroupMeta) {
          groupMetaChanged = this.applyGroupMetaToChat(chat, parsedGroupMeta) || groupMetaChanged;
          return null;
        }
        const attachmentUrl = this.normalizeAttachmentUrl(item.attachmentUrl ?? item.fileUrl ?? '');
        const rawImageUrl = this.normalizeAttachmentUrl(item.imageUrl ?? '');
        const rawAudioUrl = this.normalizeAttachmentUrl(item.audioUrl ?? '');
        const attachmentMime = String(item.attachmentMimeType ?? item.mimeType ?? '').toLowerCase();
        const fileName = String(item.fileName ?? item.filename ?? item.originalName ?? item.name ?? '').trim();
        const readBy = this.normalizeMessageReadEntries(item.readBy ?? item.reads ?? item.seenBy);
        const imageUrl = rawImageUrl || (
          attachmentMime.startsWith('image/')
            ? attachmentUrl
            : ''
        );
        const incomingImageDimensions = this.normalizeImageDimensions(
          item.imageWidth ?? item.width ?? item.mediaWidth ?? item.attachmentWidth ?? item.metadata?.width,
          item.imageHeight ?? item.height ?? item.mediaHeight ?? item.attachmentHeight ?? item.metadata?.height
        );
        const audioUrl = rawAudioUrl || (
          attachmentMime.startsWith('audio/')
            ? attachmentUrl
            : ''
        );
        let type = String(item.type ?? '').trim();
        const explicitEditedFlag = item.edited ?? item.isEdited ?? item.wasEdited;
        const serverEdited = explicitEditedFlag === true || explicitEditedFlag === 1 || explicitEditedFlag === 'true';
        const localEdited = Boolean(existingLocalMessage?.edited);
        if (!type) {
          if (audioUrl || attachmentMime.startsWith('audio/')) {
            type = 'voice';
          } else if (imageUrl && (attachmentMime.startsWith('image/') || /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(imageUrl))) {
            type = 'image';
          } else if (attachmentUrl) {
            type = 'file';
          } else {
            type = 'text';
          }
        }

        if (!existingLocalMessage && from === 'own' && serverId) {
          const comparableKey = this.getComparableMessageKey({
            type,
            text,
            imageUrl: type === 'image' ? imageUrl : '',
            audioUrl: type === 'voice' ? audioUrl : '',
            fileUrl: type === 'file' ? attachmentUrl : ''
          });
          const candidates = pendingOwnCandidatesByKey.get(comparableKey) || [];
          let matchedCandidate = null;
          let bestDelta = Number.POSITIVE_INFINITY;
          for (const candidate of candidates) {
            if (!candidate || candidate.used || usedIds.has(candidate.localId)) continue;
            if (!Number.isFinite(createdAtTs) || !Number.isFinite(candidate.ts)) {
              matchedCandidate = candidate;
              break;
            }
            const delta = Math.abs(createdAtTs - candidate.ts);
            if (delta <= 45000 && delta < bestDelta) {
              bestDelta = delta;
              matchedCandidate = candidate;
            }
          }
          if (matchedCandidate && Number.isFinite(matchedCandidate.localId)) {
            localId = matchedCandidate.localId;
            matchedCandidate.used = true;
            from = 'own';
          }
        }

        if (!Number.isFinite(localId) || localId <= 0 || usedIds.has(localId)) {
          localId = nextLocalId;
          nextLocalId += 1;
        }
        usedIds.add(localId);

        const matchedLocalMessage = existingMessageByLocalId.get(localId) || null;
        const preserveOwnVisual = Boolean(from === 'own' && matchedLocalMessage);
        const preserveLocalMediaPreview = Boolean(
          preserveOwnVisual
          && matchedLocalMessage?.localMediaPreview === true
        );
        const preservedImageDimensions = preserveOwnVisual
          ? this.normalizeImageDimensions(matchedLocalMessage?.imageWidth, matchedLocalMessage?.imageHeight)
          : null;
        const finalImageDimensions = incomingImageDimensions
          || preservedImageDimensions
          || this.getCachedChatImageDimensions(imageUrl);
        const preservedTime = preserveOwnVisual ? String(matchedLocalMessage.time || '') : '';
        const preservedDate = preserveOwnVisual ? String(matchedLocalMessage.date || '') : '';
        const preservedReplyTo = preserveOwnVisual && matchedLocalMessage.replyTo
          ? { ...matchedLocalMessage.replyTo }
          : null;
        const finalTime = preservedTime || time;
        const finalDate = preservedDate || date;
        const localSortValue = this.getMessageTimestampValue(matchedLocalMessage);
        const sortValue = Number.isFinite(localSortValue)
          ? localSortValue
          : (createdAtTs || index);
        const stableOrder = Number(existingLocalOrderById.get(localId));
        const hasStableOrder = Number.isFinite(stableOrder) && stableOrder >= 0;

        return {
          id: localId,
          serverId: serverId || null,
          text,
          from,
          senderId: senderId || null,
          senderName: senderName || '',
          senderAvatarImage: senderAvatarImage || '',
          senderAvatarColor: senderAvatarColor || '',
          type,
          time: finalTime,
          date: finalDate,
          createdAt: String(item.createdAt ?? item.timestamp ?? item.date ?? matchedLocalMessage?.createdAt ?? '').trim(),
          imageUrl: type === 'image'
            ? (preserveLocalMediaPreview && String(matchedLocalMessage?.imageUrl || '').trim()
                ? String(matchedLocalMessage.imageUrl).trim()
                : imageUrl)
            : '',
          imageWidth: type === 'image' ? (finalImageDimensions?.width || null) : null,
          imageHeight: type === 'image' ? (finalImageDimensions?.height || null) : null,
          audioUrl: type === 'voice'
            ? (preserveLocalMediaPreview && String(matchedLocalMessage?.audioUrl || '').trim()
                ? String(matchedLocalMessage.audioUrl).trim()
                : audioUrl)
            : '',
          fileUrl: type === 'file' ? attachmentUrl : '',
          attachmentUrl,
          fileName,
          attachmentMimeType: attachmentMime,
          audioDuration: Number(item.audioDuration ?? item.duration ?? 0) || 0,
          readBy,
          edited: serverEdited || localEdited,
          replyTo: preservedReplyTo,
          pending: false,
          localMediaPreview: preserveLocalMediaPreview,
          _sortValue: sortValue,
          _stableOrder: hasStableOrder ? stableOrder : null,
          _sourceIndex: index
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const aStable = Number(a?._stableOrder);
        const bStable = Number(b?._stableOrder);
        const aHasStable = Number.isFinite(aStable) && aStable >= 0;
        const bHasStable = Number.isFinite(bStable) && bStable >= 0;

        if (aHasStable && bHasStable) {
          if (aStable !== bStable) return aStable - bStable;
        } else if (aHasStable !== bHasStable) {
          // Keep previously rendered messages fixed; append unmatched server items around them later.
          return aHasStable ? -1 : 1;
        }

        const aSort = Number(a?._sortValue);
        const bSort = Number(b?._sortValue);
        if (aSort !== bSort) return aSort - bSort;

        const aSource = Number(a?._sourceIndex);
        const bSource = Number(b?._sourceIndex);
        return (Number.isFinite(aSource) ? aSource : 0) - (Number.isFinite(bSource) ? bSource : 0);
      });
    const normalizedServerMessages = serverMappedMessages
      .map(({ _sortValue, _stableOrder, _sourceIndex, ...message }) => message);

    const mergedMessages = this.mergeRecentPendingOwnMessages(normalizedServerMessages, existingMessages, {
      ttlMs: 45000
    });
    if (groupMetaChanged && typeof this.saveChats === 'function') {
      this.saveChats();
    }
    return mergedMessages;
  }


  async syncChatsFromServer({ preserveSelection = true, renderIfChanged = true } = {}) {
    const userId = this.getAuthUserId();
    if (!userId) return false;

    const response = await fetch(buildApiUrl('/chats'), {
      headers: this.getApiHeaders()
    });
    const data = await this.readJsonSafe(response);
    if (!response.ok) {
      throw new Error(this.getRequestErrorMessage(data, 'Не вдалося оновити список чатів.'));
    }

    const normalizedChats = this.normalizeServerChatsPayload(data);
    const hiddenBySelfDelete = this.getSelfDeletedChatsMap();
    const visibleChats = [];
    for (const serverChat of normalizedChats) {
      const marker = hiddenBySelfDelete[serverChat.serverId];
      if (!marker) {
        visibleChats.push(serverChat);
        continue;
      }
      const shouldRestore = await this.hasNewServerMessageAfterSelfDelete(serverChat.serverId, marker);
      if (shouldRestore) {
        this.unmarkChatDeletedForSelf(serverChat.serverId);
        visibleChats.push(serverChat);
      }
    }
    const deduplicatedVisibleChats = this.deduplicateNormalizedServerChats(visibleChats);

    const previousChats = Array.isArray(this.chats) ? this.chats : [];
    const previousCurrentServerId = this.resolveChatServerId(this.currentChat);
    const previousCurrentLocalId = this.currentChat?.id;
    const byServerId = new Map();
    const byParticipantId = new Map();
    previousChats.forEach((chat) => {
      const serverId = this.resolveChatServerId(chat);
      if (serverId) byServerId.set(serverId, chat);
      if (!chat.isGroup && chat.participantId) {
        byParticipantId.set(String(chat.participantId), chat);
      }
    });

    const activeServerId = this.resolveChatServerId(this.currentChat);
    const activeLocalId = this.currentChat?.id;
    const bootstrapReadMarkerByServerId = new Map();
    let nextLocalId = Math.max(0, ...previousChats.map((chat) => Number(chat?.id) || 0)) + 1;
    let changed = false;
    const nextChats = deduplicatedVisibleChats.map((serverChat) => {
      let existing = byServerId.get(serverChat.serverId) || null;
      if (!existing && !serverChat.isGroup && serverChat.participantId) {
        existing = byParticipantId.get(serverChat.participantId) || null;
      }

      const localId = existing?.id ?? nextLocalId++;
      const messages = Array.isArray(existing?.messages) ? existing.messages : [];
      const existingGroupParticipants = Array.isArray(existing?.groupParticipants) ? existing.groupParticipants : [];
      const incomingGroupParticipants = Array.isArray(serverChat.groupParticipants) ? serverChat.groupParticipants : [];
      const existingParticipantId = String(existing?.participantId || '').trim();
      const incomingParticipantId = String(serverChat.participantId || '').trim();
      const incomingConfidence = Number(serverChat.participantConfidence || 0);
      const existingConfidence = Number(existing?.participantConfidence || 0);
      const shouldOverrideParticipantId = Boolean(
        incomingParticipantId
        && (
          !existingParticipantId
          || (
            incomingParticipantId !== existingParticipantId
            && incomingConfidence >= 2
            && incomingConfidence >= existingConfidence
          )
        )
      );
      const mergedParticipantId = shouldOverrideParticipantId
        ? incomingParticipantId
        : (existingParticipantId || incomingParticipantId || null);
      const cachedParticipantMeta = this.getCachedUserMeta(mergedParticipantId);
      const cachedParticipantName = String(cachedParticipantMeta?.name || '').trim();
      const cachedParticipantAvatar = this.getAvatarImage(cachedParticipantMeta?.avatarImage);
      const serverName = String(serverChat.name || '').trim();
      const existingName = String(existing?.name || '').trim();
      const hasValidServerName = !this.isGenericOrInvalidChatName(serverName, { isGroup: serverChat.isGroup });
      const hasValidExistingName = !this.isGenericOrInvalidChatName(existingName, { isGroup: serverChat.isGroup });
      const mergedName = serverChat.isGroup
        ? (serverName || existingName || 'Новий чат')
        : (cachedParticipantName || (hasValidServerName ? serverName : '') || (hasValidExistingName ? existingName : '') || 'Новий чат');
      const incomingAvatarImage = this.getAvatarImage(serverChat.avatarImage || serverChat.avatarUrl);
      const existingAvatarImage = this.getAvatarImage(existing?.avatarImage || existing?.avatarUrl);
      const mergedAvatarImage = serverChat.isGroup
        ? this.getAvatarImage(incomingAvatarImage || existingAvatarImage)
        : this.getAvatarImage(cachedParticipantAvatar || incomingAvatarImage || existingAvatarImage);
      const incomingAvatarColor = String(serverChat.avatarColor || '').trim();
      const existingAvatarColor = String(existing?.avatarColor || '').trim();
      const mergedAvatarColor = String(
        serverChat.isGroup
          ? (incomingAvatarColor || existingAvatarColor || '')
          : (
            incomingAvatarColor
            || cachedParticipantMeta?.avatarColor
            || existingAvatarColor
            || ''
          )
      ).trim();
      const mergedStatus = serverChat.isGroup
        ? ''
        : this.getPresenceStatusForUser(
          mergedParticipantId,
          String(
            serverChat.status
            || cachedParticipantMeta?.status
            || existing?.status
            || 'offline'
          ).trim() || 'offline'
        );
      const mergedGroupParticipants = serverChat.isGroup
        ? (
          incomingGroupParticipants.length
            ? incomingGroupParticipants
            : existingGroupParticipants
        )
        : [];

      const updatedChat = {
        ...(existing || {}),
        id: localId,
        serverId: serverChat.serverId,
        participantId: mergedParticipantId,
        participantConfidence: shouldOverrideParticipantId
          ? incomingConfidence
          : Math.max(existingConfidence, incomingConfidence),
        name: mergedName,
        avatarImage: mergedAvatarImage,
        avatarUrl: mergedAvatarImage,
        avatarColor: mergedAvatarColor,
        status: mergedStatus,
        isGroup: serverChat.isGroup,
        groupParticipants: mergedGroupParticipants,
        messages
      };

      if (
        !existing
        || this.resolveChatServerId(existing) !== updatedChat.serverId
        || existing.name !== updatedChat.name
        || Boolean(existing.isGroup) !== Boolean(updatedChat.isGroup)
        || String(existing.participantId || '') !== String(updatedChat.participantId || '')
        || this.getAvatarImage(existing?.avatarImage || existing?.avatarUrl) !== updatedChat.avatarImage
        || String(existing?.avatarColor || '') !== String(updatedChat.avatarColor || '')
        || JSON.stringify(existingGroupParticipants) !== JSON.stringify(mergedGroupParticipants)
        || String(existing?.status || '') !== String(updatedChat.status || '')
      ) {
        changed = true;
      }

      const existingHasReadState = Boolean(
        existing?.readTrackingInitialized
        || String(existing?.lastReadServerMessageId || '').trim()
        || String(existing?.lastReadMessageAt || '').trim()
        || Number(existing?.unreadCount || 0) > 0
      );
      const existingMarker = existingHasReadState
        ? null
        : this.getLatestLocalMessageMarker(messages);
      bootstrapReadMarkerByServerId.set(serverChat.serverId, existingMarker);
      return updatedChat;
    });

    const missingCyclesById = this.serverMissingChatCyclesById instanceof Map
      ? this.serverMissingChatCyclesById
      : new Map();
    this.serverMissingChatCyclesById = missingCyclesById;

    const presentServerIds = new Set(
      nextChats
        .map((chat) => String(chat?.serverId || '').trim())
        .filter(Boolean)
    );
    const presentDirectParticipantIds = new Set(
      nextChats
        .filter((chat) => chat && !chat.isGroup)
        .map((chat) => String(chat?.participantId || '').trim())
        .filter(Boolean)
    );

    for (const presentId of presentServerIds) {
      missingCyclesById.delete(presentId);
    }

    previousChats.forEach((prevChat) => {
      if (!prevChat) return;
      const prevServerId = this.resolveChatServerId(prevChat);
      if (!prevServerId || presentServerIds.has(prevServerId)) return;

      const nextMissingCycles = Number(missingCyclesById.get(prevServerId) || 0) + 1;
      missingCyclesById.set(prevServerId, nextMissingCycles);

      const isPreviouslyActive = Boolean(
        (previousCurrentServerId && prevServerId === previousCurrentServerId)
        || (previousCurrentLocalId != null && prevChat.id === previousCurrentLocalId)
      );
      const hasLocalMessages = Array.isArray(prevChat.messages) && prevChat.messages.length > 0;
      const hasPendingLocalMessages = hasLocalMessages
        && prevChat.messages.some((item) => item?.from === 'own' && item?.pending === true);

      const directParticipantId = String(prevChat.participantId || '').trim();
      const wouldDuplicateDirectByParticipant = Boolean(
        !prevChat.isGroup
        && directParticipantId
        && presentDirectParticipantIds.has(directParticipantId)
      );

      const shouldKeepTransiently = nextMissingCycles <= 3
        && !wouldDuplicateDirectByParticipant
        && (isPreviouslyActive || hasLocalMessages || hasPendingLocalMessages);

      if (!shouldKeepTransiently) {
        return;
      }

      nextChats.push({
        ...prevChat,
        messages: Array.isArray(prevChat.messages) ? [...prevChat.messages] : []
      });
      presentServerIds.add(prevServerId);
      if (!prevChat.isGroup && directParticipantId) {
        presentDirectParticipantIds.add(directParticipantId);
      }
    });

    const unresolvedDirectChats = nextChats.filter((chat) => {
      if (!chat || chat.isGroup || !chat.participantId) return false;
      const hasReliableName = String(chat.name || '').trim()
        && chat.name !== 'Новий чат'
        && !this.isNameMatchingCurrentUser(chat.name);
      const hasAvatar = Boolean(this.getAvatarImage(chat.avatarImage || chat.avatarUrl));
      return !hasReliableName || !hasAvatar;
    });

    for (const chat of unresolvedDirectChats) {
      const resolvedName = await this.resolveUserNameById(chat.participantId);
      if (resolvedName && resolvedName !== chat.name) {
        chat.name = resolvedName;
        changed = true;
      }
      const cachedAvatar = this.getCachedUserAvatar(chat.participantId);
      if (cachedAvatar && cachedAvatar !== this.getAvatarImage(chat.avatarImage || chat.avatarUrl)) {
        chat.avatarImage = cachedAvatar;
        chat.avatarUrl = cachedAvatar;
        changed = true;
      }
    }

    const inactiveChatsNeedingRefresh = nextChats.filter((chat) => {
      if (!chat?.serverId) return false;
      const isActiveChat = Boolean(
        (activeServerId && chat.serverId === activeServerId)
        || chat.id === activeLocalId
      );
      if (isActiveChat) return false;

      const serverActivityTs = this.getChatActivityTimestampValue(chat);
      if (!Number.isFinite(serverActivityTs) || serverActivityTs <= 0) return false;

      const messages = Array.isArray(chat.messages) ? chat.messages : [];
      if (!messages.length) return true;

      const lastLocalMessage = messages[messages.length - 1] || null;
      const lastLocalTs = this.getMessageTimestampValue(lastLocalMessage);
      if (!Number.isFinite(lastLocalTs) || lastLocalTs <= 0) return true;

      return serverActivityTs > lastLocalTs + 500;
    });

    for (const chat of inactiveChatsNeedingRefresh) {
      try {
        const previousMessages = Array.isArray(chat.messages) ? [...chat.messages] : [];
        const serverMessages = await this.fetchChatMessagesFromServer(chat);
        const mappedMessages = this.mapServerMessagesToLocal(chat, serverMessages);
        const nextMessages = this.mergeRecentPendingOwnMessages(
          mappedMessages,
          previousMessages
        );
        const previousLastKey = previousMessages.length
          ? this.getMessageStableKey(previousMessages[previousMessages.length - 1])
          : '';
        const nextLastKey = nextMessages.length
          ? this.getMessageStableKey(nextMessages[nextMessages.length - 1])
          : '';

        this.notifyDesktopForNewMessages(chat, previousMessages, nextMessages);
        chat.messages = nextMessages;
        this.applyChatMessagesPaginationState(chat, {
          nextCursor: this.inferChatMessagesNextCursor(serverMessages, chat.messagesPageSize || this.getChatMessagesPageSize())
        });

        if (previousLastKey !== nextLastKey) {
          changed = true;
        }
      } catch {
        // Keep sidebar responsive if one chat refresh fails.
      }
    }

    nextChats.forEach((chat) => {
      if (!chat?.serverId) return;
      const isActiveChat = Boolean(
        (activeServerId && chat.serverId === activeServerId)
        || chat.id === activeLocalId
      );
      const cachedMessages = Array.isArray(chat.messages) ? chat.messages : [];

      let hasReadState = Boolean(
        chat.readTrackingInitialized
        || String(chat.lastReadServerMessageId || '').trim()
        || String(chat.lastReadMessageAt || '').trim()
        || Number(chat.unreadCount || 0) > 0
      );

      if (!isActiveChat && !hasReadState) {
        const bootstrapMarker = bootstrapReadMarkerByServerId.get(chat.serverId);
        if (bootstrapMarker && typeof bootstrapMarker === 'object') {
          chat.lastReadServerMessageId = String(bootstrapMarker.serverMessageId || '').trim();
          chat.lastReadMessageAt = String(bootstrapMarker.createdAt || '').trim();
          chat.readTrackingInitialized = true;
          changed = true;
          hasReadState = true;
        }
      }

      if (this.applyChatUnreadState(chat, cachedMessages, { markAsRead: isActiveChat })) {
        changed = true;
      }
    });

    const previousSignature = previousChats
      .map((chat) => {
        const lastMsg = Array.isArray(chat.messages) && chat.messages.length
          ? chat.messages[chat.messages.length - 1]
          : null;
        return `${this.resolveChatServerId(chat)}:${chat.name}:${chat.isGroup ? 1 : 0}:${chat.participantId || ''}:${this.getAvatarImage(chat.avatarImage || chat.avatarUrl)}:${String(lastMsg?.serverId || lastMsg?.id || '')}:${Number(chat.unreadCount || 0)}`;
      })
      .join('|');
    const nextSignature = nextChats
      .map((chat) => {
        const lastMsg = Array.isArray(chat.messages) && chat.messages.length
          ? chat.messages[chat.messages.length - 1]
          : null;
        return `${chat.serverId}:${chat.name}:${chat.isGroup ? 1 : 0}:${chat.participantId || ''}:${this.getAvatarImage(chat.avatarImage || chat.avatarUrl)}:${String(lastMsg?.serverId || lastMsg?.id || '')}:${Number(chat.unreadCount || 0)}`;
      })
      .join('|');
    if (previousSignature !== nextSignature) {
      changed = true;
    }

    if (!changed) {
      return false;
    }

    this.chats = nextChats;
    this.saveChats();
    this.syncRealtimeChatRooms(this.chats);

    if (preserveSelection) {
      const restoredCurrent = this.chats.find((chat) => {
        const serverId = this.resolveChatServerId(chat);
        if (previousCurrentServerId && serverId === previousCurrentServerId) return true;
        return chat.id === previousCurrentLocalId;
      }) || null;
      this.currentChat = restoredCurrent;
    }

    if (this.currentChat) {
      this.joinRealtimeChatRoom(this.currentChat);
    } else {
      this.leaveRealtimeChatRoom();
    }

    if (renderIfChanged && changed) {
      this.renderChatsList();
      this.updateChatHeader();
    }

    return changed;
  }


  async fetchChatMessagesPageFromServer(chat, { cursor = '', limit = null } = {}) {
    const chatServerId = this.resolveChatServerId(chat);
    if (!chatServerId) return { items: [], nextCursor: null };
    const safeLimit = Number.isFinite(Number(limit)) ? Math.max(1, Number(limit)) : this.getChatMessagesPageSize();
    const safeCursor = String(cursor || '').trim();

    const pageParams = new URLSearchParams({
      chatId: chatServerId,
      limit: String(safeLimit)
    });
    if (safeCursor) {
      pageParams.set('cursor', safeCursor);
    }

    let pageResponse;
    let pageData;
    try {
      pageResponse = await fetch(buildApiUrl(`/messages/page?${pageParams.toString()}`), {
        headers: this.getApiHeaders()
      });
      pageData = await this.readJsonSafe(pageResponse);
    } catch (error) {
      if (safeCursor) {
        return { items: [], nextCursor: null };
      }
      throw error;
    }

    if (pageResponse.ok) {
      return this.normalizeServerMessagesPagePayload(pageData);
    }

    if (pageResponse.status !== 404 && pageResponse.status !== 405) {
      if (safeCursor) {
        return { items: [], nextCursor: null };
      }
      throw new Error(this.getRequestErrorMessage(pageData, 'Не вдалося завантажити повідомлення.'));
    }

    if (safeCursor) {
      return { items: [], nextCursor: null };
    }

    const fallbackResponse = await fetch(buildApiUrl(`/messages?chatId=${encodeURIComponent(chatServerId)}`), {
      headers: this.getApiHeaders()
    });
    const fallbackData = await this.readJsonSafe(fallbackResponse);
    if (!fallbackResponse.ok) {
      throw new Error(this.getRequestErrorMessage(fallbackData, 'Не вдалося завантажити повідомлення.'));
    }
    const items = this.normalizeServerMessagesPayload(fallbackData);
    const nextCursor = items.length >= safeLimit
      ? String(items[items.length - 1]?.id ?? items[items.length - 1]?.messageId ?? '').trim() || null
      : null;
    return { items, nextCursor };
  }


  async fetchChatMessagesFromServer(chat) {
    const chatServerId = this.resolveChatServerId(chat);
    if (!chatServerId) return [];
    const response = await fetch(buildApiUrl(`/messages?chatId=${encodeURIComponent(chatServerId)}`), {
      headers: this.getApiHeaders()
    });
    const data = await this.readJsonSafe(response);
    if (!response.ok) {
      throw new Error(this.getRequestErrorMessage(data, 'Не вдалося завантажити повідомлення.'));
    }
    return this.normalizeServerMessagesPayload(data);
  }


  inferChatMessagesNextCursor(messages = [], pageSize = this.getChatMessagesPageSize()) {
    const safeMessages = Array.isArray(messages) ? messages : [];
    const safePageSize = Number.isFinite(Number(pageSize)) ? Math.max(1, Number(pageSize)) : this.getChatMessagesPageSize();
    if (safeMessages.length < safePageSize) return null;
    const lastItem = safeMessages[safeMessages.length - 1];
    return String(lastItem?.id ?? lastItem?.messageId ?? lastItem?._id ?? '').trim() || null;
  }


  applyChatMessagesPaginationState(chat, { nextCursor = null, preserveCursor = false } = {}) {
    if (!chat || typeof chat !== 'object') return;
    if (!preserveCursor) {
      chat.messagesNextCursor = nextCursor ? String(nextCursor).trim() : null;
    } else if (!('messagesNextCursor' in chat)) {
      chat.messagesNextCursor = nextCursor ? String(nextCursor).trim() : null;
    }
    chat.messagesPageSize = this.getChatMessagesPageSize();
    chat.messagesPaginationReady = true;
  }


  showMessagesTopLoader(container = document.getElementById('messagesContainer')) {
    if (!container) return null;
    let loader = container.querySelector('.messages-top-loader');
    if (loader) {
      loader.hidden = false;
      return loader;
    }

    loader = document.createElement('div');
    loader.className = 'messages-top-loader';
    loader.setAttribute('role', 'status');
    loader.setAttribute('aria-live', 'polite');
    loader.innerHTML = `
      <span class="messages-top-loader-spinner" aria-hidden="true"></span>
      <span class="messages-top-loader-text">Завантаження повідомлень...</span>
    `;
    container.prepend(loader);
    return loader;
  }


  hideMessagesTopLoader(container = document.getElementById('messagesContainer')) {
    if (!container) return;
    const loader = container.querySelector('.messages-top-loader');
    if (loader) {
      loader.remove();
    }
  }


  async loadOlderMessagesPage(chat = this.currentChat) {
    if (!chat || this.loadingOlderMessages === true) return false;
    const chatCursor = String(chat.messagesNextCursor || '').trim();
    if (!chatCursor) return false;

    this.loadingOlderMessages = true;
    const container = document.getElementById('messagesContainer');
    this.showMessagesTopLoader(container);
    try {
      const previousScrollHeight = container?.scrollHeight || 0;
      const previousScrollTop = container?.scrollTop || 0;
      const page = await this.fetchChatMessagesPageFromServer(chat, {
        cursor: chatCursor,
        limit: chat.messagesPageSize || this.getChatMessagesPageSize()
      });
      const pageMessages = this.mapServerMessagesToLocal(chat, page.items);
      const existingKeys = new Set(
        (Array.isArray(chat.messages) ? chat.messages : [])
          .map((msg) => this.getMessageStableKey(msg))
          .filter(Boolean)
      );
      const olderMessages = pageMessages.filter((msg) => {
        const key = this.getMessageStableKey(msg);
        return key && !existingKeys.has(key);
      });

      if (olderMessages.length) {
        chat.messages = [...olderMessages, ...(Array.isArray(chat.messages) ? chat.messages : [])];
      }
      this.applyChatMessagesPaginationState(chat, { nextCursor: page.nextCursor });
      this.saveChats();

      if (olderMessages.length && container) {
        this.skipNextRenderChatAutoScroll = true;
        this.renderChat();
        const nextHeight = container.scrollHeight;
        container.scrollTop = previousScrollTop + Math.max(0, nextHeight - previousScrollHeight);
        this.updateMessagesScrollBottomButtonVisibility();
      }

      return olderMessages.length > 0;
    } finally {
      this.loadingOlderMessages = false;
      this.hideMessagesTopLoader(container);
    }
  }


  renderChatAfterSync({ forceScroll = false, highlightId = null } = {}) {
    if (!this.currentChat) return;
    const container = document.getElementById('messagesContainer');
    if (!container) {
      if (typeof this.primeRecentChatImageUrls === 'function') {
        this.primeRecentChatImageUrls(this.currentChat);
      }
      this.renderChat(highlightId);
      return;
    }

    const previousScrollTop = container.scrollTop;
    const previousScrollBottomGap = container.scrollHeight - container.clientHeight - previousScrollTop;
    const shouldStickToBottom = forceScroll || previousScrollBottomGap <= 140;
    let anchorMessageId = '';
    let anchorOffsetTop = 0;
    if (!shouldStickToBottom) {
      const containerRect = container.getBoundingClientRect();
      const messageNodes = Array.from(container.querySelectorAll('.message'));
      const firstVisibleMessage = messageNodes.find((node) => {
        const rect = node.getBoundingClientRect();
        return rect.bottom > containerRect.top + 1;
      }) || null;
      if (firstVisibleMessage) {
        anchorMessageId = String(firstVisibleMessage.dataset.id || '');
        anchorOffsetTop = firstVisibleMessage.getBoundingClientRect().top - containerRect.top;
      }
    }

    this.skipNextRenderChatAutoScroll = true;
    if (typeof this.primeRecentChatImageUrls === 'function') {
      this.primeRecentChatImageUrls(this.currentChat);
    }
    if (shouldStickToBottom && typeof this.enableMessagesMediaAutoScroll === 'function') {
      this.enableMessagesMediaAutoScroll(container);
    }
    this.renderChat(highlightId);

    if (shouldStickToBottom) {
      if (typeof this.syncMessagesContainerToBottom === 'function') {
        this.syncMessagesContainerToBottom(container);
      } else {
        container.scrollTop = container.scrollHeight;
        this.updateMessagesScrollBottomButtonVisibility();
      }
      return;
    }

    let restoredByAnchor = false;
    if (anchorMessageId) {
      const containerRect = container.getBoundingClientRect();
      const nextAnchor = Array.from(container.querySelectorAll('.message'))
        .find((node) => String(node.dataset.id || '') === anchorMessageId);
      if (nextAnchor) {
        const nextOffsetTop = nextAnchor.getBoundingClientRect().top - containerRect.top;
        const delta = nextOffsetTop - anchorOffsetTop;
        if (Math.abs(delta) > 0.25) {
          container.scrollTop += delta;
        }
        restoredByAnchor = true;
      }
    }

    if (!restoredByAnchor) {
      const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
      container.scrollTop = Math.max(0, Math.min(previousScrollTop, maxTop));
    }

    this.updateMessagesScrollBottomButtonVisibility();
  }


  async syncCurrentChatMessagesFromServer({ forceScroll = false, highlightOwn = true } = {}) {
    if (!this.currentChat) return false;
    const targetChat = this.currentChat;
    const pageSize = targetChat.messagesPageSize || this.getChatMessagesPageSize();
    const serverMessages = await this.fetchChatMessagesFromServer(targetChat);
    const prevMessages = Array.isArray(targetChat.messages) ? targetChat.messages : [];
    const mappedRecentMessages = this.mapServerMessagesToLocal(targetChat, serverMessages);
    const nextRecentMessages = this.mergeRecentPendingOwnMessages(
      mappedRecentMessages,
      prevMessages
    );
    const preservedOlderMessages = this.getPreservedOlderMessages(prevMessages, nextRecentMessages);
    const nextMessages = [...preservedOlderMessages, ...nextRecentMessages];
    const inferredNextCursor = this.inferChatMessagesNextCursor(serverMessages, pageSize);
    this.applyChatMessagesPaginationState(targetChat, {
      nextCursor: inferredNextCursor,
      preserveCursor: preservedOlderMessages.length > 0 && Boolean(String(targetChat.messagesNextCursor || '').trim())
    });

    const previousSignature = prevMessages
      .map((msg) => `${msg.serverId || msg.id}:${msg.text}:${msg.time}:${msg.edited ? 1 : 0}`)
      .join('|');
    const nextSignature = nextMessages
      .map((msg) => `${msg.serverId || msg.id}:${msg.text}:${msg.time}:${msg.edited ? 1 : 0}`)
      .join('|');
    const previousStatusSignature = this.getMessageStatusSignature(prevMessages);
    const nextStatusSignature = this.getMessageStatusSignature(nextMessages);
    const previousVisualSignature = this.getMessagesVisualSignature(prevMessages);
    const nextVisualSignature = this.getMessagesVisualSignature(nextMessages);

    if (previousSignature === nextSignature && previousStatusSignature === nextStatusSignature) return false;

    this.notifyDesktopForNewMessages(targetChat, prevMessages, nextMessages);

    const previousKeys = new Set(
      prevMessages
        .map((msg) => String(msg?.serverId || `local:${msg?.id ?? ''}`))
        .filter(Boolean)
    );
    let newestAppendedMessageId = null;
    for (let i = nextMessages.length - 1; i >= 0; i -= 1) {
      const item = nextMessages[i];
      const key = String(item?.serverId || `local:${item?.id ?? ''}`);
      if (!previousKeys.has(key)) {
        if (!highlightOwn && item?.from === 'own') continue;
        newestAppendedMessageId = item?.id ?? null;
        break;
      }
    }

    targetChat.messages = nextMessages;
    this.applyChatUnreadState(targetChat, nextMessages, { markAsRead: true });
    if (targetChat === this.currentChat && typeof this.emitRealtimeReadReceipts === 'function') {
      this.emitRealtimeReadReceipts(targetChat);
    }
    let chatMetaChanged = false;
    if (!targetChat.isGroup) {
      const otherMessages = nextMessages.filter((msg) => msg.from === 'other');
      const otherMessage = otherMessages.length ? otherMessages[otherMessages.length - 1] : null;
      const otherSenderId = String(otherMessage?.senderId || '').trim();
      const otherSenderName = String(otherMessage?.senderName || '').trim();
      const otherSenderAvatarImage = this.getAvatarImage(otherMessage?.senderAvatarImage || '');
      const otherSenderAvatarColor = String(otherMessage?.senderAvatarColor || '').trim();

      if (otherSenderId && (!targetChat.participantId || targetChat.participantId !== otherSenderId)) {
        targetChat.participantId = otherSenderId;
        targetChat.participantConfidence = Math.max(2, Number(targetChat.participantConfidence || 0));
        chatMetaChanged = true;
      }
      if (otherSenderId || targetChat.participantId) {
        this.cacheKnownUserMeta(otherSenderId || targetChat.participantId, {
          name: otherSenderName,
          avatarImage: otherSenderAvatarImage,
          avatarColor: otherSenderAvatarColor
        });
      }
      if (otherSenderName && !this.isGenericOrInvalidChatName(otherSenderName, { isGroup: false })) {
        this.cacheKnownUserName(otherSenderId || targetChat.participantId, otherSenderName);
        if (targetChat.name !== otherSenderName) {
          targetChat.name = otherSenderName;
          chatMetaChanged = true;
        }
      }
      if (
        this.isGenericOrInvalidChatName(targetChat.name, { isGroup: false })
        && targetChat.participantId
      ) {
        const cachedName = this.getCachedUserName(targetChat.participantId);
        if (cachedName && cachedName !== targetChat.name) {
          targetChat.name = cachedName;
          chatMetaChanged = true;
        }
      }
      const cachedAvatar = this.getCachedUserAvatar(targetChat.participantId);
      const resolvedAvatarImage = this.getAvatarImage(otherSenderAvatarImage || cachedAvatar);
      if (resolvedAvatarImage && resolvedAvatarImage !== this.getAvatarImage(targetChat.avatarImage || targetChat.avatarUrl)) {
        targetChat.avatarImage = resolvedAvatarImage;
        targetChat.avatarUrl = resolvedAvatarImage;
        chatMetaChanged = true;
      }
      const cachedAvatarColor = String(this.getCachedUserMeta(targetChat.participantId)?.avatarColor || '').trim();
      const resolvedAvatarColor = String(otherSenderAvatarColor || cachedAvatarColor || '').trim();
      if (resolvedAvatarColor && resolvedAvatarColor !== String(targetChat.avatarColor || '').trim()) {
        targetChat.avatarColor = resolvedAvatarColor;
        chatMetaChanged = true;
      }
    }
    this.saveChats();
    this.renderChatsList();
    const visualChanged = previousVisualSignature !== nextVisualSignature;
    const statusChanged = previousStatusSignature !== nextStatusSignature;
    if (visualChanged) {
      const appendedIncrementally = this.canAppendMessagesIncrementally(prevMessages, nextMessages)
        && this.appendMessagesAfterSync(nextMessages.slice(prevMessages.length), prevMessages, {
          forceScroll,
          highlightOwn
        });
      if (!appendedIncrementally) {
        this.renderChatAfterSync({ forceScroll, highlightId: newestAppendedMessageId });
      }
      return true;
    }

    if (statusChanged) {
      this.refreshDeliveryStatusUi(nextMessages);
    }

    if (chatMetaChanged) {
      this.updateChatHeader();
    } else {
      this.updateMessagesScrollBottomButtonVisibility();
    }
    return true;
  }

}
