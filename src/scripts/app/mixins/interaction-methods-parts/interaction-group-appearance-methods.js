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
import { ChatAppInteractionChatProfileMethods } from './interaction-chat-profile-methods.js';

export class ChatAppInteractionGroupAppearanceMethods extends ChatAppInteractionChatProfileMethods {
  async saveGroupInfo() {
    if (!this.currentChat || !this.currentChat.isGroup) return;
    this.closeGroupInfoModal();
  }


  openGroupAppearanceModal() {
    if (!this.currentChat || !this.currentChat.isGroup) return;
    const modal = document.getElementById('groupAppearanceModal');
    const groupInfoModal = document.getElementById('groupInfoModal');
    const nameInput = document.getElementById('groupAppearanceNameInput');
    if (!modal || !nameInput) return;

    const shouldReturnToInfo = Boolean(groupInfoModal?.classList.contains('active'));
    this.groupAppearanceReturnToInfo = shouldReturnToInfo;
    if (shouldReturnToInfo) {
      groupInfoModal.classList.remove('active');
    }

    this.groupAppearanceDraft = {
      name: String(this.currentChat.name || '').trim() || 'Нова група',
      avatarImage: this.getAvatarImage(this.currentChat.avatarImage || this.currentChat.avatarUrl),
      avatarColor: String(this.currentChat.avatarColor || '').trim()
    };

    nameInput.value = this.groupAppearanceDraft.name;
    this.renderGroupAppearanceAvatarPreview();
    modal.classList.add('active');
    this.syncSharedModalOverlayState();
    window.setTimeout(() => {
      nameInput.focus();
      nameInput.select();
    }, 0);
  }


  closeGroupAppearanceModal(options = {}) {
    const restoreGroupInfo = options?.restoreGroupInfo !== false;
    const modal = document.getElementById('groupAppearanceModal');
    const shouldReturnToInfo = Boolean(restoreGroupInfo && this.groupAppearanceReturnToInfo);
    this.groupAppearanceReturnToInfo = false;
    if (modal) modal.classList.remove('active');
    const input = document.getElementById('groupAppearanceAvatarInput');
    if (input) input.value = '';
    if (shouldReturnToInfo && this.currentChat?.isGroup) {
      this.openGroupInfoModal();
      return;
    }
    this.syncSharedModalOverlayState();
  }


  renderGroupAppearanceAvatarPreview() {
    const preview = document.getElementById('groupAppearanceAvatarPreview');
    if (!preview) return;
    const nameInput = document.getElementById('groupAppearanceNameInput');
    const draft = this.groupAppearanceDraft && typeof this.groupAppearanceDraft === 'object'
      ? this.groupAppearanceDraft
      : {};
    const draftName = String(nameInput?.value || draft.name || this.currentChat?.name || 'Нова група').trim() || 'Нова група';
    const avatarImage = this.getAvatarImage(draft.avatarImage || '');
    const avatarColor = String(draft.avatarColor || this.currentChat?.avatarColor || this.getContactColor(draftName)).trim();
    const initials = this.getInitials(draftName);

    preview.classList.toggle('is-image', Boolean(avatarImage));
    if (avatarImage) {
      preview.textContent = '';
      preview.style.backgroundImage = `url("${this.escapeAttr(avatarImage)}")`;
      preview.style.backgroundColor = 'transparent';
    } else {
      preview.textContent = initials;
      preview.style.backgroundImage = '';
      preview.style.backgroundColor = '';
      preview.style.background = avatarColor || this.getContactColor(draftName);
    }
  }


  async handleGroupAppearanceAvatarChange(event) {
    const input = event?.target;
    const file = input?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.showAlert('Оберіть файл зображення');
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
          reader.onerror = () => reject(new Error('Не вдалося прочитати зображення'));
          reader.readAsDataURL(file);
        });
      }
      if (!dataUrl) {
        throw new Error('Не вдалося обробити зображення');
      }
      if (!this.groupAppearanceDraft || typeof this.groupAppearanceDraft !== 'object') {
        this.groupAppearanceDraft = {};
      }
      this.groupAppearanceDraft.avatarImage = dataUrl;
      this.renderGroupAppearanceAvatarPreview();
    } catch (error) {
      await this.showAlert(error?.message || 'Не вдалося обробити зображення групи');
    } finally {
      input.value = '';
    }
  }


  resetGroupAppearanceAvatar() {
    if (!this.groupAppearanceDraft || typeof this.groupAppearanceDraft !== 'object') {
      this.groupAppearanceDraft = {};
    }
    this.groupAppearanceDraft.avatarImage = '';
    this.renderGroupAppearanceAvatarPreview();
  }


  async saveGroupAppearance() {
    if (!this.currentChat || !this.currentChat.isGroup) return;
    const nameInput = document.getElementById('groupAppearanceNameInput');
    const nextName = String(nameInput?.value || '').trim();
    if (!nextName) {
      await this.showAlert('Введіть назву групи');
      return;
    }

    const draft = this.groupAppearanceDraft && typeof this.groupAppearanceDraft === 'object'
      ? this.groupAppearanceDraft
      : {};
    const draftAvatarImage = this.getAvatarImage(draft.avatarImage || '');
    const nextAvatarImage = await this.resolveGroupAvatarImageForServer(draftAvatarImage, {
      fileName: `group-${Date.now()}.jpg`
    });
    if (draftAvatarImage && !nextAvatarImage) {
      await this.showAlert('Не вдалося завантажити аватар групи на сервер. Спробуйте інше зображення.');
      return;
    }
    const nextAvatarColor = String(
      draft.avatarColor
      || this.currentChat.avatarColor
      || this.getContactColor(nextName)
    ).trim();

    try {
      await this.updateChatOnServer(this.currentChat, {
        ...this.buildChatAppearancePayload({
          name: nextName,
          avatarImage: nextAvatarImage,
          avatarColor: nextAvatarColor
        })
      });
    } catch (error) {
      await this.showAlert(error?.message || 'Не вдалося оновити вигляд групи на сервері.');
      return;
    }

    this.currentChat.name = nextName;
    this.currentChat.avatarImage = nextAvatarImage;
    this.currentChat.avatarUrl = nextAvatarImage;
    this.currentChat.avatarColor = nextAvatarColor;
    this.currentChat.localGroupAppearanceUpdatedAt = Date.now();
    try {
      await this.sendGroupMetaMessageToServer(this.currentChat, {
        name: nextName,
        avatarImage: nextAvatarImage,
        avatarColor: nextAvatarColor,
        participants: Array.isArray(this.currentChat.groupParticipants)
          ? this.currentChat.groupParticipants
          : []
      });
    } catch {}

    this.saveChats();
    this.renderChatsList();
    this.updateChatHeader();
    this.closeGroupAppearanceModal();
    if (document.getElementById('groupInfoModal')?.classList.contains('active')) {
      this.openGroupInfoModal();
    }
    await this.showNotice('Вигляд групи оновлено', 'Група');
  }

}
