// Шаблони налаштувань для Orion

const orionValueAssetUrl = new URL('../assets/Orion_value.png', import.meta.url).href;

export const settingsTemplates = {
  'profile': `
<div class="settings-section profile-page" id="profile">
  <div class="settings-content profile-content">
    <section class="profile-hero-card">
      <div class="profile-hero">
        <div class="profile-avatar-wrap">
          <div class="profile-avatar-glow" aria-hidden="true"></div>
          <div class="profile-avatar-large" aria-hidden="true">
            <img class="profile-avatar-image" alt="Фото профілю" />
            <span class="profile-avatar-initials">KO</span>
          </div>
        </div>

        <div class="profile-name-row">
          <h2 class="profile-name" id="profileDisplayName">Користувач Orion</h2>
          <span class="profile-name-badges" id="profileNameBadges" aria-hidden="true"></span>
        </div>
        <div class="profile-handle-row">
          <p class="profile-handle">@orion.user</p>
          <button class="profile-edit-inline" aria-label="Редагувати профіль">
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <p class="profile-bio" id="profileDisplayBio">Вітаю!</p>

        <div class="profile-meta-grid">
          <div class="profile-meta-card">
            <span class="profile-meta-label">Пошта</span>
            <span class="profile-meta-value" id="profileDisplayEmail">user@example.com</span>
          </div>
          <div class="profile-meta-card">
            <span class="profile-meta-label">
              Дата народження
              <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
                <path d="M128,16a88.1,88.1,0,0,0-88,88c0,23.43,9.4,49.42,25.13,69.5,12.08,15.41,26.5,26,41.91,31.09L96.65,228.85A8,8,0,0,0,104,240h48a8,8,0,0,0,7.35-11.15L149,204.59c15.4-5.07,29.83-15.68,41.91-31.09C206.6,153.42,216,127.43,216,104A88.1,88.1,0,0,0,128,16Zm11.87,208H116.13l6.94-16.19c1.64.12,3.28.19,4.93.19s3.29-.07,4.93-.19Zm38.4-60.37C163.94,181.93,146.09,192,128,192s-35.94-10.07-50.27-28.37C64.12,146.27,56,124,56,104a72,72,0,0,1,144,0C200,124,191.88,146.27,178.27,163.63Zm-1-59.74A8.52,8.52,0,0,1,176,104a8,8,0,0,1-7.88-6.68,41.29,41.29,0,0,0-33.43-33.43,8,8,0,1,1,2.64-15.78,57.5,57.5,0,0,1,46.57,46.57A8,8,0,0,1,177.32,103.89Z"></path>
              </svg>
            </span>
            <span class="profile-meta-value" id="profileDisplayDob">Не вказано</span>
          </div>
        </div>

        <div class="profile-hero-actions">
          <button class="btn btn-primary profile-edit-btn">Редагувати профіль</button>
          <button class="profile-icon-btn" aria-label="QR код">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zM13 3h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zM15 13h2v2h-2v-2zm4 0h2v6h-2v-6zm-4 4h6v2h-6v-2z" fill="currentColor"/>
            </svg>
            <span>QR</span>
          </button>
          <button class="profile-icon-btn" aria-label="Поділитися профілем">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 5l-8 7 8 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Поділитися</span>
          </button>
        </div>

        <div class="profile-userid">ID користувача: <span class="profile-id">OR-91A7-4F2C</span></div>
      </div>
    </section>

    <div class="profile-settings-card profile-settings-menu-card">
      <div class="profile-section-heading">
        <span class="profile-settings-kicker">Параметри</span>
      </div>
      <div class="settings-menu-list">
        <div class="settings-menu-item" data-section="notifications">
          <div class="settings-menu-icon settings-icon-notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="settings-menu-label">
            <span>Сповіщення</span>
            <p class="settings-item-desc">Звуки, вібрація, попередній перегляд</p>
          </div>
          <span class="settings-menu-arrow">›</span>
        </div>

        <div class="settings-menu-item" data-section="privacy">
          <div class="settings-menu-icon settings-icon-privacy">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="5" y="11" width="14" height="10" rx="2" stroke="white" stroke-width="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="settings-menu-label">
            <span>Конфіденційність</span>
            <p class="settings-item-desc">Статус онлайн, індикатор набору</p>
          </div>
          <span class="settings-menu-arrow">›</span>
        </div>

        <div class="settings-menu-item" data-section="messages">
          <div class="settings-menu-icon settings-icon-messages">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="settings-menu-label">
            <span>Повідомлення</span>
            <p class="settings-item-desc">Відправка, автовідтворення медіа</p>
          </div>
          <span class="settings-menu-arrow">›</span>
        </div>

        <div class="settings-menu-item" data-section="appearance">
          <div class="settings-menu-icon settings-icon-appearance">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="white" stroke-width="2"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="settings-menu-label">
            <span>Інтерфейс</span>
            <p class="settings-item-desc">Розмір шрифту, тема, анімації</p>
          </div>
          <span class="settings-menu-arrow">›</span>
        </div>

        <div class="settings-menu-item" data-section="language">
          <div class="settings-menu-icon settings-icon-language">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="white" stroke-width="2"/>
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="settings-menu-label">
            <span>Мова</span>
            <p class="settings-item-desc">Українська</p>
          </div>
          <span class="settings-menu-arrow">›</span>
        </div>
      </div>
    </div>
  </div>
</div>
  `.trim(),

  'profile-settings': `
<div class="settings-section" id="profile-settings">
  <div class="settings-header">
    <h2>Налаштування профілю</h2>
  </div>

  <div class="settings-content profile-settings-content">
    <div class="profile-settings-card profile-settings-hero-card">
      <div class="profile-avatar-section">
        <div class="profile-avatar-large">
          <img class="profile-avatar-image" alt="Фото профілю" />
          <span class="profile-avatar-initials">KO</span>
        </div>
        <div class="profile-avatar-actions">
          <span class="profile-settings-kicker">Фото профілю</span>
          <p class="profile-settings-note">Оновіть аватар або виберіть новий градієнт для швидкої візуальної зміни.</p>
          <label class="profile-upload-btn">
            <input type="file" id="profileAvatarUpload" accept="image/*" />
            Змінити фото профілю
          </label>
          <button class="btn btn-secondary btn-change-avatar">Випадковий градієнт</button>
        </div>
      </div>
    </div>

    <div class="profile-settings-card profile-settings-form-card">
      <div class="profile-form-grid">
        <div class="form-group">
          <label for="profileName">Ім'я:</label>
          <input
            type="text"
            id="profileName"
            class="form-input"
            placeholder="Введіть ваше ім'я"
            value="Користувач Orion"
          />
        </div>

        <div class="form-group">
          <label for="profileEmail">Email:</label>
          <input
            type="email"
            id="profileEmail"
            class="form-input"
            placeholder="example@email.com"
            value="user@example.com"
          />
        </div>

        <div class="form-group">
          <label for="profileDob">Дата народження:</label>
          <input
            type="date"
            id="profileDob"
            class="form-input"
          />
        </div>

        <div class="form-group profile-form-full">
          <label for="profileBio">Опис:</label>
          <textarea
            id="profileBio"
            class="form-textarea"
            placeholder="Коротко про себе"
            rows="4"
          >Вітаю!</textarea>
        </div>
      </div>

      <div class="settings-buttons">
        <button class="btn btn-primary btn-save-profile">Зберегти зміни</button>
        <button class="btn btn-secondary">Скасувати</button>
      </div>
    </div>
  </div>
</div>
  `.trim(),

  'messenger-settings': `
<div class="settings-section" id="messenger-settings">
  <div class="shop-header">
    <h2>
      <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
        <path d="M232,96a7.89,7.89,0,0,0-.3-2.2L217.35,43.6A16.07,16.07,0,0,0,202,32H54A16.07,16.07,0,0,0,38.65,43.6L24.31,93.8A7.89,7.89,0,0,0,24,96h0v16a40,40,0,0,0,16,32v72a8,8,0,0,0,8,8H208a8,8,0,0,0,8-8V144a40,40,0,0,0,16-32V96ZM54,48H202l11.42,40H42.61Zm50,56h48v8a24,24,0,0,1-48,0Zm-16,0v8a24,24,0,0,1-35.12,21.26,7.88,7.88,0,0,0-1.82-1.06A24,24,0,0,1,40,112v-8ZM200,208H56V151.2a40.57,40.57,0,0,0,8,.8,40,40,0,0,0,32-16,40,40,0,0,0,64,0,40,40,0,0,0,32,16,40.57,40.57,0,0,0,8-.8Zm4.93-75.8a8.08,8.08,0,0,0-1.8,1.05A24,24,0,0,1,168,112v-8h48v8A24,24,0,0,1,204.93,132.2Z"></path>
      </svg>
      <span>Магазин</span>
    </h2>
  </div>

  <div class="shop-balance-island" aria-label="Баланс користувача">
    <span class="shop-balance-island-label">Баланс</span>
    <strong class="shop-balance-island-value" id="shopIslandBalance">0,00</strong>
  </div>

  <div class="shop-content">
    <div class="shop-balance-card">
      <span class="shop-kicker">ORION VALUE</span>
      <div class="shop-balance-meta">
        <div>
          <div class="shop-balance-label">Доступний баланс</div>
          <div class="shop-balance-value" id="shopBalanceValue">00000000,00</div>
        </div>
      </div>
      <p class="shop-balance-note">Прокачуйте профіль предметами, які купуються лише за монети.</p>
    </div>

    <div class="shop-filter-toolbar">
      <button type="button" class="shop-filter-trigger" id="shopFilterToggle" aria-expanded="false">
        <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
          <path d="M64,105V40a8,8,0,0,0-16,0v65a32,32,0,0,0,0,62v49a8,8,0,0,0,16,0V167a32,32,0,0,0,0-62Zm-8,47a16,16,0,1,1,16-16A16,16,0,0,1,56,152Zm80-95V40a8,8,0,0,0-16,0V57a32,32,0,0,0,0,62v97a8,8,0,0,0,16,0V119a32,32,0,0,0,0-62Zm-8,47a16,16,0,1,1,16-16A16,16,0,0,1,128,104Zm104,64a32.06,32.06,0,0,0-24-31V40a8,8,0,0,0-16,0v97a32,32,0,0,0,0,62v17a8,8,0,0,0,16,0V199A32.06,32.06,0,0,0,232,168Zm-32,16a16,16,0,1,1,16-16A16,16,0,0,1,200,184Z"></path>
        </svg>
        <span>Фільтр</span>
      </button>
      <div class="shop-filter-summary" id="shopFilterSummary">Усі товари</div>
    </div>

    <div class="shop-filter-panel" id="shopFilterPanel" aria-label="Розширений фільтр товарів">
      <div class="shop-filter-panel-scroll">
        <div class="shop-filter-panel-head">
          <span class="shop-filter-panel-title">Параметри фільтра</span>
          <button type="button" class="shop-filter-close" id="shopFilterClose" aria-label="Закрити фільтр">
            <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
              <path d="M213.66,165.66a8,8,0,0,1-11.32,0L128,91.31,53.66,165.66a8,8,0,0,1-11.32-11.32l80-80a8,8,0,0,1,11.32,0l80,80A8,8,0,0,1,213.66,165.66Z"></path>
            </svg>
          </button>
        </div>

        <div class="shop-filter-section">
          <span class="shop-filter-section-title">Категорія</span>
          <div class="shop-filter-options">
            <button type="button" class="shop-filter-btn active" data-shop-filter-group="category" data-shop-filter-value="all">Усе</button>
            <button type="button" class="shop-filter-btn" data-shop-filter-group="category" data-shop-filter-value="frame">Аватар</button>
            <button type="button" class="shop-filter-btn" data-shop-filter-group="category" data-shop-filter-value="aura">Фон</button>
            <button type="button" class="shop-filter-btn" data-shop-filter-group="category" data-shop-filter-value="motion">Анімація</button>
            <button type="button" class="shop-filter-btn" data-shop-filter-group="category" data-shop-filter-value="badge">Значки</button>
          </div>
        </div>

        <div class="shop-filter-section">
          <span class="shop-filter-section-title">Власність</span>
          <div class="shop-filter-options">
            <button type="button" class="shop-filter-btn active" data-shop-filter-group="ownership" data-shop-filter-value="all">Усе</button>
            <button type="button" class="shop-filter-btn" data-shop-filter-group="ownership" data-shop-filter-value="owned">Куплені</button>
            <button type="button" class="shop-filter-btn" data-shop-filter-group="ownership" data-shop-filter-value="unowned">Не куплені</button>
          </div>
        </div>

        <div class="shop-filter-section">
          <span class="shop-filter-section-title">Стан</span>
          <div class="shop-filter-options">
            <button type="button" class="shop-filter-btn active" data-shop-filter-group="availability" data-shop-filter-value="all">Будь-який</button>
            <button type="button" class="shop-filter-btn" data-shop-filter-group="availability" data-shop-filter-value="equipped">Встановлені</button>
            <button type="button" class="shop-filter-btn" data-shop-filter-group="availability" data-shop-filter-value="can-buy">Можна купити</button>
          </div>
        </div>

        <div class="shop-filter-section">
          <span class="shop-filter-section-title">Ціна</span>
          <div class="shop-price-range">
            <div class="shop-price-row">
              <span>Від</span>
              <strong id="shopPriceMinValue">00000000,00</strong>
            </div>
            <input type="range" id="shopPriceMin" min="0" max="0" step="1" value="0" />
            <div class="shop-price-row">
              <span>До</span>
              <strong id="shopPriceMaxValue">00000000,00</strong>
            </div>
            <input type="range" id="shopPriceMax" min="0" max="0" step="1" value="0" />
          </div>
        </div>

        <div class="shop-filter-section">
          <span class="shop-filter-section-title">Сортування</span>
          <div class="shop-filter-options">
            <button type="button" class="shop-filter-btn active" data-shop-filter-group="sort" data-shop-filter-value="default">За замовчуванням</button>
            <button type="button" class="shop-filter-btn" data-shop-filter-group="sort" data-shop-filter-value="price-asc">Спочатку дешеві</button>
            <button type="button" class="shop-filter-btn" data-shop-filter-group="sort" data-shop-filter-value="price-desc">Спочатку дорогі</button>
          </div>
        </div>

        <div class="shop-filter-actions">
          <button type="button" class="shop-filter-reset" id="shopFilterReset">Скинути</button>
          <button type="button" class="shop-filter-apply" id="shopFilterApply">Застосувати</button>
        </div>
      </div>
    </div>

    <div class="shop-grid" id="shopGrid"></div>
  </div>
</div>
  `.trim(),

  'notifications-settings': `
<div class="settings-section" id="notifications-settings">
  <div class="settings-header">
    <button class="btn-back-subsection">‹</button>
    <h2>Сповіщення</h2>
  </div>

  <div class="settings-content">
    <div class="settings-group">
      <div class="settings-item">
        <div class="settings-item-label">
          <span>Звукові сповіщення</span>
          <p class="settings-item-desc">Відтворювати звук при новому повідомленні</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="soundNotifications" checked />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Десктоп сповіщення</span>
          <p class="settings-item-desc">Показувати сповіщення на робочому столі</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="desktopNotifications" checked />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Вібрація</span>
          <p class="settings-item-desc">Вібрувати при отриманні повідомлення</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="vibrationEnabled" checked />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Попередній перегляд</span>
          <p class="settings-item-desc">Показувати текст повідомлення в сповіщенні</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="messagePreview" checked />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <div class="settings-buttons">
      <button class="btn btn-primary btn-save-messenger">Зберегти налаштування</button>
      <button class="btn btn-secondary">Скасувати</button>
    </div>
  </div>
</div>
  `.trim(),

  'privacy-settings': `
<div class="settings-section" id="privacy-settings">
  <div class="settings-header">
    <button class="btn-back-subsection">‹</button>
    <h2>Конфіденційність</h2>
  </div>

  <div class="settings-content">
    <div class="settings-group">
      <div class="settings-item">
        <div class="settings-item-label">
          <span>Показувати статус онлайн</span>
          <p class="settings-item-desc">Дозволити іншим бачити, коли ви онлайн</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="showOnlineStatus" checked />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Показувати індикатор набору</span>
          <p class="settings-item-desc">Показувати, коли ви набираєте повідомлення</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="showTypingIndicator" checked />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Підтвердження прочитання</span>
          <p class="settings-item-desc">Відправляти підтвердження прочитання повідомлень</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="readReceipts" checked />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Останній раз в мережі</span>
          <p class="settings-item-desc">Показувати час останнього входу</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="lastSeen" checked />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Двофакторна автентифікація (2FA)</span>
          <p class="settings-item-desc">Додатковий захист для входу в акаунт</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="twoFactorAuth" checked />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Видимість профілю</span>
          <p class="settings-item-desc">Хто може бачити ваш профіль</p>
        </div>
        <button class="settings-item-action">Друзі</button>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Заблоковані користувачі</span>
          <p class="settings-item-desc">Керування списком блокувань</p>
        </div>
        <button class="settings-item-action">Керувати</button>
      </div>
    </div>

    <div class="settings-buttons">
      <button class="btn btn-primary btn-save-messenger">Зберегти налаштування</button>
      <button class="btn btn-secondary">Скасувати</button>
    </div>
  </div>
</div>
  `.trim(),

  'messages-settings': `
<div class="settings-section" id="messages-settings">
  <div class="settings-header">
    <button class="btn-back-subsection">‹</button>
    <h2>Повідомлення</h2>
  </div>

  <div class="settings-content">
    <div class="settings-group">
      <div class="settings-item">
        <div class="settings-item-label">
          <span>Enter для відправки</span>
          <p class="settings-item-desc">Натискання Enter відправляє повідомлення</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="enterToSend" checked />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Автовідтворення медіа</span>
          <p class="settings-item-desc">Автоматично відтворювати відео та GIF</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="autoPlayMedia" checked />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Автозбереження медіа</span>
          <p class="settings-item-desc">Автоматично зберігати отримані фото та відео</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="autoSaveMedia" />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <div class="settings-buttons">
      <button class="btn btn-primary btn-save-messenger">Зберегти налаштування</button>
      <button class="btn btn-secondary">Скасувати</button>
    </div>
  </div>
</div>
  `.trim(),

  'appearance-settings': `
<div class="settings-section" id="appearance-settings">
  <div class="settings-header">
    <button class="btn-back-subsection">‹</button>
    <h2>Інтерфейс</h2>
  </div>

  <div class="settings-content">
    <div class="settings-group">
      <div class="settings-item settings-item-column">
        <div class="settings-item-label">
          <span>Розмір шрифту</span>
          <p class="settings-item-desc">Виберіть зручний розмір шрифту</p>
        </div>
        <div class="font-size-slider-container">
          <div class="font-size-labels">
            <span class="font-label">A</span>
            <span class="font-label-large">A</span>
          </div>
          <div class="font-size-slider-wrapper">
            <input type="range" id="fontSizeSlider" class="font-size-slider" min="12" max="20" value="15" step="1" />
          </div>
          <div class="font-size-value">
            <span id="fontSizeDisplay">Середній</span>
          </div>
        </div>
        <div class="font-preview" id="fontPreview">
          <div class="preview-message">
            <div class="preview-bubble">
              <p>Це приклад повідомлення</p>
              <span class="preview-time">12:34</span>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Тема оформлення</span>
          <p class="settings-item-desc">Вибір між світлою та темною темою</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="themeToggleCheckbox" />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Анімації</span>
          <p class="settings-item-desc">Увімкнути анімації інтерфейсу</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="animationsEnabled" checked />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Компактний режим</span>
          <p class="settings-item-desc">Зменшити відступи між елементами</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="compactMode" />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <div class="settings-buttons">
      <button class="btn btn-primary btn-save-messenger">Зберегти налаштування</button>
      <button class="btn btn-secondary">Скасувати</button>
    </div>
  </div>
</div>
  `.trim(),

  'mini-games': `
<div class="settings-section" id="mini-games">
  <div class="settings-content mini-games-content coin-tapper-content">
    <span class="coin-tapper-kicker">ORION VALUE</span>
    <div class="coin-tapper-balance-label">Загальний баланс</div>
    <div class="coin-tapper-balance" id="coinTapBalance">00000000,00</div>

    <button class="coin-tapper-button" id="coinTapBtn" type="button" aria-label="Заробити монети">
      <img class="coin-tapper-image" src="${orionValueAssetUrl}" alt="Orion Value" />
    </button>

    <div class="coin-tapper-rate">
      <span>1 тап</span>
      <strong>=</strong>
      <span>0,01 монетка</span>
    </div>
  </div>
</div>
  `.trim(),

  'language-settings': `
<div class="settings-section" id="language-settings">
  <div class="settings-header">
    <button class="btn-back-subsection">‹</button>
    <h2>Мова</h2>
  </div>

  <div class="settings-content">
    <div class="settings-group">
      <div class="settings-item">
        <div class="settings-item-label">
          <span>Мова інтерфейсу</span>
          <p class="settings-item-desc">Виберіть мову інтерфейсу додатку</p>
        </div>
        <select class="form-select" id="language">
          <option value="uk" selected>Українська</option>
          <option value="en">English</option>
        </select>
      </div>
    </div>

    <div class="settings-buttons">
      <button class="btn btn-primary btn-save-messenger">Зберегти налаштування</button>
      <button class="btn btn-secondary">Скасувати</button>
    </div>
  </div>
</div>
  `.trim(),

  'calls': `
<div class="settings-section" id="calls">
  <div class="calls-header">
    <h2>
      <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
        <path d="M222.37,158.46l-47.11-21.11-.13-.06a16,16,0,0,0-15.17,1.4,8.12,8.12,0,0,0-.75.56L134.87,160c-15.42-7.49-31.34-23.29-38.83-38.51l20.78-24.71c.2-.25.39-.5.57-.77a16,16,0,0,0,1.32-15.06l0-.12L97.54,33.64a16,16,0,0,0-16.62-9.52A56.26,56.26,0,0,0,32,80c0,79.4,64.6,144,144,144a56.26,56.26,0,0,0,55.88-48.92A16,16,0,0,0,222.37,158.46ZM176,208A128.14,128.14,0,0,1,48,80,40.2,40.2,0,0,1,82.87,40a.61.61,0,0,0,0,.12l21,47L83.2,111.86a6.13,6.13,0,0,0-.57.77,16,16,0,0,0-1,15.7c9.06,18.53,27.73,37.06,46.46,46.11a16,16,0,0,0,15.75-1.14,8.44,8.44,0,0,0,.74-.56L168.89,152l47,21.05h0s.08,0,.11,0A40.21,40.21,0,0,1,176,208Z"></path>
      </svg>
      <span>Дзвінки</span>
    </h2>
  </div>

  <div class="calls-content">
    <div class="empty-state">
      <svg width="64" height="64" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M222.37,158.46l-47.11-21.11-.13-.06a16,16,0,0,0-15.17,1.4,8.12,8.12,0,0,0-.75.56L134.87,160c-15.42-7.49-31.34-23.29-38.83-38.51l20.78-24.71c.2-.25.39-.5.57-.77a16,16,0,0,0,1.32-15.06l0-.12L97.54,33.64a16,16,0,0,0-16.62-9.52A56.26,56.26,0,0,0,32,80c0,79.4,64.6,144,144,144a56.26,56.26,0,0,0,55.88-48.92A16,16,0,0,0,222.37,158.46ZM176,208A128.14,128.14,0,0,1,48,80,40.2,40.2,0,0,1,82.87,40a.61.61,0,0,0,0,.12l21,47L83.2,111.86a6.13,6.13,0,0,0-.57.77,16,16,0,0,0-1,15.7c9.06,18.53,27.73,37.06,46.46,46.11a16,16,0,0,0,15.75-1.14,8.44,8.44,0,0,0,.74-.56L168.89,152l47,21.05h0s.08,0,.11,0A40.21,40.21,0,0,1,176,208Z" fill="currentColor"/>
      </svg>
      <h3>Немає дзвінків</h3>
      <p>Поки що історія дзвінків порожня. Зробіть перший дзвінок контакту!</p>
    </div>
  </div>
</div>
  `.trim()
};

export function getSettingsTemplate(sectionName) {
  return settingsTemplates[sectionName] || '';
}
