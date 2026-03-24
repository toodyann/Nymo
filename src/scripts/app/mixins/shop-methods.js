import { ChatAppCoreMethods } from './core-methods.js';
import { ChatAppFeaturesMethods } from './features-methods.js';

function forwardMethods(targetClass, sourceClass, methods) {
  methods.forEach((methodName) => {
    const descriptor = Object.getOwnPropertyDescriptor(sourceClass.prototype, methodName);
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
