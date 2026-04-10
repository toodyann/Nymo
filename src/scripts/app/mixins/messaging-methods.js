import { getSettingsTemplate } from '../../ui/templates/settings-templates.js';
import { escapeHtml } from '../../shared/helpers/ui-helpers.js';
import { buildApiUrl } from '../../shared/api/api-url.js';
import { getAuthSession } from '../../shared/auth/auth-session.js';

const SELF_DELETED_CHATS_STORAGE_KEY = 'orion_self_deleted_chats';
const SELF_DELETED_MESSAGES_STORAGE_KEY = 'orion_self_deleted_messages';

export class ChatAppMessagingMethods {
  getSelfDeletedChatsStorageKey() {
    const userId = this.getAuthUserId();
    if (!userId) return SELF_DELETED_CHATS_STORAGE_KEY;
    return `${SELF_DELETED_CHATS_STORAGE_KEY}:${userId}`;
  }

  getSelfDeletedMessagesStorageKey() {
    const userId = this.getAuthUserId();
    if (!userId) return SELF_DELETED_MESSAGES_STORAGE_KEY;
    return `${SELF_DELETED_MESSAGES_STORAGE_KEY}:${userId}`;
  }

  decodeJwtPayload(token) {
    const raw = String(token || '').trim();
    if (!raw) return null;
    const parts = raw.split('.');
    if (parts.length < 2) return null;
    try {
      const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padLength = normalized.length % 4;
      const padded = normalized + (padLength ? '='.repeat(4 - padLength) : '');
      const decoded = atob(padded);
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }

  getAuthToken() {
    const session = getAuthSession();
    const token = session?.token ?? session?.accessToken ?? session?.access_token ?? '';
    const normalized = typeof token === 'string' ? token.trim() : '';
    return normalized.replace(/^Bearer\s+/i, '');
  }

  getAuthUserId() {
    const session = getAuthSession();
    const user = session?.user && typeof session.user === 'object' ? session.user : {};
    const directId = user.id ?? user.userId ?? user._id ?? user.sub ?? '';
    const directIdString = String(directId || '').trim();
    if (directIdString) return directIdString;

    const token = this.getAuthToken();
    if (token) {
      const payload = this.decodeJwtPayload(token);
      const sub = payload?.sub ?? payload?.userId ?? payload?.id ?? '';
      if (typeof sub === 'string' && sub.trim()) return sub.trim();
    }
    return '';
  }

  ensureDesktopNotificationDedupStore() {
    if (!(this.desktopNotificationSeenKeys instanceof Map)) {
      this.desktopNotificationSeenKeys = new Map();
    }
  }

  pruneDesktopNotificationDedupStore({ ttlMs = 180000 } = {}) {
    this.ensureDesktopNotificationDedupStore();
    const safeTtl = Math.max(15000, Number(ttlMs) || 180000);
    const now = Date.now();
    this.desktopNotificationSeenKeys.forEach((seenAt, key) => {
      if (!Number.isFinite(seenAt) || now - seenAt > safeTtl) {
        this.desktopNotificationSeenKeys.delete(key);
      }
    });
  }

  getDesktopNotificationMessageKey(chat, message) {
    if (!message || typeof message !== 'object') return '';
    const chatKey = this.resolveChatServerId(chat) || String(chat?.id || '').trim() || 'chat';
    const serverId = String(message.serverId || '').trim();
    if (serverId) return `server:${chatKey}:${serverId}`;

    const localId = Number(message.id);
    if (Number.isFinite(localId) && localId > 0) {
      const createdAt = String(message.createdAt || '').trim();
      const timestamp = Number(this.getMessageTimestampValue(message) || 0);
      return `local:${chatKey}:${localId}:${createdAt || timestamp}`;
    }

    const comparableKey = this.getComparableMessageKey(message);
    const timestamp = Number(this.getMessageTimestampValue(message) || 0);
    return `fallback:${chatKey}:${comparableKey}:${timestamp}`;
  }

  getDesktopNotificationBody(chat, message) {
    const safeChat = chat && typeof chat === 'object' ? chat : {};
    const safeMessage = message && typeof message === 'object' ? message : {};
    const senderName = String(safeMessage.senderName || '').trim();
    const isGroupChat = Boolean(safeChat.isGroup);
    const prefix = isGroupChat && senderName ? `${senderName}: ` : '';
    const previewEnabled = this.settings?.messagePreview !== false;
    const messageType = String(safeMessage.type || 'text').trim();
    const messageText = String(safeMessage.text || '').trim();
    const fileName = String(safeMessage.fileName || '').trim();

    if (!previewEnabled) {
      if (messageType === 'image') return `${prefix}Нове фото`;
      if (messageType === 'voice') return `${prefix}Нове голосове повідомлення`;
      if (messageType === 'file') return `${prefix}Новий файл`;
      return `${prefix}Нове повідомлення`;
    }

    if (messageType === 'image') {
      return `${prefix}${messageText ? `Фото: ${messageText}` : 'Надіслав(ла) фото'}`;
    }
    if (messageType === 'voice') {
      return `${prefix}Голосове повідомлення`;
    }
    if (messageType === 'file') {
      return `${prefix}${fileName ? `Файл: ${fileName}` : 'Надіслав(ла) файл'}`;
    }
    if (messageText) {
      return `${prefix}${messageText}`;
    }
    return `${prefix}Нове повідомлення`;
  }

  showDesktopBrowserNotification({
    title = 'Orion',
    body = '',
    icon = '',
    tag = '',
    data = null,
    notificationKey = '',
    requireEnabledSetting = true,
    closeAfterMs = 5000,
    silent = null,
    onClick = null
  } = {}) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return null;
    }
    if (requireEnabledSetting && this.settings?.desktopNotifications === false) {
      return null;
    }

    this.pruneDesktopNotificationDedupStore();
    const safeNotificationKey = String(notificationKey || '').trim();
    if (safeNotificationKey) {
      if (this.desktopNotificationSeenKeys.has(safeNotificationKey)) {
        return null;
      }
      this.desktopNotificationSeenKeys.set(safeNotificationKey, Date.now());
    }

    const safeTitle = String(title || '').trim() || 'Orion';
    const safeBody = String(body || '').trim();
    const safeIcon = this.getAvatarImage(icon);
    const safeTag = String(tag || safeNotificationKey || '').trim();
    const safeSilent = typeof silent === 'boolean' ? silent : !this.settings?.soundNotifications;
    const safeCloseAfterMs = Math.max(1500, Number(closeAfterMs) || 5000);
    const safeData = data && typeof data === 'object' ? { ...data } : undefined;
    const notificationOptions = {
      body: safeBody,
      icon: safeIcon || undefined,
      badge: safeIcon || undefined,
      tag: safeTag || undefined,
      data: safeData,
      silent: safeSilent
    };

    const showWindowNotification = () => {
      const notification = new Notification(safeTitle, notificationOptions);

      notification.onclick = () => {
        try {
          window.focus();
        } catch (_) {
        }
        if (typeof onClick === 'function') {
          try {
            onClick();
          } catch (_) {
          }
        }
        notification.close();
      };

      window.setTimeout(() => notification.close(), safeCloseAfterMs);
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration()
        .then((registration) => {
          if (!registration || typeof registration.showNotification !== 'function') {
            showWindowNotification();
            return null;
          }
          return registration.showNotification(safeTitle, notificationOptions);
        })
        .catch(() => {
          showWindowNotification();
        });
      return true;
    }

