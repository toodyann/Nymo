import { getSettingsTemplate } from '../../../ui/templates/settings-templates.js';
import { escapeHtml } from '../../../shared/helpers/ui-helpers.js';
import { buildApiUrl } from '../../../shared/api/api-url.js';
import { getAuthSession } from '../../../shared/auth/auth-session.js';
import {
  SELF_DELETED_CHATS_STORAGE_KEY,
  SELF_DELETED_MESSAGES_STORAGE_KEY
} from '../messaging-parts/index.js';
import { ChatAppMessagingRealtimeSyncMethods } from './messaging-realtime-sync-methods.js';

export class ChatAppMessagingSendUploadMethods extends ChatAppMessagingRealtimeSyncMethods {
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
    const messageServerId = String(
      message?.serverId
        ?? message?.messageId
        ?? message?.message_id
        ?? message?.id
        ?? message?._id
        ?? ''
    ).trim() || this.getServerMessageIdByLocalId(chat, message?.id);
    if (!messageServerId) {
      throw new Error('Повідомлення ще не синхронізовано з сервером.');
    }

    const attempts = [
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
        // Best-effort: ask server to fan-out deletion realtime event.
        // Some backends require an explicit socket event to notify other clients.
        try {
          if (chatServerId && this.realtimeSocket && this.realtimeSocketConnected) {
            this.realtimeSocket.emit('messageDeleted', { chatId: chatServerId, messageId: messageServerId });
            this.realtimeSocket.emit('deleteMessage', { chatId: chatServerId, messageId: messageServerId });
          }
        } catch {
          // Ignore transient websocket emit errors.
        }
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

}
