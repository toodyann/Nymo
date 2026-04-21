import { getSettingsTemplate } from '../../../ui/templates/settings-templates.js';
import { escapeHtml } from '../../../shared/helpers/ui-helpers.js';
import { buildApiUrl } from '../../../shared/api/api-url.js';
import { getAuthSession } from '../../../shared/auth/auth-session.js';
import {
  SELF_DELETED_CHATS_STORAGE_KEY,
  SELF_DELETED_MESSAGES_STORAGE_KEY
} from '../messaging-parts/index.js';
import { ChatAppMessagingAuthNotificationMethods } from './messaging-auth-notification-methods.js';

export class ChatAppMessagingSelfDeleteUnreadMethods extends ChatAppMessagingAuthNotificationMethods {
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

}
