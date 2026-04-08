const orionLogoAssetUrl = new URL('../../../Assets/Orion_logo.png', import.meta.url).href;

export function mountAppShell() {
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error('App container not found');
    return;
  }
  if (appContainer.querySelector('.orion-app')) return;

  const htmlContent = `<div class="orion-app">
  <header class="app-header">
    <div class="app-header-left">
      <div class="chat-brand">
        <img class="app-logo" src="${orionLogoAssetUrl}" alt="Orion" />
      </div>
      <div class="app-chat-info" id="appChatInfo">
        <div class="app-chat-avatar" id="appChatAvatar"></div>
        <div class="app-chat-meta">
          <div class="app-chat-title-line">
            <div class="app-chat-name" id="contactName">Виберіть контакт</div>
            <div class="app-chat-status" id="contactStatus"></div>
          </div>
          <div class="app-chat-typing" id="contactTyping"></div>
        </div>
      </div>
    </div>
    <div class="app-header-right">
      <button class="btn-icon" id="callBtn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" stroke-width="2" fill="none"/>
        </svg>
      </button>
      <button class="btn-icon" id="historyBtn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M23 12a11 11 0 1 1-22 0 11 11 0 0 1 22 0z" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <div class="chat-menu-wrapper">
        <button class="btn-icon" id="chatMenuBtn" aria-haspopup="true" aria-expanded="false">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="1" fill="currentColor"/>
            <circle cx="12" cy="5" r="1" fill="currentColor"/>
            <circle cx="12" cy="19" r="1" fill="currentColor"/>
          </svg>
        </button>
        <div class="chat-menu" id="chatMenu">
          <button class="chat-menu-item" data-action="clear">
            <svg class="chat-menu-item-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true"><path d="M235.5,216.81c-22.56-11-35.5-34.58-35.5-64.8V134.73a15.94,15.94,0,0,0-10.09-14.87L165,110a8,8,0,0,1-4.48-10.34l21.32-53a28,28,0,0,0-16.1-37,28.14,28.14,0,0,0-35.82,16,.61.61,0,0,0,0,.12L108.9,79a8,8,0,0,1-10.37,4.49L73.11,73.14A15.89,15.89,0,0,0,55.74,76.8C34.68,98.45,24,123.75,24,152a111.45,111.45,0,0,0,31.18,77.53A8,8,0,0,0,61,232H232a8,8,0,0,0,3.5-15.19ZM67.14,88l25.41,10.3a24,24,0,0,0,31.23-13.45l21-53c2.56-6.11,9.47-9.27,15.43-7a12,12,0,0,1,6.88,15.92L145.69,93.76a24,24,0,0,0,13.43,31.14L184,134.73V152c0,.33,0,.66,0,1L55.77,101.71A108.84,108.84,0,0,1,67.14,88Zm48,128a87.53,87.53,0,0,1-24.34-42,8,8,0,0,0-15.49,4,105.16,105.16,0,0,0,18.36,38H64.44A95.54,95.54,0,0,1,40,152a85.9,85.9,0,0,1,7.73-36.29l137.8,55.12c3,18,10.56,33.48,21.89,45.16Z"></path></svg>
            <span class="chat-menu-item-label">Очистити чат</span>
          </button>
          <button class="chat-menu-item" data-action="delete">
            <svg class="chat-menu-item-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path></svg>
            <span class="chat-menu-item-label">Видалити чат</span>
          </button>
          <button class="chat-menu-item" data-action="info">
            <svg class="chat-menu-item-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z"></path></svg>
            <span class="chat-menu-item-label">Інформація</span>
          </button>
          <button class="chat-menu-item" data-action="group-info">
            <span class="chat-menu-item-label">Деталі групи</span>
          </button>
        </div>
      </div>
    </div>
  </header>
  <div class="main-layout">
  <!-- Sidebar з контактами -->
  <aside class="sidebar">
    <nav class="desktop-nav-rail" aria-label="Основна навігація">
      <button class="desktop-nav-rail-brand" id="desktopRailReload" type="button" title="Перезавантажити" aria-label="Перезавантажити">
        <img class="desktop-nav-rail-logo" src="${orionLogoAssetUrl}" alt="Orion" />
      </button>
      <button class="desktop-nav-rail-item" type="button" data-nav-target="navChats" title="Чати" aria-label="Чати">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 256 256"><path d="M227.32,28.68a16,16,0,0,0-15.66-4.08l-.15,0L19.57,82.84a16,16,0,0,0-2.49,29.8L102,154l41.3,84.87A15.86,15.86,0,0,0,157.74,248q.69,0,1.38-.06a15.88,15.88,0,0,0,14-11.51l58.2-191.94c0-.05,0-.1,0-.15A16,16,0,0,0,227.32,28.68ZM157.83,231.85l-.05.14,0-.07-40.06-82.3,48-48a8,8,0,0,0-11.31-11.31l-48,48L24.08,98.25l-.07,0,.14,0L216,40Z"></path></svg>
      </button>
      <button class="desktop-nav-rail-item" type="button" data-nav-target="navCalls" title="Дзвінки" aria-label="Дзвінки">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 256 256"><path d="M222.37,158.46l-47.11-21.11-.13-.06a16,16,0,0,0-15.17,1.4,8.12,8.12,0,0,0-.75.56L134.87,160c-15.42-7.49-31.34-23.29-38.83-38.51l20.78-24.71c.2-.25.39-.5.57-.77a16,16,0,0,0,1.32-15.06l0-.12L97.54,33.64a16,16,0,0,0-16.62-9.52A56.26,56.26,0,0,0,32,80c0,79.4,64.6,144,144,144a56.26,56.26,0,0,0,55.88-48.92A16,16,0,0,0,222.37,158.46ZM176,208A128.14,128.14,0,0,1,48,80,40.2,40.2,0,0,1,82.87,40a.61.61,0,0,0,0,.12l21,47L83.2,111.86a6.13,6.13,0,0,0-.57.77,16,16,0,0,0-1,15.7c9.06,18.53,27.73,37.06,46.46,46.11a16,16,0,0,0,15.75-1.14,8.44,8.44,0,0,0,.74-.56L168.89,152l47,21.05h0s.08,0,.11,0A40.21,40.21,0,0,1,176,208Z"></path></svg>
      </button>
      <button class="desktop-nav-rail-item" type="button" data-nav-target="navShop" title="Магазин" aria-label="Магазин">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 256 256"><path d="M232,96a7.89,7.89,0,0,0-.3-2.2L217.35,43.6A16.07,16.07,0,0,0,202,32H54A16.07,16.07,0,0,0,38.65,43.6L24.31,93.8A7.89,7.89,0,0,0,24,96h0v16a40,40,0,0,0,16,32v72a8,8,0,0,0,8,8H208a8,8,0,0,0,8-8V144a40,40,0,0,0,16-32V96ZM54,48H202l11.42,40H42.61Zm50,56h48v8a24,24,0,0,1-48,0Zm-16,0v8a24,24,0,0,1-35.12,21.26,7.88,7.88,0,0,0-1.82-1.06A24,24,0,0,1,40,112v-8ZM200,208H56V151.2a40.57,40.57,0,0,0,8,.8,40,40,0,0,0,32-16,40,40,0,0,0,64,0,40,40,0,0,0,32,16,40.57,40.57,0,0,0,8-.8Zm4.93-75.8a8.08,8.08,0,0,0-1.8,1.05A24,24,0,0,1,168,112v-8h48v8A24,24,0,0,1,204.93,132.2Z"></path></svg>
      </button>
      <button class="desktop-nav-rail-item" type="button" data-nav-target="navWallet" title="Гаманець" aria-label="Гаманець">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 256 256"><path d="M216,64H56a8,8,0,0,1,0-16H192a8,8,0,0,0,0-16H56A24,24,0,0,0,32,56V184a24,24,0,0,0,24,24H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64Zm0,128H56a8,8,0,0,1-8-8V78.63A23.84,23.84,0,0,0,56,80H216Zm-48-60a12,12,0,1,1,12,12A12,12,0,0,1,168,132Z"></path></svg>
      </button>
      <button class="desktop-nav-rail-item" type="button" data-nav-target="navGames" title="Гра" aria-label="Гра">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 256 256"><path d="M176,112H152a8,8,0,0,1,0-16h24a8,8,0,0,1,0,16ZM104,96H96V88a8,8,0,0,0-16,0v8H72a8,8,0,0,0,0,16h8v8a8,8,0,0,0,16,0v-8h8a8,8,0,0,0,0-16ZM241.48,200.65a36,36,0,0,1-54.94,4.81c-.12-.12-.24-.24-.35-.37L146.48,160h-37L69.81,205.09l-.35.37A36.08,36.08,0,0,1,44,216,36,36,0,0,1,8.56,173.75a.68.68,0,0,1,0-.14L24.93,89.52A59.88,59.88,0,0,1,83.89,40H172a60.08,60.08,0,0,1,59,49.25c0,.06,0,.12,0,.18l16.37,84.17a.68.68,0,0,1,0,.14A35.74,35.74,0,0,1,241.48,200.65ZM172,144a44,44,0,0,0,0-88H83.89A43.9,43.9,0,0,0,40.68,92.37l0,.13L24.3,176.59A20,20,0,0,0,58,194.3l41.92-47.59a8,8,0,0,1,6-2.71Zm59.7,32.59-8.74-45A60,60,0,0,1,172,160h-4.2L198,194.31a20.09,20.09,0,0,0,17.46,5.39,20,20,0,0,0,16.23-23.11Z"></path></svg>
      </button>
      <button class="desktop-nav-rail-item" type="button" data-nav-target="navProfile" title="Профіль" aria-label="Профіль">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 256 256"><path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"></path></svg>
      </button>
      <button class="desktop-nav-rail-item" type="button" data-nav-target="navSettings" title="Налаштування" aria-label="Налаштування">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 256 256"><path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.21,107.21,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.71,107.71,0,0,0-26.25-10.87,8,8,0,0,0-7.06,1.49L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.51a8,8,0,0,0-3.93,6L67.32,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.21,107.21,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06Zm-16.1-6.5a73.93,73.93,0,0,1,0,8.68,8,8,0,0,0,1.74,5.48l14.19,17.73a91.57,91.57,0,0,1-6.23,15L187,173.11a8,8,0,0,0-5.1,2.64,74.11,74.11,0,0,1-6.14,6.14,8,8,0,0,0-2.64,5.1l-2.51,22.58a91.32,91.32,0,0,1-15,6.23l-17.74-14.19a8,8,0,0,0-5-1.75h-.48a73.93,73.93,0,0,1-8.68,0,8,8,0,0,0-5.48,1.74L100.45,215.8a91.57,91.57,0,0,1-15-6.23L82.89,187a8,8,0,0,0-2.64-5.1,74.11,74.11,0,0,1-6.14-6.14,8,8,0,0,0-5.1-2.64L46.43,170.6a91.32,91.32,0,0,1-6.23-15l14.19-17.74a8,8,0,0,0,1.74-5.48,73.93,73.93,0,0,1,0-8.68,8,8,0,0,0-1.74-5.48L40.2,100.45a91.57,91.57,0,0,1,6.23-15L69,82.89a8,8,0,0,0,5.1-2.64,74.11,74.11,0,0,1,6.14-6.14A8,8,0,0,0,82.89,69L85.4,46.43a91.32,91.32,0,0,1,15-6.23l17.74,14.19a8,8,0,0,0,5.48,1.74,73.93,73.93,0,0,1,8.68,0,8,8,0,0,0,5.48-1.74L155.55,40.2a91.57,91.57,0,0,1,15,6.23L173.11,69a8,8,0,0,0,2.64,5.1,74.11,74.11,0,0,1,6.14,6.14,8,8,0,0,0,5.1,2.64l22.58,2.51a91.32,91.32,0,0,1,6.23,15l-14.19,17.74A8,8,0,0,0,199.87,123.66Z"></path></svg>
      </button>
      <button class="desktop-nav-rail-item" type="button" data-nav-target="navFaq" title="FAQ та допомога" aria-label="FAQ та допомога">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 256 256"><path d="M140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180ZM128,72c-22.06,0-40,16.15-40,36v4a8,8,0,0,0,16,0v-4c0-11,10.77-20,24-20s24,9,24,20-10.77,20-24,20a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-.72c18.24-3.35,32-17.9,32-35.28C168,88.15,150.06,72,128,72Zm104,56A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"></path></svg>
      </button>
      <div class="desktop-nav-rail-account-wrap">
        <button class="desktop-nav-rail-account-btn" id="desktopRailAccountBtn" type="button" title="Акаунт" aria-label="Акаунт" aria-haspopup="menu" aria-expanded="false">
          <span class="nav-avatar desktop-nav-rail-account-avatar" id="desktopRailAccountAvatar" aria-hidden="true"></span>
        </button>
        <div class="desktop-nav-rail-account-menu" id="desktopRailAccountMenu" role="menu" aria-label="Меню акаунту">
          <button class="desktop-nav-rail-account-menu-item" type="button" role="menuitem" data-account-action="profile">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
              <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"></path>
            </svg>
            <span>Профіль</span>
          </button>
          <button class="desktop-nav-rail-account-menu-item" type="button" role="menuitem" data-account-action="switch-account">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
              <path d="M253.66,133.66l-24,24a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L216,132.69V128A88,88,0,0,0,56.49,76.67a8,8,0,0,1-13-9.34A104,104,0,0,1,232,128v4.69l10.34-10.35a8,8,0,0,1,11.32,11.32Zm-41.18,55A104,104,0,0,1,24,128v-4.69L13.66,133.66A8,8,0,0,1,2.34,122.34l24-24a8,8,0,0,1,11.32,0l24,24a8,8,0,0,1-11.32,11.32L40,123.31V128a87.62,87.62,0,0,0,22.24,58.41A79.66,79.66,0,0,1,98.3,157.66a48,48,0,1,1,59.4,0,79.59,79.59,0,0,1,36.08,28.78,89.68,89.68,0,0,0,5.71-7.11,8,8,0,0,1,13,9.34ZM128,152a32,32,0,1,0-32-32A32,32,0,0,0,128,152Zm0,64a88.2,88.2,0,0,0,53.92-18.49,64,64,0,0,0-107.84,0A87.57,87.57,0,0,0,128,216Z"></path>
            </svg>
            <span>Змінити акаунт</span>
          </button>
          <button class="desktop-nav-rail-account-menu-item is-danger" type="button" role="menuitem" data-account-action="logout">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
              <path d="M120,216a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H56V208h56A8,8,0,0,1,120,216Zm109.66-93.66-40-40a8,8,0,0,0-11.32,11.32L204.69,120H112a8,8,0,0,0,0,16h92.69l-26.35,26.34a8,8,0,0,0,11.32,11.32l40-40A8,8,0,0,0,229.66,122.34Z"></path>
            </svg>
            <span>Вийти з акаунту</span>
          </button>
        </div>
      </div>
    </nav>

    <aside class="desktop-secondary-menu" id="desktopSecondaryMenu" aria-label="Додаткове меню">
      <div class="desktop-secondary-menu-header">
        <div class="desktop-secondary-menu-header-left">
          <button class="desktop-secondary-menu-header-btn" id="desktopSecondaryMenuBack" type="button" aria-label="Назад до меню">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"></path></svg>
          </button>
          <h3 id="desktopSecondaryMenuTitle">Налаштування</h3>
        </div>
        <div class="desktop-secondary-menu-header-actions">
          <button class="desktop-secondary-menu-header-btn desktop-secondary-menu-header-btn--new-chat" id="desktopSecondaryMenuNewChat" type="button" aria-label="Створити чат" title="Створити чат">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M229.66,58.34l-32-32a8,8,0,0,0-11.32,0l-96,96A8,8,0,0,0,88,128v32a8,8,0,0,0,8,8h32a8,8,0,0,0,5.66-2.34l96-96A8,8,0,0,0,229.66,58.34ZM124.69,152H104V131.31l64-64L188.69,88ZM200,76.69,179.31,56,192,43.31,212.69,64ZM224,128v80a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32h80a8,8,0,0,1,0,16H48V208H208V128a8,8,0,0,1,16,0Z"></path></svg>
          </button>
          <button class="desktop-secondary-menu-header-btn" id="desktopSecondaryMenuSearch" type="button" aria-label="Пошук налаштувань">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"></path></svg>
          </button>
          <button class="desktop-secondary-menu-header-btn" id="desktopSecondaryMenuMore" type="button" aria-label="Дії">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M128,72a16,16,0,1,0-16-16A16,16,0,0,0,128,72Zm0,40a16,16,0,1,0,16,16A16,16,0,0,0,128,112Zm0,72a16,16,0,1,0,16,16A16,16,0,0,0,128,184Z"></path></svg>
          </button>
        </div>
      </div>
      <div class="desktop-secondary-menu-list" id="desktopSecondaryMenuList"></div>
    </aside>

    <!-- Пошук контактів -->
    <div class="search-box">
      <input 
        type="text" 
        id="searchInput" 
        class="search-input" 
        placeholder="Пошук чатів..."
        autocomplete="off"
      >
      <button class="btn-new-chat" id="newChatBtn" aria-label="Новий чат">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
          <path d="M229.66,58.34l-32-32a8,8,0,0,0-11.32,0l-96,96A8,8,0,0,0,88,128v32a8,8,0,0,0,8,8h32a8,8,0,0,0,5.66-2.34l96-96A8,8,0,0,0,229.66,58.34ZM124.69,152H104V131.31l64-64L188.69,88ZM200,76.69,179.31,56,192,43.31,212.69,64ZM224,128v80a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32h80a8,8,0,0,1,0,16H48V208H208V128a8,8,0,0,1,16,0Z"></path>
        </svg>
      </button>
      <svg class="search-icon" width="16" height="16" viewBox="0 0 20 20" fill="none">
        <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M19 19L14.65 14.65" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>

    <!-- Заголовок списку чатів -->
    <div class="chats-list-header">
      <h2>Повідомлення</h2>
    </div>

    <div class="desktop-sidebar-top" id="desktopSidebarTop">
      <div class="sidebar-avatars-strip" id="sidebarAvatarsStrip" aria-label="Швидкі контакти"></div>
      <div class="sidebar-nav-slot" id="sidebarNavSlot"></div>
    </div>

    <!-- Список чатів -->
    <div class="chats-list" id="chatsList">
      <!-- Чати динамічно додаватимуться тут -->
    </div>

    <!-- Розділи налаштувань (мобільна версія) -->
    <div class="settings-container" id="settingsContainerMobile">
      <!-- Розділи динамічно завантажуватимуться сюди -->
    </div>

    <!-- Меню профілю -->
    <div class="profile-menu-wrapper">
      <div class="bottom-nav">
        <div class="bottom-nav-indicator" aria-hidden="true"></div>
        <button class="bottom-nav-item" id="navCalls" title="Дзвінки">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M222.37,158.46l-47.11-21.11-.13-.06a16,16,0,0,0-15.17,1.4,8.12,8.12,0,0,0-.75.56L134.87,160c-15.42-7.49-31.34-23.29-38.83-38.51l20.78-24.71c.2-.25.39-.5.57-.77a16,16,0,0,0,1.32-15.06l0-.12L97.54,33.64a16,16,0,0,0-16.62-9.52A56.26,56.26,0,0,0,32,80c0,79.4,64.6,144,144,144a56.26,56.26,0,0,0,55.88-48.92A16,16,0,0,0,222.37,158.46ZM176,208A128.14,128.14,0,0,1,48,80,40.2,40.2,0,0,1,82.87,40a.61.61,0,0,0,0,.12l21,47L83.2,111.86a6.13,6.13,0,0,0-.57.77,16,16,0,0,0-1,15.7c9.06,18.53,27.73,37.06,46.46,46.11a16,16,0,0,0,15.75-1.14,8.44,8.44,0,0,0,.74-.56L168.89,152l47,21.05h0s.08,0,.11,0A40.21,40.21,0,0,1,176,208Z"></path></svg>
          <span>Дзвінки</span>
        </button>
        <button class="bottom-nav-item" id="navShop" title="Магазин">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M232,96a7.89,7.89,0,0,0-.3-2.2L217.35,43.6A16.07,16.07,0,0,0,202,32H54A16.07,16.07,0,0,0,38.65,43.6L24.31,93.8A7.89,7.89,0,0,0,24,96h0v16a40,40,0,0,0,16,32v72a8,8,0,0,0,8,8H208a8,8,0,0,0,8-8V144a40,40,0,0,0,16-32V96ZM54,48H202l11.42,40H42.61Zm50,56h48v8a24,24,0,0,1-48,0Zm-16,0v8a24,24,0,0,1-35.12,21.26,7.88,7.88,0,0,0-1.82-1.06A24,24,0,0,1,40,112v-8ZM200,208H56V151.2a40.57,40.57,0,0,0,8,.8,40,40,0,0,0,32-16,40,40,0,0,0,64,0,40,40,0,0,0,32,16,40.57,40.57,0,0,0,8-.8Zm4.93-75.8a8.08,8.08,0,0,0-1.8,1.05A24,24,0,0,1,168,112v-8h48v8A24,24,0,0,1,204.93,132.2Z"></path></svg>
          <span>Магазин</span>
        </button>
        <button class="bottom-nav-item" id="navWallet" title="Гаманець">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M216,64H56a8,8,0,0,1,0-16H192a8,8,0,0,0,0-16H56A24,24,0,0,0,32,56V184a24,24,0,0,0,24,24H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64Zm0,128H56a8,8,0,0,1-8-8V78.63A23.84,23.84,0,0,0,56,80H216Zm-48-60a12,12,0,1,1,12,12A12,12,0,0,1,168,132Z"></path></svg>
          <span>Гаманець</span>
        </button>
        <button class="bottom-nav-item" id="navSettings" title="Налаштування">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.21,107.21,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.71,107.71,0,0,0-26.25-10.87,8,8,0,0,0-7.06,1.49L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.51a8,8,0,0,0-3.93,6L67.32,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.21,107.21,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06Zm-16.1-6.5a73.93,73.93,0,0,1,0,8.68,8,8,0,0,0,1.74,5.48l14.19,17.73a91.57,91.57,0,0,1-6.23,15L187,173.11a8,8,0,0,0-5.1,2.64,74.11,74.11,0,0,1-6.14,6.14,8,8,0,0,0-2.64,5.1l-2.51,22.58a91.32,91.32,0,0,1-15,6.23l-17.74-14.19a8,8,0,0,0-5-1.75h-.48a73.93,73.93,0,0,1-8.68,0,8,8,0,0,0-5.48,1.74L100.45,215.8a91.57,91.57,0,0,1-15-6.23L82.89,187a8,8,0,0,0-2.64-5.1,74.11,74.11,0,0,1-6.14-6.14,8,8,0,0,0-5.1-2.64L46.43,170.6a91.32,91.32,0,0,1-6.23-15l14.19-17.74a8,8,0,0,0,1.74-5.48,73.93,73.93,0,0,1,0-8.68,8,8,0,0,0-1.74-5.48L40.2,100.45a91.57,91.57,0,0,1,6.23-15L69,82.89a8,8,0,0,0,5.1-2.64,74.11,74.11,0,0,1,6.14-6.14A8,8,0,0,0,82.89,69L85.4,46.43a91.32,91.32,0,0,1,15-6.23l17.74,14.19a8,8,0,0,0,5.48,1.74,73.93,73.93,0,0,1,8.68,0,8,8,0,0,0,5.48-1.74L155.55,40.2a91.57,91.57,0,0,1,15,6.23L173.11,69a8,8,0,0,0,2.64,5.1,74.11,74.11,0,0,1,6.14,6.14,8,8,0,0,0,5.1,2.64l22.58,2.51a91.32,91.32,0,0,1,6.23,15l-14.19,17.74A8,8,0,0,0,199.87,123.66Z"></path></svg>
          <span>Налаштування</span>
        </button>
        <button class="bottom-nav-item active" id="navChats" title="Чати">
          <svg width="24" height="24" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M232.07,186.76a80,80,0,0,0-62.5-114.17A80,80,0,1,0,23.93,138.76l-7.27,24.71a16,16,0,0,0,19.87,19.87l24.71-7.27a80.39,80.39,0,0,0,25.18,7.35,80,80,0,0,0,108.34,40.65l24.71,7.27a16,16,0,0,0,19.87-19.86ZM62,159.5a8.28,8.28,0,0,0-2.26.32L32,168l8.17-27.76a8,8,0,0,0-.63-6,64,64,0,1,1,26.26,26.26A8,8,0,0,0,62,159.5Zm153.79,28.73L224,216l-27.76-8.17a8,8,0,0,0-6,.63,64.05,64.05,0,0,1-85.87-24.88A79.93,79.93,0,0,0,174.7,89.71a64,64,0,0,1,41.75,92.48A8,8,0,0,0,215.82,188.23Z" stroke="currentColor" stroke-width="2" fill="currentColor"/>
          </svg>
          <span>Чати</span>
        </button>
        <button class="bottom-nav-item" id="navGames" title="Ігровий центр">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M176,112H152a8,8,0,0,1,0-16h24a8,8,0,0,1,0,16ZM104,96H96V88a8,8,0,0,0-16,0v8H72a8,8,0,0,0,0,16h8v8a8,8,0,0,0,16,0v-8h8a8,8,0,0,0,0-16ZM241.48,200.65a36,36,0,0,1-54.94,4.81c-.12-.12-.24-.24-.35-.37L146.48,160h-37L69.81,205.09l-.35.37A36.08,36.08,0,0,1,44,216,36,36,0,0,1,8.56,173.75a.68.68,0,0,1,0-.14L24.93,89.52A59.88,59.88,0,0,1,83.89,40H172a60.08,60.08,0,0,1,59,49.25c0,.06,0,.12,0,.18l16.37,84.17a.68.68,0,0,1,0,.14A35.74,35.74,0,0,1,241.48,200.65ZM172,144a44,44,0,0,0,0-88H83.89A43.9,43.9,0,0,0,40.68,92.37l0,.13L24.3,176.59A20,20,0,0,0,58,194.3l41.92-47.59a8,8,0,0,1,6-2.71Zm59.7,32.59-8.74-45A60,60,0,0,1,172,160h-4.2L198,194.31a20.09,20.09,0,0,0,17.46,5.39,20,20,0,0,0,16.23-23.11Z"></path></svg>
          <span>Ігри</span>
        </button>
        <button class="bottom-nav-item" id="navProfile" title="Профіль">
          <span class="nav-avatar" aria-hidden="true"></span>
          <span>Профіль</span>
        </button>
      </div>
    </div>
    <button class="nav-reveal-handle" id="navRevealHandle" aria-label="Показати меню" type="button">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
        <path d="M213.66,165.66a8,8,0,0,1-11.32,0L128,91.31,53.66,165.66a8,8,0,0,1-11.32-11.32l80-80a8,8,0,0,1,11.32,0l80,80A8,8,0,0,1,213.66,165.66Z"></path>
      </svg>
    </button>
    <button class="nav-hide-handle" id="navHideHandle" aria-label="Приховати меню" type="button">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
        <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"></path>
      </svg>
    </button>
  </aside>

  <!-- Основна область чату -->
  <main class="chat-area">
    <div class="chat-container" id="chatContainer">
      <div class="chat-modal-header">
        <div class="chat-modal-header-left">
          <div class="app-chat-info" id="chatModalInfo">
            <div class="app-chat-avatar" id="chatModalAvatar"></div>
            <div class="app-chat-meta">
              <div class="app-chat-title-line">
                <div class="app-chat-name" id="chatModalName">Виберіть контакт</div>
                <div class="app-chat-status" id="chatModalStatus"></div>
              </div>
              <div class="app-chat-typing" id="chatModalTyping"></div>
            </div>
          </div>
        </div>
        <div class="chat-modal-header-right">
          <button class="btn-icon" id="chatModalCallBtn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
          </button>
          <button class="btn-icon" id="chatModalHistoryBtn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M23 12a11 11 0 1 1-22 0 11 11 0 0 1 22 0z" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <div class="chat-menu-wrapper">
            <button class="btn-icon" id="chatModalMenuBtn" aria-haspopup="true" aria-expanded="false">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="1" fill="currentColor"/>
                <circle cx="12" cy="5" r="1" fill="currentColor"/>
                <circle cx="12" cy="19" r="1" fill="currentColor"/>
              </svg>
            </button>
            <div class="chat-menu" id="chatModalMenu">
              <button class="chat-menu-item" data-action="clear">
                <svg class="chat-menu-item-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true"><path d="M235.5,216.81c-22.56-11-35.5-34.58-35.5-64.8V134.73a15.94,15.94,0,0,0-10.09-14.87L165,110a8,8,0,0,1-4.48-10.34l21.32-53a28,28,0,0,0-16.1-37,28.14,28.14,0,0,0-35.82,16,.61.61,0,0,0,0,.12L108.9,79a8,8,0,0,1-10.37,4.49L73.11,73.14A15.89,15.89,0,0,0,55.74,76.8C34.68,98.45,24,123.75,24,152a111.45,111.45,0,0,0,31.18,77.53A8,8,0,0,0,61,232H232a8,8,0,0,0,3.5-15.19ZM67.14,88l25.41,10.3a24,24,0,0,0,31.23-13.45l21-53c2.56-6.11,9.47-9.27,15.43-7a12,12,0,0,1,6.88,15.92L145.69,93.76a24,24,0,0,0,13.43,31.14L184,134.73V152c0,.33,0,.66,0,1L55.77,101.71A108.84,108.84,0,0,1,67.14,88Zm48,128a87.53,87.53,0,0,1-24.34-42,8,8,0,0,0-15.49,4,105.16,105.16,0,0,0,18.36,38H64.44A95.54,95.54,0,0,1,40,152a85.9,85.9,0,0,1,7.73-36.29l137.8,55.12c3,18,10.56,33.48,21.89,45.16Z"></path></svg>
                <span class="chat-menu-item-label">Очистити чат</span>
              </button>
              <button class="chat-menu-item" data-action="delete">
                <svg class="chat-menu-item-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path></svg>
                <span class="chat-menu-item-label">Видалити чат</span>
              </button>
              <button class="chat-menu-item" data-action="info">
                <svg class="chat-menu-item-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z"></path></svg>
                <span class="chat-menu-item-label">Інформація</span>
              </button>
              <button class="chat-menu-item" data-action="group-info">
                <span class="chat-menu-item-label">Деталі групи</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <section class="contact-profile-view settings-subsection" id="contactProfileView" aria-hidden="true">
        <div class="settings-header settings-subsection-header">
          <button type="button" class="btn-back-subsection settings-subsection-back" id="contactProfileBackBtn" aria-label="Назад до чату">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
              <path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"></path>
            </svg>
          </button>
          <h2 class="settings-subsection-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
              <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"></path>
            </svg>
            <span>Дані</span>
          </h2>
        </div>
        <div class="contact-profile-view-body">
          <section class="profile-hero-card" id="contactProfileHeroCard">
            <div class="profile-hero contact-profile-hero">
              <div class="profile-avatar-wrap">
                <div class="profile-avatar-glow" aria-hidden="true"></div>
                <div class="profile-avatar-large" id="contactProfileAvatar" aria-hidden="true">
                  <img class="profile-avatar-image" id="contactProfileAvatarImage" alt="" hidden draggable="false" />
                  <span class="profile-avatar-initials" id="contactProfileInitials">OR</span>
                </div>
              </div>

              <div class="profile-name-row">
                <h2 class="profile-name" id="contactProfileName">Контакт</h2>
              </div>
              <div class="profile-handle-row">
                <p class="profile-handle" id="contactProfileHandle">@contact</p>
              </div>
              <p class="profile-bio" id="contactProfileBio">Профіль контакту</p>

              <div class="profile-meta-grid">
                <div class="profile-meta-card">
                  <span class="profile-meta-label">Дата народження</span>
                  <span class="profile-meta-value" id="contactProfileDob">Не вказано</span>
                </div>
                <div class="profile-meta-card">
                  <span class="profile-meta-label">Статус</span>
                  <span class="profile-meta-value" id="contactProfileStatus">Онлайн</span>
                </div>
              </div>
            </div>
          </section>
          <div class="profile-hero-actions contact-profile-actions">
            <button class="profile-action-btn" id="contactProfileCallBtn" aria-label="Подзвонити">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" stroke-width="2" fill="none"/>
              </svg>
              <span>Дзвінок</span>
            </button>
            <button class="profile-action-btn" id="contactProfileMessageBtn" aria-label="Написати">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Написати</span>
            </button>
            <div class="contact-profile-more">
              <button class="profile-action-btn contact-profile-more-btn" id="contactProfileMoreBtn" aria-label="Більше дій" aria-haspopup="true" aria-expanded="false">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
                  <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                  <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
                </svg>
                <span>Ще</span>
              </button>
              <div class="message-menu contact-profile-menu" id="contactProfileMenu" aria-hidden="true">
                <button class="message-menu-item contact-profile-menu-item" data-action="mute">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"></path>
                    <path d="M17 9l6 6M23 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
                  </svg>
                  <span>Вимкнути звук</span>
                </button>
                <button class="message-menu-item contact-profile-menu-item" data-action="hide">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" stroke-width="2"></path>
                    <path d="M1 1l22 22" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
                  </svg>
                  <span>Приховати чат</span>
                </button>
                <button class="message-menu-item contact-profile-menu-item is-danger" data-action="block">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"></circle>
                    <path d="M5 5l14 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
                  </svg>
                  <span>Заблокувати</span>
                </button>
              </div>
            </div>
          </div>
          <section class="contact-profile-media-section" aria-label="Медіа контакту">
            <div class="contact-profile-media-filters" id="contactProfileMediaFilters" role="tablist" aria-label="Фільтр медіа">
              <button type="button" class="contact-profile-media-filter is-active" data-media-filter="media" data-label="Медіа" aria-pressed="true">Медіа</button>
              <button type="button" class="contact-profile-media-filter" data-media-filter="voice" data-label="Голосові" aria-pressed="false">Голосові</button>
              <button type="button" class="contact-profile-media-filter" data-media-filter="files" data-label="Файли" aria-pressed="false">Файли</button>
            </div>
            <div class="contact-profile-media-grid" id="contactProfileMediaGrid"></div>
            <p class="contact-profile-media-empty" id="contactProfileMediaEmpty">У цьому чаті ще немає медіа.</p>
          </section>
        </div>
      </section>
      <!-- Область повідомлень -->
      <div class="messages-container" id="messagesContainer">
        <!-- Повідомлення будуть додаватися динамічно -->
      </div>
      <button
        type="button"
        class="messages-scroll-bottom-btn"
        id="messagesScrollBottomBtn"
        aria-label="Прокрутити в кінець"
        aria-hidden="true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
          <path d="M205.66,149.66l-72,72a8,8,0,0,1-11.32,0l-72-72a8,8,0,0,1,11.32-11.32L120,196.69V40a8,8,0,0,1,16,0V196.69l58.34-58.35a8,8,0,0,1,11.32,11.32Z"></path>
        </svg>
      </button>

      <!-- Поле введення повідомлення -->
      <div class="message-input-area">
        <div class="reply-bar" id="replyBar">
          <div class="reply-bar-content">
            <div class="reply-bar-label">Відповідь</div>
            <div class="reply-bar-text" id="replyBarText"></div>
          </div>
          <button class="reply-bar-close" id="replyBarClose" aria-label="Скасувати відповідь">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="input-wrapper">
          <button type="button" class="btn-icon btn-attach">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
              <path d="M209.66,122.34a8,8,0,0,1,0,11.32l-82.05,82a56,56,0,0,1-79.2-79.21L147.67,35.73a40,40,0,1,1,56.61,56.55L105,193A24,24,0,1,1,71,159L154.3,74.38A8,8,0,1,1,165.7,85.6L82.39,170.31a8,8,0,1,0,11.27,11.36L192.93,81A24,24,0,1,0,159,47L59.76,147.68a40,40,0,1,0,56.53,56.62l82.06-82A8,8,0,0,1,209.66,122.34Z"></path>
            </svg>
          </button>
          <input type="file" id="galleryPickerInput" accept="image/*" hidden />
          <input type="file" id="cameraPickerInput" accept="image/*" capture="environment" hidden />
          <input type="file" id="filePickerInput" hidden />
          <textarea
            id="messageInput"
            class="message-input"
            placeholder="Напишіть повідомлення..."
            rows="1"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="none"
            spellcheck="false"
            inputmode="text"
            enterkeyhint="send"
          ></textarea>
          <button type="button" class="btn-emoji" aria-label="Емодзі">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
              <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM80,108a12,12,0,1,1,12,12A12,12,0,0,1,80,108Zm96,0a12,12,0,1,1-12-12A12,12,0,0,1,176,108Zm-1.07,48c-10.29,17.79-27.4,28-46.93,28s-36.63-10.2-46.92-28a8,8,0,1,1,13.84-8c7.47,12.91,19.21,20,33.08,20s25.61-7.1,33.07-20a8,8,0,0,1,13.86,8Z"></path>
            </svg>
          </button>
          <button type="button" class="btn-send" id="sendBtn" aria-label="Записати голосове повідомлення">
            <svg class="send-icon send-icon-idle" xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
              <path d="M128,176a48.05,48.05,0,0,0,48-48V64a48,48,0,0,0-96,0v64A48.05,48.05,0,0,0,128,176ZM96,64a32,32,0,0,1,64,0v64a32,32,0,0,1-64,0Zm40,143.6V240a8,8,0,0,1-16,0V207.6A80.11,80.11,0,0,1,48,128a8,8,0,0,1,16,0,64,64,0,0,0,128,0,8,8,0,0,1,16,0A80.11,80.11,0,0,1,136,207.6Z"></path>
            </svg>
            <svg class="send-icon send-icon-active" xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
              <path d="M227.32,28.68a16,16,0,0,0-15.66-4.08l-.15,0L19.57,82.84a16,16,0,0,0-2.49,29.8L102,154l41.3,84.87A15.86,15.86,0,0,0,157.74,248q.69,0,1.38-.06a15.88,15.88,0,0,0,14-11.51l58.2-191.94c0-.05,0-.1,0-.15A16,16,0,0,0,227.32,28.68ZM157.83,231.85l-.05.14,0-.07-40.06-82.3,48-48a8,8,0,0,0-11.31-11.31l-48,48L24.08,98.25l-.07,0,.14,0L216,40Z"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Екран привітання -->
    <div class="welcome-screen" id="welcomeScreen">
      <div class="welcome-minimal">
        <h2 class="welcome-minimal-title">Оберіть чат, щоб почати</h2>
        <p class="welcome-minimal-subtitle">
          Відкрийте діалог зі списку контактів.
        </p>
      </div>
    </div>

    <!-- Розділи налаштувань -->
    <div class="settings-container" id="settingsContainer">
      <!-- Розділи динамічно завантажуватимуться сюди -->
    </div>
  </main>
  </div>
</div>

<!-- Sidebar overlay для мобільного -->
<div class="sidebar-overlay" id="sidebarOverlay"></div>

<!-- Mobile attach sheet -->
<div class="attach-sheet-overlay" id="attachSheetOverlay" aria-hidden="true">
  <div class="attach-sheet" id="attachSheet" role="dialog" aria-modal="true" aria-label="Меню вкладень">
    <div class="attach-sheet-handle" aria-hidden="true"></div>
    <div class="attach-sheet-grid">
      <button type="button" class="attach-sheet-item" data-attach-action="gallery">
        <span class="attach-sheet-icon gallery" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 256 256">
            <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM40,56H216V152l-38.34-38.34a16,16,0,0,0-22.63,0L120,148.69,94.34,123a16,16,0,0,0-22.63,0L40,154.69ZM216,200H40V177.31l43-43L108.69,160a16,16,0,0,0,22.62,0L166.34,125,216,174.69V200ZM92,96A12,12,0,1,1,80,84,12,12,0,0,1,92,96Z"></path>
          </svg>
        </span>
        <span class="attach-sheet-label">Галерея</span>
      </button>
      <button type="button" class="attach-sheet-item" data-attach-action="camera">
        <span class="attach-sheet-icon camera" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 256 256">
            <path d="M216,64H176L163.58,45.37A8,8,0,0,0,156.92,40H99.08a8,8,0,0,0-6.66,3.37L80,64H40A16,16,0,0,0,24,80V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64ZM128,176a40,40,0,1,1,40-40A40,40,0,0,1,128,176Zm0-64a24,24,0,1,0,24,24A24,24,0,0,0,128,112Z"></path>
          </svg>
        </span>
        <span class="attach-sheet-label">Камера</span>
      </button>
      <button type="button" class="attach-sheet-item" data-attach-action="file">
        <span class="attach-sheet-icon file" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 256 256">
            <path d="M213.66,82.34l-40-40A8,8,0,0,0,168,40H72A16,16,0,0,0,56,56V200a16,16,0,0,0,16,16H184a16,16,0,0,0,16-16V88A8,8,0,0,0,197.66,82.34ZM168,56l24,24H168ZM72,200V56h80V88a16,16,0,0,0,16,16h16V200Z"></path>
          </svg>
        </span>
        <span class="attach-sheet-label">Файл</span>
      </button>
      <button type="button" class="attach-sheet-item" data-attach-action="location">
        <span class="attach-sheet-icon location" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 256 256">
            <path d="M128,16A88.1,88.1,0,0,0,40,104c0,87.06,77.9,131.78,81.21,133.64a8,8,0,0,0,7.58,0C132.1,235.78,210,191.06,210,104A88.1,88.1,0,0,0,128,16Zm0,203.13C111.63,208.85,56,168.08,56,104a72,72,0,0,1,144,0C200,168.08,144.37,208.85,128,219.13ZM128,64a40,40,0,1,0,40,40A40,40,0,0,0,128,64Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,128Z"></path>
          </svg>
        </span>
        <span class="attach-sheet-label">Локація</span>
      </button>
    </div>
    <button type="button" class="attach-sheet-cancel" id="attachSheetCancelBtn">Скасувати</button>
  </div>
</div>

<!-- Mobile custom camera -->
<div class="camera-capture-overlay" id="cameraCaptureOverlay" aria-hidden="true">
  <div class="camera-capture">
    <video id="cameraCaptureVideo" class="camera-capture-video" autoplay playsinline muted></video>
    <div class="camera-capture-top">
      <button type="button" class="camera-capture-btn ghost" id="cameraCloseBtn" aria-label="Закрити камеру">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 256 256">
          <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66A8,8,0,0,1,50.34,194.34L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path>
        </svg>
      </button>
      <button type="button" class="camera-capture-btn ghost" id="cameraSwitchBtn" aria-label="Перемкнути камеру">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 256 256">
          <path d="M208,56H157.77l-11.4-17.1A16,16,0,0,0,133.06,32H122.94a16,16,0,0,0-13.31,6.9L98.23,56H48A16,16,0,0,0,32,72V184a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V72A16,16,0,0,0,208,56ZM124,160a36,36,0,1,1,36-36A36,36,0,0,1,124,160Zm68.94-40a8,8,0,0,1,0,11.31l-20,20A8,8,0,0,1,161.63,140L168,133.66H152a56.06,56.06,0,0,1-56-56V72a8,8,0,0,1,16,0v5.66a40,40,0,0,0,40,40h16l-6.34-6.34a8,8,0,0,1,11.31-11.32Z"></path>
        </svg>
      </button>
    </div>
    <div class="camera-capture-bottom">
      <button type="button" class="camera-shutter-btn" id="cameraShutterBtn" aria-label="Зробити фото"></button>
    </div>
  </div>
</div>

<!-- Модальне вікно для нового чату -->
<div class="modal" id="newChatModal">
  <div class="modal-content new-chat-shell">
    <div class="modal-header new-chat-header">
      <div class="new-chat-heading">
        <div class="new-chat-mark" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M256,136a8,8,0,0,1-8,8H232v16a8,8,0,0,1-16,0V144H200a8,8,0,0,1,0-16h16V112a8,8,0,0,1,16,0v16h16A8,8,0,0,1,256,136Zm-57.87,58.85a8,8,0,0,1-12.26,10.3C165.75,181.19,138.09,168,108,168s-57.75,13.19-77.87,37.15a8,8,0,0,1-12.25-10.3c14.94-17.78,33.52-30.41,54.17-37.17a68,68,0,1,1,71.9,0C164.6,164.44,183.18,177.07,198.13,194.85ZM108,152a52,52,0,1,0-52-52A52.06,52.06,0,0,0,108,152Z"></path>
          </svg>
        </div>
        <div class="new-chat-heading-copy">
          <span class="new-chat-kicker">Швидкий старт</span>
          <h3>Створити новий чат</h3>
        </div>
      </div>
      <button class="btn-close" id="closeModalBtn" aria-label="Закрити вікно">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="modal-body new-chat-body">
      <div class="new-chat-panel">
        <label class="new-chat-field">
          <span class="new-chat-field-label">Назва чату</span>
          <input 
            type="text" 
            id="newContactInput" 
            class="contact-input" 
            placeholder="Тег, ім'я або номер користувача"
            autocomplete="off"
          >
        </label>
        <div class="new-chat-user-search" id="newChatUserSearch">
          <div class="new-chat-user-search-results" id="newChatUserSearchResults"></div>
        </div>
        <button type="button" class="new-chat-mode new-chat-mode-btn" id="newChatGroupModeBtn" aria-expanded="false" aria-controls="groupFields">
          <span class="new-chat-mode-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
              <path d="M117.25,157.92a60,60,0,1,0-66.5,0A95.83,95.83,0,0,0,3.53,195.63a8,8,0,1,0,13.4,8.74,80,80,0,0,1,134.14,0,8,8,0,0,0,13.4-8.74A95.83,95.83,0,0,0,117.25,157.92ZM40,108a44,44,0,1,1,44,44A44.05,44.05,0,0,1,40,108Zm210.14,98.7a8,8,0,0,1-11.07-2.33A79.83,79.83,0,0,0,172,168a8,8,0,0,1,0-16,44,44,0,1,0-16.34-84.87,8,8,0,1,1-5.94-14.85,60,60,0,0,1,55.53,105.64,95.83,95.83,0,0,1,47.22,37.71A8,8,0,0,1,250.14,206.7Z"></path>
            </svg>
          </span>
          <span class="new-chat-mode-copy">
            <strong>Створити групу</strong>
          </span>
        </button>
      </div>
      <div class="group-fields" id="groupFields">
        <input type="hidden" id="groupMembersInput" value="" />
        <div class="new-chat-group-header">
          <div class="new-chat-group-header-copy">
            <strong>Учасники групи</strong>
            <span>Оберіть контакти для нового групового чату</span>
          </div>
          <span class="new-chat-group-count" id="newChatGroupCount">0</span>
        </div>
        <div class="new-chat-group-selected" id="newChatGroupSelectedUsers"></div>
        <p class="new-chat-note">Оберіть користувачів зі списку нижче для створення групи.</p>
        <div class="new-chat-group-users" id="newChatGroupUsersList"></div>
      </div>
      <div class="new-chat-tips" aria-hidden="true">
        <div class="new-chat-tip">
          <span class="new-chat-tip-index">01</span>
          <span>Коротка назва виглядає чистіше у списку чатів.</span>
        </div>
        <div class="new-chat-tip">
          <span class="new-chat-tip-index">02</span>
          <span>Груповий режим відкриє поле для списку учасників.</span>
        </div>
        <div class="new-chat-tip">
          <span class="new-chat-tip-index">03</span>
          <span>Чат відкриється одразу після створення.</span>
        </div>
      </div>
    </div>
    <div class="modal-footer new-chat-footer">
      <button class="btn btn-secondary" id="cancelBtn">Скасувати</button>
      <button class="btn btn-primary" id="confirmBtn">
        <span>Створити чат</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  </div>
</div>

<!-- Модальний фон -->
<div class="modal-overlay" id="modalOverlay"></div>

<!-- Custom alert/confirm modal -->
<div class="alert-overlay" id="alertOverlay" aria-hidden="true">
  <div class="alert-modal" role="dialog" aria-modal="true" aria-labelledby="alertTitle">
    <div class="alert-modal-inner">
      <div class="alert-header">
        <div class="alert-title-wrap">
          <span class="alert-title-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256" fill="currentColor">
              <path d="M224,71.1a8,8,0,0,1-10.78-3.42,94.13,94.13,0,0,0-33.46-36.91,8,8,0,1,1,8.54-13.54,111.46,111.46,0,0,1,39.12,43.09A8,8,0,0,1,224,71.1ZM35.71,72a8,8,0,0,0,7.1-4.32A94.13,94.13,0,0,1,76.27,30.77a8,8,0,1,0-8.54-13.54A111.46,111.46,0,0,0,28.61,60.32,8,8,0,0,0,35.71,72Zm186.1,103.94A16,16,0,0,1,208,200H167.2a40,40,0,0,1-78.4,0H48a16,16,0,0,1-13.79-24.06C43.22,160.39,48,138.28,48,112a80,80,0,0,1,160,0C208,138.27,212.78,160.38,221.81,175.94ZM150.62,200H105.38a24,24,0,0,0,45.24,0ZM208,184c-10.64-18.27-16-42.49-16-72a64,64,0,0,0-128,0c0,29.52-5.38,53.74-16,72Z"></path>
            </svg>
          </span>
          <h3 id="alertTitle">Помилка</h3>
        </div>
        <button class="alert-close" id="alertCloseBtn" aria-label="Закрити">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="alert-body" id="alertMessage"></div>
      <div class="alert-actions">
        <button class="btn btn-secondary" id="alertCancelBtn">Скасувати</button>
        <button class="btn btn-primary" id="alertOkBtn">OK</button>
      </div>
    </div>
  </div>
</div>

<!-- Group info modal -->
<div class="modal" id="groupInfoModal">
  <div class="modal-header">
    <h3>Профіль групи</h3>
    <button class="btn-close" id="closeGroupInfoBtn" aria-label="Закрити">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
  <div class="modal-body group-info-modal-body">
    <div class="group-info-header">
      <div class="group-avatar" id="groupInfoAvatar"></div>
      <div class="group-info-main">
        <div class="group-info-name" id="groupInfoName"></div>
        <div class="group-info-count" id="groupInfoCount"></div>
      </div>
      <button class="btn btn-secondary group-appearance-open-btn" id="openGroupAppearanceBtn">Керування виглядом</button>
    </div>
    <div>
      <div class="group-modal-caption">Учасники</div>
      <ul class="group-info-members" id="groupInfoMembers"></ul>
    </div>
  </div>
  <div class="modal-footer">
    <button class="btn btn-secondary" id="closeGroupInfoBtn2">Закрити</button>
    <button class="btn btn-primary" id="saveGroupInfoBtn">Зберегти</button>
  </div>
</div>

<!-- Group appearance modal -->
<div class="modal" id="groupAppearanceModal">
  <div class="modal-header">
    <h3>Керування виглядом групи</h3>
    <button class="btn-close" id="closeGroupAppearanceBtn" aria-label="Закрити">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
  <div class="modal-body group-appearance-modal-body">
    <div class="group-appearance-avatar-wrap">
      <div class="group-avatar group-avatar--xl" id="groupAppearanceAvatarPreview"></div>
      <input type="file" id="groupAppearanceAvatarInput" accept="image/*" hidden />
      <div class="group-appearance-avatar-actions">
        <button class="btn btn-secondary" id="groupAppearanceAvatarBtn">Завантажити фото</button>
        <button class="btn btn-secondary" id="groupAppearanceAvatarResetBtn">Скинути фото</button>
      </div>
    </div>
    <div>
      <div class="group-modal-caption">Назва групи</div>
      <input type="text" id="groupAppearanceNameInput" class="group-appearance-name-input" placeholder="Введіть назву групи" maxlength="80" />
    </div>
  </div>
  <div class="modal-footer">
    <button class="btn btn-secondary" id="cancelGroupAppearanceBtn">Скасувати</button>
    <button class="btn btn-primary" id="saveGroupAppearanceBtn">Зберегти</button>
  </div>
</div>

<!-- Message context menu -->
<div class="message-menu-backdrop" id="messageMenuBackdrop" aria-hidden="true"></div>
<div class="message-menu" id="messageMenu" aria-hidden="true">
  <div class="message-menu-date" id="messageMenuDate"></div>
  <button class="message-menu-item" id="messageMenuReply">
    <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M232,112a64.07,64.07,0,0,1-64,64H51.31l34.35,34.34a8,8,0,0,1-11.32,11.32l-48-48a8,8,0,0,1,0-11.32l48-48a8,8,0,0,1,11.32,11.32L51.31,160H168a48,48,0,0,0,0-96H80a8,8,0,0,1,0-16h88A64.07,64.07,0,0,1,232,112Z"></path>
    </svg>
    <span>Відповісти</span>
  </button>
  <button class="message-menu-item" id="messageMenuEdit">
    <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z"></path>
    </svg>
    <span>Редагувати</span>
  </button>
  <button class="message-menu-item" id="messageMenuDelete">
    <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path>
    </svg>
    <span>Видалити</span>
  </button>
  <button class="message-menu-item" id="messageMenuCopy">
    <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"></path>
    </svg>
    <span>Копіювати</span>
  </button>
</div>`;

  const extraUi = `
<!-- Chat list context menu -->
<div class="chat-list-menu" id="chatListMenu" aria-hidden="true">
  <button class="chat-list-menu-item" id="chatListMenuPin">
    <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M235.32,81.37,174.63,20.69a16,16,0,0,0-22.63,0L98.37,74.49c-10.66-3.34-35-7.37-60.4,13.14a16,16,0,0,0-1.29,23.78L85,159.71,42.34,202.34a8,8,0,0,0,11.32,11.32L96.29,171l48.29,48.29A16,16,0,0,0,155.9,224c.38,0,.75,0,1.13,0a15.93,15.93,0,0,0,11.64-6.33c19.64-26.1,17.75-47.32,13.19-60L235.33,104A16,16,0,0,0,235.32,81.37ZM224,92.69h0l-57.27,57.46a8,8,0,0,0-1.49,9.22c9.46,18.93-1.8,38.59-9.34,48.62L48,100.08c12.08-9.74,23.64-12.31,32.48-12.31A40.13,40.13,0,0,1,96.81,91a8,8,0,0,0,9.25-1.51L163.32,32,224,92.68Z"></path>
    </svg>
    <span class="chat-list-menu-item-label">Закріпити</span>
  </button>
  <button class="chat-list-menu-item" id="chatListMenuAddToGroup">
    <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"></path>
    </svg>
    <span class="chat-list-menu-item-label">Додати до групи</span>
  </button>
  <button class="chat-list-menu-item chat-list-menu-item-danger" id="chatListMenuDelete">
    <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96ZM192,208H64V64H192V208Zm-72-88v56a8,8,0,0,1-16,0V120a8,8,0,0,1,16,0Zm48,0v56a8,8,0,0,1-16,0V120a8,8,0,0,1,16,0Z"></path>
    </svg>
    <span class="chat-list-menu-item-label">Видалити чат</span>
  </button>
</div>

<!-- Add to group modal -->
<div class="modal" id="addToGroupModal">
  <div class="modal-header">
    <h3>Додати до групи</h3>
    <button class="btn-close" id="closeAddToGroupBtn" aria-label="Закрити">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
  <div class="modal-body">
    <div class="group-modal-caption">Група</div>
    <select id="addToGroupSelect" class="group-select"></select>
  </div>
  <div class="modal-footer">
    <button class="btn btn-secondary" id="cancelAddToGroupBtn">Скасувати</button>
    <button class="btn btn-primary" id="confirmAddToGroupBtn">Додати</button>
  </div>
</div>

<!-- Fullscreen image viewer -->
<div class="image-viewer-overlay" id="imageViewerOverlay" aria-hidden="true">
  <div class="image-viewer-shell" role="dialog" aria-modal="true" aria-label="Перегляд зображення">
    <div class="image-viewer-stage" id="imageViewerStage">
      <img class="image-viewer-image" id="imageViewerImage" alt="Перегляд зображення" draggable="false" />
    </div>
    <div class="image-viewer-inline-confirm" id="imageViewerInlineConfirm" hidden>
      <div class="image-viewer-inline-confirm-text" id="imageViewerInlineConfirmText">Видалити це фото?</div>
      <div class="image-viewer-inline-confirm-actions">
        <button type="button" class="image-viewer-inline-confirm-btn image-viewer-inline-confirm-btn--ghost" id="imageViewerInlineConfirmCancelBtn">Скасувати</button>
        <button type="button" class="image-viewer-inline-confirm-btn image-viewer-inline-confirm-btn--danger" id="imageViewerInlineConfirmOkBtn">Видалити</button>
      </div>
    </div>
    <div class="image-viewer-toolbar">
      <div class="image-viewer-sender" id="imageViewerSender" hidden>
        <span class="image-viewer-sender-avatar" id="imageViewerSenderAvatar" aria-hidden="true">
          <img class="image-viewer-sender-avatar-image" id="imageViewerSenderAvatarImage" alt="" hidden />
          <span class="image-viewer-sender-initials" id="imageViewerSenderAvatarInitials">OR</span>
        </span>
        <span class="image-viewer-sender-name" id="imageViewerSenderName">Користувач</span>
      </div>
      <div class="image-viewer-actions image-viewer-actions-right">
        <button type="button" class="image-viewer-btn" id="imageViewerZoomOutBtn" aria-label="Зменшити">
          <svg width="22" height="22" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M208,128a8,8,0,0,1-8,8H56a8,8,0,0,1,0-16H200A8,8,0,0,1,208,128Z"></path>
          </svg>
        </button>
        <button type="button" class="image-viewer-btn" id="imageViewerZoomInBtn" aria-label="Збільшити">
          <svg width="22" height="22" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M208,128a8,8,0,0,1-8,8H136v64a8,8,0,0,1-16,0V136H56a8,8,0,0,1,0-16h64V56a8,8,0,0,1,16,0v64h64A8,8,0,0,1,208,128Z"></path>
          </svg>
        </button>
        <button type="button" class="image-viewer-btn" id="imageViewerForwardBtn" aria-label="Переслати">
          <svg width="22" height="22" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M237.66,106.35l-80-80A8,8,0,0,0,144,32V72.35c-25.94,2.22-54.59,14.92-78.16,34.91-28.38,24.08-46.05,55.11-49.76,87.37a12,12,0,0,0,20.68,9.58h0c11-11.71,50.14-48.74,107.24-52V192a8,8,0,0,0,13.66,5.65l80-80A8,8,0,0,0,237.66,106.35ZM160,172.69V144a8,8,0,0,0-8-8c-28.08,0-55.43,7.33-81.29,21.8a196.17,196.17,0,0,0-36.57,26.52c5.8-23.84,20.42-46.51,42.05-64.86C99.41,99.77,127.75,88,152,88a8,8,0,0,0,8-8V51.32L220.69,112Z"></path>
          </svg>
        </button>
        <button type="button" class="image-viewer-btn" id="imageViewerDeleteBtn" aria-label="Видалити">
          <svg width="22" height="22" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192Z"></path>
          </svg>
        </button>
      </div>
    </div>
  </div>
</div>
`;

  appContainer.innerHTML = htmlContent + extraUi;
}
