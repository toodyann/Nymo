import { ChatAppFeaturesMethods } from './features-methods.js';

function forwardMethods(targetClass, sourceClass, methods) {
  methods.forEach((methodName) => {
    const descriptor = Object.getOwnPropertyDescriptor(sourceClass.prototype, methodName);
    if (!descriptor) {
      throw new Error(`[games-methods] Method not found: ${methodName}`);
    }
    Object.defineProperty(targetClass.prototype, methodName, descriptor);
  });
}

export class ChatAppGamesMethods {}

forwardMethods(ChatAppGamesMethods, ChatAppFeaturesMethods, [
  'initMiniGames'
]);
