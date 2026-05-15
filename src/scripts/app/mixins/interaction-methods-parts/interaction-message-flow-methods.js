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
import { ChatAppInteractionGroupAppearanceMethods } from './interaction-group-appearance-methods.js';

export class ChatAppInteractionMessageFlowMethods extends ChatAppInteractionGroupAppearanceMethods {
  getNextMessageId(chat) {
    if (!chat || !Array.isArray(chat.messages) || chat.messages.length === 0) return 1;
    const numericIds = chat.messages
      .map((m) => Number(m?.id))
      .filter((id) => Number.isFinite(id) && id > 0);
    const maxId = numericIds.length ? Math.max(...numericIds) : 0;
    return maxId + 1;
  }


  setReplyTarget(messageState) {
    const replyBar = document.getElementById('replyBar');
    const replyBarText = document.getElementById('replyBarText');
    if (!replyBar || !replyBarText) return;
    const name = messageState.from === 'own' ? this.user.name : (this.currentChat?.name || '');
    this.replyTarget = {
      id: messageState.id,
      text: messageState.text || '',
      from: messageState.from,
      name
    };
    replyBarText.textContent = `${name}: ${this.replyTarget.text}`;
    replyBar.classList.add('active');
  }


  clearReplyTarget() {
    const replyBar = document.getElementById('replyBar');
    const replyBarText = document.getElementById('replyBarText');
    this.replyTarget = null;
    if (replyBarText) replyBarText.textContent = '';
    if (replyBar) replyBar.classList.remove('active');
  }


  deleteMessageById(messageId) {
    if (!this.currentChat) return;
    const idx = this.currentChat.messages.findIndex(m => m.id === messageId);
    if (idx === -1) return;
    if (typeof this.releaseMediaRetryDraft === 'function') {
      this.releaseMediaRetryDraft(messageId, { revokePreview: true });
    }
    this.currentChat.messages.splice(idx, 1);
    this.saveChats();
    this.renderChat();
    this.renderChatsList();
    if (this.isContactProfileSectionActive()) {
      this.renderContactProfileMedia();
    }
  }


  async deleteMessageWithScope(messageId, { scope = 'self' } = {}) {
    if (!this.currentChat) return false;
    const idx = this.currentChat.messages.findIndex((m) => Number(m?.id) === Number(messageId));
    if (idx === -1) return false;
    const targetMessage = this.currentChat.messages[idx];
    const safeScope = scope === 'all' ? 'all' : 'self';

    if (safeScope === 'all') {
      if (targetMessage?.from !== 'own') {
        throw new Error('Видалити для всіх можна лише власне повідомлення.');
      }
      if (typeof this.deleteMessageOnServer === 'function') {
        await this.deleteMessageOnServer(this.currentChat, targetMessage, { scope: 'all' });
      }
      if (typeof this.unmarkMessageDeletedForSelf === 'function') {
        this.unmarkMessageDeletedForSelf(
          this.resolveChatServerId(this.currentChat),
          targetMessage?.serverId
        );
      }
    } else if (typeof this.markMessageDeletedForSelf === 'function') {
      this.markMessageDeletedForSelf(this.currentChat, targetMessage);
    }

    if (typeof this.releaseMediaRetryDraft === 'function') {
      this.releaseMediaRetryDraft(messageId, { revokePreview: true });
    }
    this.currentChat.messages.splice(idx, 1);
    if (Number(this.editingMessageId) === Number(messageId)) {
      this.editingMessageId = null;
    }
    this.saveChats();
    this.renderChat();
    this.renderChatsList();
    if (this.isContactProfileSectionActive()) {
      this.renderContactProfileMedia();
    }
    return true;
  }


