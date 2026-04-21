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
      throw new Error(`[shop-methods] Method not found: ${methodName}`);
    }
    Object.defineProperty(targetClass.prototype, methodName, descriptor);
  });
}

export class ChatAppShopMethods {}

forwardMethods(ChatAppShopMethods, ChatAppCoreMethods, [
  'formatCoinBalance',
  'formatShopIslandBalance',
  'getTapBalanceCents',
  'setTapBalanceCents',
  'getShopCatalog',
  'loadShopInventory',
  'saveShopInventory',
  'getShopItem'
]);

forwardMethods(ChatAppShopMethods, ChatAppFeaturesMethods, [
  'initShop'
]);
