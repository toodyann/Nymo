import { ChatAppInteractionMethods } from './interaction-methods.js';
import { ChatAppMessagingMethods } from './messaging-methods.js';

function forwardMethods(targetClass, sourceClass, methods) {
  methods.forEach((methodName) => {
    const descriptor = Object.getOwnPropertyDescriptor(sourceClass.prototype, methodName);
    if (!descriptor) {
      throw new Error(`[composer-methods] Method not found: ${methodName}`);
    }
    Object.defineProperty(targetClass.prototype, methodName, descriptor);
  });
}

export class ChatAppComposerMethods {}

forwardMethods(ChatAppComposerMethods, ChatAppInteractionMethods, [
  'resizeMessageInput',
  'syncMobileKeyboardState',
  'setMobilePageScrollLock',
  'applyMobileChatViewportLayout',
  'setupMessageComposer',
  'getNextMessageId',
  'setReplyTarget',
  'clearReplyTarget',
  'deleteMessageById'
]);

forwardMethods(ChatAppComposerMethods, ChatAppMessagingMethods, [
  'sendMessage',
  'openImagePicker',
  'closeImagePickerMenu',
  'openAttachSheet',
  'closeAttachSheet',
  'onAttachSheetTouchStart',
  'onAttachSheetTouchMove',
  'onAttachSheetTouchEnd',
  'handleAttachSheetAction',
  'launchNativePicker',
  'setComposerInputInteractionLocked',
  'closeCameraCapture',
  'stopCameraStream',
  'capturePhotoFromCamera',
  'handleImageSelected',
  'sendImageMessage',
  'beginEditMessage'
]);
