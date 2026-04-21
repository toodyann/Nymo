import { getSettingsTemplate } from '../../../ui/templates/settings-templates.js';
import { escapeHtml } from '../../../shared/helpers/ui-helpers.js';
import { buildApiUrl } from '../../../shared/api/api-url.js';
import { getAuthSession } from '../../../shared/auth/auth-session.js';
import {
  SELF_DELETED_CHATS_STORAGE_KEY,
  SELF_DELETED_MESSAGES_STORAGE_KEY
} from '../messaging-parts/index.js';
import { ChatAppMessagingSelfDeleteUnreadMethods } from './messaging-self-delete-unread-methods.js';

export class ChatAppMessagingUserMetaMethods extends ChatAppMessagingSelfDeleteUnreadMethods {
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

}
