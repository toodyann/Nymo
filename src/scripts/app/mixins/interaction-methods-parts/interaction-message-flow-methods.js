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

        if (isTyping) {
          if (contactTyping) {
            contactTyping.textContent = 'друкує...';
            contactTyping.classList.add('active');
          }
        } else if (contactTyping) {
          contactTyping.textContent = '';
          contactTyping.classList.remove('active');
        }

        if (!this.currentChat.isGroup) {
          const isOnline = (this.currentChat.status || 'offline') !== 'offline';
          contactStatus.classList.toggle('online', isOnline);
          contactStatus.classList.toggle('offline', !isOnline);
          contactStatus.classList.remove('hidden');
        } else {
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
        if (contactName) contactName.textContent = 'Виберіть контакт';
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


  clearMessages() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;
    messagesContainer.innerHTML = '';
    messagesContainer.classList.remove('has-content');
    messagesContainer.classList.add('no-content');
    this.updateMessagesScrollBottomButtonVisibility();
  }

}
