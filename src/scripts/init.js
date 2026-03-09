document.addEventListener('DOMContentLoaded', () => {
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error('App container not found');
    return;
  }

  const htmlContent = `<div class="bridge-app">
  <header class="app-header">
    <div class="app-header-left">
      <div class="chat-brand">
        <img class="app-logo" src="./src/Assets/Orion_logo.png" alt="Orion" />
        <h1 class="app-title">ORION</h1>
      </div>
      <div class="app-chat-info" id="appChatInfo">
        <button class="btn-back" id="backBtn" aria-label="Назад">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
            <path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"></path>
          </svg>
        </button>
        <div class="app-chat-avatar" id="appChatAvatar"></div>
        <div class="app-chat-meta">
          <div class="app-chat-name" id="contactName">Виберіть контакт</div>
          <div class="app-chat-status" id="contactStatus">онлайн</div>
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
          <button class="chat-menu-item" data-action="clear">Очистити чат</button>
          <button class="chat-menu-item" data-action="delete">Видалити чат</button>
          <button class="chat-menu-item" data-action="info">Інформація</button>
          <button class="chat-menu-item" data-action="group-info">Деталі групи</button>
        </div>
      </div>
    </div>
  </header>
  <div class="main-layout">
  <!-- Sidebar з контактами -->
  <aside class="sidebar">

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
        <button class="bottom-nav-item" id="navSettings" title="Магазин">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M232,96a7.89,7.89,0,0,0-.3-2.2L217.35,43.6A16.07,16.07,0,0,0,202,32H54A16.07,16.07,0,0,0,38.65,43.6L24.31,93.8A7.89,7.89,0,0,0,24,96h0v16a40,40,0,0,0,16,32v72a8,8,0,0,0,8,8H208a8,8,0,0,0,8-8V144a40,40,0,0,0,16-32V96ZM54,48H202l11.42,40H42.61Zm50,56h48v8a24,24,0,0,1-48,0Zm-16,0v8a24,24,0,0,1-35.12,21.26,7.88,7.88,0,0,0-1.82-1.06A24,24,0,0,1,40,112v-8ZM200,208H56V151.2a40.57,40.57,0,0,0,8,.8,40,40,0,0,0,32-16,40,40,0,0,0,64,0,40,40,0,0,0,32,16,40.57,40.57,0,0,0,8-.8Zm4.93-75.8a8.08,8.08,0,0,0-1.8,1.05A24,24,0,0,1,168,112v-8h48v8A24,24,0,0,1,204.93,132.2Z"></path></svg>
          <span>Магазин</span>
        </button>
        <button class="bottom-nav-item active" id="navChats" title="Чати">
          <svg width="24" height="24" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M232.07,186.76a80,80,0,0,0-62.5-114.17A80,80,0,1,0,23.93,138.76l-7.27,24.71a16,16,0,0,0,19.87,19.87l24.71-7.27a80.39,80.39,0,0,0,25.18,7.35,80,80,0,0,0,108.34,40.65l24.71,7.27a16,16,0,0,0,19.87-19.86ZM62,159.5a8.28,8.28,0,0,0-2.26.32L32,168l8.17-27.76a8,8,0,0,0-.63-6,64,64,0,1,1,26.26,26.26A8,8,0,0,0,62,159.5Zm153.79,28.73L224,216l-27.76-8.17a8,8,0,0,0-6,.63,64.05,64.05,0,0,1-85.87-24.88A79.93,79.93,0,0,0,174.7,89.71a64,64,0,0,1,41.75,92.48A8,8,0,0,0,215.82,188.23Z" stroke="currentColor" stroke-width="2" fill="currentColor"/>
          </svg>
          <span>Чати</span>
        </button>
        <button class="bottom-nav-item" id="navGames" title="Гра">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M207.58,63.84C186.85,53.48,159.33,48,128,48S69.15,53.48,48.42,63.84,16,88.78,16,104v48c0,15.22,11.82,29.85,32.42,40.16S96.67,208,128,208s58.85-5.48,79.58-15.84S240,167.22,240,152V104C240,88.78,228.18,74.15,207.58,63.84ZM128,64c62.64,0,96,23.23,96,40s-33.36,40-96,40-96-23.23-96-40S65.36,64,128,64Zm-8,95.86v32c-19-.62-35-3.42-48-7.49V153.05A203.43,203.43,0,0,0,120,159.86Zm16,0a203.43,203.43,0,0,0,48-6.81v31.31c-13,4.07-29,6.87-48,7.49ZM32,152V133.53a82.88,82.88,0,0,0,16.42,10.63c2.43,1.21,5,2.35,7.58,3.43V178C40.17,170.16,32,160.29,32,152Zm168,26V147.59c2.61-1.08,5.15-2.22,7.58-3.43A82.88,82.88,0,0,0,224,133.53V152C224,160.29,215.83,170.16,200,178Z"></path></svg>
          <span>Гра</span>
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
          <button class="btn-back" id="chatBackBtn" aria-label="Назад">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
              <path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"></path>
            </svg>
          </button>
          <div class="app-chat-info" id="chatModalInfo">
            <div class="app-chat-avatar" id="chatModalAvatar"></div>
            <div class="app-chat-meta">
              <div class="app-chat-name" id="chatModalName">Виберіть контакт</div>
              <div class="app-chat-status" id="chatModalStatus"></div>
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
              <button class="chat-menu-item" data-action="clear">Очистити чат</button>
              <button class="chat-menu-item" data-action="delete">Видалити чат</button>
              <button class="chat-menu-item" data-action="info">Інформація</button>
              <button class="chat-menu-item" data-action="group-info">Деталі групи</button>
            </div>
          </div>
        </div>
      </div>
      <!-- Область повідомлень -->
      <div class="messages-container" id="messagesContainer">
        <!-- Повідомлення будуть додаватися динамічно -->
      </div>

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
              <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm48-88a8,8,0,0,1-8,8H136v32a8,8,0,0,1-16,0V136H88a8,8,0,0,1,0-16h32V88a8,8,0,0,1,16,0v32h32A8,8,0,0,1,176,128Z"></path>
            </svg>
          </button>
          <input type="file" id="galleryPickerInput" accept="image/*" hidden />
          <input type="file" id="cameraPickerInput" accept="image/*" capture="environment" hidden />
          <input type="file" id="filePickerInput" accept="image/*" hidden />
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
          <button type="button" class="btn-emoji">😊</button>
          <button type="button" class="btn-send" id="sendBtn">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
              <path d="M237.9,200.1,141.85,32.18a16,16,0,0,0-27.89,0l-95.89,168a16,16,0,0,0,19.26,22.92L128,192.45l90.67,30.63A16.22,16.22,0,0,0,224,224a16,16,0,0,0,13.86-23.9Zm-14.05,7.84L136,178.26V120a8,8,0,0,0-16,0v58.26L32.16,207.94,32,208,127.86,40,224,208Z"></path>
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
          <p>Додайте контакт або зберіть групу в окремий діалог за кілька секунд.</p>
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
            placeholder="Ім'я контакту або назва групи"
            autocomplete="off"
          >
        </label>
        <label class="group-toggle new-chat-mode">
          <input type="checkbox" id="isGroupToggle" />
          <span class="new-chat-mode-copy">
            <strong>Створити групу</strong>
            <small>Увімкніть, якщо це чат на кілька учасників.</small>
          </span>
        </label>
      </div>
      <div class="group-fields" id="groupFields">
        <label class="new-chat-field">
          <span class="new-chat-field-label">Учасники</span>
          <input
            type="text"
            id="groupMembersInput"
            class="contact-input"
            placeholder="Наприклад: Анна, Ігор, Марта"
            autocomplete="off"
          >
        </label>
        <p class="new-chat-note">Вкажіть учасників через кому. Після створення чат відкриється автоматично.</p>
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
        <h3 id="alertTitle">Помилка</h3>
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
    <h3>Деталі групи</h3>
    <button class="btn-close" id="closeGroupInfoBtn" aria-label="Закрити">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
  <div class="modal-body">
    <div class="group-info-header">
      <div class="group-avatar" id="groupInfoAvatar"></div>
      <div class="group-info-main">
        <div class="group-info-name" id="groupInfoName"></div>
        <div class="group-info-count" id="groupInfoCount"></div>
      </div>
    </div>
    <div class="group-info-section">
      <label class="group-info-label" for="groupInfoDescription">Опис</label>
      <textarea id="groupInfoDescription" class="group-info-textarea" rows="3" placeholder="Додайте опис групи..."></textarea>
    </div>
    <div class="group-info-section">
      <div class="group-info-label">Учасники</div>
      <ul class="group-info-members" id="groupInfoMembers"></ul>
    </div>
  </div>
  <div class="modal-footer">
    <button class="btn btn-secondary" id="closeGroupInfoBtn2">Закрити</button>
    <button class="btn btn-primary" id="saveGroupInfoBtn">Зберегти</button>
  </div>
</div>

<!-- Message context menu -->
<div class="message-menu-backdrop" id="messageMenuBackdrop" aria-hidden="true"></div>
<div class="message-menu" id="messageMenu" aria-hidden="true">
  <div class="message-menu-date" id="messageMenuDate"></div>
  <button class="message-menu-item" id="messageMenuReply">
    <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M224,128a8,8,0,0,1-8,8H91.31l34.35,34.34a8,8,0,0,1-11.32,11.32l-48-48a8,8,0,0,1,0-11.32l48-48a8,8,0,0,1,11.32,11.32L91.31,120H216A8,8,0,0,1,224,128Z"></path>
    </svg>
    <span>Відповісти</span>
  </button>
  <button class="message-menu-item" id="messageMenuEdit">
    <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M227.31,73.37,182.63,28.69a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96A16,16,0,0,0,227.31,73.37ZM92.69,208H48V163.31L136,75.31,180.69,120Z"></path>
    </svg>
    <span>Редагувати</span>
  </button>
  <button class="message-menu-item" id="messageMenuDelete">
    <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16Z"></path>
    </svg>
    <span>Видалити</span>
  </button>
  <button class="message-menu-item" id="messageMenuCopy">
    <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M216,40H120A16,16,0,0,0,104,56V80H80A16,16,0,0,0,64,96V216a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V192h24a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Z"></path>
    </svg>
    <span>Копіювати</span>
  </button>
</div>`;

  const extraUi = `
<!-- Chat list context menu -->
<div class="chat-list-menu" id="chatListMenu" aria-hidden="true">
  <button class="chat-list-menu-item" id="chatListMenuPin">Закріпити</button>
  <button class="chat-list-menu-item" id="chatListMenuDelete">Видалити чат</button>
  <button class="chat-list-menu-item" id="chatListMenuAddToGroup">Додати до групи</button>
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
    <label class="group-info-label" for="addToGroupSelect">Група</label>
    <select id="addToGroupSelect" class="group-select"></select>
  </div>
  <div class="modal-footer">
    <button class="btn btn-secondary" id="cancelAddToGroupBtn">Скасувати</button>
    <button class="btn btn-primary" id="confirmAddToGroupBtn">Додати</button>
  </div>
</div>
`;

  appContainer.innerHTML = htmlContent + extraUi;
});
