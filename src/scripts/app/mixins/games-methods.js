let miniGamesMethodsModulePromise = null;

function loadMiniGamesMethodsModule() {
  if (!miniGamesMethodsModulePromise) {
    miniGamesMethodsModulePromise = import('./features-methods-parts/features-mini-games-methods.js');
  }
  return miniGamesMethodsModulePromise;
}

export class ChatAppGamesMethods {
  async initMiniGames(settingsContainer) {
    const { ChatAppFeaturesMiniGamesMethods } = await loadMiniGamesMethodsModule();
    const descriptor = Object.getOwnPropertyDescriptor(
      ChatAppFeaturesMiniGamesMethods.prototype,
      'initMiniGames'
    );
    const method = descriptor?.value;
    if (typeof method !== 'function') {
      throw new Error('[games-methods] Method not found: initMiniGames');
    }
    return method.call(this, settingsContainer);
  }
}
