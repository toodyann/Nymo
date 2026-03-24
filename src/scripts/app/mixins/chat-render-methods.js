import { ChatAppInteractionMethods } from './interaction-methods.js';
import { ChatAppMessagingMethods } from './messaging-methods.js';

function forwardMethods(targetClass, sourceClass, methods) {
  methods.forEach((methodName) => {
    const descriptor = Object.getOwnPropertyDescriptor(sourceClass.prototype, methodName);
    if (!descriptor) {
      throw new Error(`[chat-render-methods] Method not found: ${methodName}`);
    }
    Object.defineProperty(targetClass.prototype, methodName, descriptor);
  });
}

export class ChatAppChatRenderMethods {}

forwardMethods(ChatAppChatRenderMethods, ChatAppInteractionMethods, [
  'renderChatsList',
  'getSortedChats',
  'filterChats',
  'selectChat',
  'triggerChatEnterAnimation',
  'finalizeCloseChatState',
  'closeChat',
  'renderChat',
  'bindMessageContextMenu',
  'openGroupInfoModal',
  'closeGroupInfoModal',
  'formatMessageDateTime',
  'updateChatHeader',
  'clearMessages'
]);

forwardMethods(ChatAppChatRenderMethods, ChatAppMessagingMethods, [
  'appendMessage',
  'hideWelcomeScreen',
  'showWelcomeScreen',
  'escapeHtml',
  'formatMessageText',
  'buildMessageBodyHtml',
  'initMessageImageTransitions',
  'initVoiceMessageElements',
  'renderSidebarAvatarsStrip'
]);
