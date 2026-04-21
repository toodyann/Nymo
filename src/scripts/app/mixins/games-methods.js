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
      throw new Error(`[games-methods] Method not found: ${methodName}`);
    }
    Object.defineProperty(targetClass.prototype, methodName, descriptor);
  });
}

export class ChatAppGamesMethods {}

forwardMethods(ChatAppGamesMethods, ChatAppFeaturesMethods, [
  'initMiniGames'
]);
