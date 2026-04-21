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
  const prototypes = [];
  let currentPrototype = sourceClass.prototype;
  while (currentPrototype && currentPrototype !== Object.prototype) {
    prototypes.push(currentPrototype);
    currentPrototype = Object.getPrototypeOf(currentPrototype);
  }

  prototypes.reverse().forEach((prototype) => {
    Object.getOwnPropertyNames(prototype).forEach((methodName) => {
      if (methodName === 'constructor') return;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName);
      if (descriptor) {
        Object.defineProperty(targetClass.prototype, methodName, descriptor);
      }
    });
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
    this.pendingWalletView = null;
    this.walletActiveView = 'ledger';
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
    this.eventListenersBound = false;
    this.mobileScrollLockY = 0;
    this.mobileScrollLocked = false;
    this.mobileTouchMoveLockHandler = null;
    this.mobileNewChatModeActive = false;
    this.mobileNewChatSearchRevealPending = false;
    this.mobileCopyProtectionBound = false;
    this.mobileCopyLockSyncHandler = null;
    this.mobileCopyContextMenuHandler = null;
    this.mobileCopySelectStartHandler = null;
    this.mobileCopySelectionChangeHandler = null;
    this.mobileCopyEventHandler = null;
    this.mobileCutEventHandler = null;
    this.bottomNavHomeAnchor = null;
    this.bottomNavInSidebarTop = false;
    this.settingsParentSection = 'messenger-settings';
    this.imageViewerState = null;
    this.contactProfileMenuCloseTimer = null;
    this.realtimeSocket = null;
    this.realtimeSocketInitialized = false;
    this.realtimeSocketConnected = false;
    this.realtimeJoinedChatId = '';
    this.realtimeOnlineUserIds = new Set();
    this.realtimeTypingByChatId = new Map();
    this.realtimeTypingEmitTimer = null;
    this.realtimeTypingActiveChatId = '';
    this.realtimeTypingInputDebounceMs = 1400;
    this.serverMissingChatCyclesById = new Map();
    this.lastSendDispatchAt = 0;
    this.lastSendTriggerSource = '';
    this.messagesBottomSyncTimers = [];
    this.mediaRetryDrafts = new Map();
    this.managedObjectUrls = new Set();
    this.walletRefreshPromise = null;
    this.walletRefreshIncludesTransactions = false;
    this.walletLastRefreshAt = 0;
    this.walletLastTransactionsRefreshAt = 0;
    this.walletRefreshRetryAfterTs = 0;
    this.walletTransactionsRetryAfterTs = 0;
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