  formatMessageDateTime(dateStr, timeStr) {
    const dateObj = new Date((dateStr || new Date().toISOString().slice(0,10)) + 'T00:00:00');
    const dateText = new Intl.DateTimeFormat('uk-UA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(dateObj);
    const timeText = timeStr ? ` ${timeStr}` : '';
    return `${dateText.charAt(0).toUpperCase() + dateText.slice(1)}${timeText}`;
  }


  updateGroupInfoMenuVisibility() {
    const isGroupChat = Boolean(this.currentChat && this.currentChat.isGroup);
    const menus = [
      document.getElementById('chatMenu'),
      document.getElementById('chatModalMenu')
    ];

    menus.forEach((menu) => {
      if (!menu) return;
      const groupInfoItem = menu.querySelector('.chat-menu-item[data-action="group-info"]');
      if (!groupInfoItem) return;
      groupInfoItem.hidden = !isGroupChat;
      groupInfoItem.setAttribute('aria-hidden', (!isGroupChat).toString());
    });
  }


  updateChatHeader() {
    const headerTargets = [
      {
        contactName: document.getElementById('contactName'),
        contactStatus: document.getElementById('contactStatus'),
        contactTyping: document.getElementById('contactTyping'),
        avatar: document.getElementById('appChatAvatar'),
        contactDetails: document.getElementById('appChatInfo')
      },
      {
        contactName: document.getElementById('chatModalName'),
        contactStatus: document.getElementById('chatModalStatus'),
        contactTyping: document.getElementById('chatModalTyping'),
        avatar: document.getElementById('chatModalAvatar'),
        contactDetails: document.getElementById('chatModalInfo')
      }
    ];

    headerTargets.forEach(({ contactName, contactStatus, contactTyping, avatar, contactDetails }) => {
      if (this.currentChat && contactName && contactStatus) {
        contactName.textContent = this.currentChat.name;
        const isTyping = Boolean(
          !this.currentChat.isGroup
          && typeof this.isChatTypingActive === 'function'
          && this.isChatTypingActive(this.currentChat)
        );

        if (!this.currentChat.isGroup) {
          const isOnline = typeof this.isDirectChatParticipantOnline === 'function'
            ? this.isDirectChatParticipantOnline(this.currentChat)
            : (this.currentChat.status || 'offline') !== 'offline';
          const presenceSubtitle = typeof this.getDirectChatPresenceSubtitle === 'function'
            ? this.getDirectChatPresenceSubtitle(this.currentChat)
            : '';

          if (contactTyping) {
            if (isTyping) {
              contactTyping.textContent = this.translateUiText('друкує...');
              contactTyping.classList.add('active');
            } else if (!isOnline && presenceSubtitle) {
              contactTyping.textContent = presenceSubtitle;
              contactTyping.classList.add('active');
            } else {
              contactTyping.textContent = '';
              contactTyping.classList.remove('active');
            }
          }

          contactStatus.classList.toggle('online', isOnline);
          contactStatus.classList.toggle('offline', !isOnline);
          contactStatus.classList.remove('hidden');
        } else {
          if (contactTyping) {
            contactTyping.textContent = '';
            contactTyping.classList.remove('active');
          }
          contactStatus.classList.remove('online', 'offline');
          contactStatus.classList.add('hidden');
        }
        if (avatar) {
          this.applyChatAvatarToElement(avatar, this.currentChat);
        }
        if (this.isContactProfileSectionActive()) {
          this.renderCurrentContactProfileView();
        }

        if (contactDetails) {
          contactDetails.style.cursor = 'pointer';
          contactDetails.onclick = this.currentChat.isGroup
            ? () => this.openGroupInfoModal()
            : () => this.openContactProfileSection();
        }
        this.enforcePlainChatModalHeader();
      } else {
        this.closeContactProfileSection();
        if (contactName) contactName.textContent = this.translateUiText('Виберіть контакт');
        if (contactStatus) {
          contactStatus.classList.remove('online', 'offline');
          contactStatus.classList.add('hidden');
        }
        if (contactTyping) {
          contactTyping.textContent = '';
          contactTyping.classList.remove('active');
        }
        if (avatar) {
          avatar.textContent = '';
          avatar.style.backgroundImage = '';
          avatar.style.backgroundColor = '';
          avatar.style.background = '';
        }
        if (contactDetails) {
          contactDetails.style.cursor = 'default';
          contactDetails.onclick = null;
        }
        this.enforcePlainChatModalHeader();
        }
    });
    this.updateGroupInfoMenuVisibility();
    this.updateCurrentContactProfileStatusLabel();
  }


  shouldShowChatTypingBubble() {
    if (!this.currentChat) return false;
    if (typeof this.isChatTypingActive !== 'function' || !this.isChatTypingActive(this.currentChat)) {
      return false;
    }
    const chatServerId = typeof this.resolveChatServerId === 'function'
      ? this.resolveChatServerId(this.currentChat)
      : '';
    if (!chatServerId || !(this.realtimeTypingByChatId instanceof Map)) return false;
    const state = this.realtimeTypingByChatId.get(chatServerId);
    if (!state?.active) return false;
    const selfId = typeof this.getAuthUserId === 'function' ? this.getAuthUserId() : '';
    const typingUserId = String(state.userId || '').trim();
    if (typingUserId && selfId && typingUserId === selfId) return false;
    return true;
  }


  getActiveChatTypingPeerMeta() {
    if (!this.currentChat) return null;
    const chatServerId = typeof this.resolveChatServerId === 'function'
      ? this.resolveChatServerId(this.currentChat)
      : '';
    const state = this.realtimeTypingByChatId instanceof Map && chatServerId
      ? this.realtimeTypingByChatId.get(chatServerId)
      : null;
    const senderId = String(
      state?.userId
      || this.currentChat.participantId
      || ''
    ).trim();
    if (typeof this.getMessageSenderDisplayMeta !== 'function') {
      return {
        name: this.currentChat.name || 'Користувач',
        avatarImage: '',
        avatarColor: this.getContactColor?.(this.currentChat.name || 'Користувач') || '#6b7280',
        initials: this.getInitials?.(this.currentChat.name || 'Користувач') || '?'
      };
    }
    return this.getMessageSenderDisplayMeta({ senderId }, this.currentChat);
  }


  cancelPendingMessagesBottomSyncTimers() {
    if (Array.isArray(this.messagesBottomSyncTimers)) {
      this.messagesBottomSyncTimers.forEach((timerId) => clearTimeout(timerId));
      this.messagesBottomSyncTimers = [];
    }
  }


  preserveMessagesScrollPosition(messagesContainer, mutateFn) {
    if (!(messagesContainer instanceof HTMLElement)) {
      mutateFn?.();
      return;
    }
    const scrollTop = messagesContainer.scrollTop;
    mutateFn?.();
    const restore = () => {
      messagesContainer.scrollTop = scrollTop;
    };
    window.requestAnimationFrame(() => {
      restore();
      window.requestAnimationFrame(restore);
    });
  }


  clearChatTypingIndicator() {
    const legacyHost = document.getElementById('chatTypingIndicatorHost');
    if (legacyHost instanceof HTMLElement) {
      legacyHost.replaceChildren();
      legacyHost.hidden = true;
    }
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
    messagesContainer.classList.remove('has-typing-indicator');
    messagesContainer.style.removeProperty('--messages-typing-inset');
    messagesContainer.querySelectorAll('[data-typing-indicator="true"], .messages-typing-tail').forEach((node) => node.remove());
  }


  syncChatTypingIndicator({ scroll = false, forceReveal = false } = {}) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;

    const legacyHost = document.getElementById('chatTypingIndicatorHost');
    if (legacyHost instanceof HTMLElement) {
      legacyHost.replaceChildren();
      legacyHost.hidden = true;
    }

    const existing = messagesContainer.querySelector('[data-typing-indicator="true"]');
    const shouldShow = this.shouldShowChatTypingBubble();

    if (!shouldShow) {
      this.cancelPendingMessagesBottomSyncTimers();
      this.preserveMessagesScrollPosition(messagesContainer, () => {
        this.clearChatTypingIndicator();
      });
      const hasMessages = Array.isArray(this.currentChat?.messages) && this.currentChat.messages.length > 0;
      if (!hasMessages && typeof this.renderChat === 'function') {
        this.renderChat();
      }
      return;
    }

    const emptyEl = messagesContainer.querySelector('.chat-empty-state');
    if (emptyEl) emptyEl.remove();
    messagesContainer.classList.remove('no-content');
    messagesContainer.classList.add('has-content', 'has-typing-indicator');
    if (typeof this.ensureMessagesBottomSpacer === 'function') {
      this.ensureMessagesBottomSpacer(messagesContainer);
    }

    const wasNearBottom = typeof this.isMessagesNearBottom === 'function'
      ? this.isMessagesNearBottom(messagesContainer, 280)
      : false;
    const pinToBottom = typeof this.shouldKeepCurrentChatPinnedToBottom === 'function'
      ? this.shouldKeepCurrentChatPinnedToBottom()
      : false;
    const shouldRevealTyping = Boolean(forceReveal || scroll || wasNearBottom || pinToBottom);

    if (existing) {
      messagesContainer.appendChild(existing);
      this.scheduleRevealTypingIndicator(messagesContainer, shouldRevealTyping);
      return;
    }

    const senderMeta = this.getActiveChatTypingPeerMeta();
    if (!senderMeta) return;

    const avatarHtml = typeof this.getChatAvatarHtml === 'function'
      ? this.getChatAvatarHtml(senderMeta, 'message-avatar')
      : '';
    const senderNameHtml = this.currentChat?.isGroup && senderMeta.name
      ? `<div class="message-sender-name">${typeof this.escapeHtml === 'function' ? this.escapeHtml(senderMeta.name) : senderMeta.name}</div>`
      : '';

    const typingEl = document.createElement('div');
    typingEl.className = 'message other message-typing-indicator new-message';
    typingEl.dataset.typingIndicator = 'true';
    typingEl.setAttribute('aria-live', 'polite');
    typingEl.setAttribute('aria-label', this.translateUiText?.('друкує') || 'друкує');
    typingEl.innerHTML = `
      ${avatarHtml}
      <div class="message-bubble">
        ${senderNameHtml}
        <div class="message-content typing-indicator-content with-tail">
          <span class="typing-dots" aria-hidden="true">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
          </span>
        </div>
      </div>
    `;

    messagesContainer.appendChild(typingEl);
    this.scheduleRevealTypingIndicator(messagesContainer, shouldRevealTyping);
    window.setTimeout(() => {
      typingEl.classList.remove('new-message');
      if (shouldRevealTyping) {
        this.revealChatTypingIndicator(messagesContainer);
      }
    }, 420);
  }


