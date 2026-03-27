import { getSettingsTemplate } from '../../ui/templates/settings-templates.js';
import { escapeHtml } from '../../shared/helpers/ui-helpers.js';
import { buildApiUrl, getAuthSession } from '../../shared/auth/auth-session.js';

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

  getApiHeaders({ json = false } = {}) {
    const headers = {};
    if (json) headers['Content-Type'] = 'application/json';
    // Backend test client works via X-User-Id only.
    const userId = this.getAuthUserId();
    if (userId) headers['X-User-Id'] = userId;
    return headers;
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
    const value = user.avatarColor ?? user.profileColor ?? '';
    return String(value || '').trim();
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
    return String(entity.id ?? entity.userId ?? entity._id ?? entity.sub ?? '').trim();
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
    const directName = this.getUserDisplayName(message);
    if (directName && directName !== 'Користувач') return directName;
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
      message.owner,
      message
    ];
    for (const candidate of senderCandidates) {
      const avatar = this.getUserAvatarImage(candidate);
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
      message.owner,
      message
    ];
    for (const candidate of senderCandidates) {
      const color = this.getUserAvatarColor(candidate);
      if (color) return color;
    }
    return '';
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

  normalizeUserList(payload) {
    const candidates = [
      payload,
      payload?.users,
      payload?.data,
      payload?.results,
      payload?.items
    ];
    const source = candidates.find(Array.isArray);
    if (!source) return [];

    const selfId = this.getAuthUserId();
    return source
      .filter((item) => item && typeof item === 'object')
      .map((item) => {
        const id = String(item.id ?? item.userId ?? item._id ?? '').trim();
        const normalizedName = this.getUserDisplayName(item);
        const avatarImage = this.getUserAvatarImage(item);
        const avatarColor = this.getUserAvatarColor(item);
        this.cacheKnownUserMeta(id, {
          name: normalizedName,
          avatarImage,
          avatarColor
        });
        return {
          id,
          name: normalizedName,
          tag: this.getUserTag(item),
          mobile: String(item.mobile ?? item.phone ?? '').trim(),
          email: String(item.email ?? '').trim(),
          avatarImage,
          avatarColor,
          raw: item
        };
      })
      .filter((item) => item.id && item.id !== selfId);
  }

  renderNewChatSearchState({
    loading = false,
    users = [],
    selectedUserId = ''
  } = {}) {
    const listEl = document.getElementById('newChatUserSearchResults');
    if (!listEl) return;

    if (loading) {
      listEl.innerHTML = '';
      return;
    }

    if (!users.length) {
      listEl.innerHTML = '';
      return;
    }

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
      `/users/search?query=${encoded}`,
      `/users/search?search=${encoded}`,
      `/users?search=${encoded}`,
      `/users?query=${encoded}`
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
        if (users.length > 0) return users;
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

  getNewChatGroupSelectedIds() {
    if (!(this.newChatGroupSelectedIds instanceof Set)) {
      this.newChatGroupSelectedIds = new Set();
    }
    return this.newChatGroupSelectedIds;
  }

  collectRelatedUsersForGroupChat() {
    const selfId = this.getAuthUserId();
    const relatedById = new Map();

    const mergeUser = (userId, meta = {}) => {
      const safeId = String(userId || '').trim();
      if (!safeId || (selfId && safeId === selfId)) return;

      const prev = relatedById.get(safeId) || {
        id: safeId,
        name: '',
        tag: '',
        mobile: '',
        email: '',
        avatarImage: '',
        avatarColor: '',
        raw: null
      };

      const nextName = String(meta.name || '').trim();
      const nextAvatarImage = this.getAvatarImage(meta.avatarImage);
      const nextAvatarColor = String(meta.avatarColor || '').trim();
      const nextTag = String(meta.tag || '').trim();
      const nextMobile = String(meta.mobile || '').trim();
      const nextEmail = String(meta.email || '').trim();

      const next = {
        ...prev,
        name: prev.name || nextName || 'Користувач',
        tag: prev.tag || nextTag,
        mobile: prev.mobile || nextMobile,
        email: prev.email || nextEmail,
        avatarImage: prev.avatarImage || nextAvatarImage,
        avatarColor: prev.avatarColor || nextAvatarColor
      };
      relatedById.set(safeId, next);
    };

    const chats = Array.isArray(this.chats) ? this.chats : [];
    chats.forEach((chat) => {
      if (!chat || typeof chat !== 'object') return;

      const participantId = String(chat.participantId || '').trim();
      if (participantId && !chat.isGroup) {
        const cached = this.getCachedUserMeta(participantId);
        const fallbackName = !this.isGenericOrInvalidChatName(chat.name, { isGroup: false })
          ? String(chat.name || '').trim()
          : '';
        mergeUser(participantId, {
          name: cached?.name || fallbackName,
          avatarImage: this.getAvatarImage(chat.avatarImage || chat.avatarUrl || cached?.avatarImage),
          avatarColor: String(chat.avatarColor || cached?.avatarColor || '').trim()
        });
      }

      const messages = Array.isArray(chat.messages) ? chat.messages : [];
      messages.forEach((msg) => {
        const senderId = String(msg?.senderId || '').trim();
        if (!senderId || (selfId && senderId === selfId)) return;
        const cached = this.getCachedUserMeta(senderId);
        mergeUser(senderId, {
          name: String(msg?.senderName || '').trim() || cached?.name || '',
          avatarImage: this.getAvatarImage(
            msg?.senderAvatarImage
              || msg?.senderAvatar
              || msg?.avatarImage
              || cached?.avatarImage
          ),
          avatarColor: String(msg?.senderAvatarColor || cached?.avatarColor || '').trim()
        });
      });
    });

    return Array.from(relatedById.values()).sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''), 'uk', { sensitivity: 'base' })
    );
  }

  syncNewChatGroupMembersInputFromSelection() {
    const input = document.getElementById('groupMembersInput');
    if (!input) return;
    const selectedIds = this.getNewChatGroupSelectedIds();
    const users = Array.isArray(this.newChatGroupUsers) ? this.newChatGroupUsers : [];
    const members = users
      .filter((user) => selectedIds.has(user.id))
      .map((user) => String(user.name || '').trim())
      .filter(Boolean);
    input.value = members.join(', ');
  }

  renderNewChatGroupSelectionSummary() {
    const selectedWrap = document.getElementById('newChatGroupSelectedUsers');
    const countEl = document.getElementById('newChatGroupCount');
    if (!selectedWrap) return;

    if (!this.newChatGroupMode) {
      selectedWrap.innerHTML = '';
      if (countEl) countEl.textContent = '0';
      return;
    }

    const selectedIds = this.getNewChatGroupSelectedIds();
    const users = Array.isArray(this.newChatGroupUsers) ? this.newChatGroupUsers : [];
    const selectedUsers = users.filter((user) => selectedIds.has(user.id));

    if (countEl) {
      countEl.textContent = String(selectedUsers.length);
    }

    if (!selectedUsers.length) {
      selectedWrap.innerHTML = '<span class="new-chat-group-selected-empty">Ще нікого не обрано</span>';
      return;
    }

    selectedWrap.innerHTML = selectedUsers.map((user) => {
      const avatarHtml = this.getChatAvatarHtml(
        {
          name: user.name,
          avatarImage: user.avatarImage,
          avatarColor: user.avatarColor
        },
        'new-chat-group-chip-avatar'
      );
      return `
        <button type="button" class="new-chat-group-chip" data-user-id="${this.escapeHtml(user.id)}" title="Прибрати ${this.escapeHtml(user.name)}">
          ${avatarHtml}
          <span class="new-chat-group-chip-name">${this.escapeHtml(user.name)}</span>
          <span class="new-chat-group-chip-remove" aria-hidden="true">×</span>
        </button>
      `;
    }).join('');

    selectedWrap.querySelectorAll('.new-chat-group-chip').forEach((button) => {
      button.addEventListener('click', () => {
        const userId = String(button.getAttribute('data-user-id') || '').trim();
        if (!userId) return;
        const selected = this.getNewChatGroupSelectedIds();
        selected.delete(userId);
        this.syncNewChatGroupMembersInputFromSelection();
        this.renderNewChatGroupUsersList();
      });
    });
  }

  renderNewChatGroupUsersList() {
    const listEl = document.getElementById('newChatGroupUsersList');
    if (!listEl) return;
    const users = Array.isArray(this.newChatGroupUsers) ? this.newChatGroupUsers : [];
    const selectedIds = this.getNewChatGroupSelectedIds();

    if (!this.newChatGroupMode) {
      listEl.innerHTML = '';
      this.renderNewChatGroupSelectionSummary();
      return;
    }

    this.renderNewChatGroupSelectionSummary();

    if (!users.length) {
      listEl.innerHTML = '<div class="new-chat-group-users-empty">Немає користувачів для групи. Спочатку створіть або відкрийте діалог.</div>';
      return;
    }

    listEl.innerHTML = users.map((user) => {
      const tagText = user.tag ? `@${user.tag}` : '';
      const secondary = [tagText, user.mobile || user.email || ''].filter(Boolean).join(' · ');
      const isSelected = selectedIds.has(user.id);
      const activeClass = isSelected ? ' active' : '';
      const avatarHtml = this.getChatAvatarHtml(
        {
          name: user.name,
          avatarImage: user.avatarImage,
          avatarColor: user.avatarColor
        },
        'new-chat-user-result-avatar'
      );

      return `
        <button type="button" class="new-chat-user-result new-chat-group-user${activeClass}" data-user-id="${this.escapeHtml(user.id)}" aria-pressed="${isSelected ? 'true' : 'false'}">
          ${avatarHtml}
          <span class="new-chat-user-result-copy">
            <span class="new-chat-user-result-main">${this.escapeHtml(user.name)}</span>
            <span class="new-chat-user-result-secondary">${this.escapeHtml(secondary || 'Користувач зі списку контактів')}</span>
          </span>
          <span class="new-chat-group-user-indicator" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/>
            </svg>
          </span>
        </button>
      `;
    }).join('');

    listEl.querySelectorAll('.new-chat-group-user').forEach((button) => {
      button.addEventListener('click', () => {
        const userId = String(button.getAttribute('data-user-id') || '').trim();
        if (!userId) return;
        if (selectedIds.has(userId)) {
          selectedIds.delete(userId);
        } else {
          selectedIds.add(userId);
        }
        this.syncNewChatGroupMembersInputFromSelection();
        this.renderNewChatGroupUsersList();
      });
    });
  }

  setNewChatGroupMode(active) {
    const next = Boolean(active);
    this.newChatGroupMode = next;

    const button = document.getElementById('newChatGroupModeBtn');
    const groupFields = document.getElementById('groupFields');
    const userSearchWrap = document.getElementById('newChatUserSearch');

    if (button) {
      button.classList.toggle('active', next);
      button.setAttribute('aria-expanded', next ? 'true' : 'false');
    }
    if (groupFields) {
      groupFields.classList.toggle('active', next);
    }
    if (userSearchWrap) {
      userSearchWrap.classList.toggle('hidden', next);
    }

    if (next) {
      this.newChatSelectedUser = null;
      this.newChatGroupUsers = this.collectRelatedUsersForGroupChat();
      this.renderNewChatSearchState({ users: [], selectedUserId: '' });
      this.renderNewChatGroupUsersList();
      this.syncNewChatGroupMembersInputFromSelection();
      return;
    }

    const selectedIds = this.getNewChatGroupSelectedIds();
    selectedIds.clear();
    this.newChatGroupUsers = [];
    this.syncNewChatGroupMembersInputFromSelection();
    this.renderNewChatGroupSelectionSummary();
    this.renderNewChatGroupUsersList();
    const value = document.getElementById('newContactInput')?.value || '';
    this.scheduleUserSearch(value);
  }

  toggleNewChatGroupMode() {
    this.setNewChatGroupMode(!this.newChatGroupMode);
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
      groupParticipants: this.mergeGroupParticipants(
        Array.isArray(fallback?.groupParticipants) ? fallback.groupParticipants : [],
        []
      )
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
    return String(
      payload.userId
        ?? payload.senderId
        ?? payload.fromUserId
        ?? payload.authorId
        ?? payload.id
        ?? nestedUser?.id
        ?? nestedUser?.userId
        ?? ''
    ).trim();
  }

  extractRealtimeChatId(payload) {
    if (!payload || typeof payload !== 'object') return '';
    const nestedChat = payload.chat && typeof payload.chat === 'object' ? payload.chat : null;
    return String(
      payload.chatId
        ?? payload.roomId
        ?? payload.conversationId
        ?? payload.id
        ?? nestedChat?.id
        ?? nestedChat?.chatId
        ?? ''
    ).trim();
  }

  findChatByServerId(chatServerId) {
    const safeId = String(chatServerId || '').trim();
    if (!safeId || !Array.isArray(this.chats)) return null;
    return this.chats.find((chat) => this.resolveChatServerId(chat) === safeId) || null;
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
      return;
    }

    if (!typingVisible) {
      this.stopRealtimeTyping({ emit: true });
    }

    this.connectRealtimeSocket();
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

  bindRealtimeSocketEvents(socket) {
    if (!socket || socket.__orionBound === true) return;
    socket.__orionBound = true;

    socket.on('connect', () => {
      this.realtimeSocketConnected = true;
      this.joinRealtimeChatRoom(this.currentChat);
    });

    socket.on('disconnect', () => {
      this.realtimeSocketConnected = false;
      this.realtimeJoinedChatId = '';
      this.stopRealtimeTyping({ emit: false });
    });

    socket.on('userOnline', (payload) => this.handleRealtimePresenceEvent(payload, true));
    socket.on('userOffline', (payload) => this.handleRealtimePresenceEvent(payload, false));

    socket.on('userTyping', (payload) => this.handleRealtimeTypingEvent(payload));
    socket.on('typingStart', (payload) => this.handleRealtimeTypingEvent(payload, true));
    socket.on('typingStop', (payload) => this.handleRealtimeTypingEvent(payload, false));
  }

  joinRealtimeChatRoom(chat) {
    const chatServerId = this.resolveChatServerId(chat);
    if (!chatServerId) {
      this.leaveRealtimeChatRoom();
      return;
    }
    if (!this.realtimeSocketConnected || !this.realtimeSocket) return;
    if (this.realtimeJoinedChatId === chatServerId) return;

    this.leaveRealtimeChatRoom();

    try {
      this.realtimeSocket.emit('joinChat', { chatId: chatServerId });
      this.realtimeSocket.emit('joinRoom', { chatId: chatServerId });
    } catch {
      // Ignore transient websocket errors.
    }
    this.realtimeJoinedChatId = chatServerId;
  }

  leaveRealtimeChatRoom() {
    const chatServerId = String(this.realtimeJoinedChatId || '').trim();
    if (!chatServerId || !this.realtimeSocket) {
      this.realtimeJoinedChatId = '';
      return;
    }
    try {
      this.realtimeSocket.emit('leaveChat', { chatId: chatServerId });
      this.realtimeSocket.emit('leaveRoom', { chatId: chatServerId });
    } catch {
      // Ignore transient websocket errors.
    }
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
    this.initializeRealtimeSocket();

    this.runServerChatSync({ forceScroll: false });

    if (this.serverChatSyncTimer) {
      window.clearInterval(this.serverChatSyncTimer);
    }
    this.serverChatSyncTimer = window.setInterval(() => {
      this.runServerChatSync({ forceScroll: false, skipWhenHidden: true });
    }, 2500);

    if (this.serverChatVisibilityHandler) {
      document.removeEventListener('visibilitychange', this.serverChatVisibilityHandler);
    }
    this.serverChatVisibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        this.runServerChatSync({ forceScroll: false });
      }
    };
    document.addEventListener('visibilitychange', this.serverChatVisibilityHandler);
  }

  async runServerChatSync({ forceScroll = false, skipWhenHidden = false } = {}) {
    if (skipWhenHidden && document.visibilityState === 'hidden') return;
    if (this.serverChatSyncInFlight) return;
    this.serverChatSyncInFlight = true;
    try {
      await this.syncChatsFromServer({ preserveSelection: true, renderIfChanged: true });
      await this.syncCurrentChatMessagesFromServer({ forceScroll, highlightOwn: false });
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
        const normalizedParticipants = participants
          .map((member) => this.normalizeParticipantRecord(member))
          .filter(Boolean);
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
        const fallbackAvatarImage = this.getUserAvatarImage(item);
        const avatarImage = this.getAvatarImage(participantAvatarImage || cachedParticipantAvatar || fallbackAvatarImage);
        const fallbackAvatarColor = this.getUserAvatarColor(item);
        const avatarColor = String(participantAvatarColor || cachedParticipant?.avatarColor || fallbackAvatarColor || '').trim();
        const status = this.normalizePresenceStatus(
          participantStatus
          || cachedParticipant?.status
          || item.status
          || item.presence
          || item.isOnline
          || item.online
        );
        const activityAt = this.getChatActivityTimestampValue(item);
        const groupParticipants = isGroup
          ? this.mergeGroupParticipants(
            normalizedParticipants.map((member) => ({
              id: String(member.id || '').trim() || null,
              name: String(member.name || '').trim() || 'Користувач',
              avatarImage: this.getAvatarImage(member.avatarImage || member.avatarUrl),
              avatarColor: String(member.avatarColor || '').trim(),
              status: this.normalizePresenceStatus(member.status)
            })),
            []
          )
          : [];

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
          groupParticipants,
          activityAt
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

  getServerMessageUniqueKey(item) {
    if (!item || typeof item !== 'object') return '';
    const directId = String(item.id ?? item.messageId ?? item._id ?? '').trim();
    if (directId) return `id:${directId}`;
    const createdAt = String(item.createdAt ?? item.timestamp ?? item.date ?? '').trim();
    const senderId = String(
      item.senderId
      ?? item.fromUserId
      ?? item.authorId
      ?? item.userId
      ?? item.user?.id
      ?? ''
    ).trim();
    const type = String(item.type ?? '').trim();
    const content = String(item.content ?? item.text ?? item.message ?? '').trim();
    const attachment = String(item.attachmentUrl ?? item.imageUrl ?? item.audioUrl ?? '').trim();
    return `fp:${createdAt}|${senderId}|${type}|${content}|${attachment}`;
  }

  dedupeServerMessages(messages = []) {
    const source = Array.isArray(messages) ? messages : [];
    if (source.length <= 1) return source;
    const seen = new Set();
    const deduped = [];
    source.forEach((item) => {
      const key = this.getServerMessageUniqueKey(item);
      if (!key || seen.has(key)) return;
      seen.add(key);
      deduped.push(item);
    });
    return deduped;
  }

  async fetchServerMessagesBatch(chatServerId, query = {}) {
    const params = new URLSearchParams({ chatId: String(chatServerId) });
    Object.entries(query || {}).forEach(([key, value]) => {
      if (value == null) return;
      const safeValue = String(value).trim();
      if (!safeValue) return;
      params.set(key, safeValue);
    });

    const response = await fetch(buildApiUrl(`/messages?${params.toString()}`), {
      headers: this.getApiHeaders()
    });
    const data = await this.readJsonSafe(response);
    if (!response.ok) {
      throw new Error(this.getRequestErrorMessage(data, 'Не вдалося завантажити повідомлення.'));
    }
    return {
      data,
      messages: this.normalizeServerMessagesPayload(data)
    };
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
    const mergedGroupParticipants = this.mergeGroupParticipants(
      primary?.groupParticipants,
      secondary?.groupParticipants
    );

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
      groupParticipants: mergedGroupParticipants,
      activityAt: Math.max(
        this.getChatActivityTimestampValue(primary),
        this.getChatActivityTimestampValue(secondary)
      )
    };
  }

  mergeGroupParticipants(primaryList = [], secondaryList = []) {
    const map = new Map();
    const append = (candidate) => {
      if (!candidate || typeof candidate !== 'object') return;
      const id = String(candidate.id || candidate.userId || '').trim();
      const name = String(candidate.name || '').trim();
      const key = id || (name ? `name:${name.toLowerCase()}` : '');
      if (!key) return;

      const previous = map.get(key) || {};
      const avatarImage = this.getAvatarImage(candidate.avatarImage || candidate.avatarUrl || previous.avatarImage || previous.avatarUrl);
      const avatarColor = String(candidate.avatarColor || previous.avatarColor || '').trim();
      const status = this.normalizePresenceStatus(candidate.status || previous.status);

      map.set(key, {
        id: id || String(previous.id || '').trim() || null,
        name: name || String(previous.name || '').trim() || 'Користувач',
        avatarImage,
        avatarUrl: avatarImage,
        avatarColor,
        status
      });
    };

    (Array.isArray(secondaryList) ? secondaryList : []).forEach(append);
    (Array.isArray(primaryList) ? primaryList : []).forEach(append);
    return Array.from(map.values());
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
    const imageUrl = String(message.imageUrl || '').trim();
    const audioUrl = String(message.audioUrl || '').trim();
    return [type, text, imageUrl, audioUrl].join('|');
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
          String(msg?.replyTo?.from || ''),
          String(msg?.replyTo?.text || '')
        ].join(':');
      })
      .join('|');
  }

  getMessageMergeKey(message) {
    if (!message || typeof message !== 'object') return '';
    const serverId = String(message.serverId || '').trim();
    if (serverId) return `server:${serverId}`;

    const localId = Number(message.id);
    if (Number.isFinite(localId) && localId > 0) return `local:${localId}`;

    const from = String(message.from || '').trim();
    const type = String(message.type || 'text').trim();
    const text = String(message.text || '').trim();
    const createdAt = String(message.createdAt || message.timestamp || '').trim();
    const date = String(message.date || '').trim();
    const time = String(message.time || '').trim();
    const imageUrl = String(message.imageUrl || '').trim();
    const audioUrl = String(message.audioUrl || '').trim();
    return `fp:${from}|${type}|${text}|${createdAt}|${date}|${time}|${imageUrl}|${audioUrl}`;
  }

  mergeServerMessagesWithLocalHistory(serverMessages = [], localMessages = []) {
    const incoming = Array.isArray(serverMessages) ? serverMessages : [];
    const existing = Array.isArray(localMessages) ? localMessages : [];
    if (!existing.length) return incoming;
    if (!incoming.length) return existing;

    const map = new Map();
    const order = [];

    const pushBase = (message, index) => {
      const key = this.getMessageMergeKey(message);
      if (!key) return;
      if (!map.has(key)) order.push(key);
      map.set(key, { ...message, _mergeOrder: index });
    };

    existing.forEach((message, index) => pushBase(message, index));

    incoming.forEach((message, index) => {
      const key = this.getMessageMergeKey(message);
      if (!key) return;
      const prev = map.get(key);
      if (!prev) {
        order.push(key);
        map.set(key, { ...message, _mergeOrder: existing.length + index });
        return;
      }

      map.set(key, {
        ...prev,
        ...message,
        // Preserve local echo marker while we are within reconciliation window.
        clientEcho: Boolean(prev.clientEcho || message.clientEcho),
        pending: Boolean(message.pending)
      });
    });

    return order
      .map((key, index) => {
        const item = map.get(key);
        return {
          item,
          index,
          ts: this.getMessageTimestampValue(item),
          mergeOrder: Number(item?._mergeOrder)
        };
      })
      .sort((a, b) => {
        const aTs = Number.isFinite(a.ts) ? a.ts : Number.NaN;
        const bTs = Number.isFinite(b.ts) ? b.ts : Number.NaN;
        if (Number.isFinite(aTs) && Number.isFinite(bTs) && aTs !== bTs) return aTs - bTs;
        const aOrder = Number.isFinite(a.mergeOrder) ? a.mergeOrder : a.index;
        const bOrder = Number.isFinite(b.mergeOrder) ? b.mergeOrder : b.index;
        return aOrder - bOrder;
      })
      .map(({ item }) => {
        const { _mergeOrder, ...clean } = item || {};
        return clean;
      });
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
      if (!liveMessage || liveMessage.from !== 'own') return;

      const liveServerId = String(liveMessage.serverId || '').trim();
      const liveTs = this.getMessageTimestampValue(liveMessage);
      const withinTtl = Number.isFinite(liveTs) && (nowTs - liveTs <= safeTtl);
      const keepAsEcho = liveMessage.pending === true || (liveMessage.clientEcho === true && withinTtl);
      if (!keepAsEcho) return;

      if (liveServerId && usedServerIds.has(liveServerId)) return;

      const key = this.getComparableMessageKey(liveMessage);
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

      if (!withinTtl) return;

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
      if (!msg || msg.from !== 'own' || msg.pending !== true) return;
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
        const senderName = this.extractMessageSenderName(item);
        const senderAvatarImage = this.extractMessageSenderAvatar(item);
        const senderAvatarColor = this.extractMessageSenderAvatarColor(item);
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
        const attachmentUrl = String(item.attachmentUrl ?? item.fileUrl ?? '').trim();
        const imageUrl = String(item.imageUrl ?? '').trim() || attachmentUrl;
        const audioUrl = String(item.audioUrl ?? '').trim();
        const attachmentMime = String(item.attachmentMimeType ?? item.mimeType ?? '').toLowerCase();
        let type = String(item.type ?? '').trim();
        const explicitEditedFlag = item.edited ?? item.isEdited ?? item.wasEdited;
        const serverEdited = explicitEditedFlag === true || explicitEditedFlag === 1 || explicitEditedFlag === 'true';
        const localEdited = Boolean(existingLocalMessage?.edited);
        if (!type) {
          if (audioUrl || attachmentMime.startsWith('audio/')) {
            type = 'voice';
          } else if (imageUrl && (attachmentMime.startsWith('image/') || /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(imageUrl))) {
            type = 'image';
          } else {
            type = 'text';
          }
        }

        if (!existingLocalMessage && (from === 'own' || !senderId)) {
          const comparableKey = this.getComparableMessageKey({
            type,
            text,
            imageUrl: type === 'image' ? imageUrl : '',
            audioUrl: type === 'voice' ? audioUrl : ''
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
          imageUrl: type === 'image' ? imageUrl : '',
          audioUrl: type === 'voice' ? audioUrl : '',
          audioDuration: Number(item.audioDuration ?? item.duration ?? 0) || 0,
          edited: serverEdited || localEdited,
          replyTo: preservedReplyTo,
          pending: false,
          clientEcho: Boolean(matchedLocalMessage?.clientEcho),
          _sortValue: sortValue,
          _stableOrder: hasStableOrder ? stableOrder : null,
          _sourceIndex: index
        };
      })
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

    return this.mergeRecentPendingOwnMessages(normalizedServerMessages, existingMessages, {
      ttlMs: 45000
    });
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
      const localGroupAppearanceUpdatedAt = Number(existing?.localGroupAppearanceUpdatedAt || 0);
      const shouldPreferLocalGroupAppearance = Boolean(
        serverChat.isGroup
        && localGroupAppearanceUpdatedAt > 0
      );
      const mergedName = serverChat.isGroup
        ? (
          shouldPreferLocalGroupAppearance
            ? (existingName || serverName || 'Новий чат')
            : (serverName || existingName || 'Новий чат')
        )
        : (cachedParticipantName || (hasValidServerName ? serverName : '') || (hasValidExistingName ? existingName : '') || 'Новий чат');
      const incomingAvatarImage = this.getAvatarImage(serverChat.avatarImage || serverChat.avatarUrl);
      const existingAvatarImage = this.getAvatarImage(existing?.avatarImage || existing?.avatarUrl);
      const mergedAvatarImage = this.getAvatarImage(
        serverChat.isGroup
          ? (
            shouldPreferLocalGroupAppearance
              ? (existingAvatarImage || incomingAvatarImage)
              : (incomingAvatarImage || existingAvatarImage)
          )
          : (cachedParticipantAvatar || incomingAvatarImage || existingAvatarImage)
      );
      const incomingAvatarColor = String(serverChat.avatarColor || '').trim();
      const existingAvatarColor = String(existing?.avatarColor || '').trim();
      const mergedAvatarColor = String(
        serverChat.isGroup
          ? (
            shouldPreferLocalGroupAppearance
              ? (existingAvatarColor || incomingAvatarColor || '')
              : (incomingAvatarColor || existingAvatarColor || '')
          )
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
        groupParticipants: this.mergeGroupParticipants(
          serverChat.groupParticipants,
          existing?.groupParticipants
        ),
        localGroupAppearanceUpdatedAt: shouldPreferLocalGroupAppearance
          ? localGroupAppearanceUpdatedAt
          : Number(existing?.localGroupAppearanceUpdatedAt || 0),
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
        || String(existing?.status || '') !== String(updatedChat.status || '')
        || JSON.stringify(Array.isArray(existing?.groupParticipants) ? existing.groupParticipants : []) !== JSON.stringify(Array.isArray(updatedChat.groupParticipants) ? updatedChat.groupParticipants : [])
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
      if (!prevServerId) {
        // Keep local-only chats (without server id) to prevent accidental disappearance
        // when backend payload is partial or delayed.
        const localKey = `local:${String(prevChat.id ?? '').trim()}`;
        if (!presentServerIds.has(localKey)) {
          nextChats.push({
            ...prevChat,
            messages: Array.isArray(prevChat.messages) ? [...prevChat.messages] : []
          });
          presentServerIds.add(localKey);
        }
        return;
      }
      if (presentServerIds.has(prevServerId)) return;

      missingCyclesById.set(prevServerId, Number(missingCyclesById.get(prevServerId) || 0) + 1);

      const directParticipantId = String(prevChat.participantId || '').trim();
      const wouldDuplicateDirectByParticipant = Boolean(
        !prevChat.isGroup
        && directParticipantId
        && presentDirectParticipantIds.has(directParticipantId)
      );

      // Never auto-remove missing chats during sync.
      // We keep them locally unless there is a known duplicate direct chat
      // for the same participant.
      const shouldKeepLocally = !wouldDuplicateDirectByParticipant;

      if (!shouldKeepLocally) {
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

    await Promise.all(
      nextChats.map(async (chat) => {
        if (!chat?.serverId) return;
        try {
          const serverMessages = await this.fetchChatMessagesFromServer(chat);
          let nextMessages = this.mapServerMessagesToLocal(chat, serverMessages);
          nextMessages = this.mergeServerMessagesWithLocalHistory(nextMessages, chat.messages);
          const liveChat = this.findChatByServerId(chat.serverId);
          if (liveChat && liveChat !== chat) {
            nextMessages = this.mergeRecentPendingOwnMessages(nextMessages, liveChat.messages, {
              ttlMs: 45000
            });
          }
          const prevMessageSignature = Array.isArray(chat.messages)
            ? chat.messages.map((msg) => `${msg.serverId || msg.id}:${msg.text}:${msg.time}:${msg.edited ? 1 : 0}`).join('|')
            : '';
          const nextMessageSignature = nextMessages
            .map((msg) => `${msg.serverId || msg.id}:${msg.text}:${msg.time}:${msg.edited ? 1 : 0}`)
            .join('|');
          const isActiveChat = Boolean(
            (activeServerId && chat.serverId === activeServerId)
            || chat.id === activeLocalId
          );
          if (prevMessageSignature !== nextMessageSignature) {
            changed = true;
          }
          // Keep message state for every chat entry in the next snapshot.
          // For active chat this prevents a transient "empty/stale messages"
          // replacement right before syncCurrentChatMessagesFromServer runs.
          chat.messages = nextMessages;

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

          if (this.applyChatUnreadState(chat, nextMessages, { markAsRead: isActiveChat })) {
            changed = true;
          }
        } catch {
          // Keep chat list resilient if single chat messages endpoint fails.
        }
      })
    );

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

  async fetchChatMessagesFromServer(chat) {
    const chatServerId = this.resolveChatServerId(chat);
    if (!chatServerId) return [];
    const pageSize = 100;
    const maxPages = 30;

    // 1) Base fetch (and try to raise limit if backend supports it).
    const first = await this.fetchServerMessagesBatch(chatServerId, { limit: pageSize });
    let allMessages = this.dedupeServerMessages(first.messages);
    if (!allMessages.length) {
      return [];
    }

    const appendUnique = (batch = []) => {
      const combined = this.dedupeServerMessages([...allMessages, ...(Array.isArray(batch) ? batch : [])]);
      const grew = combined.length > allMessages.length;
      allMessages = combined;
      return grew;
    };

    // 2) Offset pagination: /messages?chatId=...&limit=...&offset=...
    try {
      for (let i = 1; i < maxPages; i += 1) {
        const batch = await this.fetchServerMessagesBatch(chatServerId, {
          limit: pageSize,
          offset: i * pageSize
        });
        const items = this.dedupeServerMessages(batch.messages);
        if (!items.length) break;
        const grew = appendUnique(items);
        if (!grew || items.length < pageSize) break;
      }
    } catch {
      // Backend may not support offset pagination.
    }

    // 3) Page pagination: /messages?chatId=...&limit=...&page=...
    try {
      for (let page = 2; page <= maxPages; page += 1) {
        const batch = await this.fetchServerMessagesBatch(chatServerId, {
          limit: pageSize,
          page
        });
        const items = this.dedupeServerMessages(batch.messages);
        if (!items.length) break;
        const grew = appendUnique(items);
        if (!grew || items.length < pageSize) break;
      }
    } catch {
      // Backend may not support page pagination.
    }

    // 4) Cursor-like by oldest message id: /messages?chatId=...&beforeId=...
    try {
      for (let i = 0; i < maxPages; i += 1) {
        const oldest = allMessages.reduce((acc, item) => {
          const ts = this.getMessageTimestampValue(item);
          if (!acc) return { item, ts };
          if (!Number.isFinite(ts)) return acc;
          if (!Number.isFinite(acc.ts) || ts < acc.ts) return { item, ts };
          return acc;
        }, null)?.item || null;
        const oldestId = String(oldest?.id ?? oldest?.messageId ?? oldest?._id ?? '').trim();
        if (!oldestId) break;
        const batch = await this.fetchServerMessagesBatch(chatServerId, {
          limit: pageSize,
          beforeId: oldestId
        });
        const items = this.dedupeServerMessages(batch.messages);
        if (!items.length) break;
        const grew = appendUnique(items);
        if (!grew || items.length < pageSize) break;
      }
    } catch {
      // Backend may not support beforeId cursor.
    }

    return this.dedupeServerMessages(allMessages);
  }

  renderChatAfterSync({ forceScroll = false, highlightId = null } = {}) {
    if (!this.currentChat) return;
    const container = document.getElementById('messagesContainer');
    if (!container) {
      this.renderChat(highlightId);
      return;
    }

    const previousScrollTop = container.scrollTop;
    const previousScrollBottomGap = container.scrollHeight - container.clientHeight - previousScrollTop;
    const shouldStickToBottom = forceScroll || previousScrollBottomGap <= 72;
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
    this.renderChat(highlightId);

    if (shouldStickToBottom) {
      container.scrollTop = container.scrollHeight;
      this.updateMessagesScrollBottomButtonVisibility();
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
    const serverMessages = await this.fetchChatMessagesFromServer(targetChat);
    const prevMessages = Array.isArray(targetChat.messages) ? targetChat.messages : [];
    let nextMessages = this.mapServerMessagesToLocal(targetChat, serverMessages);
    nextMessages = this.mergeServerMessagesWithLocalHistory(nextMessages, prevMessages);

    const previousSignature = prevMessages
      .map((msg) => `${msg.serverId || msg.id}:${msg.text}:${msg.time}:${msg.edited ? 1 : 0}`)
      .join('|');
    const nextSignature = nextMessages
      .map((msg) => `${msg.serverId || msg.id}:${msg.text}:${msg.time}:${msg.edited ? 1 : 0}`)
      .join('|');
    const previousVisualSignature = this.getMessagesVisualSignature(prevMessages);
    const nextVisualSignature = this.getMessagesVisualSignature(nextMessages);

    if (previousSignature === nextSignature) return false;

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
    if (visualChanged) {
      this.renderChatAfterSync({ forceScroll, highlightId: newestAppendedMessageId });
      return true;
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

  appendMessage(msg, highlightClass = '') {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer || !this.currentChat) return;
    messagesContainer.classList.remove('no-content');
    messagesContainer.classList.add('has-content');

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
    
    let avatarHtml = '';
    let senderNameHtml = '';
    
    if (msg.from === 'other') {
      const otherChatAvatar = {
        name: msg.senderName || this.currentChat?.name || 'Контакт',
        avatarImage: this.getAvatarImage(msg.senderAvatarImage || this.currentChat?.avatarImage || this.currentChat?.avatarUrl),
        avatarColor: msg.senderAvatarColor || this.currentChat?.avatarColor || ''
      };
      avatarHtml = this.getChatAvatarHtml(otherChatAvatar, 'message-avatar');
    } else {
      avatarHtml = this.getUserAvatarHtml();
    }
    
    const editedLabel = msg.edited ? '<span class="message-edited">редаговано</span>' : '';
    const editedClass = msg.edited ? ' edited' : '';
    const imageClass = msg.type === 'image' && msg.imageUrl ? ' has-image' : '';
    const voiceClass = msg.type === 'voice' && msg.audioUrl ? ' has-voice' : '';
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
        <div class="message-content${editedClass}${imageClass}${voiceClass}${inlineMetaClass}${tailClass}">
          ${replyHtml}
          ${this.buildMessageBodyHtml(msg)}
          <span class="message-meta"><span class="message-time">${msg.time || ''}</span>${editedLabel}</span>
        </div>
      </div>
    `;
    messagesContainer.appendChild(messageEl);
    this.initMessageImageTransitions(messageEl);
    this.initVoiceMessageElements(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
      replyText
    ].join('|');

    return { primaryKey, fallbackKey };
  }

  shouldAnimateMessageInsertion(msg, ttlMs = 4500) {
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
    this.sendVoiceMessage(audioUrl, durationSeconds);
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
      clientEcho: true,
      replyTo: this.replyTarget
        ? { id: this.replyTarget.id, text: this.replyTarget.text, from: this.replyTarget.from }
        : null
    };
    const restoreReplyTarget = optimisticMessage.replyTo
      ? { ...optimisticMessage.replyTo }
      : null;

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
        // Keep optimistic message visible until server list confirms it.
        // This prevents a brief "disappear -> reappear" flicker on eventual-consistent backends.
        optimisticCurrent.pending = true;
      }
      this.saveChats();
      this.renderChatsList();

      // Do not trigger an extra delayed sync here.
      // Regular realtime/poll sync will reconcile server state without causing
      // an immediate second render cycle (which can look like flicker).
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
      this.launchNativePicker(document.getElementById('galleryPickerInput'));
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
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    this.sendImageMessage(dataUrl);
    this.closeCameraCapture();
  }

  handleImageSelected(event) {
    const input = event?.target;
    const file = input?.files?.[0];
    if (!file || !this.currentChat) return;
    if (!file.type.startsWith('image/')) {
      this.showAlert('Оберіть файл зображення');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (result) {
        this.sendImageMessage(result);
      }
      input.value = '';
    };
    reader.onerror = () => {
      this.showAlert('Не вдалося прочитати зображення');
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  sendImageMessage(imageUrl) {
    if (!imageUrl || !this.currentChat) return;
    const input = document.getElementById('messageInput');
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newMessage = {
      id: this.getNextMessageId(this.currentChat),
      text: '',
      type: 'image',
      imageUrl,
      from: 'own',
      time,
      date: now.toISOString().slice(0, 10),
      replyTo: this.replyTarget
        ? { id: this.replyTarget.id, text: this.replyTarget.text, from: this.replyTarget.from }
        : null
    };

    this.currentChat.messages.push(newMessage);
    this.saveChats();
    this.clearReplyTarget();
    if (this.currentChat.messages.length === 1) {
      this.renderChat(newMessage.id);
    } else {
      this.appendMessage(newMessage, ' new-message');
    }
    this.renderChatsList();

    if (input && window.innerWidth <= 900) {
      input.focus({ preventScroll: true });
    }
  }

  sendVoiceMessage(audioUrl, durationSeconds = 0) {
    if (!audioUrl || !this.currentChat) return;
    const input = document.getElementById('messageInput');
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newMessage = {
      id: this.getNextMessageId(this.currentChat),
      text: '',
      type: 'voice',
      audioUrl,
      audioDuration: Math.max(0, Number(durationSeconds) || 0),
      from: 'own',
      time,
      date: now.toISOString().slice(0, 10),
      replyTo: this.replyTarget
        ? { id: this.replyTarget.id, text: this.replyTarget.text, from: this.replyTarget.from }
        : null
    };

    this.currentChat.messages.push(newMessage);
    this.saveChats();
    this.clearReplyTarget();
    if (this.currentChat.messages.length === 1) {
      this.renderChat(newMessage.id);
    } else {
      this.appendMessage(newMessage, ' new-message');
    }
    this.renderChatsList();

    if (input && window.innerWidth <= 900) {
      input.focus({ preventScroll: true });
    }
  }

  openNewChatModal() {
    document.getElementById('newChatModal').classList.add('active');
    document.getElementById('modalOverlay').classList.add('active');
    this.newChatUserResults = [];
    this.newChatSelectedUser = null;
    this.newChatUserSearchRequestId = 0;
    this.setNewChatGroupMode(false);
    this.renderNewChatSearchState({
      message: "Почніть вводити тег користувача (або ім'я/номер)."
    });
    document.getElementById('newContactInput').focus();
  }

  closeNewChatModal() {
    document.getElementById('newChatModal').classList.remove('active');
    document.getElementById('modalOverlay').classList.remove('active');
    document.getElementById('newContactInput').value = '';
    const groupMembersInput = document.getElementById('groupMembersInput');
    if (groupMembersInput) groupMembersInput.value = '';
    if (this.newChatUserSearchTimer) {
      clearTimeout(this.newChatUserSearchTimer);
      this.newChatUserSearchTimer = null;
    }
    this.newChatUserResults = [];
    this.newChatSelectedUser = null;
    this.newChatUserSearchRequestId = 0;
    this.setNewChatGroupMode(false);
    this.renderNewChatSearchState({
      message: "Почніть вводити тег користувача (або ім'я/номер)."
    });
  }

  async createNewChat() {
    const input = document.getElementById('newContactInput');
    const groupMembersInput = document.getElementById('groupMembersInput');
    const raw = input.value || '';
    const name = raw.trim();
    const isGroup = Boolean(this.newChatGroupMode);

    if (!isGroup && !name) {
      await this.showAlert('Будь ласка, введіть ім\'я контакту');
      return;
    }

    let members = [];
    const groupMemberIds = [];
    if (isGroup) {
      const selectedIds = this.getNewChatGroupSelectedIds();
      const users = Array.isArray(this.newChatGroupUsers) ? this.newChatGroupUsers : [];
      const selectedUsers = users.filter((user) => selectedIds.has(user.id));
      members = selectedUsers
        .map((user) => String(user.name || '').trim())
        .filter(Boolean);
      groupMemberIds.push(...selectedUsers.map((user) => user.id).filter(Boolean));
      if (groupMembersInput) {
        groupMembersInput.value = members.join(', ');
      }
      const rawMembers = groupMembersInput?.value || '';
      if (!members.length && rawMembers) {
        members = rawMembers
          .split(',')
          .map((member) => member.trim())
          .filter(Boolean);
      }
      if (!members.length) {
        await this.showAlert('Оберіть хоча б одного користувача для групи.');
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
    let selectedGroupUsers = [];
    try {
      const selected = this.newChatSelectedUser;
      selectedUserForDirectChat = !isGroup ? selected : null;
      if (isGroup) {
        const selectedIds = this.getNewChatGroupSelectedIds();
        const users = Array.isArray(this.newChatGroupUsers) ? this.newChatGroupUsers : [];
        selectedGroupUsers = users.filter((user) => selectedIds.has(user.id));
      }
      if (!isGroup && selected?.id) {
        this.cacheKnownUserMeta(selected.id, {
          name: selected.name || '',
          avatarImage: selected.avatarImage || this.getUserAvatarImage(selected.raw),
          avatarColor: selected.avatarColor || this.getUserAvatarColor(selected.raw)
        });
      }
      const payload = {
        name: isGroup ? (name || 'Нова група') : (selected?.name || name),
        isPrivate: !isGroup,
        isGroup
      };
      const serverChat = await this.createChatOnServer(payload);

      if (isGroup && groupMemberIds.length) {
        const createdChatId = this.extractServerChatId(serverChat);
        if (createdChatId) {
          await Promise.allSettled(
            groupMemberIds.map((userId) => this.joinChatOnServerAsUser(createdChatId, userId))
          );
        }
      }

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
        groupParticipants: isGroup
          ? selectedGroupUsers.map((user) => ({
            id: String(user.id || '').trim() || null,
            name: String(user.name || '').trim() || 'Користувач',
            avatarImage: this.getAvatarImage(user.avatarImage),
            avatarColor: String(user.avatarColor || '').trim(),
            status: ''
          }))
          : [],
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

  buildMessageBodyHtml(msg) {
    if (msg?.type === 'image' && msg.imageUrl) {
      const safeUrl = this.escapeAttr(msg.imageUrl);
      const caption = (msg.text || '').trim();
      const captionHtml = caption ? `<div class="message-image-caption">${this.formatMessageText(caption)}</div>` : '';
      return `<img class="message-image" src="${safeUrl}" alt="Надіслане фото" loading="lazy" />${captionHtml}`;
    }
    if (msg?.type === 'voice' && msg.audioUrl) {
      const safeUrl = this.escapeAttr(msg.audioUrl);
      const durationValue = Number.isFinite(Number(msg.audioDuration)) ? Number(msg.audioDuration) : 0;
      const durationLabel = this.formatVoiceDuration(durationValue);
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
        </div>
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
    images.forEach((img) => {
      if (img.dataset.ready === 'true') return;
      const markLoaded = () => {
        img.classList.add('is-loaded');
        img.dataset.ready = 'true';
      };
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
        messageFrom: messageEl?.dataset.from || ''
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
      senderName: document.getElementById('imageViewerSenderName')
    };
  }

  isImageViewerOpen() {
    const { overlay } = this.getImageViewerElements();
    return Boolean(overlay?.classList.contains('active'));
  }

  getImageViewerSenderMeta(messageFrom = '') {
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

    const contactName = this.currentChat?.name || 'Контакт';
    const cachedAvatar = this.getCachedUserAvatar(this.currentChat?.participantId);
    const avatarImage = this.getAvatarImage(
      this.currentChat?.avatarImage
      || this.currentChat?.avatarUrl
      || cachedAvatar
    );
    const avatarColor = this.currentChat?.avatarColor || this.getContactColor(contactName);
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
    const { overlay, stage, image, toolbar } = this.getImageViewerElements();
    if (!overlay || !stage || !image || !toolbar || !overlay.classList.contains('active')) return;

    const stageRect = stage.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    if (!stageRect.width || !stageRect.height) return;

    const isMobile = window.innerWidth <= 768;
    const minBottom = isMobile ? 10 : 14;
    const edgeGap = isMobile ? 8 : 12;
    const toolbarHeight = toolbar.offsetHeight || (isMobile ? 38 : 44);
    const visibleImageBottom = Number.isFinite(imageRect.bottom) ? imageRect.bottom : stageRect.bottom;
    const gapToImage = Math.max(0, stageRect.bottom - visibleImageBottom);
    // Place toolbar outside (below) the image whenever there is room.
    const desiredBottom = gapToImage - toolbarHeight - edgeGap;
    const maxBottom = Math.max(minBottom, stageRect.height - toolbarHeight - edgeGap);
    const nextBottom = Math.min(maxBottom, Math.max(minBottom, desiredBottom));

    const widthPadding = isMobile ? 16 : 24;
    const minWidth = isMobile ? 220 : 320;
    const imageWidth = imageRect.width > 1 ? imageRect.width : stageRect.width - widthPadding;
    const nextWidth = Math.max(minWidth, Math.min(imageWidth, stageRect.width - widthPadding));

    toolbar.style.setProperty('--image-viewer-toolbar-bottom', `${Math.round(nextBottom)}px`);
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
    const senderMeta = this.getImageViewerSenderMeta(state.messageFrom);
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
  }

  async deleteImageFromViewer() {
    const state = this.getImageViewerState();
    if (!this.currentChat || !Number.isFinite(state.messageId) || state.messageId <= 0) return;

    const confirmed = await this.showConfirm('Видалити це фото?', 'Видалення фото');
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
    await this.showNotice('Фото переслано!');
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
