import { getSettingsTemplate } from '../../../ui/templates/settings-templates.js';
import { escapeHtml } from '../../../shared/helpers/ui-helpers.js';
import { buildApiUrl } from '../../../shared/api/api-url.js';
import { getAuthSession } from '../../../shared/auth/auth-session.js';
import {
  SELF_DELETED_CHATS_STORAGE_KEY,
  SELF_DELETED_MESSAGES_STORAGE_KEY
} from '../messaging-parts/index.js';
import { ChatAppMessagingSendUploadMethods } from './messaging-send-upload-methods.js';

export class ChatAppMessagingRenderMediaMethods extends ChatAppMessagingSendUploadMethods {
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
      if (item.dataset.defaultIconMarkup) {
        item.innerHTML = item.dataset.defaultIconMarkup;
        delete item.dataset.defaultIconMarkup;
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
