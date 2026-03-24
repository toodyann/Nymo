import { ChatAppCoreMethods } from './core-methods.js';
import { ChatAppFeaturesMethods } from './features-methods.js';

function forwardMethods(targetClass, sourceClass, methods) {
  methods.forEach((methodName) => {
    const descriptor = Object.getOwnPropertyDescriptor(sourceClass.prototype, methodName);
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
  'getRandomAvatarGradient',
  'escapeAttr',
  'applyUserAvatarToElement',
  'getUserAvatarHtml',
  'renderProfileAvatar',
  'updateProfileDisplay',
  'formatBirthDate'
]);

forwardMethods(ChatAppProfileMethods, ChatAppFeaturesMethods, [
  'saveProfileSettings',
  'handleAvatarChange'
]);
