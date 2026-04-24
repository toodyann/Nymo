import { getSettingsTemplate } from '../../../ui/templates/settings-templates.js';
import { escapeHtml } from '../../../shared/helpers/ui-helpers.js';
import { buildApiUrl } from '../../../shared/api/api-url.js';
import { getAuthSession } from '../../../shared/auth/auth-session.js';
import {
  SELF_DELETED_CHATS_STORAGE_KEY,
  SELF_DELETED_MESSAGES_STORAGE_KEY,
  LEGACY_SELF_DELETED_CHATS_STORAGE_KEY,
  LEGACY_SELF_DELETED_MESSAGES_STORAGE_KEY
} from '../messaging-parts/index.js';

export class ChatAppMessagingAuthNotificationMethods {
  getSelfDeletedChatsStorageKey() {
    const userId = this.getAuthUserId();
    if (!userId) return SELF_DELETED_CHATS_STORAGE_KEY;
    return `${SELF_DELETED_CHATS_STORAGE_KEY}:${userId}`;
  }

  getLegacySelfDeletedChatsStorageKey() {
    const userId = this.getAuthUserId();
    if (!userId) return LEGACY_SELF_DELETED_CHATS_STORAGE_KEY;
    return `${LEGACY_SELF_DELETED_CHATS_STORAGE_KEY}:${userId}`;
  }


  getSelfDeletedMessagesStorageKey() {
    const userId = this.getAuthUserId();
    if (!userId) return SELF_DELETED_MESSAGES_STORAGE_KEY;
    return `${SELF_DELETED_MESSAGES_STORAGE_KEY}:${userId}`;
  }

  getLegacySelfDeletedMessagesStorageKey() {
    const userId = this.getAuthUserId();
    if (!userId) return LEGACY_SELF_DELETED_MESSAGES_STORAGE_KEY;
    return `${LEGACY_SELF_DELETED_MESSAGES_STORAGE_KEY}:${userId}`;
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
    title = 'Nymo',
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

    const safeTitle = String(title || '').trim() || 'Nymo';
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
    const title = String(chat.name || message.senderName || 'Nymo').trim() || 'Nymo';
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
        type: 'nymo-open-chat',
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

}
