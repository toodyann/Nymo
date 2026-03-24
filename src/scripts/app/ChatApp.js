import {
  ChatAppCoreMethods,
  ChatAppInteractionMethods,
  ChatAppMessagingMethods,
  ChatAppFeaturesMethods,
  ChatAppProfileMethods,
  ChatAppShopMethods,
  ChatAppGamesMethods,
  ChatAppChatRenderMethods,
  ChatAppComposerMethods
} from './mixins/index.js';

function attachMethods(targetClass, sourceClass) {
  Object.getOwnPropertyNames(sourceClass.prototype).forEach((methodName) => {
    if (methodName === 'constructor') return;
    const descriptor = Object.getOwnPropertyDescriptor(sourceClass.prototype, methodName);
    if (descriptor) {
      Object.defineProperty(targetClass.prototype, methodName, descriptor);
    }
  });
}

export class ChatApp {
  constructor() {
    this.chats = this.loadChats();
    this.currentChat = null;
    this.user = this.loadUserProfile();
    this.settings = this.loadSettings();
    this.editingMessageId = null;
    this.replyTarget = null;
    this.messageMenuState = { id: null, from: null, text: '' };
    this.chatListMenuState = { id: null, name: '' };
    this.addToGroupTarget = null;
    this.bottomNavHidden = false;
    this.navRevealTimeout = null;
    this.lastSendTriggerAt = 0;
    this.forceComposerFocusUntil = 0;
    this.attachSheetOpen = false;
    this.nativePickerOpen = false;
    this.nativePickerResetTimer = null;
    this.cameraCaptureOpen = false;
    this.cameraStream = null;
    this.cameraFacingMode = 'environment';
    this.voiceRecorder = null;
    this.voiceRecordingStream = null;
    this.voiceRecordingChunks = [];
    this.voiceRecordingStartedAt = 0;
    this.voiceRecordingActive = false;
    this.voiceRecordingDiscarded = false;
    this.activeVoiceAudio = null;
    this.chatEnterAnimation = null;
    this.chatCloseAnimation = null;
    this.attachSheetTouchStartY = 0;
    this.attachSheetTouchCurrentY = 0;
    this.attachSheetTouchDragging = false;
    this.mobileScrollLockY = 0;
    this.mobileScrollLocked = false;
    this.mobileTouchMoveLockHandler = null;
    this.bottomNavHomeAnchor = null;
    this.bottomNavInSidebarTop = false;
    this.settingsParentSection = 'messenger-settings';
    this.imageViewerState = null;
    this.contactProfileMenuCloseTimer = null;
    this.loadTheme();
    this.profileMenuPlaceholder = null;
    this.init();
  }
}

attachMethods(ChatApp, ChatAppCoreMethods);
attachMethods(ChatApp, ChatAppInteractionMethods);
attachMethods(ChatApp, ChatAppMessagingMethods);
attachMethods(ChatApp, ChatAppFeaturesMethods);
attachMethods(ChatApp, ChatAppProfileMethods);
attachMethods(ChatApp, ChatAppShopMethods);
attachMethods(ChatApp, ChatAppGamesMethods);
attachMethods(ChatApp, ChatAppChatRenderMethods);
attachMethods(ChatApp, ChatAppComposerMethods);