  scheduleRevealTypingIndicator(messagesContainer, shouldReveal = false) {
    if (!(messagesContainer instanceof HTMLElement) || !shouldReveal) return;
    window.requestAnimationFrame(() => {
      this.revealChatTypingIndicator(messagesContainer);
    });
  }


  revealChatTypingIndicator(messagesContainer) {
    if (!(messagesContainer instanceof HTMLElement)) return;
    this.cancelPendingMessagesBottomSyncTimers();

    const applyReveal = () => {
      const typingEl = messagesContainer.querySelector('[data-typing-indicator="true"]');
      const inputArea = document.querySelector('.message-input-area');

      if (!(typingEl instanceof HTMLElement)) {
        messagesContainer.scrollTop = Math.max(0, messagesContainer.scrollHeight - messagesContainer.clientHeight);
        this.updateMessagesScrollBottomButtonVisibility?.();
        return;
      }

      const containerRect = messagesContainer.getBoundingClientRect();
      let visibleBottom = containerRect.bottom;
      if (inputArea instanceof HTMLElement) {
        visibleBottom = Math.min(visibleBottom, inputArea.getBoundingClientRect().top);
      }

      const targetGap = 10;
      const typingRect = typingEl.getBoundingClientRect();
      const overflow = Math.ceil(typingRect.bottom - (visibleBottom - targetGap));

      if (overflow !== 0) {
        messagesContainer.scrollTop += overflow;
      }

      this.updateMessagesScrollBottomButtonVisibility?.();
    };

    applyReveal();
    window.requestAnimationFrame(applyReveal);
  }


  scrollChatToTypingIndicator(messagesContainer) {
    if (!(messagesContainer instanceof HTMLElement)) return;
    const shouldReveal = typeof this.shouldKeepCurrentChatPinnedToBottom === 'function'
      ? this.shouldKeepCurrentChatPinnedToBottom()
      : (
        typeof this.isMessagesNearBottom === 'function'
          ? this.isMessagesNearBottom(messagesContainer, 280)
          : false
      );
    if (!shouldReveal) return;
    this.revealChatTypingIndicator(messagesContainer);
  }


  clearMessages() {
    if (typeof this.clearChatTypingIndicator === 'function') {
      this.clearChatTypingIndicator();
    }
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
    messagesContainer.innerHTML = '';
    messagesContainer.classList.remove('has-content');
    messagesContainer.classList.add('no-content');
    this.updateMessagesScrollBottomButtonVisibility();
  }

}