    showWindowNotification();
    return true;
  }

  notifyDesktopIncomingMessage(chat, message) {
    if (!chat || !message || typeof message !== 'object') return false;
    if (String(message.from || '').trim() === 'own') return false;

    const notificationKey = this.getDesktopNotificationMessageKey(chat, message);
    const title = String(chat.name || message.senderName || 'Orion').trim() || 'Orion';
    const body = this.getDesktopNotificationBody(chat, message);
    const icon = this.getAvatarImage(
      chat.avatarImage
      || chat.avatarUrl
      || message.senderAvatarImage
      || ''
    );
    const chatServerId = this.resolveChatServerId(chat);
    const localChatId = chat?.id;

    const notification = this.showDesktopBrowserNotification({
      title,
      body,
      icon,
      tag: notificationKey,
      data: {
        type: 'orion-open-chat',
        url: window.location.href,
        chatServerId,
        localChatId
      },
      notificationKey,
      requireEnabledSetting: true,
      onClick: () => {
        const resolvedChat = (Array.isArray(this.chats) ? this.chats : []).find((item) => {
          if (!item) return false;
          if (chatServerId && this.resolveChatServerId(item) === chatServerId) return true;
          return localChatId != null && item.id === localChatId;
        });
        if (resolvedChat && typeof this.selectChat === 'function') {
          this.selectChat(resolvedChat.id);
        }
      }
    });

    return Boolean(notification);
  }

  notifyDesktopForNewMessages(chat, prevMessages = [], nextMessages = []) {
    const safePrev = Array.isArray(prevMessages) ? prevMessages : [];
    const safeNext = Array.isArray(nextMessages) ? nextMessages : [];
    if (!chat || !safeNext.length) return;

    const previousKeys = new Set(
      safePrev
        .map((message) => this.getDesktopNotificationMessageKey(chat, message))
        .filter(Boolean)
    );

    safeNext.forEach((message) => {
      const key = this.getDesktopNotificationMessageKey(chat, message);
      if (!key || previousKeys.has(key)) return;
      this.notifyDesktopIncomingMessage(chat, message);
    });
  }

  getApiHeaders({ json = false } = {}) {
    const headers = {};
    if (json) headers['Content-Type'] = 'application/json';
    const token = this.getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const userId = this.getAuthUserId();
    if (userId) headers['X-User-Id'] = userId;
    return headers;
  }

  normalizeAttachmentUrl(value = '') {
    const normalized = String(value || '').trim();
    if (!normalized) return '';
    if (/^(?:https?:|data:|blob:)/i.test(normalized)) return normalized;
    if (/^\/?(?:storage|upload|uploads)\//i.test(normalized)) {
      const path = normalized.startsWith('/') ? normalized : `/${normalized}`;
      return buildApiUrl(path);
    }
    return normalized;
  }

  normalizeMessageReadEntries(value) {
    const source = Array.isArray(value) ? value : [];
    return source
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const userId = String(entry.userId ?? entry.id ?? '').trim();
        const readAt = String(entry.readAt ?? entry.createdAt ?? '').trim();
        if (!userId) return null;
        return { userId, readAt };
      })
      .filter(Boolean);
  }

  ensureMediaRetryDraftStore() {
    if (!(this.mediaRetryDrafts instanceof Map)) {
      this.mediaRetryDrafts = new Map();
    }
    if (!(this.managedObjectUrls instanceof Set)) {
      this.managedObjectUrls = new Set();
    }
  }

  createManagedObjectUrl(source) {
    if (!source || typeof URL?.createObjectURL !== 'function') return '';
    try {
      const objectUrl = URL.createObjectURL(source);
      if (objectUrl) {
        this.ensureMediaRetryDraftStore();
        this.managedObjectUrls.add(objectUrl);
      }
      return objectUrl;
    } catch (_) {
      return '';
    }
  }

  revokeManagedObjectUrl(url) {
    const safeUrl = String(url || '').trim();
    if (!safeUrl || !/^blob:/i.test(safeUrl)) return;
    if (typeof URL?.revokeObjectURL === 'function') {
      try {
        URL.revokeObjectURL(safeUrl);
      } catch (_) {
      }
    }
    if (this.managedObjectUrls instanceof Set) {
      this.managedObjectUrls.delete(safeUrl);
    }
  }

  normalizeImageDimensions(width, height) {
    const safeWidth = Math.max(1, Math.round(Number(width) || 0));
    const safeHeight = Math.max(1, Math.round(Number(height) || 0));
    if (!safeWidth || !safeHeight) return null;
    return { width: safeWidth, height: safeHeight };
  }

  ensureChatImageDimensionCache() {
    if (!(this.chatImageDimensionCache instanceof Map)) {
      this.chatImageDimensionCache = new Map();
    }
    if (!(this.chatImageDimensionLoadPromises instanceof Map)) {
      this.chatImageDimensionLoadPromises = new Map();
    }
  }

  getCachedChatImageDimensions(url = '') {
    const safeUrl = this.normalizeAttachmentUrl(url);
    if (!safeUrl) return null;
    this.ensureChatImageDimensionCache();
    const cached = this.chatImageDimensionCache.get(safeUrl);
    if (!cached || typeof cached !== 'object') return null;
    return this.normalizeImageDimensions(cached.width, cached.height);
  }

  setCachedChatImageDimensions(url = '', width = 0, height = 0) {
    const safeUrl = this.normalizeAttachmentUrl(url);
    const normalized = this.normalizeImageDimensions(width, height);
    if (!safeUrl || !normalized) return null;
    this.ensureChatImageDimensionCache();
    this.chatImageDimensionCache.set(safeUrl, normalized);
    return normalized;
  }

  applyMessageImageDimensions(message, width = 0, height = 0) {
    if (!message || typeof message !== 'object') return null;
    const normalized = this.normalizeImageDimensions(width, height);
    if (!normalized) return null;
    message.imageWidth = normalized.width;
    message.imageHeight = normalized.height;
    const imageUrl = String(message.imageUrl || '').trim();
    if (imageUrl) {
      this.setCachedChatImageDimensions(imageUrl, normalized.width, normalized.height);
    }
    return normalized;
  }

  getMessageImageDimensions(message) {
    if (!message || typeof message !== 'object') return null;
    const direct = this.normalizeImageDimensions(message.imageWidth, message.imageHeight);
    if (direct) return direct;
    return this.getCachedChatImageDimensions(message.imageUrl || '');
  }

  async getImageFileDimensions(file) {
    if (!(file instanceof File)) return null;
    const image = await this.loadImageElementFromFile(file);
    return this.normalizeImageDimensions(
      image.naturalWidth || image.width || 0,
      image.naturalHeight || image.height || 0
    );
  }

  loadChatImageDimensions(url = '') {
    const safeUrl = this.normalizeAttachmentUrl(url);
    if (!safeUrl) return Promise.resolve(null);

    const cached = this.getCachedChatImageDimensions(safeUrl);
    if (cached) return Promise.resolve(cached);

    this.ensureChatImageDimensionCache();
    const existingPromise = this.chatImageDimensionLoadPromises.get(safeUrl);
    if (existingPromise) return existingPromise;

    const loadPromise = new Promise((resolve) => {
      const image = new Image();
      const finalize = (dimensions = null) => {
        this.chatImageDimensionLoadPromises.delete(safeUrl);
        resolve(dimensions);
      };
      image.onload = () => {
        finalize(this.setCachedChatImageDimensions(
          safeUrl,
          image.naturalWidth || image.width || 0,
          image.naturalHeight || image.height || 0
        ));
      };
      image.onerror = () => finalize(null);
      image.src = safeUrl;
    });

    this.chatImageDimensionLoadPromises.set(safeUrl, loadPromise);
    return loadPromise;
  }

  async warmChatImageDimensions(chat = this.currentChat, { limit = 8, timeoutMs = 180 } = {}) {
    const messages = Array.isArray(chat?.messages) ? chat.messages : [];
    if (!messages.length) return;

    const targets = [];
    for (let index = messages.length - 1; index >= 0 && targets.length < limit; index -= 1) {
      const message = messages[index];
      if (String(message?.type || '') !== 'image') continue;
      const imageUrl = String(message?.imageUrl || '').trim();
      if (!imageUrl || this.getMessageImageDimensions(message)) continue;
      targets.push({ message, imageUrl });
    }
    if (!targets.length) return;

    const warmupPromise = Promise.allSettled(
      targets.map(async ({ message, imageUrl }) => {
        const dimensions = await this.loadChatImageDimensions(imageUrl);
        if (dimensions) {
          this.applyMessageImageDimensions(message, dimensions.width, dimensions.height);
        }
      })
    );

    const safeTimeout = Math.max(80, Number(timeoutMs) || 180);
    await Promise.race([
      warmupPromise,
      new Promise((resolve) => window.setTimeout(resolve, safeTimeout))
    ]);
  }

  getMessageImageMarkupSize(message) {
    const dimensions = this.getMessageImageDimensions(message);
    if (dimensions) {
      return ` width="${dimensions.width}" height="${dimensions.height}"`;
    }
    return ' width="4" height="3"';
  }

  storeMediaRetryDraft(messageId, draft = {}) {
    const safeId = Number(messageId);
    if (!Number.isFinite(safeId) || safeId <= 0) return;
    this.ensureMediaRetryDraftStore();
    this.mediaRetryDrafts.set(safeId, {
      kind: String(draft.kind || 'file').trim() || 'file',
      file: draft.file instanceof File ? draft.file : null,
      previewUrl: String(draft.previewUrl || '').trim(),
      durationSeconds: Math.max(0, Number(draft.durationSeconds) || 0)
    });
  }

  getMediaRetryDraft(messageId) {
    const safeId = Number(messageId);
    if (!Number.isFinite(safeId) || safeId <= 0) return null;
    this.ensureMediaRetryDraftStore();
    return this.mediaRetryDrafts.get(safeId) || null;
  }

  releaseMediaRetryDraft(messageId, { revokePreview = true } = {}) {
    const safeId = Number(messageId);
    if (!Number.isFinite(safeId) || safeId <= 0) return;
    const draft = this.getMediaRetryDraft(safeId);
    if (draft?.previewUrl && revokePreview) {
      this.revokeManagedObjectUrl(draft.previewUrl);
    }
    if (this.mediaRetryDrafts instanceof Map) {
      this.mediaRetryDrafts.delete(safeId);
    }
  }

  getMessageStatusFailedSvg() {
    return '<svg class="message-status-failed" viewBox="0 0 256 256" aria-hidden="true" focusable="false"><path d="M128,24A104,104,0,1,0,232,128,104.12,104.12,0,0,0,128,24Zm0,144a12,12,0,1,1,12-12A12,12,0,0,1,128,168Zm8-48a8,8,0,0,1-16,0V80a8,8,0,0,1,16,0Z"></path></svg>';
  }

  getRetryableMediaTypes() {
    return new Set(['image', 'voice', 'file']);
  }

  isRetryableMediaMessage(message) {
    if (!message || typeof message !== 'object') return false;
    if (message.from !== 'own' || message.failed !== true) return false;
    return this.getRetryableMediaTypes().has(String(message.type || '').trim());
  }

  getMessageStatusCheckSvg() {
    return '<svg class="message-status-check" viewBox="0 0 256 256" aria-hidden="true" focusable="false"><path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"></path></svg>';
  }

  getMessageDeliveryState(message) {
    if (!message || message.from !== 'own') return '';
    if (message.failed === true) return 'failed';
    if (message.pending === true) return '';

    const selfId = this.getAuthUserId();
    const readBy = this.normalizeMessageReadEntries(message.readBy);
    const readByOtherUser = readBy.some((entry) => entry.userId && entry.userId !== selfId);
    if (readByOtherUser) return 'read';

    return 'sent';
  }

  getMessageDeliveryStatusHtml(message) {
    const state = this.getMessageDeliveryState(message);
    if (!state) return '';
    if (state === 'failed') {
      return `<span class="message-status failed" aria-label="Помилка надсилання">${this.getMessageStatusFailedSvg()}</span>`;
    }
    const checkSvg = this.getMessageStatusCheckSvg();
    const ariaLabel = state === 'read' ? 'Прочитано' : 'Надіслано';
    return `<span class="message-status ${state}" aria-label="${ariaLabel}">${checkSvg}${state === 'read' ? checkSvg : ''}</span>`;
  }

  getMessageStatusSignature(messages = []) {
    const source = Array.isArray(messages) ? messages : [];
    return source
      .map((msg) => {
        const readBy = this.normalizeMessageReadEntries(msg?.readBy)
          .map((entry) => `${entry.userId}:${entry.readAt}`)
          .join(',');
        return [
          String(msg?.serverId || msg?.id || ''),
          msg?.failed === true ? 'failed' : (msg?.pending === true ? 'pending' : 'done'),
          readBy
        ].join(':');
      })
      .join('|');
  }

  getUnreadServerMessageIdsForChat(chat = this.currentChat) {
    const selfId = this.getAuthUserId();
    const messages = Array.isArray(chat?.messages) ? chat.messages : [];
    return messages
      .filter((message) => {
        if (!message || message.from !== 'other') return false;
        const serverId = String(message.serverId || '').trim();
        if (!serverId) return false;
        const readBy = this.normalizeMessageReadEntries(message.readBy);
        return !readBy.some((entry) => entry.userId === selfId);
      })
      .map((message) => String(message.serverId || '').trim())
      .filter(Boolean);
  }

  refreshDeliveryStatusUi(messages = this.currentChat?.messages) {
    const source = Array.isArray(messages) ? messages : [];
    if (!source.length) return;
    source.forEach((message) => {
      const safeId = String(message?.id ?? '').trim();
      if (!safeId) return;
      const messageEl = document.querySelector(`.message[data-id="${CSS.escape(safeId)}"]`);
      if (!messageEl) return;
      messageEl.dataset.pending = message?.pending === true ? 'true' : 'false';
      messageEl.dataset.failed = message?.failed === true ? 'true' : 'false';
      const metaEl = messageEl.querySelector('.message-meta');
      if (!metaEl) return;
      const editedLabel = message?.edited ? '<span class="message-edited">редаговано</span>' : '';
      const deliveryStatus = this.getMessageDeliveryStatusHtml(message);
      metaEl.innerHTML = `<span class="message-time">${message?.time || ''}</span>${editedLabel}${deliveryStatus}`;
    });
  }

  emitRealtimeReadReceipts(chat = this.currentChat) {
    const chatServerId = this.resolveChatServerId(chat);
    const messageIds = this.getUnreadServerMessageIdsForChat(chat);
    if (!chatServerId || !messageIds.length) return false;

    const socket = this.realtimeSocket;
    if (socket && this.realtimeSocketConnected) {
      try {
        socket.emit('markMessagesRead', { chatId: chatServerId, messageIds });
        return true;
      } catch {
        // Fall through to HTTP fallback.
      }
    }

    fetch(buildApiUrl('/messages/read-receipts'), {
      method: 'POST',
      headers: this.getApiHeaders({ json: true }),
      body: JSON.stringify({ chatId: chatServerId, messageIds })
    }).catch(() => {});
    return false;
  }

  handleRealtimeReadReceiptsEvent(payload = {}) {
    const chatServerId = this.extractRealtimeChatId(payload);
    const receiptsSource = Array.isArray(payload?.receipts)
      ? payload.receipts
      : (payload ? [payload] : []);
    const receipts = receiptsSource
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const messageId = String(entry.messageId ?? entry.id ?? '').trim();
        const userId = String(entry.userId ?? entry.readerId ?? '').trim();
        const readAt = String(entry.readAt ?? entry.createdAt ?? new Date().toISOString()).trim();
        if (!messageId || !userId) return null;
        return { messageId, userId, readAt };
      })
      .filter(Boolean);

    if (!receipts.length) return;

    let changed = false;
    const chats = Array.isArray(this.chats) ? this.chats : [];
    chats.forEach((chat) => {
      const safeChatServerId = this.resolveChatServerId(chat);
      if (chatServerId && safeChatServerId && safeChatServerId !== chatServerId) return;
      const messages = Array.isArray(chat?.messages) ? chat.messages : [];
      messages.forEach((message) => {
        const serverId = String(message?.serverId || '').trim();
        if (!serverId) return;
        const matchingReceipts = receipts.filter((entry) => entry.messageId === serverId);
        if (!matchingReceipts.length) return;
        const readBy = this.normalizeMessageReadEntries(message.readBy);
        let localChanged = false;
        matchingReceipts.forEach((receipt) => {
          if (readBy.some((entry) => entry.userId === receipt.userId)) return;
          readBy.push({ userId: receipt.userId, readAt: receipt.readAt });
          localChanged = true;
        });
        if (localChanged) {
          message.readBy = readBy;
          changed = true;
        }
      });
    });

    if (!changed) return;
    this.saveChats();
    this.refreshDeliveryStatusUi(this.currentChat?.messages);
    this.renderChatsList();
    if (typeof this.refreshDesktopSecondaryChatsListIfVisible === 'function') {
      this.refreshDesktopSecondaryChatsListIfVisible();
    }
  }

  getSelfDeletedChatsMap() {
    const storageKey = this.getSelfDeletedChatsStorageKey();
    if (this.selfDeletedChatsStorageKey === storageKey && this.selfDeletedChatsMap && typeof this.selfDeletedChatsMap === 'object') {
      return this.selfDeletedChatsMap;
    }

    if (this.selfDeletedChatsMap && typeof this.selfDeletedChatsMap === 'object') {
      this.selfDeletedChatsMap = {};
    }

    let parsed = {};
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          parsed = data;
        }
      }
    } catch {
      parsed = {};
    }

    this.selfDeletedChatsStorageKey = storageKey;
    this.selfDeletedChatsMap = parsed;
    return this.selfDeletedChatsMap;
  }

  saveSelfDeletedChatsMap() {
    try {
      const storageKey = this.getSelfDeletedChatsStorageKey();
      localStorage.setItem(
        storageKey,
        JSON.stringify(this.getSelfDeletedChatsMap())
      );
    } catch {
      // Ignore storage write errors.
    }
  }

  getSelfDeletedMessagesMap() {
    const storageKey = this.getSelfDeletedMessagesStorageKey();
    if (
      this.selfDeletedMessagesStorageKey === storageKey
      && this.selfDeletedMessagesMap
      && typeof this.selfDeletedMessagesMap === 'object'
    ) {
      return this.selfDeletedMessagesMap;
    }

    let parsed = {};
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          parsed = data;
        }
      }
    } catch {
      parsed = {};
    }

    this.selfDeletedMessagesStorageKey = storageKey;
    this.selfDeletedMessagesMap = parsed;
    return this.selfDeletedMessagesMap;
  }

  saveSelfDeletedMessagesMap() {
    try {
      const storageKey = this.getSelfDeletedMessagesStorageKey();
      localStorage.setItem(
        storageKey,
        JSON.stringify(this.getSelfDeletedMessagesMap())
      );
    } catch {
      // Ignore storage write errors.
    }
  }

  getSelfDeletedMessageIdsForChat(chatServerId) {
    const safeChatId = String(chatServerId || '').trim();
    if (!safeChatId) return new Set();
    const map = this.getSelfDeletedMessagesMap();
    const chatMessages = map[safeChatId];
    if (!chatMessages || typeof chatMessages !== 'object') return new Set();
    return new Set(
      Object.keys(chatMessages)
        .map((id) => String(id || '').trim())
        .filter(Boolean)
    );
  }

  markMessageDeletedForSelf(chat, message) {
    const chatServerId = this.resolveChatServerId(chat);
    const messageServerId = String(message?.serverId ?? '').trim();
    if (!chatServerId || !messageServerId) return;

    const map = this.getSelfDeletedMessagesMap();
    if (!map[chatServerId] || typeof map[chatServerId] !== 'object') {
      map[chatServerId] = {};
    }
    map[chatServerId][messageServerId] = Date.now();
    this.saveSelfDeletedMessagesMap();
  }

  unmarkMessageDeletedForSelf(chatServerId, messageServerId) {
    const safeChatId = String(chatServerId || '').trim();
    const safeMessageId = String(messageServerId || '').trim();
    if (!safeChatId || !safeMessageId) return;

    const map = this.getSelfDeletedMessagesMap();
    const chatMessages = map[safeChatId];
    if (!chatMessages || typeof chatMessages !== 'object') return;

    if (Object.prototype.hasOwnProperty.call(chatMessages, safeMessageId)) {
      delete chatMessages[safeMessageId];
      if (!Object.keys(chatMessages).length) {
        delete map[safeChatId];
      }
      this.saveSelfDeletedMessagesMap();
    }
  }

  filterSelfDeletedServerMessages(chat, serverMessages = []) {
    const source = Array.isArray(serverMessages) ? serverMessages : [];
    if (!source.length) return source;
    const chatServerId = this.resolveChatServerId(chat);
    if (!chatServerId) return source;

    const deletedIds = this.getSelfDeletedMessageIdsForChat(chatServerId);
    if (!deletedIds.size) return source;

    return source.filter((item) => {
      const serverMessageId = String(item?.id ?? item?.messageId ?? item?._id ?? '').trim();
      if (!serverMessageId) return true;
      return !deletedIds.has(serverMessageId);
    });
  }

  getLatestLocalServerMessageMeta(chat) {
    const messages = Array.isArray(chat?.messages) ? chat.messages : [];
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const item = messages[i];
      const serverId = String(item?.serverId ?? '').trim();
      const createdAt = String(item?.createdAt ?? '').trim();
      const fallbackDate = item?.date && item?.time ? `${item.date}T${item.time}` : '';
      const fallbackIso = String(item?.date ?? '').trim();
      if (serverId || createdAt || fallbackDate || fallbackIso) {
        return {
          serverMessageId: serverId,
          createdAt: createdAt || fallbackDate || fallbackIso || ''
        };
      }
    }
    return { serverMessageId: '', createdAt: '' };
  }

  markChatDeletedForSelf(chat) {
    const chatServerId = this.resolveChatServerId(chat);
    if (!chatServerId) return;
    const latest = this.getLatestLocalServerMessageMeta(chat);
    const map = this.getSelfDeletedChatsMap();
    map[chatServerId] = {
      serverMessageId: String(latest.serverMessageId || '').trim(),
      createdAt: String(latest.createdAt || '').trim(),
      deletedAt: Date.now()
    };
    this.saveSelfDeletedChatsMap();
  }

  unmarkChatDeletedForSelf(chatServerId) {
    const safeId = String(chatServerId || '').trim();
    if (!safeId) return;
    const map = this.getSelfDeletedChatsMap();
    if (!Object.prototype.hasOwnProperty.call(map, safeId)) return;
    delete map[safeId];
    this.saveSelfDeletedChatsMap();
  }

  getLatestServerMessageMetaFromPayload(serverMessages = []) {
    const source = Array.isArray(serverMessages) ? serverMessages : [];
    if (!source.length) return { serverMessageId: '', createdAt: '' };

    const toMeta = (item) => ({
      serverMessageId: String(item?.id ?? item?.messageId ?? item?._id ?? '').trim(),
      createdAt: String(item?.createdAt ?? item?.timestamp ?? item?.date ?? '').trim()
    });
    const toTimestamp = (item) => {
      const raw = item?.createdAt ?? item?.timestamp ?? item?.date ?? '';
      if (raw == null || raw === '') return NaN;
      if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
      const parsed = Date.parse(String(raw));
      return Number.isFinite(parsed) ? parsed : NaN;
    };

    let latestItem = null;
    let latestTs = Number.NEGATIVE_INFINITY;
    for (const item of source) {
      const ts = toTimestamp(item);
      if (!Number.isFinite(ts)) continue;
      if (!latestItem || ts >= latestTs) {
        latestItem = item;
        latestTs = ts;
      }
    }

    if (latestItem) {
      return toMeta(latestItem);
    }

    // Fallback when timestamps are missing/invalid.
    return toMeta(source[0] || {});
  }

  getMessageTimestampValue(message) {
    if (!message || typeof message !== 'object') return NaN;
    const candidates = [
      message.createdAt,
      message.timestamp,
      message.date && message.time ? `${message.date}T${message.time}` : message.date
    ];
    for (const raw of candidates) {
      if (!raw) continue;
      const parsed = Date.parse(String(raw));
      if (Number.isFinite(parsed)) return parsed;
    }
    return NaN;
  }

  getLatestLocalMessageMarker(messages = []) {
    const source = Array.isArray(messages) ? messages : [];
    if (!source.length) {
      return { serverMessageId: '', createdAt: '' };
    }
    const last = source[source.length - 1] || {};
    return {
      serverMessageId: String(last.serverId || '').trim(),
      createdAt: String(last.createdAt || '').trim()
    };
  }

  countUnreadMessagesAfterMarker(chat, messages = []) {
    const source = Array.isArray(messages) ? messages : [];
    if (!source.length) return 0;

    const markerId = String(chat?.lastReadServerMessageId || '').trim();
    const markerAt = String(chat?.lastReadMessageAt || '').trim();
    let startIndex = 0;

    if (markerId) {
      let markerIndex = -1;
      for (let i = source.length - 1; i >= 0; i -= 1) {
        if (String(source[i]?.serverId || '').trim() === markerId) {
          markerIndex = i;
          break;
        }
      }
      if (markerIndex >= 0) {
        startIndex = markerIndex + 1;
      }
    }

    if (startIndex === 0 && markerAt) {
      const markerTs = Date.parse(markerAt);
      if (Number.isFinite(markerTs)) {
        const firstNewIndex = source.findIndex((item) => {
          const ts = this.getMessageTimestampValue(item);
          return Number.isFinite(ts) && ts > markerTs;
        });
        if (firstNewIndex >= 0) {
          startIndex = firstNewIndex;
        } else {
          return 0;
        }
      }
    }

    return source.slice(startIndex).reduce((count, item) => {
      return count + (item?.from === 'other' ? 1 : 0);
    }, 0);
  }

  applyChatUnreadState(chat, messages = [], { markAsRead = false } = {}) {
    if (!chat || typeof chat !== 'object') return false;
    const latestMarker = this.getLatestLocalMessageMarker(messages);
    const hadState = Boolean(
      chat.readTrackingInitialized
      || String(chat.lastReadServerMessageId || '').trim()
      || String(chat.lastReadMessageAt || '').trim()
      || Number(chat.unreadCount || 0) > 0
    );

    let changed = false;
    if (markAsRead) {
      const nextId = String(latestMarker.serverMessageId || '').trim();
      const nextAt = String(latestMarker.createdAt || '').trim();
      if (String(chat.lastReadServerMessageId || '').trim() !== nextId) {
        chat.lastReadServerMessageId = nextId;
        changed = true;
      }
      if (String(chat.lastReadMessageAt || '').trim() !== nextAt) {
        chat.lastReadMessageAt = nextAt;
        changed = true;
      }
      if (Number(chat.unreadCount || 0) !== 0) {
        chat.unreadCount = 0;
        changed = true;
      }
      if (!chat.readTrackingInitialized) {
        chat.readTrackingInitialized = true;
        changed = true;
      }
      return changed;
    }

    if (!hadState && !chat.readTrackingInitialized) {
      chat.readTrackingInitialized = true;
      changed = true;
    }

    const nextUnreadCount = this.countUnreadMessagesAfterMarker(chat, messages);
    if (Number(chat.unreadCount || 0) !== nextUnreadCount) {
      chat.unreadCount = nextUnreadCount;
      changed = true;
    }
    return changed;
  }

  markChatAsRead(chat, { persist = false } = {}) {
    if (!chat || typeof chat !== 'object') return false;
    const messages = Array.isArray(chat.messages) ? chat.messages : [];
    const changed = this.applyChatUnreadState(chat, messages, { markAsRead: true });
    if (changed && persist) {
      this.saveChats();
    }
    return changed;
  }

  async hasNewServerMessageAfterSelfDelete(chatServerId, marker = {}) {
    const safeChatId = String(chatServerId || '').trim();
    if (!safeChatId) return false;

    try {
      const response = await fetch(
        buildApiUrl(`/messages?chatId=${encodeURIComponent(safeChatId)}`),
        { headers: this.getApiHeaders() }
      );
      if (!response.ok) return false;
      const data = await this.readJsonSafe(response);
      const serverMessages = this.normalizeServerMessagesPayload(data);
      if (!serverMessages.length) return false;

      const toMeta = (item) => ({
        serverMessageId: String(item?.id ?? item?.messageId ?? item?._id ?? '').trim(),
        createdAt: String(item?.createdAt ?? item?.timestamp ?? item?.date ?? '').trim()
      });
      const latest = this.getLatestServerMessageMetaFromPayload(serverMessages);
      const first = toMeta(serverMessages[0]);
      const last = toMeta(serverMessages[serverMessages.length - 1]);

      const markerId = String(marker?.serverMessageId || '').trim();
      const markerCreatedAt = String(marker?.createdAt || '').trim();
      const markerDeletedAt = Number(marker?.deletedAt || 0);

      const candidateIds = new Set(
        [latest.serverMessageId, first.serverMessageId, last.serverMessageId]
          .map((value) => String(value || '').trim())
          .filter(Boolean)
      );
      if (markerId && candidateIds.size > 0) {
        return !candidateIds.has(markerId);
      }

      const candidateTimes = new Set(
        [latest.createdAt, first.createdAt, last.createdAt]
          .map((value) => String(value || '').trim())
          .filter(Boolean)
      );
      if (markerCreatedAt && candidateTimes.size > 0) {
        return !candidateTimes.has(markerCreatedAt);
      }

      if (markerDeletedAt > 0) {
        const latestTimestamp = Date.parse(String(latest.createdAt || ''));
        if (Number.isFinite(latestTimestamp) && latestTimestamp > markerDeletedAt) {
          return true;
        }
      }

      // If marker doesn't have message id/time, keep chat hidden until we can
      // confidently detect that new messages appeared after deletion.
      return false;
    } catch {
      return false;
    }
  }

  async readJsonSafe(response) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  getRequestErrorMessage(data, fallback = 'Помилка запиту до сервера.') {
    const raw = data?.message || data?.error || fallback;
    if (Array.isArray(raw)) return raw.filter(Boolean).join(' ') || fallback;
    return String(raw || fallback);
  }

  getUserDisplayName(user) {
    const name = (
      user?.nickname ||
      user?.name ||
      user?.fullName ||
      user?.displayName ||
      user?.mobile ||
      user?.phone ||
      user?.email ||
      'Користувач'
    );
    return String(name).trim() || 'Користувач';
  }

  getUserAvatarImage(user) {
    if (!user || typeof user !== 'object') return '';
    const nestedAvatar = user.avatar && typeof user.avatar === 'object' ? user.avatar : null;
    const nestedProfile = user.profile && typeof user.profile === 'object' ? user.profile : null;
    const avatarCandidate =
      user.avatarImage ??
      user.avatarUrl ??
      user.photoUrl ??
      user.photoURL ??
      user.profilePhoto ??
      user.profileImage ??
      user.image ??
      user.picture ??
      nestedProfile?.avatarImage ??
      nestedProfile?.avatarUrl ??
      nestedProfile?.image ??
      nestedAvatar?.url ??
      nestedAvatar?.secure_url ??
      '';
    return this.getAvatarImage(avatarCandidate);
  }

  getUserAvatarColor(user) {
    if (!user || typeof user !== 'object') return '';
    const avatarImage = this.getUserAvatarImage(user);
    if (avatarImage) {
      const value = user.avatarColor ?? user.profileColor ?? '';
      return String(value || '').trim();
    }
    return this.getContactColor(this.getUserDisplayName(user));
  }

  getCurrentUserDisplayName() {
    const session = getAuthSession();
    return this.getUserDisplayName(session?.user || {});
  }

  normalizePresenceStatus(value) {
    if (typeof value === 'boolean') return value ? 'online' : 'offline';
    const safe = String(value || '').trim().toLowerCase();
    if (!safe) return '';
    if (['online', 'active', 'available', 'connected', '1', 'true'].includes(safe)) return 'online';
    if (['offline', 'away', 'inactive', 'disconnected', '0', 'false'].includes(safe)) return 'offline';
    return '';
  }

  normalizeParticipantRecord(member) {
    if (!member || typeof member !== 'object') return null;
    const nestedUser = member.user && typeof member.user === 'object' ? member.user : null;
    const id = String(
      member.id
        ?? member.userId
        ?? member._id
        ?? nestedUser?.id
        ?? nestedUser?.userId
        ?? nestedUser?._id
        ?? ''
    ).trim();
    if (!id) return null;
    const normalizedSource = nestedUser ? { ...member, ...nestedUser } : member;
    return {
      id,
      name: this.getUserDisplayName(normalizedSource),
      avatarImage: this.getUserAvatarImage(normalizedSource),
      avatarColor: this.getUserAvatarColor(normalizedSource),
      status: this.normalizePresenceStatus(
        normalizedSource.status
          ?? normalizedSource.presence
          ?? normalizedSource.isOnline
          ?? normalizedSource.online
      )
    };
  }

  cacheKnownUserMeta(userId, meta = {}) {
    const safeId = String(userId || '').trim();
    if (!safeId) return;

    if (!this.knownUsersById) {
      this.knownUsersById = new Map();
    }

    const previous = this.knownUsersById.get(safeId) || {};
    const next = { ...previous };
    const safeName = String(meta?.name || '').trim();
    const safeAvatar = this.getAvatarImage(meta?.avatarImage || meta?.avatarUrl);
    const safeAvatarColor = String(meta?.avatarColor || '').trim();
    const safeStatus = this.normalizePresenceStatus(
      meta?.status ?? meta?.presence ?? meta?.isOnline ?? meta?.online
    );

    if (safeName && safeName !== 'Користувач') next.name = safeName;
    if (safeAvatar) next.avatarImage = safeAvatar;
    if (safeAvatarColor) next.avatarColor = safeAvatarColor;
    if (safeStatus) next.status = safeStatus;

    this.knownUsersById.set(safeId, next);
    if (next.name) {
      if (!this.knownUserNamesById) {
        this.knownUserNamesById = new Map();
      }
      this.knownUserNamesById.set(safeId, next.name);
    }
  }

  getCachedUserMeta(userId) {
    const safeId = String(userId || '').trim();
    if (!safeId || !this.knownUsersById) return {};
    const meta = this.knownUsersById.get(safeId);
    return meta && typeof meta === 'object' ? meta : {};
  }

  cacheKnownUserName(userId, name) {
    this.cacheKnownUserMeta(userId, { name });
  }

  cacheKnownUserAvatar(userId, avatarImage = '') {
    this.cacheKnownUserMeta(userId, { avatarImage });
  }

  extractEntityId(entity) {
    if (!entity || typeof entity !== 'object') return '';
    const nestedUser = entity.user && typeof entity.user === 'object' ? entity.user : null;
    const nestedMember = entity.member && typeof entity.member === 'object' ? entity.member : null;
    const nestedProfile = entity.profile && typeof entity.profile === 'object' ? entity.profile : null;
    return String(
      entity.id
        ?? entity.userId
        ?? entity._id
        ?? entity.sub
        ?? nestedUser?.id
        ?? nestedUser?.userId
        ?? nestedUser?._id
        ?? nestedMember?.id
        ?? nestedMember?.userId
        ?? nestedMember?._id
        ?? nestedProfile?.id
        ?? nestedProfile?.userId
        ?? nestedProfile?._id
        ?? ''
    ).trim();
  }

  getCachedUserName(userId) {
    const safeId = String(userId || '').trim();
    if (!safeId) return '';
    const metaName = String(this.getCachedUserMeta(safeId)?.name || '').trim();
    if (metaName) return metaName;
    if (!this.knownUserNamesById) return '';
    return String(this.knownUserNamesById.get(safeId) || '').trim();
  }

  getCachedUserAvatar(userId) {
    const safeId = String(userId || '').trim();
    if (!safeId) return '';
    return this.getAvatarImage(this.getCachedUserMeta(safeId)?.avatarImage);
  }

  async resolveUserNameById(userId) {
    const safeId = String(userId || '').trim();
    if (!safeId) return '';

    const cached = this.getCachedUserName(safeId);
    if (cached) return cached;

    const endpoints = [
      `/users/${encodeURIComponent(safeId)}`,
      `/users?id=${encodeURIComponent(safeId)}`,
      `/users?userId=${encodeURIComponent(safeId)}`,
      `/users?search=${encodeURIComponent(safeId)}`
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(buildApiUrl(endpoint), { headers: this.getApiHeaders() });
        if (!response.ok) {
          if (response.status === 404 || response.status === 405) continue;
          continue;
        }
        const data = await this.readJsonSafe(response);
        const lists = [
          Array.isArray(data) ? data : null,
          Array.isArray(data?.users) ? data.users : null,
          Array.isArray(data?.items) ? data.items : null,
          Array.isArray(data?.results) ? data.results : null
        ].filter(Boolean);

        let exactUser = null;
        if (this.extractEntityId(data) === safeId) exactUser = data;
        if (!exactUser && this.extractEntityId(data?.user) === safeId) exactUser = data.user;
        if (!exactUser) {
          for (const list of lists) {
            exactUser = list.find((item) => this.extractEntityId(item) === safeId) || null;
            if (exactUser) break;
          }
        }
        if (!exactUser) continue;

        const name = this.getUserDisplayName(exactUser);
        const avatarImage = this.getUserAvatarImage(exactUser);
        const avatarColor = this.getUserAvatarColor(exactUser);
        this.cacheKnownUserMeta(safeId, { name, avatarImage, avatarColor });
        if (name && name !== 'Користувач') {
          return name;
        }
      } catch {
        // Try next endpoint.
      }
    }

    return '';
  }

  isNameMatchingCurrentUser(name) {
    const a = String(name || '').trim().toLowerCase();
    const b = this.getCurrentUserDisplayName().trim().toLowerCase();
    if (!a || !b) return false;
    return a === b;
  }

  isGenericOrInvalidChatName(name, { isGroup = false } = {}) {
    const value = String(name || '').trim();
    if (!value) return true;
    if (!isGroup && this.isNameMatchingCurrentUser(value)) return true;
    const lower = value.toLowerCase();
    return lower === 'новий чат' || lower === 'користувач';
  }

  extractMessageSenderName(message) {
    if (!message || typeof message !== 'object') return '';
    const senderCandidates = [
      message.sender,
      message.author,
      message.fromUser,
      message.user,
      message.createdBy,
      message.owner
    ];
    for (const candidate of senderCandidates) {
      if (!candidate || typeof candidate !== 'object') continue;
      const name = this.getUserDisplayName(candidate);
      if (name && name !== 'Користувач') return name;
    }
    const directNameCandidates = [
      message.senderName,
      message.authorName,
      message.fromName,
      message.fromUserName,
      message.createdByName,
      message.ownerName,
      message.userName,
      message.username,
      message.userNickname,
      message.senderDisplayName
    ];
    for (const candidate of directNameCandidates) {
      const safeName = String(candidate || '').trim();
      if (safeName && safeName !== 'Користувач') return safeName;
    }
    return '';
  }

  extractMessageSenderAvatar(message) {
    if (!message || typeof message !== 'object') return '';
    const senderCandidates = [
      message.sender,
      message.author,
      message.fromUser,
      message.user,
      message.createdBy,
      message.owner
    ];
    for (const candidate of senderCandidates) {
      const avatar = this.getUserAvatarImage(candidate);
      if (avatar) return avatar;
    }
    const directAvatarCandidates = [
      message.senderAvatarImage,
      message.senderAvatarUrl,
      message.senderAvatar,
      message.authorAvatarImage,
      message.authorAvatarUrl,
      message.fromUserAvatarImage,
      message.fromUserAvatarUrl,
      message.userAvatarImage,
      message.userAvatarUrl,
      message.createdByAvatarImage,
      message.createdByAvatarUrl,
      message.ownerAvatarImage,
      message.ownerAvatarUrl
    ];
    for (const candidate of directAvatarCandidates) {
      const avatar = this.getAvatarImage(candidate);
      if (avatar) return avatar;
    }
    return '';
  }

  extractMessageSenderAvatarColor(message) {
    if (!message || typeof message !== 'object') return '';
    const senderCandidates = [
      message.sender,
      message.author,
      message.fromUser,
      message.user,
      message.createdBy,
      message.owner
    ];
    for (const candidate of senderCandidates) {
      const color = this.getUserAvatarColor(candidate);
      if (color) return color;
    }
    const directColorCandidates = [
      message.senderAvatarColor,
      message.authorAvatarColor,
      message.fromUserAvatarColor,
      message.userAvatarColor,
      message.createdByAvatarColor,
      message.ownerAvatarColor
    ];
    for (const candidate of directColorCandidates) {
      const safeColor = String(candidate || '').trim();
      if (safeColor) return safeColor;
    }
    return '';
  }

  getChatParticipantMetaById(chat, userId = '') {
    const safeUserId = String(userId || '').trim();
    const targetChat = chat && typeof chat === 'object' ? chat : this.currentChat;
    if (!targetChat || !safeUserId) return null;

    const participantSources = [
      ...(Array.isArray(targetChat.groupParticipants) ? targetChat.groupParticipants : []),
      ...(Array.isArray(targetChat.members) ? targetChat.members : [])
    ];

    for (const source of participantSources) {
      if (!source || typeof source !== 'object') continue;
      const normalized = typeof this.normalizeParticipantRecord === 'function'
        ? this.normalizeParticipantRecord(source)
        : null;
      const id = String(
        normalized?.id
        || source.id
        || source.userId
        || source._id
        || source.user?.id
        || source.user?._id
        || ''
      ).trim();
      if (!id || id !== safeUserId) continue;

      return {
        id,
        name: String(
          normalized?.name
          || source.name
          || source.nickname
          || source.displayName
          || ''
        ).trim(),
        avatarImage: this.getAvatarImage(
          normalized?.avatarImage
          || source.avatarImage
          || source.avatarUrl
          || source.user?.avatarImage
          || source.user?.avatarUrl
        ),
        avatarColor: String(
          normalized?.avatarColor
          || source.avatarColor
          || source.user?.avatarColor
          || ''
        ).trim(),
        status: this.normalizePresenceStatus(
          normalized?.status
          || source.status
          || source.user?.status
        )
      };
    }

    return null;
  }

  getMessageSenderDisplayMeta(message, chat = null) {
    const targetChat = chat && typeof chat === 'object' ? chat : this.currentChat;
    const senderId = String(message?.senderId || '').trim();
    const cachedMeta = senderId && typeof this.getCachedUserMeta === 'function'
      ? (this.getCachedUserMeta(senderId) || {})
      : {};
    const participantMeta = senderId
      ? this.getChatParticipantMetaById(targetChat, senderId)
      : null;
    const isGroupChat = Boolean(targetChat?.isGroup);
    const directChatName = !isGroupChat
      ? String(targetChat?.name || '').trim()
      : '';
    const directChatAvatarImage = !isGroupChat
      ? this.getAvatarImage(targetChat?.avatarImage || targetChat?.avatarUrl)
      : '';
    const directChatAvatarColor = !isGroupChat
      ? String(targetChat?.avatarColor || '').trim()
      : '';

    const name = String(
      message?.senderName
      || participantMeta?.name
      || cachedMeta?.name
      || directChatName
      || 'Користувач'
    ).trim() || 'Користувач';
    const avatarImage = this.getAvatarImage(
      message?.senderAvatarImage
      || participantMeta?.avatarImage
      || cachedMeta?.avatarImage
      || directChatAvatarImage
    );
    const avatarColor = String(
      message?.senderAvatarColor
      || participantMeta?.avatarColor
      || cachedMeta?.avatarColor
      || directChatAvatarColor
      || this.getContactColor(name)
    ).trim();

    return {
      id: senderId || participantMeta?.id || null,
      name,
      avatarImage,
      avatarColor,
      initials: this.getInitials(name)
    };
  }

  buildChatAppearancePayload({ name = '', avatarImage = '', avatarColor = '' } = {}) {
    const safeName = String(name || '').trim();
    const safeAvatarImage = this.getAvatarImage(avatarImage || '');
    const safeAvatarColor = String(avatarColor || '').trim();
    return {
      ...(safeName ? { name: safeName, title: safeName } : {}),
      ...(safeAvatarImage ? {
        avatarImage: safeAvatarImage,
        avatarUrl: safeAvatarImage,
        avatar: safeAvatarImage,
        image: safeAvatarImage,
        picture: safeAvatarImage
      } : {
        avatarImage: '',
        avatarUrl: '',
        avatar: '',
        image: '',
        picture: ''
      }),
      ...(safeAvatarColor ? { avatarColor: safeAvatarColor } : {})
    };
  }

  isInlineAvatarDataUrl(value = '') {
    return /^data:image\//i.test(String(value || '').trim());
  }

  async resolveGroupAvatarImageForServer(avatarImage = '', { fileName = 'group-avatar.jpg' } = {}) {
    const safeAvatarImage = this.getAvatarImage(avatarImage || '');
    if (!safeAvatarImage) return '';
    if (!this.isInlineAvatarDataUrl(safeAvatarImage)) {
      return safeAvatarImage;
    }
    if (typeof this.buildProfileAvatarUploadFile !== 'function' || typeof this.uploadMessageAttachmentToServer !== 'function') {
      return '';
    }

    try {
      const uploadFile = this.buildProfileAvatarUploadFile({ name: fileName }, safeAvatarImage);
      const uploaded = await this.uploadMessageAttachmentToServer(uploadFile, { kind: 'image' });
      return this.normalizeAttachmentUrl(
        uploaded?.url
        || uploaded?.attachmentUrl
        || uploaded?.fileUrl
        || uploaded?.imageUrl
        || ''
      );
    } catch {
      return '';
    }
  }

  getGroupMetaMessagePrefix() {
    return '__orion_group_meta__:';
  }

  buildGroupMetaMessageText(chat, meta = {}) {
    const prefix = this.getGroupMetaMessagePrefix();
    const targetChat = chat && typeof chat === 'object' ? chat : {};
    const payload = {
      v: 1,
      chatId: this.resolveChatServerId(targetChat) || String(targetChat.id || '').trim() || '',
      name: String(meta.name || targetChat.name || '').trim(),
      avatarImage: this.getAvatarImage(meta.avatarImage || targetChat.avatarImage || targetChat.avatarUrl || ''),
      avatarColor: String(meta.avatarColor || targetChat.avatarColor || '').trim(),
      participants: Array.isArray(meta.participants)
        ? meta.participants
            .map((member) => ({
              id: String(member?.id || member?.userId || '').trim(),
              name: String(member?.name || '').trim(),
              avatarImage: this.getAvatarImage(member?.avatarImage || member?.avatarUrl || ''),
              avatarColor: String(member?.avatarColor || '').trim(),
              status: this.normalizePresenceStatus(member?.status)
            }))
            .filter((member) => member.id || member.name)
        : []
    };
    return `${prefix}${JSON.stringify(payload)}`;
  }

  parseGroupMetaMessageText(text = '') {
    const safeText = String(text || '').trim();
    const prefix = this.getGroupMetaMessagePrefix();
    if (!safeText.startsWith(prefix)) return null;
    try {
      const payload = JSON.parse(safeText.slice(prefix.length));
      if (!payload || typeof payload !== 'object') return null;
      return {
        chatId: String(payload.chatId || '').trim(),
        name: String(payload.name || '').trim(),
        avatarImage: this.getAvatarImage(payload.avatarImage || ''),
        avatarColor: String(payload.avatarColor || '').trim(),
        participants: Array.isArray(payload.participants)
          ? payload.participants
              .map((member) => ({
                id: String(member?.id || member?.userId || '').trim(),
                name: String(member?.name || '').trim(),
                avatarImage: this.getAvatarImage(member?.avatarImage || member?.avatarUrl || ''),
                avatarColor: String(member?.avatarColor || '').trim(),
                status: this.normalizePresenceStatus(member?.status)
              }))
              .filter((member) => member.id || member.name)
          : []
      };
    } catch {
      return null;
    }
  }

  isGroupMetaMessageText(text = '') {
    return Boolean(this.parseGroupMetaMessageText(text));
  }

  applyGroupMetaToChat(chat, meta = {}) {
    const targetChat = chat && typeof chat === 'object' ? chat : null;
    if (!targetChat || !targetChat.isGroup || !meta || typeof meta !== 'object') return false;

    let changed = false;
    const nextName = String(meta.name || '').trim();
    const nextAvatarImage = this.getAvatarImage(meta.avatarImage || '');
    const nextAvatarColor = String(meta.avatarColor || '').trim();
    const nextParticipants = Array.isArray(meta.participants) ? meta.participants : [];

    if (nextName && targetChat.name !== nextName) {
      targetChat.name = nextName;
      changed = true;
    }
    if (nextAvatarImage && this.getAvatarImage(targetChat.avatarImage || targetChat.avatarUrl) !== nextAvatarImage) {
      targetChat.avatarImage = nextAvatarImage;
      targetChat.avatarUrl = nextAvatarImage;
      changed = true;
    }
    if (nextAvatarColor && String(targetChat.avatarColor || '').trim() !== nextAvatarColor) {
      targetChat.avatarColor = nextAvatarColor;
      changed = true;
    }
    if (nextParticipants.length) {
      const normalized = nextParticipants.map((member) => ({
        id: String(member?.id || '').trim(),
        name: String(member?.name || '').trim() || 'Користувач',
        avatarImage: this.getAvatarImage(member?.avatarImage || ''),
        avatarColor: String(member?.avatarColor || '').trim(),
        status: this.normalizePresenceStatus(member?.status)
      }));
      normalized.forEach((member) => {
        if (member.id) {
          this.cacheKnownUserMeta(member.id, member);
        }
      });
      if (JSON.stringify(targetChat.groupParticipants || []) !== JSON.stringify(normalized)) {
        targetChat.groupParticipants = normalized;
        changed = true;
      }
    }

    return changed;
  }

  async sendGroupMetaMessageToServer(chat, meta = {}) {
    const targetChat = chat && typeof chat === 'object' ? chat : null;
    if (!targetChat || !targetChat.isGroup) return null;
    const nextMeta = meta && typeof meta === 'object' ? { ...meta } : {};
    const resolvedAvatarImage = await this.resolveGroupAvatarImageForServer(
      nextMeta.avatarImage || targetChat.avatarImage || targetChat.avatarUrl || '',
      { fileName: `group-meta-${Date.now()}.jpg` }
    );
    nextMeta.avatarImage = resolvedAvatarImage || '';
    const text = this.buildGroupMetaMessageText(targetChat, nextMeta);
    if (!text) return null;
    return this.sendTextMessageToServer(targetChat, text);
  }

  getUserTag(user) {
    const tag = (
      user?.tag ||
      user?.username ||
      user?.handle ||
      user?.login ||
      user?.userTag ||
      ''
    );
    return String(tag).trim().replace(/^@+/, '');
  }

  normalizeSearchQuery(value) {
    return String(value || '').trim().toLowerCase();
  }

  normalizeTagQuery(value) {
    return this.normalizeSearchQuery(value).replace(/^@+/, '');
  }

  rankUsersByQuery(users, query) {
    const q = this.normalizeSearchQuery(query);
    const qTag = this.normalizeTagQuery(query);
    if (!q) return [];

    const scored = users
      .map((user) => {
        const tag = this.normalizeTagQuery(user.tag);
        const name = this.normalizeSearchQuery(user.name);
        const mobile = this.normalizeSearchQuery(user.mobile);
        const email = this.normalizeSearchQuery(user.email);

        const matches =
          (tag && (tag.includes(qTag) || tag.includes(q))) ||
          (name && name.includes(q)) ||
          (mobile && mobile.includes(q)) ||
          (email && email.includes(q));
        if (!matches) return null;

        let score = 99;
        if (tag && qTag && tag === qTag) score = 0;
        else if (tag && qTag && tag.startsWith(qTag)) score = 1;
        else if (tag && qTag && tag.includes(qTag)) score = 2;
        else if (name === q) score = 3;
        else if (name.startsWith(q)) score = 4;
        else if (name.includes(q)) score = 5;
        else if (mobile.startsWith(q)) score = 6;
        else if (mobile.includes(q) || email.includes(q)) score = 7;

        return { user, score, tag, name };
      })
      .filter(Boolean);

    scored.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      if (a.tag && b.tag && a.tag !== b.tag) return a.tag.localeCompare(b.tag, 'uk');
      return a.name.localeCompare(b.name, 'uk');
    });

    return scored.map((item) => item.user);
  }

  extractUserCollection(payload) {
    const queue = [payload];
    const visited = new Set();

    while (queue.length) {
      const current = queue.shift();
      if (!current || typeof current !== 'object') continue;
      if (visited.has(current)) continue;
      visited.add(current);

      if (Array.isArray(current)) return current;

      const candidates = [
        current.users,
        current.items,
        current.results,
        current.data,
        current.list,
        current.rows,
        current.members
      ];

      for (const candidate of candidates) {
        if (Array.isArray(candidate)) return candidate;
        if (candidate && typeof candidate === 'object') {
          queue.push(candidate);
        }
      }
    }

    return [];
  }

  normalizeUserList(payload) {
    const source = this.extractUserCollection(payload);
    if (!source.length) return [];

    const selfId = this.getAuthUserId();
    return source
      .filter((item) => item && typeof item === 'object')
      .map((item) => {
        const nestedUser = item.user && typeof item.user === 'object' ? item.user : null;
        const nestedMember = item.member && typeof item.member === 'object' ? item.member : null;
        const normalizedSource = nestedUser
          ? { ...item, ...nestedUser }
          : (nestedMember ? { ...item, ...nestedMember } : item);
        const id = this.extractEntityId(normalizedSource);
        const normalizedName = this.getUserDisplayName(normalizedSource);
        const avatarImage = this.getUserAvatarImage(normalizedSource);
        const avatarColor = this.getUserAvatarColor(normalizedSource);
        this.cacheKnownUserMeta(id, {
          name: normalizedName,
          avatarImage,
          avatarColor
        });
        return {
          id,
          name: normalizedName,
          tag: this.getUserTag(normalizedSource),
          mobile: String(normalizedSource.mobile ?? normalizedSource.phone ?? '').trim(),
          email: String(normalizedSource.email ?? '').trim(),
          avatarImage,
          avatarColor,
          raw: normalizedSource
        };
      })
      .filter((item) => item.id && item.id !== selfId);
  }

  mergeNormalizedUsers(...lists) {
    const byId = new Map();

    lists.flat().forEach((user) => {
      if (!user || typeof user !== 'object') return;
      const id = String(user.id || '').trim();
      if (!id) return;

      const previous = byId.get(id) || {};
      const next = {
        ...previous,
        ...user,
        id,
        name: String(user.name || previous.name || '').trim(),
        tag: String(user.tag || previous.tag || '').trim(),
        mobile: String(user.mobile || previous.mobile || '').trim(),
        email: String(user.email || previous.email || '').trim(),
        avatarImage: this.getAvatarImage(user.avatarImage || previous.avatarImage || ''),
        avatarColor: String(user.avatarColor || previous.avatarColor || '').trim(),
        raw: user.raw || previous.raw || null
      };

      byId.set(id, next);
    });

    return Array.from(byId.values());
  }

  collectKnownUsersForSearch() {
    const selfId = this.getAuthUserId();
    const knownUsers = [];

    if (Array.isArray(this.chats)) {
      this.chats.forEach((chat) => {
        if (!chat || chat.isGroup) return;
        const participantId = String(chat.participantId || '').trim();
        if (!participantId || participantId === selfId) return;

        const cachedMeta = typeof this.getCachedUserMeta === 'function'
          ? this.getCachedUserMeta(participantId)
          : {};
        knownUsers.push({
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
    }

    if (this.knownUsersById instanceof Map) {
      this.knownUsersById.forEach((meta, userId) => {
        const safeId = String(userId || '').trim();
        if (!safeId || safeId === selfId) return;
        knownUsers.push({
          id: safeId,
          name: String(meta?.name || 'Користувач').trim() || 'Користувач',
          tag: '',
          mobile: '',
          email: '',
          avatarImage: this.getAvatarImage(meta?.avatarImage || ''),
          avatarColor: String(meta?.avatarColor || '').trim(),
          raw: null
        });
      });
    }

    return this.mergeNormalizedUsers(knownUsers).sort((a, b) => {
      const aName = String(a?.name || '').trim() || 'Користувач';
      const bName = String(b?.name || '').trim() || 'Користувач';
      return aName.localeCompare(bName, 'uk');
    });
  }

  async fetchAllRegisteredUsers({ force = false } = {}) {
    if (!force && Array.isArray(this.allRegisteredUsersCache) && this.allRegisteredUsersCache.length) {
      return this.allRegisteredUsersCache;
    }
    if (!force && this.allRegisteredUsersPromise) {
      return this.allRegisteredUsersPromise;
    }

    this.allRegisteredUsersPromise = (async () => {
      try {
        const response = await fetch(buildApiUrl('/users'), {
          headers: this.getApiHeaders()
        });
        if (!response.ok) {
          return this.collectKnownUsersForSearch();
        }

        const data = await this.readJsonSafe(response);
        const users = this.mergeNormalizedUsers(
          this.normalizeUserList(data),
          this.collectKnownUsersForSearch()
        ).sort((a, b) => {
          const aTag = String(a?.tag || '').trim();
          const bTag = String(b?.tag || '').trim();
          if (aTag && bTag && aTag !== bTag) return aTag.localeCompare(bTag, 'uk');
          return String(a?.name || '').localeCompare(String(b?.name || ''), 'uk');
        });

        this.allRegisteredUsersCache = users;
        return users;
      } catch {
        return this.collectKnownUsersForSearch();
      } finally {
        this.allRegisteredUsersPromise = null;
      }
    })();

    return this.allRegisteredUsersPromise;
  }

  async openOrCreateDirectChatByUser(user) {
    const selected = user && typeof user === 'object' ? user : null;
    const selectedId = String(selected?.id || '').trim();
    if (!selectedId) {
      throw new Error('Не вдалося визначити користувача для чату.');
    }

    const cachedMeta = typeof this.getCachedUserMeta === 'function'
      ? this.getCachedUserMeta(selectedId)
      : {};
    const safeName = String(
      selected?.name
      || cachedMeta?.name
      || this.getUserDisplayName(selected?.raw || selected)
      || 'Користувач'
    ).trim() || 'Користувач';
    const safeAvatarImage = this.getAvatarImage(
      selected?.avatarImage
      || cachedMeta?.avatarImage
      || this.getUserAvatarImage(selected?.raw || selected)
      || ''
    );
    const safeAvatarColor = String(
      selected?.avatarColor
      || cachedMeta?.avatarColor
      || this.getUserAvatarColor(selected?.raw || selected)
      || ''
    ).trim();

    this.cacheKnownUserMeta(selectedId, {
      name: safeName,
      avatarImage: safeAvatarImage,
      avatarColor: safeAvatarColor
    });

    const existingChat = this.findDirectChatByParticipantId(selectedId);
    if (existingChat) {
      this.selectChat(existingChat.id);
      return existingChat;
    }

    const payload = {
      name: safeName,
      isPrivate: true,
      isGroup: false
    };

    const serverChat = await this.createChatOnServer(payload);
    const createdChatId = this.extractServerChatId(serverChat);
    if (!createdChatId) {
      throw new Error('Сервер не повернув ідентифікатор чату.');
    }

    const joined = await this.joinChatOnServerAsUser(createdChatId, selectedId);
    if (!joined) {
      throw new Error('Не вдалося додати другого користувача до чату.');
    }

    const newChat = this.buildLocalChatFromServer(serverChat, {
      name: safeName,
      isGroup: false,
      participantId: selectedId,
      avatarImage: safeAvatarImage,
      avatarColor: safeAvatarColor
    });
    newChat.participantConfidence = 2;
    newChat.participantJoinedVerified = true;
    newChat.status = this.getPresenceStatusForUser(selectedId, 'offline');

    this.chats.push(newChat);
    this.saveChats();
    this.renderChatsList();
    this.selectChat(newChat.id);
    this.runServerChatSync({ forceScroll: true });

    window.setTimeout(() => {
      this.runServerChatSync({ forceScroll: false });
    }, 450);

    return newChat;
  }

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
    } catch {
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

  getServerMessageIdByLocalId(chat, localId) {
    if (!chat || localId == null) return '';
    const message = Array.isArray(chat.messages)
      ? chat.messages.find((item) => Number(item?.id) === Number(localId))
      : null;
    return String(message?.serverId ?? '').trim();
  }

  extractServerMessageIdFromPayload(payload) {
    if (!payload || typeof payload !== 'object') return '';
    const directId = String(payload.id ?? payload.messageId ?? payload._id ?? '').trim();
    if (directId) return directId;

    const nestedMessage = payload.message && typeof payload.message === 'object'
      ? payload.message
      : null;
    if (nestedMessage) {
      const nestedId = String(
        nestedMessage.id ?? nestedMessage.messageId ?? nestedMessage._id ?? ''
      ).trim();
      if (nestedId) return nestedId;
    }

    const nestedData = payload.data && typeof payload.data === 'object'
      ? payload.data
      : null;
    if (nestedData) {
      const nestedDataId = String(
        nestedData.id ?? nestedData.messageId ?? nestedData._id ?? ''
      ).trim();
      if (nestedDataId) return nestedDataId;
    }

    return '';
  }

  async sendTextMessageToServer(chat, text, { replyToLocalId = null } = {}) {
    const userId = this.getAuthUserId();
    if (!userId) {
      throw new Error('Не знайдено X-User-Id у сесії. Увійдіть у акаунт ще раз.');
    }

    const chatServerId = this.resolveChatServerId(chat);
    if (!chatServerId) {
      throw new Error('Не вдалося визначити чат для надсилання повідомлення.');
    }

    const basePayload = { chatId: chatServerId };
    const replyToServerId = this.getServerMessageIdByLocalId(chat, replyToLocalId);
    if (replyToServerId) {
      basePayload.replyToId = replyToServerId;
    }

    const attempts = [
      { endpoint: '/messages', payload: { ...basePayload, content: text } },
      { endpoint: '/messages', payload: { ...basePayload, text } },
      { endpoint: '/messages', payload: { ...basePayload, message: text } }
    ];

    let lastError = 'Не вдалося надіслати повідомлення.';
    let bestError = '';

    for (const attempt of attempts) {
      const response = await fetch(buildApiUrl(attempt.endpoint), {
        method: 'POST',
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

  extractUploadedAttachmentMeta(payload) {
    const queue = [payload];
    const visited = new Set();

    while (queue.length) {
      const current = queue.shift();
      if (!current || typeof current !== 'object') continue;
      if (visited.has(current)) continue;
      visited.add(current);

      const url = this.normalizeAttachmentUrl(
        current.url
        ?? current.fileUrl
        ?? current.attachmentUrl
        ?? current.imageUrl
        ?? current.audioUrl
        ?? current.path
        ?? current.location
        ?? ''
      );
      const fileName = String(
        current.fileName
        ?? current.filename
        ?? current.originalName
        ?? current.name
        ?? ''
      ).trim();
      const mimeType = String(
        current.mimeType
        ?? current.attachmentMimeType
        ?? current.contentType
        ?? current.type
        ?? ''
      ).trim();
      const size = Number(current.size ?? current.fileSize ?? current.bytes ?? 0) || 0;
      if (url) {
        return { url, fileName, mimeType, size };
      }

      const nested = [
        current.data,
        current.file,
        current.upload,
        current.result,
        current.attachment
      ];
      nested.forEach((item) => {
        if (item && typeof item === 'object') queue.push(item);
      });
    }

    return { url: '', fileName: '', mimeType: '', size: 0 };
  }

  async uploadMessageAttachmentToServer(file, {
    kind = 'file',
    chat = null,
    content = '',
    replyToLocalId = null
  } = {}) {
    const uploadFile = file instanceof File
      ? file
      : new File([file], `attachment-${Date.now()}`, { type: file?.type || 'application/octet-stream' });
    const chatServerId = this.resolveChatServerId(chat);
    const replyToServerId = chat
      ? this.getServerMessageIdByLocalId(chat, replyToLocalId)
      : '';
    const errorMessages = [];

    if (chatServerId) {
      try {
        const formData = new FormData();
        formData.append('file', uploadFile, uploadFile.name);
        formData.append('chatId', chatServerId);
        if (typeof content === 'string' && content.trim()) {
          formData.append('content', content.trim());
        }
        if (replyToServerId) {
          formData.append('replyToId', replyToServerId);
        }

        const response = await fetch(buildApiUrl('/messages/upload'), {
          method: 'POST',
          headers: this.getApiHeaders(),
          body: formData
        });
        const data = await this.readJsonSafe(response);
        if (response.ok) {
          const meta = this.extractUploadedAttachmentMeta(data);
          return {
            ...meta,
            fileName: meta.fileName || uploadFile.name,
            mimeType: meta.mimeType || uploadFile.type || '',
            createdMessage: data || {}
          };
        }
        errorMessages.push(`/messages/upload [file]: ${this.getRequestErrorMessage(data, 'Не вдалося завантажити файл.')}`);
      } catch (error) {
        errorMessages.push(`/messages/upload [file]: ${String(error?.message || 'upload failed')}`);
      }
    }

    if (kind === 'image') {
      try {
        const formData = new FormData();
        formData.append('file', uploadFile, uploadFile.name);
        formData.append('kind', 'message');
        const response = await fetch(buildApiUrl('/storage/upload'), {
          method: 'POST',
          headers: this.getApiHeaders(),
          body: formData
        });
        const data = await this.readJsonSafe(response);
        if (response.ok) {
          const meta = this.extractUploadedAttachmentMeta(data);
          if (meta.url) {
            return {
              ...meta,
              fileName: meta.fileName || uploadFile.name,
              mimeType: meta.mimeType || uploadFile.type || ''
            };
          }
        }
        errorMessages.push(`/storage/upload [file]: ${this.getRequestErrorMessage(data, 'Не вдалося завантажити зображення.')}`);
      } catch (error) {
        errorMessages.push(`/storage/upload [file]: ${String(error?.message || 'upload failed')}`);
      }
    }

    const preferredError = errorMessages.find((message) => !/unexpected field/i.test(message))
      || errorMessages[0]
      || 'Не вдалося завантажити файл.';
    throw new Error(preferredError);
  }

  async sendAttachmentMessageToServer(chat, attachment, { replyToLocalId = null } = {}) {
    const userId = this.getAuthUserId();
    if (!userId) {
      throw new Error('Не знайдено X-User-Id у сесії. Увійдіть у акаунт ще раз.');
    }

    const chatServerId = this.resolveChatServerId(chat);
    if (!chatServerId) {
      throw new Error('Не вдалося визначити чат для надсилання вкладення.');
    }

    const attachmentUrl = this.normalizeAttachmentUrl(attachment?.url || attachment?.attachmentUrl || attachment?.fileUrl);
    if (!attachmentUrl) {
      throw new Error('Сервер не повернув URL завантаженого файла.');
    }

    const type = String(attachment?.type || 'file').trim() || 'file';
    const mimeType = String(attachment?.mimeType || '').trim();
    const fileName = String(attachment?.fileName || attachment?.name || '').trim();
    const duration = Number(attachment?.audioDuration || 0) || 0;
    const basePayload = { chatId: chatServerId };
    const replyToServerId = this.getServerMessageIdByLocalId(chat, replyToLocalId);
    if (replyToServerId) {
      basePayload.replyToId = replyToServerId;
    }

    const attempts = [];
    if (type === 'image') {
      attempts.push(
        { endpoint: '/messages', payload: { ...basePayload, type: 'image', imageUrl: attachmentUrl, attachmentUrl, mimeType, fileName, content: '' } },
        { endpoint: '/messages', payload: { ...basePayload, imageUrl: attachmentUrl, mimeType, fileName, text: '' } },
        { endpoint: '/messages', payload: { ...basePayload, attachmentUrl, attachmentMimeType: mimeType, fileName, type: 'image' } }
      );
    } else if (type === 'voice') {
      attempts.push(
        { endpoint: '/messages', payload: { ...basePayload, type: 'voice', audioUrl: attachmentUrl, attachmentUrl, mimeType, fileName, audioDuration: duration, content: '' } },
        { endpoint: '/messages', payload: { ...basePayload, audioUrl: attachmentUrl, mimeType, fileName, duration, text: '' } },
        { endpoint: '/messages', payload: { ...basePayload, attachmentUrl, attachmentMimeType: mimeType, fileName, type: 'voice', audioDuration: duration } }
      );
    } else {
      attempts.push(
        { endpoint: '/messages', payload: { ...basePayload, type: 'file', attachmentUrl, fileUrl: attachmentUrl, mimeType, attachmentMimeType: mimeType, fileName, text: fileName } },
        { endpoint: '/messages', payload: { ...basePayload, fileUrl: attachmentUrl, mimeType, fileName, content: fileName } },
        { endpoint: '/messages', payload: { ...basePayload, attachmentUrl, attachmentMimeType: mimeType, fileName, message: fileName } }
      );
    }

    let lastError = 'Не вдалося надіслати вкладення.';
    let bestError = '';

    for (const attempt of attempts) {
      const response = await fetch(buildApiUrl(attempt.endpoint), {
        method: 'POST',
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

  async updateMessageOnServer(chat, message, text) {
    const chatServerId = this.resolveChatServerId(chat);
    const messageServerId = String(message?.serverId ?? '').trim();
    if (!chatServerId || !messageServerId) {
      return { skipped: true };
    }

    const attempts = [
      {
        endpoint: `/messages/${encodeURIComponent(messageServerId)}`,
        method: 'PATCH',
        payload: { content: text }
      },
      {
        endpoint: `/messages/${encodeURIComponent(messageServerId)}`,
        method: 'PATCH',
        payload: { text }
      },
      {
        endpoint: `/messages/${encodeURIComponent(messageServerId)}`,
        method: 'PUT',
        payload: { content: text }
      },
      {
        endpoint: `/messages/${encodeURIComponent(messageServerId)}/edit`,
        method: 'POST',
        payload: { chatId: chatServerId, content: text }
      },
      {
        endpoint: '/messages/edit',
        method: 'POST',
        payload: { chatId: chatServerId, messageId: messageServerId, content: text }
      },
      {
        endpoint: '/messages/edit',
        method: 'POST',
        payload: { chatId: chatServerId, id: messageServerId, text }
      }
    ];

    let lastError = 'Не вдалося відредагувати повідомлення.';
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

      const messageText = this.getRequestErrorMessage(data, lastError);
      lastError = `HTTP ${response.status}: ${messageText}`;
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

  async deleteMessageOnServer(chat, message, { scope = 'all' } = {}) {
    const safeScope = scope === 'self' ? 'self' : 'all';
    if (safeScope === 'self') {
      return { skipped: true };
    }

    const chatServerId = this.resolveChatServerId(chat);
    const messageServerId = String(message?.serverId ?? '').trim();
    if (!chatServerId || !messageServerId) {
      throw new Error('Повідомлення ще не синхронізовано з сервером.');
    }

    const attempts = [
      {
        endpoint: `/messages/${encodeURIComponent(messageServerId)}?chatId=${encodeURIComponent(chatServerId)}`,
        method: 'DELETE'
      },
      {
        endpoint: `/messages/${encodeURIComponent(messageServerId)}`,
        method: 'DELETE'
      },
      {
        endpoint: `/messages/${encodeURIComponent(messageServerId)}/delete`,
        method: 'POST',
        payload: { chatId: chatServerId }
      },
      {
        endpoint: '/messages/delete',
        method: 'POST',
        payload: { chatId: chatServerId, messageId: messageServerId }
      },
      {
        endpoint: '/messages/remove',
        method: 'POST',
        payload: { chatId: chatServerId, messageId: messageServerId }
      },
      {
        endpoint: `/messages?chatId=${encodeURIComponent(chatServerId)}&messageId=${encodeURIComponent(messageServerId)}`,
        method: 'DELETE'
      }
    ];

    let lastError = 'Не вдалося видалити повідомлення на сервері.';
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
        return data || {};
      }

      const messageText = this.getRequestErrorMessage(data, lastError);
      lastError = `HTTP ${response.status}: ${messageText}`;
      if (!bestError || (response.status !== 404 && response.status !== 405)) {
        bestError = lastError;
      }

      const alreadyDeleted = /already|вже|not found|не знайдено|does not exist|не існує/i.test(messageText);
      if (alreadyDeleted) {
        return {};
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

  appendMessage(msg, highlightClass = '', { scrollToBottom = true } = {}) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer || !this.currentChat) return;
    messagesContainer.classList.remove('no-content');
    messagesContainer.classList.add('has-content');
    if (typeof this.ensureMessagesBottomSpacer === 'function') {
      this.ensureMessagesBottomSpacer(messagesContainer);
    }
    if (typeof this.enableMessagesMediaAutoScroll === 'function') {
      this.enableMessagesMediaAutoScroll(messagesContainer);
    }

    const messageEl = document.createElement('div');
    const highlightTokens = String(highlightClass || '')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);
    const hasNewMessageHighlight = highlightTokens.includes('new-message');
    const shouldAnimate = !hasNewMessageHighlight || this.shouldAnimateMessageInsertion(msg);
    const normalizedHighlightTokens = shouldAnimate
      ? highlightTokens
      : highlightTokens.filter((token) => token !== 'new-message');
    const normalizedHighlightClass = normalizedHighlightTokens.length
      ? ` ${normalizedHighlightTokens.join(' ')}`
      : '';
    messageEl.className = `message ${msg.from}${normalizedHighlightClass}`;
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
    const tailClass = hasInlineMeta ? ' with-tail' : '';
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
    this.initMessageImageTransitions(messageEl);
    this.initVoiceMessageElements(messageEl);
    if (scrollToBottom) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  appendDateSeparator(messagesContainer, dateKey) {
    if (!messagesContainer || !dateKey) return;
    const dateObj = new Date(`${dateKey}T00:00:00`);
    let dateLabel = new Intl.DateTimeFormat('uk-UA', { weekday: 'long', day: 'numeric' }).format(dateObj);
    dateLabel = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
    const sep = document.createElement('div');
    sep.className = 'date-separator';
    sep.innerHTML = `<span class="date-separator-text">${dateLabel}</span>`;
    messagesContainer.appendChild(sep);
  }

  canAppendMessagesIncrementally(prevMessages = [], nextMessages = []) {
    if (!Array.isArray(prevMessages) || !Array.isArray(nextMessages)) return false;
    if (!prevMessages.length || nextMessages.length <= prevMessages.length) return false;

    for (let index = 0; index < prevMessages.length; index += 1) {
      const prev = prevMessages[index];
      const next = nextMessages[index];
      if (!prev || !next) return false;
      const prevServerId = String(prev.serverId || '').trim();
      const nextServerId = String(next.serverId || '').trim();
      if (prevServerId || nextServerId) {
        if (prevServerId !== nextServerId) return false;
      } else if (Number(prev.id) !== Number(next.id)) {
        return false;
      }

      const prevSignature = [
        String(prev.type || 'text'),
        String(prev.text || ''),
        String(prev.time || ''),
        String(prev.date || ''),
        prev.edited ? '1' : '0',
        String(prev.imageUrl || ''),
        String(prev.audioUrl || ''),
        String(prev.fileUrl || prev.attachmentUrl || ''),
        String(prev.replyTo?.from || ''),
        String(prev.replyTo?.text || '')
      ].join('|');
      const nextSignature = [
        String(next.type || 'text'),
        String(next.text || ''),
        String(next.time || ''),
        String(next.date || ''),
        next.edited ? '1' : '0',
        String(next.imageUrl || ''),
        String(next.audioUrl || ''),
        String(next.fileUrl || next.attachmentUrl || ''),
        String(next.replyTo?.from || ''),
        String(next.replyTo?.text || '')
      ].join('|');
      if (prevSignature !== nextSignature) return false;
    }

    return true;
  }

  appendMessagesAfterSync(appendedMessages = [], previousMessages = [], { forceScroll = false, highlightOwn = true } = {}) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer || !Array.isArray(appendedMessages) || !appendedMessages.length) return false;

    const shouldStickToBottom = forceScroll || this.isMessagesNearBottom(messagesContainer, 140);
    let previousMessage = Array.isArray(previousMessages) && previousMessages.length
      ? previousMessages[previousMessages.length - 1]
      : null;

    appendedMessages.forEach((message) => {
      const previousDateKey = String(previousMessage?.date || '').trim();
      const nextDateKey = String(message?.date || new Date().toISOString().slice(0, 10)).trim();
      if (nextDateKey && nextDateKey !== previousDateKey) {
        this.appendDateSeparator(messagesContainer, nextDateKey);
      }
      const shouldHighlight = !message?.from || (highlightOwn || message.from !== 'own');
      const highlightClass = shouldHighlight
        ? (message?.from === 'own' ? ' new-message from-composer' : ' new-message')
        : '';
      this.appendMessage(message, highlightClass, { scrollToBottom: false });
      previousMessage = message;
    });

    if (shouldStickToBottom) {
      this.syncMessagesContainerToBottom(messagesContainer);
    } else {
      this.updateMessagesScrollBottomButtonVisibility();
    }
    return true;
  }

  enableMessagesMediaAutoScroll(messagesContainer, ttlMs = 3200) {
    if (!messagesContainer) return;
    messagesContainer.dataset.mediaAutoScroll = 'true';
    if (this.messagesMediaAutoScrollTimer) {
      clearTimeout(this.messagesMediaAutoScrollTimer);
    }
    this.messagesMediaAutoScrollTimer = window.setTimeout(() => {
      const currentContainer = document.getElementById('messagesContainer');
      if (currentContainer) {
        delete currentContainer.dataset.mediaAutoScroll;
      }
      this.messagesMediaAutoScrollTimer = null;
    }, Math.max(900, Number(ttlMs) || 3200));
  }

  isMessagesAutoScrollSuppressed() {
    const untilTs = Number(this.messagesAutoScrollSuppressedUntil || 0);
    return Number.isFinite(untilTs) && untilTs > Date.now();
  }

  cancelPendingMessagesAutoScroll(messagesContainer = null, { suppressMs = 2200 } = {}) {
    const container = messagesContainer || document.getElementById('messagesContainer');
    if (this.messagesMediaAutoScrollTimer) {
      clearTimeout(this.messagesMediaAutoScrollTimer);
      this.messagesMediaAutoScrollTimer = null;
    }
    if (Array.isArray(this.messagesBottomSyncTimers)) {
      this.messagesBottomSyncTimers.forEach((timerId) => clearTimeout(timerId));
    }
    this.messagesBottomSyncTimers = [];
    this.currentChatBottomPinUntil = 0;
    this.messagesAutoScrollSuppressedUntil = Date.now() + Math.max(400, Number(suppressMs) || 2200);
    if (container) {
      delete container.dataset.mediaAutoScroll;
    }
  }

  pinCurrentChatToBottom(ttlMs = 420) {
    const safeTtl = Number.isFinite(Number(ttlMs)) ? Math.max(180, Number(ttlMs)) : 420;
    this.currentChatBottomPinUntil = Date.now() + safeTtl;
    this.messagesAutoScrollSuppressedUntil = 0;
    const currentChatServerId = this.resolveChatServerId(this.currentChat);
    const currentChatLocalId = Number(this.currentChat?.id);
    this.currentChatBottomPinKey = currentChatServerId
      ? `server:${currentChatServerId}`
      : (Number.isFinite(currentChatLocalId) ? `local:${currentChatLocalId}` : '');
    if (Array.isArray(this.currentChatBottomPinTimeouts)) {
      this.currentChatBottomPinTimeouts.forEach((timerId) => clearTimeout(timerId));
    }
    this.currentChatBottomPinTimeouts = [];
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer || typeof this.syncMessagesContainerToBottom !== 'function') return;
    this.syncMessagesContainerToBottom(messagesContainer);
  }

  shouldKeepCurrentChatPinnedToBottom() {
    const untilTs = Number(this.currentChatBottomPinUntil || 0);
    if (!Number.isFinite(untilTs) || untilTs <= Date.now()) {
      return false;
    }
    const currentChatServerId = this.resolveChatServerId(this.currentChat);
    const currentChatLocalId = Number(this.currentChat?.id);
    const activeChatKey = currentChatServerId
      ? `server:${currentChatServerId}`
      : (Number.isFinite(currentChatLocalId) ? `local:${currentChatLocalId}` : '');
    return Boolean(activeChatKey && activeChatKey === String(this.currentChatBottomPinKey || ''));
  }

  syncMessagesContainerToBottom(messagesContainer, { smooth = false } = {}) {
    if (!messagesContainer) return;
    if (Array.isArray(this.messagesBottomSyncTimers)) {
      this.messagesBottomSyncTimers.forEach((timerId) => clearTimeout(timerId));
    }
    this.messagesBottomSyncTimers = [];

    const applyScroll = () => {
      if (this.isMessagesAutoScrollSuppressed()) return;
      const maxTop = Math.max(0, messagesContainer.scrollHeight - messagesContainer.clientHeight);
      if (smooth && typeof messagesContainer.scrollTo === 'function') {
        messagesContainer.scrollTo({ top: maxTop, behavior: 'smooth' });
      } else {
        messagesContainer.scrollTop = maxTop;
      }
    };

    applyScroll();
    window.requestAnimationFrame(() => {
      applyScroll();
    });
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        applyScroll();
        if (typeof this.updateMessagesScrollBottomButtonVisibility === 'function') {
          this.updateMessagesScrollBottomButtonVisibility();
        }
      });
    });

    [60, 180, 420, 900, 1800].forEach((delay) => {
      const timerId = window.setTimeout(() => {
        applyScroll();
        if (typeof this.updateMessagesScrollBottomButtonVisibility === 'function') {
          this.updateMessagesScrollBottomButtonVisibility();
        }
      }, delay);
      this.messagesBottomSyncTimers.push(timerId);
    });
  }

  getMessageAnimationIdentity(msg) {
    if (!msg || typeof msg !== 'object') {
      return { primaryKey: '', fallbackKey: '' };
    }

    const serverId = String(msg.serverId || '').trim();
    const localId = Number.isFinite(Number(msg.id)) ? String(Number(msg.id)) : '';
    const primaryKey = serverId
      ? `server:${serverId}`
      : (localId ? `local:${localId}` : '');

    const from = String(msg.from || '');
    const type = String(msg.type || 'text');
    const senderId = String(msg.senderId || '');
    const text = String(msg.text || '').trim().slice(0, 160);
    const date = String(msg.date || '');
    const time = String(msg.time || '');
    const imageUrl = String(msg.imageUrl || '').trim();
    const audioUrl = String(msg.audioUrl || '').trim();
    const fileUrl = String(msg.fileUrl || msg.attachmentUrl || '').trim();
    const fileName = String(msg.fileName || '').trim();
    const replyText = String(msg.replyTo?.text || '').trim().slice(0, 80);
    const fallbackKey = [
      'fp',
      from,
      type,
      senderId,
      text,
      date,
      time,
      imageUrl,
      audioUrl,
      fileUrl,
      fileName,
      replyText
    ].join('|');

    return { primaryKey, fallbackKey };
  }

  shouldAnimateMessageInsertion(msg, ttlMs = 4500) {
    const type = String(msg?.type || 'text');
    const isMediaMessage = type === 'image' || type === 'voice' || type === 'file';
    if (isMediaMessage && msg?.pending !== true) {
      return false;
    }

    const safeTtl = Number.isFinite(Number(ttlMs)) ? Math.max(600, Number(ttlMs)) : 4500;
    if (!(this.recentAnimatedMessageKeys instanceof Map)) {
      this.recentAnimatedMessageKeys = new Map();
    }

    const now = Date.now();
    for (const [key, at] of this.recentAnimatedMessageKeys.entries()) {
      if (!key || !Number.isFinite(at) || now - at > safeTtl) {
        this.recentAnimatedMessageKeys.delete(key);
      }
    }

    const { primaryKey, fallbackKey } = this.getMessageAnimationIdentity(msg);
    const dedupeKeys = primaryKey ? [primaryKey] : [fallbackKey].filter(Boolean);
    if (!dedupeKeys.length) return true;

    const alreadyAnimated = dedupeKeys.some((key) => this.recentAnimatedMessageKeys.has(key));
    if (alreadyAnimated) {
      return false;
    }

    dedupeKeys.forEach((key) => this.recentAnimatedMessageKeys.set(key, now));
    return true;
  }

  getMessagePreviewText(msg) {
    if (!msg) return 'Немає повідомлень';
    if (msg.type === 'image' && msg.imageUrl) {
      return (msg.text || '').trim() || 'Фото';
    }
    if (msg.type === 'voice' && msg.audioUrl) {
      return 'Голосове повідомлення';
    }
    if (msg.type === 'file' && (msg.fileUrl || msg.attachmentUrl || msg.fileName)) {
      return String(msg.fileName || msg.text || 'Файл').trim() || 'Файл';
    }
    const text = (msg.text || '').trim();
    return text || 'Немає повідомлень';
  }

  getMessageContextText(msg) {
    if (!msg) return '';
    if (msg.type === 'image' && msg.imageUrl) {
      return (msg.text || 'Фото');
    }
    if (msg.type === 'voice' && msg.audioUrl) {
      return 'Голосове повідомлення';
    }
    if (msg.type === 'file' && (msg.fileUrl || msg.attachmentUrl || msg.fileName)) {
      return String(msg.fileName || msg.text || 'Файл');
    }
    return msg.text || '';
  }

  isTextMessageEditable(msg) {
    if (!msg || msg.from !== 'own') return false;
    return !msg.type || msg.type === 'text';
  }

  updateComposerPrimaryButtonState(hasText = null) {
    const sendBtn = document.getElementById('sendBtn');
    if (!sendBtn) return;
    const input = document.getElementById('messageInput');
    const computedHasText = typeof hasText === 'boolean'
      ? hasText
      : Boolean(input?.value.trim().length);

    sendBtn.classList.toggle('has-text', computedHasText);
    sendBtn.classList.toggle('is-recording', !computedHasText && this.voiceRecordingActive);

    if (computedHasText) {
      sendBtn.setAttribute('aria-label', 'Надіслати повідомлення');
      return;
    }
    if (this.voiceRecordingActive) {
      sendBtn.setAttribute('aria-label', 'Зупинити запис голосового повідомлення');
      return;
    }
    sendBtn.setAttribute('aria-label', 'Записати голосове повідомлення');
  }

  handleSendButtonAction() {
    const input = document.getElementById('messageInput');
    const hasText = Boolean(input?.value.trim().length);
    if (hasText) {
      this.sendMessage();
      return;
    }

    if (!this.currentChat) {
      this.showAlert('Спочатку оберіть чат.');
      return;
    }

    this.toggleVoiceRecording();
  }

  async toggleVoiceRecording() {
    if (this.voiceRecordingActive) {
      this.stopVoiceRecording();
      return;
    }
    await this.startVoiceRecording();
  }

  async startVoiceRecording() {
    if (this.voiceRecordingActive || !this.currentChat) return;
    if (!window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) {
      this.showAlert('Запис голосу недоступний у цьому браузері.');
      return;
    }

    const input = document.getElementById('messageInput');
    if (input?.value.trim().length) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorderOptions = {};
      if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        recorderOptions.mimeType = 'audio/webm;codecs=opus';
      }
      const recorder = new MediaRecorder(stream, recorderOptions);
      this.voiceRecorder = recorder;
      this.voiceRecordingStream = stream;
      this.voiceRecordingChunks = [];
      this.voiceRecordingStartedAt = Date.now();
      this.voiceRecordingDiscarded = false;
      this.voiceRecordingActive = true;

      recorder.addEventListener('dataavailable', (event) => {
        if (!event.data || event.data.size <= 0) return;
        this.voiceRecordingChunks.push(event.data);
      });
      recorder.addEventListener('stop', () => {
        this.finalizeVoiceRecording().catch(() => {
          this.showAlert('Не вдалося обробити голосове повідомлення.');
        });
      }, { once: true });

      if (input) {
        if (!input.dataset.defaultPlaceholder) {
          input.dataset.defaultPlaceholder = input.placeholder || '';
        }
        input.readOnly = true;
        input.placeholder = 'Запис голосового...';
        input.blur();
      }
      this.updateComposerPrimaryButtonState(false);
      recorder.start(150);
    } catch (_) {
      this.voiceRecordingActive = false;
      this.voiceRecorder = null;
      if (this.voiceRecordingStream) {
        this.voiceRecordingStream.getTracks().forEach((track) => track.stop());
        this.voiceRecordingStream = null;
      }
      this.showAlert('Не вдалося розпочати запис. Перевірте доступ до мікрофона.');
      this.updateComposerPrimaryButtonState(false);
    }
  }

  stopVoiceRecording({ discard = false, silent = false } = {}) {
    this.voiceRecordingDiscarded = Boolean(discard);
    this.voiceRecordingActive = false;

    const input = document.getElementById('messageInput');
    if (input) {
      input.readOnly = false;
      input.placeholder = input.dataset.defaultPlaceholder || 'Напишіть повідомлення...';
    }
    this.updateComposerPrimaryButtonState(Boolean(input?.value.trim().length));

    const recorder = this.voiceRecorder;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch (_) {
        this.resetVoiceRecordingState();
        if (!silent) this.showAlert('Не вдалося завершити запис голосу.');
      }
    } else {
      this.resetVoiceRecordingState();
    }

    if (this.voiceRecordingStream) {
      this.voiceRecordingStream.getTracks().forEach((track) => track.stop());
      this.voiceRecordingStream = null;
    }
  }

  resetVoiceRecordingState() {
    this.voiceRecorder = null;
    this.voiceRecordingStream = null;
    this.voiceRecordingChunks = [];
    this.voiceRecordingStartedAt = 0;
    this.voiceRecordingActive = false;
    this.voiceRecordingDiscarded = false;
  }

  async finalizeVoiceRecording() {
    const chunks = Array.isArray(this.voiceRecordingChunks) ? [...this.voiceRecordingChunks] : [];
    const startedAt = this.voiceRecordingStartedAt;
    const shouldDiscard = this.voiceRecordingDiscarded;
    this.resetVoiceRecordingState();

    if (shouldDiscard) return;
    if (!this.currentChat || chunks.length === 0) return;

    const blob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' });
    if (!blob.size) return;

    const audioUrl = await this.blobToDataUrl(blob);
    if (!audioUrl) return;

    const elapsedMs = startedAt > 0 ? (Date.now() - startedAt) : 0;
    const durationSeconds = Math.max(1, Math.round(elapsedMs / 1000));
    const extension = blob.type.includes('ogg') ? 'ogg' : 'webm';
    const voiceFile = new File([blob], `voice-${Date.now()}.${extension}`, {
      type: blob.type || 'audio/webm'
    });
    this.sendVoiceMessage(voiceFile, audioUrl, durationSeconds);
  }

  blobToDataUrl(blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  }

  async sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input?.value.trim() || '';

    if (!message || !this.currentChat) return;
    const nowTs = Date.now();
    if (nowTs - Number(this.lastSendDispatchAt || 0) < 180) return;
    this.lastSendDispatchAt = nowTs;
    this.stopRealtimeTyping({ emit: true });

    if (this.editingMessageId) {
      const msg = this.currentChat.messages.find(m => m.id === this.editingMessageId);
      if (!msg || !this.isTextMessageEditable(msg)) {
        this.editingMessageId = null;
        return;
      }
      const previousText = msg.text;
      const previousEdited = Boolean(msg.edited);
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
      if (msg.serverId) {
        try {
          await this.updateMessageOnServer(this.currentChat, msg, message);
          await this.syncCurrentChatMessagesFromServer({ forceScroll: false, highlightOwn: false });
        } catch (error) {
          msg.text = previousText;
          msg.edited = previousEdited;
          this.saveChats();
          this.renderChat();
          this.renderChatsList();
          await this.showAlert(error?.message || 'Не вдалося відредагувати повідомлення.');
        }
      }
      return;
    }

    const now = new Date();
    const optimisticMessage = {
      id: this.getNextMessageId(this.currentChat),
      serverId: null,
      text: message,
      type: 'text',
      from: 'own',
      time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
      date: now.toISOString().slice(0, 10),
      createdAt: now.toISOString(),
      edited: false,
      pending: true,
      replyTo: this.replyTarget
        ? { id: this.replyTarget.id, text: this.replyTarget.text, from: this.replyTarget.from }
        : null
    };
    const restoreReplyTarget = optimisticMessage.replyTo
      ? { ...optimisticMessage.replyTo }
      : null;

    this.pinCurrentChatToBottom();
    this.currentChat.messages.push(optimisticMessage);
    this.saveChats();
    if (this.currentChat.messages.length === 1) {
      this.renderChat(optimisticMessage.id);
    } else {
      this.appendMessage(optimisticMessage, ' new-message from-composer');
    }
    this.renderChatsList();

    input.value = '';
    this.resizeMessageInput(input);
    this.clearReplyTarget();
    if (window.innerWidth <= 900) {
      input.focus({ preventScroll: true });
    }

    let sentToServer = false;
    try {
      if (this.currentChat && !this.currentChat.isGroup && this.currentChat.participantId) {
        await this.ensurePrivateChatParticipantJoined(this.currentChat);
      }
      const sendResponse = await this.sendTextMessageToServer(this.currentChat, message, {
        replyToLocalId: restoreReplyTarget?.id ?? null
      });
      sentToServer = true;

      const optimisticCurrent = this.currentChat.messages.find((item) => {
        return Number(item?.id) === Number(optimisticMessage.id);
      });
      if (optimisticCurrent) {
        const serverMessageId = this.extractServerMessageIdFromPayload(sendResponse);
        if (serverMessageId) {
          optimisticCurrent.serverId = serverMessageId;
        }
        optimisticCurrent.pending = false;
      }
      this.saveChats();
      this.renderChatsList();
      this.refreshDeliveryStatusUi(this.currentChat.messages);
      if (typeof this.refreshDesktopSecondaryChatsListIfVisible === 'function') {
        this.refreshDesktopSecondaryChatsListIfVisible();
      }

      const hasServerMessageId = Boolean(
        this.extractServerMessageIdFromPayload(sendResponse)
        || String(optimisticCurrent?.serverId || '').trim()
      );
      if (!hasServerMessageId) {
        const activeChatServerId = this.resolveChatServerId(this.currentChat);
        window.setTimeout(() => {
          if (!this.currentChat) return;
          const currentServerId = this.resolveChatServerId(this.currentChat);
          if (activeChatServerId && currentServerId !== activeChatServerId) return;
          this.syncCurrentChatMessagesFromServer({ forceScroll: true, highlightOwn: false }).catch(() => {});
        }, 900);
      }
    } catch (error) {
      if (!sentToServer) {
        const rollbackIndex = this.currentChat.messages.findIndex((item) => {
          return Number(item?.id) === Number(optimisticMessage.id) && !item?.serverId;
        });
        if (rollbackIndex !== -1) {
          this.currentChat.messages.splice(rollbackIndex, 1);
        }
        this.saveChats();
        this.renderChat();
        this.renderChatsList();

        if (input) {
          input.value = message;
          this.resizeMessageInput(input);
        }
        if (restoreReplyTarget) {
          this.setReplyTarget(restoreReplyTarget);
        }
        if (window.innerWidth <= 900) {
          input.focus({ preventScroll: true });
        }
        await this.showAlert(error?.message || 'Не вдалося надіслати повідомлення.');
      }
    }
  }

  openImagePicker() {
    if (this.voiceRecordingActive) {
      this.stopVoiceRecording({ discard: true, silent: true });
    }
    this.forceComposerFocusUntil = 0;
    if (window.innerWidth > 900) {
      this.launchNativePicker(
        document.getElementById('filePickerInput')
        || document.getElementById('galleryPickerInput')
      );
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
    const appEl = document.querySelector('.orion-app');
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

  async loadImageElementFromFile(file) {
    if (!(file instanceof File)) {
      throw new Error('Некоректний файл зображення.');
    }

    const tempUrl = this.createManagedObjectUrl(file);
    if (!tempUrl) {
      throw new Error('Не вдалося підготувати зображення до обробки.');
    }

    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Не вдалося обробити зображення.'));
        img.src = tempUrl;
      });
      return image;
    } finally {
      this.revokeManagedObjectUrl(tempUrl);
    }
  }

  canvasToBlob(canvas, type, quality = 0.82) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error('Не вдалося підготувати файл зображення.'));
      }, type, quality);
    });
  }

  buildFileNameForMimeType(fileName, mimeType) {
    const baseName = String(fileName || 'image').replace(/\.[^.]+$/, '') || 'image';
    const extensionByType = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp'
    };
    const extension = extensionByType[String(mimeType || '').trim().toLowerCase()] || 'jpg';
    return `${baseName}.${extension}`;
  }

  getImageCompressionMimeCandidates(fileType = '') {
    const normalizedType = String(fileType || '').trim().toLowerCase();
    if (!normalizedType || normalizedType === 'image/jpeg' || normalizedType === 'image/jpg') {
      return ['image/jpeg'];
    }
    if (normalizedType === 'image/webp') {
      return ['image/webp', 'image/jpeg'];
    }
    if (normalizedType === 'image/png' || normalizedType === 'image/avif' || normalizedType === 'image/heic' || normalizedType === 'image/heif') {
      return ['image/webp', 'image/jpeg'];
    }
    return [normalizedType, 'image/jpeg'];
  }

  async prepareImageFileForUpload(file) {
    if (!(file instanceof File)) {
      throw new Error('Некоректний файл зображення.');
    }

    const fileType = String(file.type || '').trim().toLowerCase();
    if (!fileType.startsWith('image/')) {
      return file;
    }
    if (fileType === 'image/gif' || fileType === 'image/svg+xml') {
      return file;
    }

    const image = await this.loadImageElementFromFile(file);
    const sourceWidth = Number(image.naturalWidth || image.width || 0);
    const sourceHeight = Number(image.naturalHeight || image.height || 0);
    if (!sourceWidth || !sourceHeight) {
      return file;
    }

    const maxSide = 1920;
    const sizeThreshold = 1_400_000;
    const longestSide = Math.max(sourceWidth, sourceHeight);
    const scale = Math.min(1, maxSide / Math.max(1, longestSide));
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));
    const requiresResize = targetWidth !== sourceWidth || targetHeight !== sourceHeight;
    const requiresCompression = file.size > sizeThreshold;

    if (!requiresResize && !requiresCompression) {
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      return file;
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.clearRect(0, 0, targetWidth, targetHeight);
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const candidates = this.getImageCompressionMimeCandidates(fileType);
    let outputBlob = null;
    let outputType = fileType || 'image/jpeg';

    for (const candidateType of candidates) {
      try {
        const quality = candidateType === 'image/png' ? 0.92 : 0.82;
        outputBlob = await this.canvasToBlob(canvas, candidateType, quality);
        if (outputBlob?.size) {
          outputType = candidateType;
          break;
        }
      } catch (_) {
      }
    }

    if (!outputBlob?.size) {
      return file;
    }
    if (!requiresResize && outputBlob.size >= file.size * 0.98) {
      return file;
    }

    return new File(
      [outputBlob],
      this.buildFileNameForMimeType(file.name, outputType),
      { type: outputType, lastModified: Date.now() }
    );
  }

  createOptimisticMediaMessage({ kind = 'file', file, previewUrl = '', durationSeconds = 0 } = {}) {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const baseMessage = {
      id: this.getNextMessageId(this.currentChat),
      serverId: null,
      text: '',
      type: kind,
      from: 'own',
      time,
      date: now.toISOString().slice(0, 10),
      createdAt: now.toISOString(),
      pending: true,
      failed: false,
      mediaErrorMessage: '',
      transientMediaDraft: true,
      replyTo: this.replyTarget
        ? { id: this.replyTarget.id, text: this.replyTarget.text, from: this.replyTarget.from }
        : null
    };

    if (kind === 'image') {
      const imageDimensions = this.normalizeImageDimensions(file?.imageWidth, file?.imageHeight);
      return {
        ...baseMessage,
        imageUrl: previewUrl,
        attachmentUrl: '',
        localMediaPreview: true,
        imageWidth: imageDimensions?.width || null,
        imageHeight: imageDimensions?.height || null
      };
    }
    if (kind === 'voice') {
      return {
        ...baseMessage,
        audioUrl: previewUrl,
        attachmentUrl: '',
        audioDuration: Math.max(0, Number(durationSeconds) || 0),
        localMediaPreview: true
      };
    }
    return {
      ...baseMessage,
      text: file?.name || 'Файл',
      fileUrl: '',
      attachmentUrl: '',
      fileName: file?.name || 'Файл',
      attachmentMimeType: file?.type || ''
    };
  }

  async processPendingMediaMessage(messageId, { replyToLocalId = null } = {}) {
    if (!this.currentChat) return false;
    const currentMessage = this.currentChat.messages.find((item) => Number(item?.id) === Number(messageId));
    const draft = this.getMediaRetryDraft(messageId);
    if (!currentMessage || !draft?.file) return false;

    const wasFailed = currentMessage.failed === true;
    currentMessage.pending = true;
    currentMessage.failed = false;
    currentMessage.mediaErrorMessage = '';
    this.saveChats();
    this.renderChatsList();
    if (wasFailed) {
      this.renderChat();
    } else {
      this.refreshDeliveryStatusUi([currentMessage]);
    }

    try {
      if (!this.currentChat.isGroup && this.currentChat.participantId) {
        await this.ensurePrivateChatParticipantJoined(this.currentChat);
      }

      let uploadFile = draft.file;
      if (draft.kind === 'image') {
        uploadFile = await this.prepareImageFileForUpload(draft.file);
      }

      const uploaded = await this.uploadMessageAttachmentToServer(uploadFile, {
        kind: draft.kind,
        chat: this.currentChat,
        content: draft.kind === 'file' ? (uploadFile.name || '') : '',
        replyToLocalId
      });
      const sendResponse = uploaded.createdMessage
        ? uploaded.createdMessage
        : await this.sendAttachmentMessageToServer(this.currentChat, {
          ...uploaded,
          type: draft.kind,
          audioDuration: draft.kind === 'voice' ? Math.max(0, Number(draft.durationSeconds) || 0) : 0
        }, {
          replyToLocalId
        });

      const optimisticCurrent = this.currentChat.messages.find((item) => Number(item?.id) === Number(messageId));
      if (!optimisticCurrent) return false;
      const previousImageUrl = String(optimisticCurrent.imageUrl || '').trim();

      if (draft.kind === 'image') {
        optimisticCurrent.imageUrl = uploaded.url || optimisticCurrent.imageUrl || '';
        optimisticCurrent.attachmentUrl = uploaded.url || optimisticCurrent.attachmentUrl || '';
        optimisticCurrent.localMediaPreview = false;
      } else if (draft.kind === 'voice') {
        optimisticCurrent.audioUrl = uploaded.url || optimisticCurrent.audioUrl || '';
        optimisticCurrent.attachmentUrl = uploaded.url || optimisticCurrent.attachmentUrl || '';
        optimisticCurrent.audioDuration = Math.max(0, Number(draft.durationSeconds) || optimisticCurrent.audioDuration || 0);
        optimisticCurrent.localMediaPreview = false;
      } else {
        optimisticCurrent.fileUrl = uploaded.url || optimisticCurrent.fileUrl || '';
        optimisticCurrent.attachmentUrl = uploaded.url || optimisticCurrent.attachmentUrl || '';
        optimisticCurrent.fileName = uploaded.fileName || optimisticCurrent.fileName;
      }

      optimisticCurrent.attachmentMimeType = uploaded.mimeType || optimisticCurrent.attachmentMimeType || uploadFile.type || '';
      optimisticCurrent.serverId = this.extractServerMessageIdFromPayload(sendResponse) || optimisticCurrent.serverId;
      optimisticCurrent.pending = false;
      optimisticCurrent.failed = false;
      optimisticCurrent.mediaErrorMessage = '';
      optimisticCurrent.transientMediaDraft = false;

      this.releaseMediaRetryDraft(messageId, { revokePreview: draft.kind !== 'image' });
      this.saveChats();
      this.renderChatsList();
      this.refreshDeliveryStatusUi(this.currentChat.messages);
      if (draft.kind === 'image' && uploaded.url) {
        this.transitionRenderedMessageImageToUploadedSource(messageId, uploaded.url, previousImageUrl);
      } else if (draft.kind === 'file') {
        this.renderChat();
      }
      if (typeof this.refreshDesktopSecondaryChatsListIfVisible === 'function') {
        this.refreshDesktopSecondaryChatsListIfVisible();
      }

      const hasServerMessageId = Boolean(
        this.extractServerMessageIdFromPayload(sendResponse)
        || String(optimisticCurrent?.serverId || '').trim()
      );
      if (!hasServerMessageId) {
        window.setTimeout(() => {
          this.syncCurrentChatMessagesFromServer({ forceScroll: true, highlightOwn: false }).catch(() => {});
        }, 900);
      }
      return true;
    } catch (error) {
      const optimisticCurrent = this.currentChat.messages.find((item) => Number(item?.id) === Number(messageId));
      if (optimisticCurrent) {
        optimisticCurrent.pending = false;
        optimisticCurrent.failed = true;
        optimisticCurrent.mediaErrorMessage = String(error?.message || 'Не вдалося надіслати медіа.');
        optimisticCurrent.transientMediaDraft = true;
      }
      this.saveChats();
      this.renderChat();
      this.renderChatsList();
      if (typeof this.refreshDesktopSecondaryChatsListIfVisible === 'function') {
        this.refreshDesktopSecondaryChatsListIfVisible();
      }
      return false;
    }
  }

  transitionRenderedMessageImageToUploadedSource(messageId, uploadedUrl, previousUrl = '') {
    const safeId = String(messageId || '').trim();
    const nextUrl = String(uploadedUrl || '').trim();
    const prevUrl = String(previousUrl || '').trim();
    if (!safeId || !nextUrl) {
      if (prevUrl && prevUrl !== nextUrl) {
        this.revokeManagedObjectUrl(prevUrl);
      }
      return;
    }

    const selector = `.message[data-id="${CSS.escape(safeId)}"] .message-image`;
    const imageEl = document.querySelector(selector);
    if (!imageEl) {
      if (prevUrl && prevUrl !== nextUrl) {
        this.revokeManagedObjectUrl(prevUrl);
      }
      return;
    }

    const currentUrl = String(imageEl.currentSrc || imageEl.getAttribute('src') || '').trim();
    if (currentUrl === nextUrl) {
      if (prevUrl && prevUrl !== nextUrl) {
        this.revokeManagedObjectUrl(prevUrl);
      }
      return;
    }

    const preloadImage = new Image();
    try {
      preloadImage.decoding = 'async';
    } catch (_) {
    }
    preloadImage.onload = () => {
      if (imageEl.isConnected) {
        imageEl.src = nextUrl;
        imageEl.dataset.ready = 'true';
        imageEl.classList.add('is-loaded');
      }
      if (prevUrl && prevUrl !== nextUrl) {
        this.revokeManagedObjectUrl(prevUrl);
      }
    };
    preloadImage.onerror = () => {
      if (prevUrl && prevUrl !== nextUrl) {
        this.revokeManagedObjectUrl(prevUrl);
      }
    };
    preloadImage.src = nextUrl;
  }

  async queueMediaMessage({ kind = 'file', file, previewUrl = '', durationSeconds = 0 } = {}) {
    if (!(file instanceof File) || !this.currentChat) return false;
    const input = document.getElementById('messageInput');
    const optimisticMessage = this.createOptimisticMediaMessage({
      kind,
      file,
      previewUrl,
      durationSeconds
    });
    const replyToLocalId = optimisticMessage.replyTo?.id ?? null;

    this.storeMediaRetryDraft(optimisticMessage.id, {
      kind,
      file,
      previewUrl,
      durationSeconds
    });

    this.pinCurrentChatToBottom();
    this.currentChat.messages.push(optimisticMessage);
    this.saveChats();
    this.clearReplyTarget();
    if (this.currentChat.messages.length === 1) {
      this.renderChat(optimisticMessage.id);
    } else {
      this.appendMessage(optimisticMessage, ' new-message');
    }
    this.renderChatsList();

    if (input && window.innerWidth <= 900) {
      input.focus({ preventScroll: true });
    }

    return this.processPendingMediaMessage(optimisticMessage.id, { replyToLocalId });
  }

  async retryFailedMediaMessage(messageId) {
    if (!this.currentChat) return false;
    const targetMessage = this.currentChat.messages.find((item) => Number(item?.id) === Number(messageId));
    const draft = this.getMediaRetryDraft(messageId);
    if (!targetMessage || !draft?.file) {
      await this.showAlert('Немає локального файла для повторного надсилання.');
      return false;
    }
    this.pinCurrentChatToBottom();
    return this.processPendingMediaMessage(messageId, {
      replyToLocalId: targetMessage.replyTo?.id ?? null
    });
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
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
      this.sendImageMessage(file);
    }, 'image/jpeg', 0.9);
    this.closeCameraCapture();
  }

  handleImageSelected(event) {
    const input = event?.target;
    const file = input?.files?.[0];
    if (!file || !this.currentChat) return;
    const isImage = file.type.startsWith('image/');
    const isFilePicker = String(input?.id || '') === 'filePickerInput';
    if (isFilePicker && !isImage) {
      this.sendFileMessage(file);
      input.value = '';
      return;
    }
    if (!isImage) {
      this.showAlert('Оберіть файл зображення');
      input.value = '';
      return;
    }
    this.sendImageMessage(file);
    input.value = '';
  }

  async sendImageMessage(file) {
    if (!(file instanceof File) || !this.currentChat) return false;
    try {
      const dimensions = await this.getImageFileDimensions(file);
      if (dimensions) {
        file.imageWidth = dimensions.width;
        file.imageHeight = dimensions.height;
      }
    } catch (_) {
    }
    const previewUrl = this.createManagedObjectUrl(file);
    if (!previewUrl) {
      await this.showAlert('Не вдалося підготувати фото до надсилання.');
      return false;
    }
    return this.queueMediaMessage({
      kind: 'image',
      file,
      previewUrl
    });
  }

  async sendVoiceMessage(file, previewUrl, durationSeconds = 0) {
    if (!(file instanceof File) || !previewUrl || !this.currentChat) return false;
    return this.queueMediaMessage({
      kind: 'voice',
      file,
      previewUrl,
      durationSeconds
    });
  }

  async sendFileMessage(file) {
    if (!(file instanceof File) || !this.currentChat) return false;
    return this.queueMediaMessage({
      kind: 'file',
      file
    });
  }

  openNewChatModal({ mode = 'direct' } = {}) {
    document.getElementById('newChatModal').classList.add('active');
    document.getElementById('modalOverlay').classList.add('active');
    document.getElementById('newContactInput').value = '';
    this.newChatUserResults = [];
    this.newChatSelectedUser = null;
    this.newChatUserSearchRequestId = 0;
    this.newChatGroupSelectedUsers = [];
    this.renderNewChatSearchState({
      message: "Почніть вводити тег користувача (або ім'я/номер)."
    });
    this.setNewChatGroupMode(mode === 'group');
    document.getElementById('newContactInput').focus();
  }

  closeNewChatModal() {
    document.getElementById('newChatModal').classList.remove('active');
    document.getElementById('modalOverlay').classList.remove('active');
    document.getElementById('newContactInput').value = '';
    const isGroupToggle = document.getElementById('isGroupToggle');
    const groupMembersInput = document.getElementById('groupMembersInput');
    const groupFields = document.getElementById('groupFields');
    const userSearchWrap = document.getElementById('newChatUserSearch');
    if (isGroupToggle) isGroupToggle.checked = false;
    if (groupMembersInput) groupMembersInput.value = '';
    if (groupFields) groupFields.classList.remove('active');
    if (userSearchWrap) userSearchWrap.classList.remove('hidden');
    if (this.newChatUserSearchTimer) {
      clearTimeout(this.newChatUserSearchTimer);
      this.newChatUserSearchTimer = null;
    }
    this.newChatUserResults = [];
    this.newChatSelectedUser = null;
    this.newChatGroupSelectedUsers = [];
    this.newChatGroupCandidateUsers = [];
    this.newChatUserSearchRequestId = 0;
    this.renderNewChatSearchState({
      message: "Почніть вводити тег користувача (або ім'я/номер)."
    });
    this.renderNewChatGroupSelectedUsers();
    this.renderNewChatGroupUserList([]);
    this.setNewChatGroupMode(false);
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

    if (!isGroup) {
      let selected = this.newChatSelectedUser;
      if (!selected && Array.isArray(this.newChatUserResults) && this.newChatUserResults.length) {
        const normalized = name.toLowerCase();
        const normalizedTag = normalized.replace(/^@+/, '');
        selected = this.newChatUserResults.find((user) => {
          const byName = (user.name || '').toLowerCase() === normalized;
          const byMobile = String(user.mobile || '').trim() === name;
          const byTag = String(user.tag || '').toLowerCase() === normalizedTag;
          return byName || byMobile || byTag;
        }) || null;
        if (selected) {
          this.newChatSelectedUser = selected;
        }
      }
      if (!selected) {
        await this.showAlert('Оберіть користувача зі списку пошуку.');
        return;
      }
      const existsByParticipant = this.chats.find((chat) => chat.participantId && chat.participantId === selected.id);
      if (existsByParticipant) {
        this.closeNewChatModal();
        this.selectChat(existsByParticipant.id);
        return;
      }
    }

    let newChat;
    let selectedUserForDirectChat = null;
    try {
      const selected = this.newChatSelectedUser;
      selectedUserForDirectChat = !isGroup ? selected : null;
      if (!isGroup && selected?.id) {
        this.cacheKnownUserMeta(selected.id, {
          name: selected.name || '',
          avatarImage: selected.avatarImage || this.getUserAvatarImage(selected.raw),
          avatarColor: selected.avatarColor || this.getUserAvatarColor(selected.raw)
        });
      }
      const payload = {
        name: isGroup ? name : (selected?.name || name),
        isPrivate: !isGroup,
        isGroup
      };
      const serverChat = await this.createChatOnServer(payload);

      if (!isGroup && selected?.id) {
        const createdChatId = this.extractServerChatId(serverChat);
        if (createdChatId) {
          // Backend routes use X-User-Id identity; add second participant explicitly
          // so the chat appears in the other user's own /chats list.
          const joined = await this.joinChatOnServerAsUser(createdChatId, selected.id);
          if (!joined) {
            throw new Error('Не вдалося додати другого користувача до чату.');
          }
        } else {
          throw new Error('Сервер не повернув ідентифікатор чату.');
        }
      }

      newChat = this.buildLocalChatFromServer(serverChat, {
        name: payload.name,
        isGroup,
        members,
        participantId: selected?.id || null,
        avatarImage: selected?.avatarImage || this.getCachedUserAvatar(selected?.id),
        avatarColor: selected?.avatarColor || this.getCachedUserMeta(selected?.id)?.avatarColor
      });
      if (!isGroup && selected?.id) {
        newChat.participantConfidence = 2;
        newChat.participantJoinedVerified = true;
        newChat.status = this.getPresenceStatusForUser(selected.id, 'offline');
      }
    } catch (error) {
      await this.showAlert(error?.message || 'Не вдалося створити чат.');
      return;
    }

    this.chats.push(newChat);
    this.saveChats();
    this.renderChatsList();
    this.closeNewChatModal();
    this.selectChat(newChat.id);
    this.runServerChatSync({ forceScroll: true });

    if (selectedUserForDirectChat?.id) {
      // Refresh list shortly after create/join to reflect backend participant state.
      window.setTimeout(() => {
        this.runServerChatSync({ forceScroll: false });
      }, 450);
    }
  }

  beginEditMessage(messageId) {
    if (!this.currentChat) return;
    const msg = this.currentChat.messages.find(m => m.id === messageId);
    if (!msg || !this.isTextMessageEditable(msg)) return;

    const input = document.getElementById('messageInput');
    if (!input) return;
    this.editingMessageId = messageId;
    input.value = msg.text;
    this.resizeMessageInput(input);
    input.focus();
  }

  hideWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    const chatContainer = document.getElementById('chatContainer');
    if (welcomeScreen) {
      welcomeScreen.classList.remove('is-revealing');
      welcomeScreen.classList.add('hidden');
    }
    if (chatContainer) chatContainer.classList.add('active');
  }

  showWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    const chatContainer = document.getElementById('chatContainer');
    if (welcomeScreen) {
      welcomeScreen.classList.remove('hidden');
      welcomeScreen.classList.remove('is-revealing');
      void welcomeScreen.offsetWidth;
      welcomeScreen.classList.add('is-revealing');
      if (this.welcomeRevealTimer) {
        clearTimeout(this.welcomeRevealTimer);
      }
      this.welcomeRevealTimer = window.setTimeout(() => {
        welcomeScreen.classList.remove('is-revealing');
      }, 320);
    }
    if (chatContainer) {
      chatContainer.classList.remove('active');
      chatContainer.style.removeProperty('display');
      chatContainer.style.removeProperty('flex-direction');
      chatContainer.style.removeProperty('height');
      chatContainer.style.removeProperty('padding-bottom');
      chatContainer.style.removeProperty('background-color');
    }
  }

  // Метод-обгортка для імпортованої функції escapeHtml
  escapeHtml(text) {
    return escapeHtml(text);
  }

  formatMessageText(text) {
    return this.escapeHtml(text || '').replace(/\r?\n/g, '<br>');
  }

  shouldInlineMessageMeta(msg) {
    if (!msg || typeof msg !== 'object') return false;
    if (msg.type && msg.type !== 'text') return false;
    if (msg.replyTo) return false;
    const rawText = String(msg.text || '');
    if (!rawText.trim()) return false;
    if (rawText.includes('\n') || rawText.includes('\r')) return false;
    const normalized = rawText.replace(/\s+/g, ' ').trim();
    return normalized.length > 0 && normalized.length <= 36;
  }

  getPriorityChatImageUrls(chat = this.currentChat, limit = 4) {
    const messages = Array.isArray(chat?.messages) ? chat.messages : [];
    const urls = [];
    for (let index = messages.length - 1; index >= 0 && urls.length < limit; index -= 1) {
      const message = messages[index];
      const imageUrl = this.normalizeAttachmentUrl(message?.imageUrl || '');
      if (!imageUrl) continue;
      urls.push(imageUrl);
    }
    return urls;
  }

  primeRecentChatImageUrls(chat = this.currentChat, limit = 4) {
    const urls = this.getPriorityChatImageUrls(chat, limit);
    this.priorityCurrentChatImageUrls = new Set(urls);
    if (!urls.length) return urls;

    if (!(this.preloadedChatImageUrls instanceof Set)) {
      this.preloadedChatImageUrls = new Set();
    }

    urls.forEach((url, index) => {
      if (!url || this.preloadedChatImageUrls.has(url)) return;
      this.preloadedChatImageUrls.add(url);
      const preloadImage = new Image();
      try {
        preloadImage.decoding = 'async';
      } catch (_) {
      }
      try {
        preloadImage.fetchPriority = index === 0 ? 'high' : 'auto';
      } catch (_) {
      }
      preloadImage.src = url;
    });

    return urls;
  }

  getMediaFailureText(message) {
    const raw = String(message?.mediaErrorMessage || '').trim();
    if (!raw) return 'Не вдалося надіслати. Спробуйте ще раз.';
    return raw;
  }

  buildMediaFailureMarkup(message) {
    if (!this.isRetryableMediaMessage(message)) return '';
    const safeId = this.escapeAttr(String(message?.id || ''));
    const failureText = this.escapeHtml(this.getMediaFailureText(message));
    return `
      <div class="message-media-failure" role="status" aria-live="polite">
        <span class="message-media-failure-text">${failureText}</span>
        <button type="button" class="message-media-retry" data-message-id="${safeId}">Повторити</button>
      </div>
    `;
  }

  buildMessageBodyHtml(msg) {
    if (msg?.type === 'image' && msg.imageUrl) {
      const normalizedUrl = this.normalizeAttachmentUrl(msg.imageUrl);
      const safeUrl = this.escapeAttr(normalizedUrl);
      const imageSizeAttrs = this.getMessageImageMarkupSize(msg);
      const isPriorityImage = this.priorityCurrentChatImageUrls instanceof Set
        && this.priorityCurrentChatImageUrls.has(normalizedUrl);
      const loadingMode = isPriorityImage ? 'eager' : 'lazy';
      const fetchPriority = isPriorityImage ? 'high' : 'auto';
      const caption = (msg.text || '').trim();
      const captionHtml = caption ? `<div class="message-image-caption">${this.formatMessageText(caption)}</div>` : '';
      const failureHtml = this.buildMediaFailureMarkup(msg);
      return `
        <div class="message-image-frame">
          <span class="message-image-spinner" aria-hidden="true"></span>
          <img class="message-image" src="${safeUrl}" alt="Надіслане фото" loading="${loadingMode}" fetchpriority="${fetchPriority}" decoding="async"${imageSizeAttrs} />
        </div>${captionHtml}${failureHtml}
      `;
    }
    if (msg?.type === 'voice' && msg.audioUrl) {
      const safeUrl = this.escapeAttr(msg.audioUrl);
      const durationValue = Number.isFinite(Number(msg.audioDuration)) ? Number(msg.audioDuration) : 0;
      const durationLabel = this.formatVoiceDuration(durationValue);
      const failureHtml = this.buildMediaFailureMarkup(msg);
      return `
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
          <span class="voice-duration">${durationLabel}</span>
          <audio class="voice-audio" preload="metadata" src="${safeUrl}"></audio>
        </div>${failureHtml}
      `;
    }
    if (msg?.type === 'file' && (msg.fileUrl || msg.attachmentUrl || msg.documentUrl || msg.fileName)) {
      const rawFileSrc = String(msg.fileUrl || msg.attachmentUrl || msg.documentUrl || '').trim();
      const fileSrc = this.escapeAttr(rawFileSrc);
      const fileName = this.escapeHtml(String(msg.fileName || msg.text || 'Файл'));
      const failureHtml = this.buildMediaFailureMarkup(msg);
      if (!rawFileSrc) {
        return `
          <div class="message-file message-file--pending" role="status" aria-live="polite">
            <span class="message-file-icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
                <path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"></path>
              </svg>
            </span>
            <span class="message-file-name">${fileName}</span>
          </div>${failureHtml}
        `;
      }
      return `
        <a class="message-file" href="${fileSrc}" target="_blank" rel="noopener noreferrer">
          <span class="message-file-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
              <path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"></path>
            </svg>
          </span>
          <span class="message-file-name">${fileName}</span>
        </a>${failureHtml}
      `;
    }
    return `<div class="message-text">${this.formatMessageText(msg?.text || '')}</div>`;
  }

  formatVoiceDuration(seconds = 0) {
    const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
    const minutes = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  }

  buildVoiceWaveBarsHtml(count = 48) {
    const safeCount = Math.max(16, Number(count) || 48);
    return Array.from({ length: safeCount }, (_, index) => {
      const fallbackHeight = index % 2 === 0 ? 42 : 32;
      return `<span class="voice-wave-bar" style="--voice-bar-height: ${fallbackHeight}%; --voice-bar-index: ${index};"></span>`;
    }).join('');
  }

  async ensureVoiceWaveform(voiceEl, audioEl) {
    if (!voiceEl || !audioEl || voiceEl.dataset.waveformReady === 'true') return;
    const bars = voiceEl.querySelectorAll('.voice-wave-bar');
    if (!bars.length) return;
    const source = audioEl.currentSrc || audioEl.getAttribute('src');
    if (!source) return;
    if (!this.voiceWaveformCache) this.voiceWaveformCache = new Map();

    const cachedPeaks = this.voiceWaveformCache.get(source);
    if (cachedPeaks?.length) {
      this.applyVoiceWaveformBars(voiceEl, cachedPeaks);
      voiceEl.dataset.waveformReady = 'true';
      return;
    }
    if (voiceEl.dataset.waveformLoading === 'true') return;

    voiceEl.dataset.waveformLoading = 'true';
    try {
      const peaks = await this.extractVoiceWaveformPeaks(source, bars.length);
      if (peaks.length) {
        this.voiceWaveformCache.set(source, peaks);
        this.applyVoiceWaveformBars(voiceEl, peaks);
      }
    } catch (error) {
      // Fallback bars are already rendered in markup.
    } finally {
      voiceEl.dataset.waveformLoading = 'false';
      voiceEl.dataset.waveformReady = 'true';
    }
  }

  applyVoiceWaveformBars(voiceEl, peaks = []) {
    if (!voiceEl || !Array.isArray(peaks) || !peaks.length) return;
    const bars = voiceEl.querySelectorAll('.voice-wave-bar');
    if (!bars.length) return;
    const defaultHeight = peaks[peaks.length - 1] || 40;

    bars.forEach((barEl, index) => {
      const height = Number.isFinite(peaks[index]) ? peaks[index] : defaultHeight;
      barEl.style.setProperty('--voice-bar-height', `${height}%`);
    });
  }

  async extractVoiceWaveformPeaks(source, barsCount = 24) {
    if (!source || barsCount < 1 || typeof fetch !== 'function') return [];
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return [];

    const response = await fetch(source);
    if (!response.ok) return [];
    const data = await response.arrayBuffer();
    if (!data?.byteLength) return [];

    if (!this.voiceWaveformAudioContext) {
      this.voiceWaveformAudioContext = new AudioContextCtor();
    }
    const audioBuffer = await this.decodeVoiceAudioData(this.voiceWaveformAudioContext, data);
    if (!audioBuffer) return [];
    return this.buildVoiceWaveformPeaksFromBuffer(audioBuffer, barsCount);
  }

  decodeVoiceAudioData(audioContext, arrayBuffer) {
    if (!audioContext || !arrayBuffer) return Promise.resolve(null);
    try {
      const decodeResult = audioContext.decodeAudioData(arrayBuffer.slice(0));
      if (decodeResult && typeof decodeResult.then === 'function') {
        return decodeResult.then((decoded) => decoded || null);
      }
      return Promise.resolve(null);
    } catch (error) {
      return new Promise((resolve, reject) => {
        audioContext.decodeAudioData(arrayBuffer.slice(0), (decoded) => resolve(decoded || null), reject);
      });
    }
  }

  buildVoiceWaveformPeaksFromBuffer(audioBuffer, barsCount = 24) {
    const sampleLength = Number(audioBuffer?.length || 0);
    if (!sampleLength || barsCount < 1) return [];

    const channelsCount = Math.max(1, Number(audioBuffer.numberOfChannels || 1));
    const channels = [];
    for (let channelIndex = 0; channelIndex < channelsCount; channelIndex += 1) {
      channels.push(audioBuffer.getChannelData(channelIndex));
    }

    const blockSize = Math.max(1, Math.floor(sampleLength / barsCount));
    const peaks = [];

    for (let barIndex = 0; barIndex < barsCount; barIndex += 1) {
      const start = barIndex * blockSize;
      const end = Math.min(sampleLength, start + blockSize);
      let peak = 0;

      for (let sampleIndex = start; sampleIndex < end; sampleIndex += 2) {
        for (let channelIndex = 0; channelIndex < channelsCount; channelIndex += 1) {
          const value = Math.abs(channels[channelIndex][sampleIndex] || 0);
          if (value > peak) peak = value;
        }
      }
      peaks.push(peak);
    }

    const smoothed = peaks.map((value, index) => {
      const left = peaks[index - 1] ?? value;
      const right = peaks[index + 1] ?? value;
      return (left + value + right) / 3;
    });
    const maxPeak = Math.max(...smoothed, 0.001);
    const minHeight = 16;
    const maxHeight = 92;

    return smoothed.map((value) => {
      const normalized = value / maxPeak;
      return Math.round(minHeight + normalized * (maxHeight - minHeight));
    });
  }

  initMessageImageTransitions(rootEl) {
    if (!rootEl) return;
    const images = rootEl.querySelectorAll ? rootEl.querySelectorAll('.message-image') : [];
    if (!(this.loadedMessageImageUrls instanceof Set)) {
      this.loadedMessageImageUrls = new Set();
    }
    images.forEach((img) => {
      if (img.dataset.ready === 'true') return;
      const sourceKey = String(img.currentSrc || img.getAttribute('src') || '').trim();
      const markLoaded = () => {
        const messagesContainer = document.getElementById('messagesContainer');
        const frameEl = img.closest('.message-image-frame');
        const messageEl = img.closest('.message');
        const messageId = Number(messageEl?.dataset.id || 0);
        const normalizedDimensions = this.normalizeImageDimensions(
          img.naturalWidth || img.width || img.clientWidth || 0,
          img.naturalHeight || img.height || img.clientHeight || 0
        );
        if (normalizedDimensions) {
          img.setAttribute('width', String(normalizedDimensions.width));
          img.setAttribute('height', String(normalizedDimensions.height));
          if (sourceKey) {
            this.setCachedChatImageDimensions(sourceKey, normalizedDimensions.width, normalizedDimensions.height);
          }
          if (this.currentChat && Number.isFinite(messageId) && messageId > 0) {
            const targetMessage = this.currentChat.messages.find((item) => Number(item?.id) === messageId);
            if (targetMessage) {
              this.applyMessageImageDimensions(
                targetMessage,
                normalizedDimensions.width,
                normalizedDimensions.height
              );
            }
          }
        }
        const shouldStickToBottom = Boolean(
          !this.isMessagesAutoScrollSuppressed()
          && (
          messagesContainer
          && (
            messagesContainer.dataset.mediaAutoScroll === 'true'
            || (typeof this.isMessagesNearBottom === 'function' && this.isMessagesNearBottom(messagesContainer, 160))
          )
          )
        );
        img.classList.add('is-loaded');
        if (frameEl) {
          frameEl.classList.add('is-loaded');
        }
        img.dataset.ready = 'true';
        if (sourceKey) {
          this.loadedMessageImageUrls.add(sourceKey);
        }
        if (shouldStickToBottom && typeof this.syncMessagesContainerToBottom === 'function') {
          this.syncMessagesContainerToBottom(messagesContainer);
        }
      };
      if (sourceKey && this.loadedMessageImageUrls.has(sourceKey)) {
        markLoaded();
        return;
      }
      if (img.complete && img.naturalWidth > 0) {
        markLoaded();
        return;
      }
      img.addEventListener('load', markLoaded, { once: true });
      img.addEventListener('error', markLoaded, { once: true });
    });
  }

  initVoiceMessageElements(rootEl) {
    if (!rootEl) return;
    const voiceMessages = rootEl.querySelectorAll ? rootEl.querySelectorAll('.message-voice') : [];
    voiceMessages.forEach((voiceEl) => {
      const audioEl = voiceEl.querySelector('.voice-audio');
      if (!audioEl) return;
      this.bindVoiceMessageAudio(voiceEl, audioEl);
    });
  }

  setupMessageMediaRetryEvents() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer || messagesContainer.dataset.mediaRetryBound === 'true') return;
    messagesContainer.dataset.mediaRetryBound = 'true';

    messagesContainer.addEventListener('click', (event) => {
      const retryBtn = event.target.closest('.message-media-retry');
      if (!retryBtn) return;
      event.preventDefault();
      event.stopPropagation();
      const messageId = Number(retryBtn.getAttribute('data-message-id') || 0);
      if (!Number.isFinite(messageId) || messageId <= 0) return;
      this.retryFailedMediaMessage(messageId).catch(() => {});
    });
  }

  setupVoiceMessageEvents() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer || messagesContainer.dataset.voiceBound === 'true') return;

    messagesContainer.dataset.voiceBound = 'true';
    messagesContainer.addEventListener('click', (event) => {
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
      if (!trackEl) return;
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
    });

    messagesContainer.addEventListener('pointermove', (event) => {
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

    messagesContainer.addEventListener('pointerleave', () => {
      if (!this.hoveredVoiceMessageEl) return;
      this.clearVoiceTrackHoverPreview(this.hoveredVoiceMessageEl);
      this.hoveredVoiceMessageEl = null;
    });
  }

  getVoiceTrackProgressFromEvent(trackEl, event) {
    if (!trackEl) return 0;
    const pointerX = Number.isFinite(Number(event?.clientX))
      ? Number(event.clientX)
      : null;

    const bars = trackEl.querySelectorAll('.voice-wave-bar');
    if (bars.length) {
      const firstBarRect = bars[0].getBoundingClientRect();
      const lastBarRect = bars[bars.length - 1].getBoundingClientRect();
      const left = firstBarRect.left;
      const right = lastBarRect.right;
      const width = right - left;
      if (width > 0) {
        const safePointerX = pointerX ?? (left + width / 2);
        const rawProgress = ((safePointerX - left) / width) * 100;
        return Math.min(100, Math.max(0, rawProgress));
      }
    }

    const rect = trackEl.getBoundingClientRect();
    if (!rect.width) return 0;
    const safePointerX = pointerX ?? (rect.left + rect.width / 2);
    const rawProgress = ((safePointerX - rect.left) / rect.width) * 100;
    return Math.min(100, Math.max(0, rawProgress));
  }

  seekVoiceMessageToProgress(voiceEl, progress = 0) {
    if (!voiceEl) return;
    const audioEl = voiceEl.querySelector('.voice-audio');
    if (!audioEl) return;
    this.bindVoiceMessageAudio(voiceEl, audioEl);

    const durationFromMeta = Number.isFinite(audioEl.duration) && audioEl.duration > 0
      ? audioEl.duration
      : Number(voiceEl.dataset.duration || 0);
    const safeDuration = durationFromMeta > 0 ? durationFromMeta : 0;
    if (!safeDuration) return;

    const normalizedProgress = Math.min(100, Math.max(0, Number(progress) || 0)) / 100;
    const targetTime = normalizedProgress * safeDuration;
    try {
      audioEl.currentTime = Math.min(safeDuration, Math.max(0, targetTime));
    } catch (_) {
      return;
    }

    this.updateVoiceMessageVisualState(voiceEl, audioEl);
  }

  updateVoiceTrackHoverPreview(voiceEl, progress = 0) {
    if (!voiceEl) return;
    const bars = voiceEl.querySelectorAll('.voice-wave-bar');
    if (!bars.length) return;

    const safeProgress = Math.min(100, Math.max(0, Number(progress) || 0));
    const hoveredBars = Math.max(0, Math.min(
      bars.length,
      Math.round((safeProgress / 100) * bars.length)
    ));
    bars.forEach((barEl, index) => {
      barEl.classList.toggle('is-hovered', index < hoveredBars);
    });
  }

  clearVoiceTrackHoverPreview(voiceEl) {
    if (!voiceEl) return;
    const bars = voiceEl.querySelectorAll('.voice-wave-bar.is-hovered');
    bars.forEach((barEl) => {
      barEl.classList.remove('is-hovered');
    });
  }

  playVoiceMessage(voiceEl, { showError = true } = {}) {
    if (!voiceEl) return;
    const audioEl = voiceEl.querySelector('.voice-audio');
    if (!audioEl) return;

    this.bindVoiceMessageAudio(voiceEl, audioEl);
    if (this.activeVoiceAudio && this.activeVoiceAudio !== audioEl) {
      this.activeVoiceAudio.pause();
    }

    const playAttempt = audioEl.play();
    if (playAttempt && typeof playAttempt.catch === 'function') {
      playAttempt.catch(() => {
        if (this.activeVoiceAudio === audioEl) {
          this.activeVoiceAudio = null;
        }
        this.updateVoiceMessageVisualState(voiceEl, audioEl);
        if (showError) {
          this.showAlert('Не вдалося відтворити голосове повідомлення.');
        }
      });
    }
    this.activeVoiceAudio = audioEl;
  }

  getNextVoiceMessageElement(currentVoiceEl) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer || !currentVoiceEl) return null;
    const voiceMessages = Array.from(messagesContainer.querySelectorAll('.message-voice'));
    if (!voiceMessages.length) return null;
    const currentIndex = voiceMessages.indexOf(currentVoiceEl);
    if (currentIndex < 0) return null;

    for (let index = currentIndex + 1; index < voiceMessages.length; index += 1) {
      const nextVoiceEl = voiceMessages[index];
      if (nextVoiceEl?.querySelector('.voice-audio')) {
        return nextVoiceEl;
      }
    }
    return null;
  }

  playNextVoiceMessage(currentVoiceEl) {
    const nextVoiceEl = this.getNextVoiceMessageElement(currentVoiceEl);
    if (!nextVoiceEl) return;
    this.playVoiceMessage(nextVoiceEl, { showError: false });
  }

  toggleVoiceMessagePlayback(voiceEl) {
    if (!voiceEl) return;
    const audioEl = voiceEl.querySelector('.voice-audio');
    if (!audioEl) return;

    this.bindVoiceMessageAudio(voiceEl, audioEl);
    if (audioEl.paused) {
      this.playVoiceMessage(voiceEl, { showError: true });
      return;
    }

    audioEl.pause();
    if (this.activeVoiceAudio === audioEl) {
      this.activeVoiceAudio = null;
    }
  }

  startVoiceUiAnimation(voiceEl, audioEl) {
    if (!voiceEl || !audioEl || typeof window.requestAnimationFrame !== 'function') return;
    if (!this.voiceUiAnimationFrames) {
      this.voiceUiAnimationFrames = new WeakMap();
    }
    this.stopVoiceUiAnimation(audioEl);

    const tick = () => {
      if (!audioEl || audioEl.paused || audioEl.ended) {
        this.stopVoiceUiAnimation(audioEl);
        return;
      }
      this.updateVoiceMessageVisualState(voiceEl, audioEl);
      const rafId = window.requestAnimationFrame(tick);
      this.voiceUiAnimationFrames.set(audioEl, rafId);
    };

    const rafId = window.requestAnimationFrame(tick);
    this.voiceUiAnimationFrames.set(audioEl, rafId);
  }

  stopVoiceUiAnimation(audioEl) {
    if (!audioEl || !this.voiceUiAnimationFrames || typeof window.cancelAnimationFrame !== 'function') return;
    const rafId = this.voiceUiAnimationFrames.get(audioEl);
    if (!rafId) return;
    window.cancelAnimationFrame(rafId);
    this.voiceUiAnimationFrames.delete(audioEl);
  }

  bindVoiceMessageAudio(voiceEl, audioEl) {
    if (!voiceEl || !audioEl) return;
    if (audioEl.dataset.voiceUiBound === 'true') {
      this.ensureVoiceWaveform(voiceEl, audioEl);
      if (!audioEl.paused && !audioEl.ended) {
        this.startVoiceUiAnimation(voiceEl, audioEl);
      } else {
        this.stopVoiceUiAnimation(audioEl);
      }
      this.updateVoiceMessageVisualState(voiceEl, audioEl);
      return;
    }

    const syncUi = () => this.updateVoiceMessageVisualState(voiceEl, audioEl);
    audioEl.dataset.voiceUiBound = 'true';
    this.ensureVoiceWaveform(voiceEl, audioEl);
    audioEl.addEventListener('loadedmetadata', syncUi);
    audioEl.addEventListener('timeupdate', syncUi);
    audioEl.addEventListener('play', () => {
      this.startVoiceUiAnimation(voiceEl, audioEl);
      syncUi();
    });
    audioEl.addEventListener('pause', () => {
      this.stopVoiceUiAnimation(audioEl);
      syncUi();
    });
    audioEl.addEventListener('ended', () => {
      this.stopVoiceUiAnimation(audioEl);
      audioEl.currentTime = 0;
      if (this.activeVoiceAudio === audioEl) {
        this.activeVoiceAudio = null;
      }
      syncUi();
      this.playNextVoiceMessage(voiceEl);
    });
    syncUi();
  }

  updateVoiceMessageVisualState(voiceEl, audioEl) {
    if (!voiceEl || !audioEl) return;

    const progressEl = voiceEl.querySelector('.voice-track-progress');
    const durationEl = voiceEl.querySelector('.voice-duration');
    const playBtn = voiceEl.querySelector('.voice-play-btn');
    const bars = voiceEl.querySelectorAll('.voice-wave-bar');
    const durationFromMeta = Number.isFinite(audioEl.duration) && audioEl.duration > 0
      ? audioEl.duration
      : Number(voiceEl.dataset.duration || 0);
    const safeDuration = durationFromMeta > 0 ? durationFromMeta : 0;

    if (safeDuration > 0) {
      voiceEl.dataset.duration = String(safeDuration);
    }
    if (durationEl) {
      durationEl.textContent = this.formatVoiceDuration(safeDuration);
    }
    if (progressEl) {
      const progress = safeDuration > 0
        ? Math.min(100, Math.max(0, (audioEl.currentTime / safeDuration) * 100))
        : 0;
      progressEl.style.width = `${progress}%`;
      if (bars.length) {
        const playedBars = Math.max(0, Math.min(
          bars.length,
          Math.round((progress / 100) * bars.length)
        ));
        bars.forEach((barEl, index) => {
          barEl.classList.toggle('is-played', index < playedBars);
        });
      }
    }

    const isPlaying = !audioEl.paused && !audioEl.ended;
    voiceEl.classList.toggle('is-playing', isPlaying);
    if (playBtn) {
      playBtn.setAttribute('aria-label', isPlaying ? 'Пауза' : 'Відтворити голосове повідомлення');
    }
  }

  stopActiveVoicePlayback(resetTime = true) {
    if (!this.activeVoiceAudio) return;
    const audioEl = this.activeVoiceAudio;
    this.activeVoiceAudio = null;
    audioEl.pause();
    if (resetTime) {
      audioEl.currentTime = 0;
    }
    const voiceEl = audioEl.closest('.message-voice');
    if (voiceEl) {
      this.updateVoiceMessageVisualState(voiceEl, audioEl);
    }
  }

  setupImageViewerEvents() {
    const messagesContainer = document.getElementById('messagesContainer');
    const overlay = document.getElementById('imageViewerOverlay');
    const stage = document.getElementById('imageViewerStage');
    const zoomInBtn = document.getElementById('imageViewerZoomInBtn');
    const zoomOutBtn = document.getElementById('imageViewerZoomOutBtn');
    const deleteBtn = document.getElementById('imageViewerDeleteBtn');
    const forwardBtn = document.getElementById('imageViewerForwardBtn');

    if (!messagesContainer || !overlay || !stage || !zoomInBtn || !zoomOutBtn || !deleteBtn || !forwardBtn) return;
    if (overlay.dataset.bound === 'true') return;
    overlay.dataset.bound = 'true';

    messagesContainer.addEventListener('click', (event) => {
      const imageEl = event.target.closest('.message-image');
      if (!imageEl) return;
      const messageEl = imageEl.closest('.message');
      const src = imageEl.currentSrc || imageEl.getAttribute('src');
      if (!src) return;
      event.preventDefault();
      this.openImageViewer(src, imageEl.getAttribute('alt') || 'Надіслане фото', {
        messageId: Number(messageEl?.dataset.id || 0),
        messageFrom: messageEl?.dataset.from || '',
        senderId: messageEl?.dataset.senderId || '',
        senderName: messageEl?.dataset.senderName || '',
        senderAvatarImage: messageEl?.dataset.senderAvatarImage || '',
        senderAvatarColor: messageEl?.dataset.senderAvatarColor || ''
      });
    });

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        this.closeImageViewer();
      }
    });

    zoomInBtn.addEventListener('click', () => {
      const state = this.getImageViewerState();
      this.setImageViewerScale(state.scale + 0.25);
    });
    zoomOutBtn.addEventListener('click', () => {
      const state = this.getImageViewerState();
      this.setImageViewerScale(state.scale - 0.25);
    });
    deleteBtn.addEventListener('click', () => this.deleteImageFromViewer());
    forwardBtn.addEventListener('click', () => this.forwardImageFromViewer());

    stage.addEventListener('dblclick', (event) => {
      const state = this.getImageViewerState();
      if (state.scale <= state.minScale + 0.001) {
        this.setImageViewerScale(2, { clientX: event.clientX, clientY: event.clientY });
        return;
      }
      this.resetImageViewerZoom();
    });

    stage.addEventListener('wheel', (event) => {
      if (!this.isImageViewerOpen()) return;
      event.preventDefault();
      const state = this.getImageViewerState();
      let delta = event.deltaY;
      if (event.deltaMode === 1) delta *= 16;
      if (event.deltaMode === 2) delta *= window.innerHeight;
      const zoomFactor = Math.exp(-delta * 0.0032);
      const nextScale = state.scale * zoomFactor;
      this.setImageViewerScale(nextScale, { clientX: event.clientX, clientY: event.clientY });
    }, { passive: false });

    stage.addEventListener('click', (event) => {
      if (!this.isImageViewerOpen()) return;
      const state = this.getImageViewerState();
      if (state.movedDuringPointer) {
        state.movedDuringPointer = false;
        return;
      }
      const target = event.target;
      if (target instanceof Element && target.closest('#imageViewerImage')) return;
      this.closeImageViewer();
    });

    const handlePointerEnd = (event) => {
      const state = this.getImageViewerState();
      if (!state.pointers.has(event.pointerId)) return;
      state.pointers.delete(event.pointerId);
      if (stage.hasPointerCapture(event.pointerId)) {
        stage.releasePointerCapture(event.pointerId);
      }
      if (state.pointers.size < 2) {
        state.pinchStartDistance = 0;
      }
      if (state.pointers.size === 1 && state.scale > state.minScale + 0.001) {
        const [point] = state.pointers.values();
        state.dragging = true;
        state.lastPointerX = point.x;
        state.lastPointerY = point.y;
      } else {
        state.dragging = false;
      }
    };

    stage.addEventListener('pointerdown', (event) => {
      if (!this.isImageViewerOpen()) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();

      const state = this.getImageViewerState();
      stage.setPointerCapture(event.pointerId);
      state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (state.pointers.size >= 2) {
        const [first, second] = [...state.pointers.values()];
        state.pinchStartDistance = this.getImageViewerDistance(first, second);
        state.pinchStartScale = state.scale;
        state.movedDuringPointer = false;
        state.dragging = false;
        return;
      }

      state.movedDuringPointer = false;
      if (state.scale > state.minScale + 0.001) {
        state.dragging = true;
        state.lastPointerX = event.clientX;
        state.lastPointerY = event.clientY;
      }
    });

    stage.addEventListener('pointermove', (event) => {
      if (!this.isImageViewerOpen()) return;
      const state = this.getImageViewerState();
      if (!state.pointers.has(event.pointerId)) return;
      event.preventDefault();

      state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (state.pointers.size >= 2) {
        const [first, second] = [...state.pointers.values()];
        const currentDistance = this.getImageViewerDistance(first, second);
        if (state.pinchStartDistance > 0) {
          if (Math.abs(currentDistance - state.pinchStartDistance) > 1) {
            state.movedDuringPointer = true;
          }
          const centerX = (first.x + second.x) / 2;
          const centerY = (first.y + second.y) / 2;
          this.setImageViewerScale(
            state.pinchStartScale * (currentDistance / state.pinchStartDistance),
            { clientX: centerX, clientY: centerY }
          );
        }
        return;
      }

      if (!state.dragging || state.scale <= state.minScale + 0.001) return;
      const dx = event.clientX - state.lastPointerX;
      const dy = event.clientY - state.lastPointerY;
      state.lastPointerX = event.clientX;
      state.lastPointerY = event.clientY;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        state.movedDuringPointer = true;
      }
      state.translateX += dx;
      state.translateY += dy;
      this.clampImageViewerTranslation();
      this.applyImageViewerTransform();
    });

    stage.addEventListener('pointerup', handlePointerEnd);
    stage.addEventListener('pointercancel', handlePointerEnd);

    document.addEventListener('keydown', (event) => {
      if (!this.isImageViewerOpen()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeImageViewer();
        return;
      }
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        const state = this.getImageViewerState();
        this.setImageViewerScale(state.scale + 0.25);
        return;
      }
      if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        const state = this.getImageViewerState();
        this.setImageViewerScale(state.scale - 0.25);
        return;
      }
      if (event.key === '0') {
        event.preventDefault();
        this.resetImageViewerZoom();
      }
    });

    window.addEventListener('resize', () => {
      if (!this.isImageViewerOpen()) return;
      this.scheduleImageViewerToolbarLayout();
      this.scheduleImageViewerInlineConfirmLayout();
    });
  }

  getImageViewerState() {
    if (this.imageViewerState) return this.imageViewerState;
    this.imageViewerState = {
      scale: 1,
      minScale: 1,
      maxScale: 5,
      translateX: 0,
      translateY: 0,
      imageSrc: '',
      imageAlt: '',
      messageId: null,
      messageFrom: '',
      senderName: '',
      senderAvatarImage: '',
      senderAvatarColor: '',
      senderInitials: '',
      movedDuringPointer: false,
      dragging: false,
      lastPointerX: 0,
      lastPointerY: 0,
      pinchStartDistance: 0,
      pinchStartScale: 1,
      toolbarLayoutScheduled: false,
      inlineConfirmLayoutScheduled: false,
      inlineConfirmCleanup: null,
      pointers: new Map()
    };
    return this.imageViewerState;
  }

  getImageViewerElements() {
    return {
      overlay: document.getElementById('imageViewerOverlay'),
      stage: document.getElementById('imageViewerStage'),
      image: document.getElementById('imageViewerImage'),
      toolbar: document.querySelector('.image-viewer-toolbar'),
      sender: document.getElementById('imageViewerSender'),
      senderAvatar: document.getElementById('imageViewerSenderAvatar'),
      senderAvatarImage: document.getElementById('imageViewerSenderAvatarImage'),
      senderAvatarInitials: document.getElementById('imageViewerSenderAvatarInitials'),
      senderName: document.getElementById('imageViewerSenderName'),
      inlineConfirm: document.getElementById('imageViewerInlineConfirm'),
      inlineConfirmText: document.getElementById('imageViewerInlineConfirmText'),
      inlineConfirmOkBtn: document.getElementById('imageViewerInlineConfirmOkBtn'),
      inlineConfirmCancelBtn: document.getElementById('imageViewerInlineConfirmCancelBtn')
    };
  }

  isImageViewerOpen() {
    const { overlay } = this.getImageViewerElements();
    return Boolean(overlay?.classList.contains('active'));
  }

  getImageViewerSenderMeta(messageFrom = '', messageMeta = null) {
    const isOwn = String(messageFrom || '').trim() === 'own';
    if (isOwn) {
      const name = this.user?.name || 'Ви';
      const avatarImage = this.getAvatarImage(this.user?.avatarImage || this.user?.avatarUrl);
      const avatarColor = this.user?.avatarColor || this.getContactColor(name);
      return {
        name,
        avatarImage,
        avatarColor,
        initials: this.getInitials(name)
      };
    }

    const senderMeta = this.getMessageSenderDisplayMeta(messageMeta || {}, this.currentChat);
    const contactName = senderMeta.name || this.currentChat?.name || 'Контакт';
    const avatarImage = this.getAvatarImage(senderMeta.avatarImage || '');
    const avatarColor = senderMeta.avatarColor || this.currentChat?.avatarColor || this.getContactColor(contactName);
    return {
      name: contactName,
      avatarImage,
      avatarColor,
      initials: this.getInitials(contactName)
    };
  }

  renderImageViewerSender() {
    const {
      sender,
      senderAvatar,
      senderAvatarImage,
      senderAvatarInitials,
      senderName
    } = this.getImageViewerElements();
    if (!sender || !senderAvatar || !senderAvatarImage || !senderAvatarInitials || !senderName) return;

    const state = this.getImageViewerState();
    const displayName = String(state.senderName || '').trim();
    if (!displayName) {
      sender.hidden = true;
      senderName.textContent = '';
      senderAvatarImage.hidden = true;
      senderAvatarImage.removeAttribute('src');
      senderAvatarInitials.hidden = false;
      senderAvatarInitials.textContent = '';
      senderAvatar.style.removeProperty('background');
      return;
    }

    sender.hidden = false;
    senderName.textContent = displayName;
    senderAvatar.style.background = state.senderAvatarColor || this.getContactColor(displayName);

    const avatarImageSrc = String(state.senderAvatarImage || '').trim();
    if (avatarImageSrc) {
      senderAvatarImage.onerror = () => {
        senderAvatarImage.hidden = true;
        senderAvatarImage.removeAttribute('src');
        senderAvatarInitials.hidden = false;
      };
      senderAvatarImage.onload = () => {
        senderAvatarInitials.hidden = true;
      };
      senderAvatarImage.src = avatarImageSrc;
      senderAvatarImage.hidden = false;
    } else {
      senderAvatarImage.hidden = true;
      senderAvatarImage.removeAttribute('src');
    }

    senderAvatarInitials.textContent = state.senderInitials || this.getInitials(displayName);
    senderAvatarInitials.hidden = Boolean(avatarImageSrc);
  }

  clearImageViewerInlineConfirmBindings() {
    const state = this.getImageViewerState();
    if (typeof state.inlineConfirmCleanup === 'function') {
      state.inlineConfirmCleanup();
    }
    state.inlineConfirmCleanup = null;
  }

  hideImageViewerInlineConfirm() {
    const { inlineConfirm, inlineConfirmText, inlineConfirmOkBtn, inlineConfirmCancelBtn } = this.getImageViewerElements();
    const state = this.getImageViewerState();
    this.clearImageViewerInlineConfirmBindings();
    state.inlineConfirmLayoutScheduled = false;
    if (!inlineConfirm) return;
    inlineConfirm.hidden = true;
    inlineConfirm.style.removeProperty('--image-viewer-inline-confirm-top');
    if (inlineConfirmText) inlineConfirmText.textContent = '';
    if (inlineConfirmOkBtn) inlineConfirmOkBtn.textContent = 'Видалити';
    if (inlineConfirmCancelBtn) inlineConfirmCancelBtn.textContent = 'Скасувати';
  }

  scheduleImageViewerInlineConfirmLayout() {
    const state = this.getImageViewerState();
    const { inlineConfirm } = this.getImageViewerElements();
    if (!inlineConfirm || inlineConfirm.hidden) return;
    if (state.inlineConfirmLayoutScheduled) return;
    state.inlineConfirmLayoutScheduled = true;
    window.requestAnimationFrame(() => {
      state.inlineConfirmLayoutScheduled = false;
      this.updateImageViewerInlineConfirmLayout();
    });
  }

  updateImageViewerInlineConfirmLayout() {
    const { overlay, image, inlineConfirm } = this.getImageViewerElements();
    if (!overlay || !image || !inlineConfirm || inlineConfirm.hidden || !overlay.classList.contains('active')) return;

    const overlayRect = overlay.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    const confirmHeight = inlineConfirm.offsetHeight || 92;
    const edgeGap = window.innerWidth <= 768 ? 10 : 14;
    const minTop = edgeGap;
    const maxTop = Math.max(minTop, overlayRect.height - confirmHeight - edgeGap);
    const preferredTop = (Number.isFinite(imageRect.bottom) ? imageRect.bottom - overlayRect.top : overlayRect.height * 0.5) + edgeGap;
    const nextTop = Math.max(minTop, Math.min(maxTop, preferredTop));

    inlineConfirm.style.setProperty('--image-viewer-inline-confirm-top', `${Math.round(nextTop)}px`);
  }

  showImageViewerInlineConfirm(
    message,
    {
      confirmText = 'Видалити',
      cancelText = 'Скасувати'
    } = {}
  ) {
    const {
      inlineConfirm,
      inlineConfirmText,
      inlineConfirmOkBtn,
      inlineConfirmCancelBtn
    } = this.getImageViewerElements();

    if (!inlineConfirm || !inlineConfirmText || !inlineConfirmOkBtn || !inlineConfirmCancelBtn) {
      return this.showConfirm(message, 'Підтвердження');
    }

    this.hideImageViewerInlineConfirm();
    inlineConfirmText.textContent = String(message || '').trim() || 'Підтвердити дію?';
    inlineConfirmOkBtn.textContent = confirmText;
    inlineConfirmCancelBtn.textContent = cancelText;
    inlineConfirm.hidden = false;
    this.scheduleImageViewerInlineConfirmLayout();

    return new Promise((resolve) => {
      const cleanup = () => {
        inlineConfirmOkBtn.removeEventListener('click', onConfirm);
        inlineConfirmCancelBtn.removeEventListener('click', onCancel);
      };
      const onConfirm = () => {
        this.hideImageViewerInlineConfirm();
        resolve(true);
      };
      const onCancel = () => {
        this.hideImageViewerInlineConfirm();
        resolve(false);
      };

      inlineConfirmOkBtn.addEventListener('click', onConfirm);
      inlineConfirmCancelBtn.addEventListener('click', onCancel);
      this.getImageViewerState().inlineConfirmCleanup = cleanup;
    });
  }

  scheduleImageViewerToolbarLayout() {
    const state = this.getImageViewerState();
    if (state.toolbarLayoutScheduled) return;
    state.toolbarLayoutScheduled = true;
    window.requestAnimationFrame(() => {
      state.toolbarLayoutScheduled = false;
      this.updateImageViewerToolbarLayout();
    });
  }

  updateImageViewerToolbarLayout() {
    const { overlay, stage, toolbar } = this.getImageViewerElements();
    if (!overlay || !stage || !toolbar || !overlay.classList.contains('active')) return;

    const stageRect = stage.getBoundingClientRect();
    if (!stageRect.width || !stageRect.height) return;

    const isMobile = window.innerWidth <= 768;
    const minBottom = isMobile ? 10 : 14;
    const widthPadding = isMobile ? 16 : 24;
    const minWidth = isMobile ? 220 : 320;
    const preferredWidth = isMobile ? 420 : 560;
    const nextWidth = Math.max(minWidth, Math.min(preferredWidth, stageRect.width - widthPadding));

    toolbar.style.setProperty('--image-viewer-toolbar-bottom', `${Math.round(minBottom)}px`);
    toolbar.style.setProperty('--image-viewer-toolbar-width', `${Math.round(nextWidth)}px`);
  }

  openImageViewer(src, alt = 'Надіслане фото', options = {}) {
    if (!src) return;
    const { overlay, image } = this.getImageViewerElements();
    if (!overlay || !image) return;

    image.src = src;
    image.alt = alt;

    const state = this.getImageViewerState();
    state.scale = state.minScale;
    state.translateX = 0;
    state.translateY = 0;
    state.imageSrc = src;
    state.imageAlt = alt;
    state.messageId = Number.isFinite(options.messageId) && options.messageId > 0 ? options.messageId : null;
    state.messageFrom = options.messageFrom || '';
    const senderMeta = this.getImageViewerSenderMeta(state.messageFrom, {
      senderId: options.senderId || '',
      senderName: options.senderName || '',
      senderAvatarImage: options.senderAvatarImage || '',
      senderAvatarColor: options.senderAvatarColor || ''
    });
    state.senderName = senderMeta.name || '';
    state.senderAvatarImage = senderMeta.avatarImage || '';
    state.senderAvatarColor = senderMeta.avatarColor || '';
    state.senderInitials = senderMeta.initials || '';
    state.movedDuringPointer = false;
    state.pointers.clear();
    state.dragging = false;
    state.pinchStartDistance = 0;
    state.pinchStartScale = state.minScale;
    state.toolbarLayoutScheduled = false;
    state.inlineConfirmLayoutScheduled = false;
    this.hideImageViewerInlineConfirm();
    this.applyImageViewerTransform();
    this.renderImageViewerSender();

    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('image-viewer-open');
    document.body.classList.add('image-viewer-open');
    this.scheduleImageViewerToolbarLayout();

    const applyInitialFit = () => {
      if (!this.isImageViewerOpen()) return;
      this.resetImageViewerZoom();
      this.scheduleImageViewerToolbarLayout();
    };

    if (image.complete && image.naturalWidth > 0) {
      window.requestAnimationFrame(applyInitialFit);
    } else {
      image.addEventListener('load', applyInitialFit, { once: true });
      image.addEventListener('error', applyInitialFit, { once: true });
    }
  }

  closeImageViewer() {
    const { overlay, stage, image, toolbar } = this.getImageViewerElements();
    if (!overlay || !stage || !image) return;

    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    stage.classList.remove('is-zoomed');

    document.documentElement.classList.remove('image-viewer-open');
    document.body.classList.remove('image-viewer-open');

    const state = this.getImageViewerState();
    state.scale = state.minScale;
    state.translateX = 0;
    state.translateY = 0;
    state.imageSrc = '';
    state.imageAlt = '';
    state.messageId = null;
    state.messageFrom = '';
    state.senderName = '';
    state.senderAvatarImage = '';
    state.senderAvatarColor = '';
    state.senderInitials = '';
    state.movedDuringPointer = false;
    state.dragging = false;
    state.pointers.clear();
    state.pinchStartDistance = 0;
    state.pinchStartScale = state.minScale;
    state.toolbarLayoutScheduled = false;
    state.inlineConfirmLayoutScheduled = false;
    this.hideImageViewerInlineConfirm();
    image.style.removeProperty('transform');
    image.removeAttribute('src');
    if (toolbar) {
      toolbar.style.removeProperty('--image-viewer-toolbar-bottom');
      toolbar.style.removeProperty('--image-viewer-toolbar-width');
    }
    this.renderImageViewerSender();
  }

  resetImageViewerZoom() {
    const state = this.getImageViewerState();
    state.scale = state.minScale;
    state.translateX = 0;
    state.translateY = 0;
    this.applyImageViewerTransform();
  }

  setImageViewerScale(nextScale, focalPoint = null) {
    const { stage } = this.getImageViewerElements();
    if (!stage) return;

    const state = this.getImageViewerState();
    const targetScale = Math.min(state.maxScale, Math.max(state.minScale, Number(nextScale) || state.minScale));
    const previousScale = state.scale || state.minScale;
    if (Math.abs(targetScale - previousScale) < 0.001) return;

    if (focalPoint && Number.isFinite(focalPoint.clientX) && Number.isFinite(focalPoint.clientY)) {
      const stageRect = stage.getBoundingClientRect();
      const centerX = stageRect.left + stageRect.width / 2;
      const centerY = stageRect.top + stageRect.height / 2;
      const pointerX = focalPoint.clientX - centerX;
      const pointerY = focalPoint.clientY - centerY;
      const offsetX = pointerX - state.translateX;
      const offsetY = pointerY - state.translateY;
      state.translateX = pointerX - (offsetX / previousScale) * targetScale;
      state.translateY = pointerY - (offsetY / previousScale) * targetScale;
    } else {
      const ratio = targetScale / previousScale;
      state.translateX *= ratio;
      state.translateY *= ratio;
    }

    state.scale = targetScale;
    if (targetScale <= state.minScale + 0.001) {
      state.translateX = 0;
      state.translateY = 0;
    }

    this.clampImageViewerTranslation();
    this.applyImageViewerTransform();
  }

  getImageViewerBaseSize() {
    const { stage, image } = this.getImageViewerElements();
    if (!stage || !image) return { width: 0, height: 0 };

    const stageWidth = stage.clientWidth || 0;
    const stageHeight = stage.clientHeight || 0;
    const imageWidth = image.naturalWidth || image.clientWidth || stageWidth;
    const imageHeight = image.naturalHeight || image.clientHeight || stageHeight;

    if (!stageWidth || !stageHeight || !imageWidth || !imageHeight) {
      return { width: stageWidth, height: stageHeight };
    }

    const imageRatio = imageWidth / imageHeight;
    const stageRatio = stageWidth / stageHeight;
    if (imageRatio >= stageRatio) {
      return { width: stageWidth, height: stageWidth / imageRatio };
    }
    return { width: stageHeight * imageRatio, height: stageHeight };
  }

  clampImageViewerTranslation() {
    const { stage } = this.getImageViewerElements();
    if (!stage) return;
    const state = this.getImageViewerState();
    if (state.scale <= state.minScale + 0.001) {
      state.translateX = 0;
      state.translateY = 0;
      return;
    }

    const stageWidth = stage.clientWidth || 0;
    const stageHeight = stage.clientHeight || 0;
    const baseSize = this.getImageViewerBaseSize();
    const scaledWidth = baseSize.width * state.scale;
    const scaledHeight = baseSize.height * state.scale;
    const maxOffsetX = Math.max(0, (scaledWidth - stageWidth) / 2);
    const maxOffsetY = Math.max(0, (scaledHeight - stageHeight) / 2);

    state.translateX = Math.min(maxOffsetX, Math.max(-maxOffsetX, state.translateX));
    state.translateY = Math.min(maxOffsetY, Math.max(-maxOffsetY, state.translateY));
  }

  applyImageViewerTransform() {
    const { stage, image } = this.getImageViewerElements();
    if (!stage || !image) return;
    const state = this.getImageViewerState();
    image.style.transform = `translate3d(${state.translateX}px, ${state.translateY}px, 0) scale(${state.scale})`;
    stage.classList.toggle('is-zoomed', state.scale > state.minScale + 0.001);
    this.scheduleImageViewerToolbarLayout();
    this.scheduleImageViewerInlineConfirmLayout();
  }

  async deleteImageFromViewer() {
    const state = this.getImageViewerState();
    if (!this.currentChat || !Number.isFinite(state.messageId) || state.messageId <= 0) return;

    const confirmed = await this.showImageViewerInlineConfirm('Видалити це фото?', {
      confirmText: 'Видалити',
      cancelText: 'Скасувати'
    });
    if (!confirmed) return;

    this.closeImageViewer();
    this.deleteMessageById(state.messageId);
  }

  async forwardImageFromViewer() {
    const state = this.getImageViewerState();
    if (!state.imageSrc) return;

    if (!Array.isArray(this.chats) || this.chats.length === 0) {
      await this.showAlert('Немає чатів для пересилання.');
      return;
    }

    const targetList = this.chats
      .slice()
      .sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
      .map(chat => `#${chat.id} — ${chat.name}`)
      .join('\n');

    const rawTargetId = window.prompt(`Введіть ID чату для пересилання:\n${targetList}`, this.currentChat ? String(this.currentChat.id) : '');
    if (rawTargetId === null) return;

    const targetId = Number.parseInt(rawTargetId.trim(), 10);
    if (!Number.isFinite(targetId)) {
      await this.showAlert('Невірний ID чату.');
      return;
    }

    const targetChat = this.chats.find(chat => chat.id === targetId);
    if (!targetChat) {
      await this.showAlert('Чат із таким ID не знайдено.');
      return;
    }

    const now = new Date();
    const forwardedMessage = {
      id: this.getNextMessageId(targetChat),
      text: '',
      type: 'image',
      imageUrl: state.imageSrc,
      from: 'own',
      time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
      date: now.toISOString().slice(0, 10),
      replyTo: null
    };

    if (!Array.isArray(targetChat.messages)) {
      targetChat.messages = [];
    }
    targetChat.messages.push(forwardedMessage);
    this.saveChats();

    if (this.currentChat?.id === targetChat.id) {
      this.renderChat(forwardedMessage.id);
    }
    this.renderChatsList();
    await this.showAlert('Фото переслано!', 'Пересилання');
  }

  getImageViewerDistance(firstPoint, secondPoint) {
    const dx = firstPoint.x - secondPoint.x;
    const dy = firstPoint.y - secondPoint.y;
    return Math.hypot(dx, dy);
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
    this.syncDesktopNavRailActive(btn?.id || null);
  }

  syncDesktopNavRailActive(activeNavId = null) {
    const railItems = document.querySelectorAll('.desktop-nav-rail-item[data-nav-target]');
    if (!railItems.length) return;
    const resolvedNavId = activeNavId
      || document.querySelector('.bottom-nav-item.active')?.id
      || 'navChats';

    railItems.forEach((item) => {
      const isActive = item.dataset.navTarget === resolvedNavId;
      item.classList.toggle('active', isActive);
      if (isActive) {
        item.setAttribute('aria-current', 'page');
      } else {
        item.removeAttribute('aria-current');
      }
    });
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
    const appRoot = document.querySelector('.orion-app') || document.getElementById('app');
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

      button.innerHTML = this.getChatAvatarHtml(chat, 'sidebar-avatar-chip-circle');
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

}
