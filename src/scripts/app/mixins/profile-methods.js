import { ChatAppCoreMethods } from './core-methods.js';
import { ChatAppFeaturesMethods } from './features-methods.js';

function forwardMethods(targetClass, sourceClass, methods) {
  const resolveMethodDescriptor = (methodName) => {
    let currentPrototype = sourceClass.prototype;
    while (currentPrototype && currentPrototype !== Object.prototype) {
      const descriptor = Object.getOwnPropertyDescriptor(currentPrototype, methodName);
      if (descriptor) return descriptor;
      currentPrototype = Object.getPrototypeOf(currentPrototype);
    }
    return null;
  };

  methods.forEach((methodName) => {
    const descriptor = resolveMethodDescriptor(methodName);
    if (!descriptor) {
      throw new Error(`[profile-methods] Method not found: ${methodName}`);
    }
    Object.defineProperty(targetClass.prototype, methodName, descriptor);
  });
}

export class ChatAppProfileMethods {}

forwardMethods(ChatAppProfileMethods, ChatAppCoreMethods, [
  'loadUserProfile',
  'saveUserProfile',
  'applyAvatarDecoration',
  'applyProfileAura',
  'applyProfileMotion',
  'getProfileBadgeDefinition',
  'getProfileBadgeMarkup',
  'applyProfileBadge',
  'syncProfileCosmetics',
  'updateProfileMenuButton',
  'getInitials',
  'escapeAttr',
  'applyUserAvatarToElement',
  'getUserAvatarHtml',
  'renderProfileAvatar',
  'updateProfileDisplay',
  'formatBirthDate'
]);

forwardMethods(ChatAppProfileMethods, ChatAppFeaturesMethods, [
  'saveProfileSettings'
]);
