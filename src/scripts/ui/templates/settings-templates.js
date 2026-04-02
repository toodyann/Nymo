// Шаблони налаштувань для Orion

const orionValueAssetUrl = new URL('../../../Assets/Orion_value.png', import.meta.url).href;
const flappyOrionSpriteAssetUrl = new URL('../../../Assets/Flappy-Orion-Sprite.png', import.meta.url).href;
const orionDriveCarAssetUrl = new URL('../../../Assets/OrionDrive/Сar-kit/Models/GLB format/race.glb', import.meta.url).href;
const orionDriveConeAssetUrl = new URL('../../../Assets/OrionDrive/Сar-kit/Models/GLB format/cone.glb', import.meta.url).href;
const orionDriveBoxAssetUrl = new URL('../../../Assets/OrionDrive/Сar-kit/Models/GLB format/box.glb', import.meta.url).href;

export const settingsTemplates = {
  'profile': `
<div class="settings-section profile-page" id="profile">
  <div class="settings-content profile-content">
    <section class="profile-hero-card">
      <button class="profile-edit-inline" aria-label="Редагувати профіль">
        <svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z"></path>
        </svg>
      </button>

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
          <p class="profile-handle" id="profileDisplayHandle">@orion.user</p>
          <span class="profile-status-pill" id="profileDisplayStatus" data-status="online" aria-label="Онлайн"></span>
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
          <button class="profile-action-btn" id="profileMyItemsBtn" aria-label="Мої предмети">
            <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
              <path d="M223.68,66.15,135.68,18a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM128,32l80.34,44-29.77,16.3-80.35-44ZM128,120,47.66,76l33.9-18.56,80.34,44ZM40,90l80,43.78v85.79L40,175.82Zm176,85.78h0l-80,43.79V133.82l32-17.51V152a8,8,0,0,0,16,0V107.55L216,90v85.77Z"></path>
            </svg>
            <span>Мої предмети</span>
          </button>
          <button class="profile-action-btn" aria-label="QR код">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zM13 3h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zM15 13h2v2h-2v-2zm4 0h2v6h-2v-6zm-4 4h6v2h-6v-2z" fill="currentColor"/>
            </svg>
            <span>QR</span>
          </button>
        </div>

      </div>
    </section>

    <section class="profile-summary-grid" aria-label="Статистика профілю">
      <article class="profile-summary-card">
        <span class="profile-summary-kicker">Чати</span>
        <h3 id="profileStatChats">0</h3>
        <p>Загальна кількість активних діалогів у вашому акаунті.</p>
      </article>
      <article class="profile-summary-card">
        <span class="profile-summary-kicker">Повідомлення</span>
        <h3 id="profileStatMessages">0</h3>
        <p>Усі повідомлення в особистих і групових розмовах.</p>
      </article>
      <article class="profile-summary-card">
        <span class="profile-summary-kicker">Заповнення</span>
        <h3 id="profileStatCompletion">0%</h3>
        <p>Рівень заповнення профілю для кращої персоналізації.</p>
      </article>
      <article class="profile-summary-card">
        <span class="profile-summary-kicker">У Orion з</span>
        <h3 id="profileStatMemberSince">цього місяця</h3>
        <p>Дата першого входу та початку використання платформи.</p>
      </article>
    </section>

    <section class="profile-settings-card profile-settings-menu-card">
      <div class="profile-section-heading">
        <h3>Швидкі розділи</h3>
        <p>Керування основними параметрами акаунта в один клік.</p>
      </div>
      <div class="settings-menu-list">
        <button type="button" class="settings-menu-item" data-section="notifications">
          <span class="settings-menu-icon settings-icon-notifications">
            <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
              <path d="M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216ZM48,184c7.7-13.24,16-43.92,16-80a64,64,0,1,1,128,0c0,36.05,8.28,66.73,16,80Z"></path>
            </svg>
          </span>
          <span class="settings-menu-label">
            <span>Сповіщення</span>
          </span>
          <span class="settings-menu-arrow">›</span>
        </button>
        <button type="button" class="settings-menu-item" data-section="privacy">
          <span class="settings-menu-icon settings-icon-privacy">
            <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
              <path d="M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.27,47,25.53a8,8,0,0,0,4.2,0c1-.26,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40Zm0,72c0,37.07-13.66,67.16-40.6,89.42A129.3,129.3,0,0,1,128,223.62a128.25,128.25,0,0,1-38.92-21.81C61.82,179.51,48,149.3,48,112V56H208Z"></path>
            </svg>
          </span>
          <span class="settings-menu-label">
            <span>Конфіденційність</span>
          </span>
          <span class="settings-menu-arrow">›</span>
        </button>
        <button type="button" class="settings-menu-item" data-section="messages">
          <span class="settings-menu-icon settings-icon-messages">
            <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
              <path d="M216,40H40A16,16,0,0,0,24,56V192a16,16,0,0,0,16,16H82.34l23,23a8,8,0,0,0,11.32,0l23-23H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,152H136a8,8,0,0,0-5.66,2.34L111,213.66,91.66,194.34A8,8,0,0,0,86,192H40V56H216Z"></path>
            </svg>
          </span>
          <span class="settings-menu-label">
            <span>Повідомлення</span>
          </span>
          <span class="settings-menu-arrow">›</span>
        </button>
        <button type="button" class="settings-menu-item" data-section="wallet">
          <span class="settings-menu-icon settings-icon-wallet">
            <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
              <path d="M216,64H56a8,8,0,0,1,0-16H192a8,8,0,0,0,0-16H56A24,24,0,0,0,32,56V184a24,24,0,0,0,24,24H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64Zm0,128H56a8,8,0,0,1-8-8V78.63A23.84,23.84,0,0,0,56,80H216Zm-48-60a12,12,0,1,1,12,12A12,12,0,0,1,168,132Z"></path>
            </svg>
          </span>
          <span class="settings-menu-label">
            <span>Гаманець</span>
          </span>
          <span class="settings-menu-arrow">›</span>
        </button>
        <button type="button" class="settings-menu-item" data-section="appearance">
          <span class="settings-menu-icon settings-icon-appearance">
            <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
              <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM40,56H216V96H40Zm0,56H96v88H40Zm176,88H112V112H216v88Z"></path>
            </svg>
          </span>
          <span class="settings-menu-label">
            <span>Інтерфейс</span>
          </span>
          <span class="settings-menu-arrow">›</span>
        </button>
        <button type="button" class="settings-menu-item" data-section="language">
          <span class="settings-menu-icon settings-icon-language">
            <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
              <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm88,104a87.62,87.62,0,0,1-6.4,32.94l-44.7-27.49a15.92,15.92,0,0,0-6.24-2.23l-22.82-3.08a16.11,16.11,0,0,0-16,7.86h-8.72l-3.8-7.86a15.91,15.91,0,0,0-11-8.67l-8-1.73L96.14,104h16.71a16.06,16.06,0,0,0,7.73-2l12.25-6.76a16.62,16.62,0,0,0,3-2.14l26.91-24.34A15.93,15.93,0,0,0,166,49.1l-.36-.65A88.11,88.11,0,0,1,216,128ZM143.31,41.34,152,56.9,125.09,81.24,112.85,88H96.14a16,16,0,0,0-13.88,8l-8.73,15.23L63.38,84.19,74.32,58.32a87.87,87.87,0,0,1,69-17ZM40,128a87.53,87.53,0,0,1,8.54-37.8l11.34,30.27a16,16,0,0,0,11.62,10l21.43,4.61L96.74,143a16.09,16.09,0,0,0,14.4,9h1.48l-7.23,16.23a16,16,0,0,0,2.86,17.37l.14.14L128,205.94l-1.94,10A88.11,88.11,0,0,1,40,128Zm102.58,86.78,1.13-5.81a16.09,16.09,0,0,0-4-13.9,1.85,1.85,0,0,1-.14-.14L120,174.74,133.7,144l22.82,3.08,45.72,28.12A88.18,88.18,0,0,1,142.58,214.78Z"></path>
            </svg>
          </span>
          <span class="settings-menu-label">
            <span>Мова</span>
          </span>
          <span class="settings-menu-arrow">›</span>
        </button>
      </div>
    </section>
  </div>
</div>
  `.trim(),

  'profile-settings': `
<div class="settings-section" id="profile-settings">
  <div class="settings-header">
    <h2 class="profile-settings-title">Налаштування профілю</h2>
  </div>

  <div class="settings-content profile-settings-content">
    <div class="profile-settings-card profile-settings-hero-card">
      <div class="profile-settings-card-head">
        <span class="profile-settings-kicker">Профіль</span>
        <h3>Фото та персоналізація</h3>
      </div>
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
      <div class="profile-settings-card-head">
        <span class="profile-settings-kicker">Дані акаунта</span>
        <h3>Основна інформація</h3>
        <p class="profile-settings-note">Зміни застосовуються одразу після збереження та відображаються в профілі.</p>
      </div>
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

      <div class="settings-buttons profile-settings-buttons">
        <button class="btn btn-primary btn-save-profile">Зберегти зміни</button>
        <button class="btn btn-secondary btn-cancel-profile">Скасувати</button>
      </div>
    </div>
  </div>
</div>
  `.trim(),

  'profile-items': `
<div class="settings-section" id="profile-items">
  <div class="profile-items-header">
    <button type="button" class="btn-back-subsection profile-items-back-island" aria-label="Назад">
      <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
        <path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"></path>
      </svg>
    </button>
    <h2>Мої предмети</h2>
  </div>

  <div class="settings-content profile-items-content">
    <div class="profile-items-balance-card">
      <span class="profile-items-kicker">ІНВЕНТАР</span>
      <div class="profile-items-balance-row">
        <span>Баланс</span>
        <strong id="profileItemsBalance">0,00</strong>
      </div>
      <div class="profile-items-balance-row">
        <span>Куплено предметів</span>
        <strong id="profileItemsCount">0</strong>
      </div>
    </div>

    <div class="profile-items-view-toolbar" aria-label="Вигляд списку предметів">
      <button type="button" class="profile-items-view-btn is-active" data-profile-items-view="cards" aria-pressed="true" aria-label="Картки">
        <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
          <path d="M184,72H40A16,16,0,0,0,24,88V200a16,16,0,0,0,16,16H184a16,16,0,0,0,16-16V88A16,16,0,0,0,184,72Zm0,128H40V88H184V200ZM232,56V176a8,8,0,0,1-16,0V56H64a8,8,0,0,1,0-16H216A16,16,0,0,1,232,56Z"></path>
        </svg>
      </button>
      <button type="button" class="profile-items-view-btn" data-profile-items-view="list" aria-pressed="false" aria-label="Рядки">
        <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
          <path d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z"></path>
        </svg>
      </button>
    </div>

    <div class="profile-items-grid" id="profileItemsGrid"></div>
  </div>
</div>
  `.trim(),

  'settings-home': `
<div class="settings-section" id="settings-home">
  <div class="settings-header">
    <button class="btn-back-settings" type="button" aria-label="Назад">
      <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
        <path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"></path>
      </svg>
    </button>
    <h2>Налаштування</h2>
  </div>

  <div class="settings-content">
    <div class="settings-menu-list">
      <button type="button" class="settings-menu-item" data-section="notifications">
        <span class="settings-menu-icon settings-icon-notifications">
          <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216ZM48,184c7.7-13.24,16-43.92,16-80a64,64,0,1,1,128,0c0,36.05,8.28,66.73,16,80Z"></path>
          </svg>
        </span>
        <span class="settings-menu-label"><span>Сповіщення</span></span>
        <span class="settings-menu-arrow">›</span>
      </button>

      <button type="button" class="settings-menu-item" data-section="privacy">
        <span class="settings-menu-icon settings-icon-privacy">
          <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.27,47,25.53a8,8,0,0,0,4.2,0c1-.26,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40Zm0,72c0,37.07-13.66,67.16-40.6,89.42A129.3,129.3,0,0,1,128,223.62a128.25,128.25,0,0,1-38.92-21.81C61.82,179.51,48,149.3,48,112V56H208Z"></path>
          </svg>
        </span>
        <span class="settings-menu-label"><span>Конфіденційність</span></span>
        <span class="settings-menu-arrow">›</span>
      </button>

      <button type="button" class="settings-menu-item" data-section="messages">
        <span class="settings-menu-icon settings-icon-messages">
          <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M216,40H40A16,16,0,0,0,24,56V192a16,16,0,0,0,16,16H82.34l23,23a8,8,0,0,0,11.32,0l23-23H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,152H136a8,8,0,0,0-5.66,2.34L111,213.66,91.66,194.34A8,8,0,0,0,86,192H40V56H216Z"></path>
          </svg>
        </span>
        <span class="settings-menu-label"><span>Повідомлення</span></span>
        <span class="settings-menu-arrow">›</span>
      </button>

      <button type="button" class="settings-menu-item" data-section="appearance">
        <span class="settings-menu-icon settings-icon-appearance">
          <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM40,56H216V96H40Zm0,56H96v88H40Zm176,88H112V112H216v88Z"></path>
          </svg>
        </span>
        <span class="settings-menu-label"><span>Інтерфейс</span></span>
        <span class="settings-menu-arrow">›</span>
      </button>

      <button type="button" class="settings-menu-item" data-section="language">
        <span class="settings-menu-icon settings-icon-language">
          <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm88,104a87.62,87.62,0,0,1-6.4,32.94l-44.7-27.49a15.92,15.92,0,0,0-6.24-2.23l-22.82-3.08a16.11,16.11,0,0,0-16,7.86h-8.72l-3.8-7.86a15.91,15.91,0,0,0-11-8.67l-8-1.73L96.14,104h16.71a16.06,16.06,0,0,0,7.73-2l12.25-6.76a16.62,16.62,0,0,0,3-2.14l26.91-24.34A15.93,15.93,0,0,0,166,49.1l-.36-.65A88.11,88.11,0,0,1,216,128ZM143.31,41.34,152,56.9,125.09,81.24,112.85,88H96.14a16,16,0,0,0-13.88,8l-8.73,15.23L63.38,84.19,74.32,58.32a87.87,87.87,0,0,1,69-17ZM40,128a87.53,87.53,0,0,1,8.54-37.8l11.34,30.27a16,16,0,0,0,11.62,10l21.43,4.61L96.74,143a16.09,16.09,0,0,0,14.4,9h1.48l-7.23,16.23a16,16,0,0,0,2.86,17.37l.14.14L128,205.94l-1.94,10A88.11,88.11,0,0,1,40,128Zm102.58,86.78,1.13-5.81a16.09,16.09,0,0,0-4-13.9,1.85,1.85,0,0,1-.14-.14L120,174.74,133.7,144l22.82,3.08,45.72,28.12A88.18,88.18,0,0,1,142.58,214.78Z"></path>
          </svg>
        </span>
        <span class="settings-menu-label"><span>Мова</span></span>
        <span class="settings-menu-arrow">›</span>
      </button>
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
          <div class="shop-balance-value" id="shopBalanceValue">0,00</div>
        </div>
      </div>
      <p class="shop-balance-note">Прокачуйте профіль і Orion Drive предметами, які купуються лише за монети.</p>
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

	        <div class="shop-filter-panel-content">
	          <div class="shop-filter-section">
	            <span class="shop-filter-section-title">Категорія</span>
	            <div class="shop-filter-options">
	              <button type="button" class="shop-filter-btn active" data-shop-filter-group="category" data-shop-filter-value="all">Усе</button>
	              <button type="button" class="shop-filter-btn" data-shop-filter-group="category" data-shop-filter-value="frame">Аватар</button>
	              <button type="button" class="shop-filter-btn" data-shop-filter-group="category" data-shop-filter-value="aura">Фон</button>
	              <button type="button" class="shop-filter-btn" data-shop-filter-group="category" data-shop-filter-value="motion">Анімація</button>
	              <button type="button" class="shop-filter-btn" data-shop-filter-group="category" data-shop-filter-value="badge">Значки</button>
                <button type="button" class="shop-filter-btn" data-shop-filter-group="category" data-shop-filter-value="car">Авто Orion Drive</button>
                <button type="button" class="shop-filter-btn" data-shop-filter-group="category" data-shop-filter-value="smoke">Дим Orion Drive</button>
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
	                <strong id="shopPriceMinValue">0,00</strong>
	              </div>
	              <input type="range" id="shopPriceMin" min="0" max="0" step="1" value="0" />
	              <div class="shop-price-row">
	                <span>До</span>
	                <strong id="shopPriceMaxValue">0,00</strong>
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

  'orion-drive-garage': `
<div class="settings-section settings-subsection" id="orion-drive-garage">
  <div class="settings-header settings-subsection-header">
    <button type="button" class="btn-back-subsection settings-subsection-back" aria-label="Назад">
      <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
        <path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"></path>
      </svg>
    </button>
    <h2 class="settings-subsection-title">
      <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
        <path d="M176,112H152a8,8,0,0,1,0-16h24a8,8,0,0,1,0,16ZM104,96H96V88a8,8,0,0,0-16,0v8H72a8,8,0,0,0,0,16h8v8a8,8,0,0,0,16,0v-8h8a8,8,0,0,0,0-16ZM241.48,200.65a36,36,0,0,1-54.94,4.81c-.12-.12-.24-.24-.35-.37L146.48,160h-37L69.81,205.09l-.35.37A36.08,36.08,0,0,1,44,216,36,36,0,0,1,8.56,173.75a.68.68,0,0,1,0-.14L24.93,89.52A59.88,59.88,0,0,1,83.89,40H172a60.08,60.08,0,0,1,59,49.25c0,.06,0,.12,0,.18l16.37,84.17a.68.68,0,0,1,0,.14A35.74,35.74,0,0,1,241.48,200.65ZM172,144a44,44,0,0,0,0-88H83.89A43.9,43.9,0,0,0,40.68,92.37l0,.13L24.3,176.59A20,20,0,0,0,58,194.3l41.92-47.59a8,8,0,0,1,6-2.71Zm59.7,32.59-8.74-45A60,60,0,0,1,172,160h-4.2L198,194.31a20.09,20.09,0,0,0,17.46,5.39,20,20,0,0,0,16.23-23.11Z"></path>
      </svg>
      <span>Гараж Orion Drive</span>
    </h2>
  </div>

  <div class="settings-content orion-drive-garage-content">
    <section class="orion-drive-garage-viewer-card">
      <div class="orion-drive-garage-stage" id="shopGarageStage">
        <canvas id="shopGarageCanvas" class="orion-drive-garage-canvas" aria-label="3D модель авто"></canvas>
        <img id="shopGarageFallback" class="orion-drive-garage-fallback" alt="Превʼю авто" loading="lazy" />
        <span class="orion-drive-garage-state" id="shopGarageOwnershipTag">Огляд</span>
        <button type="button" class="orion-drive-garage-rotate-btn rotate-left" data-shop-garage-rotate="-1" aria-label="Попереднє авто">
          <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"></path>
          </svg>
        </button>
        <button type="button" class="orion-drive-garage-rotate-btn rotate-right" data-shop-garage-rotate="1" aria-label="Наступне авто">
          <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66A8,8,0,0,1,101.66,42.34l80,80A8,8,0,0,1,181.66,133.66Z"></path>
          </svg>
        </button>
        <p class="orion-drive-garage-hint">Стрілки перемикають авто. Поточну модель можна крутити свайпом.</p>
      </div>
    </section>

    <section class="orion-drive-garage-info-card">
      <span class="shop-kicker">ORION DRIVE</span>
      <h3 id="shopGarageTitle">Авто</h3>
      <p id="shopGarageDescription">Опис авто.</p>
      <div class="orion-drive-garage-meta">
        <div class="orion-drive-garage-meta-item">
          <span>Клас</span>
          <strong id="shopGarageClass">-</strong>
        </div>
        <div class="orion-drive-garage-meta-item">
          <span>Ціна</span>
          <strong id="shopGaragePrice" class="currency-value-inline">0,00</strong>
        </div>
        <div class="orion-drive-garage-meta-item">
          <span>Баланс</span>
          <strong id="shopGarageBalance" class="currency-value-inline">0,00</strong>
        </div>
      </div>
    </section>

    <section class="orion-drive-garage-specs-card">
      <h4>Характеристики</h4>
      <div class="orion-drive-garage-specs" id="shopGarageSpecs"></div>
    </section>

    <button type="button" class="shop-item-action orion-drive-garage-action" id="shopGarageActionBtn">Купити</button>
  </div>
</div>
  `.trim(),

  'notifications-settings': `
<div class="settings-section settings-subsection" id="notifications-settings">
  <div class="settings-header settings-subsection-header">
    <button type="button" class="btn-back-subsection settings-subsection-back" aria-label="Назад">
      <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
        <path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"></path>
      </svg>
    </button>
    <h2 class="settings-subsection-title">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Сповіщення</span>
    </h2>
  </div>

  <div class="settings-content">
    <div class="settings-group">
      <div class="settings-item">
        <div class="settings-item-label">
          <span>Звукові сповіщення</span>
          <p class="settings-item-desc">Відтворювати звук при новому повідомленні</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="soundNotifications" data-settings-key="soundNotifications" checked />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Десктоп сповіщення</span>
          <p class="settings-item-desc">Показувати сповіщення на робочому столі</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="desktopNotifications" data-settings-key="desktopNotifications" checked />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Дозвіл браузера</span>
          <p class="settings-item-desc" id="desktopNotificationState">Натисніть, щоб перевірити або надати доступ</p>
        </div>
        <button type="button" class="btn btn-secondary settings-item-action" id="desktopNotificationActionBtn">Перевірити</button>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Вібрація</span>
          <p class="settings-item-desc">Вібрувати при отриманні повідомлення</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="vibrationEnabled" data-settings-key="vibrationEnabled" checked />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Попередній перегляд</span>
          <p class="settings-item-desc">Показувати текст повідомлення в сповіщенні</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="messagePreview" data-settings-key="messagePreview" checked />
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
<div class="settings-section settings-subsection" id="privacy-settings">
  <div class="settings-header settings-subsection-header">
    <button type="button" class="btn-back-subsection settings-subsection-back" aria-label="Назад">
      <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
        <path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"></path>
      </svg>
    </button>
    <h2 class="settings-subsection-title">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
      </svg>
      <span>Конфіденційність</span>
    </h2>
  </div>

  <div class="settings-content">
    <div class="settings-group">
      <div class="settings-item">
        <div class="settings-item-label">
          <span>Показувати статус онлайн</span>
          <p class="settings-item-desc">Дозволити іншим бачити, коли ви онлайн</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="showOnlineStatus" data-settings-key="showOnlineStatus" checked />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Показувати індикатор набору</span>
          <p class="settings-item-desc">Показувати, коли ви набираєте повідомлення</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="showTypingIndicator" data-settings-key="showTypingIndicator" checked />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Підтвердження прочитання</span>
          <p class="settings-item-desc">Відправляти підтвердження прочитання повідомлень</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="readReceipts" data-settings-key="readReceipts" checked />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Останній раз в мережі</span>
          <p class="settings-item-desc">Показувати час останнього входу</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="lastSeen" data-settings-key="lastSeen" checked />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Двофакторна автентифікація (2FA)</span>
          <p class="settings-item-desc">Додатковий захист для входу в акаунт</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="twoFactorAuth" data-settings-key="twoFactorAuth" checked />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Видимість профілю</span>
          <p class="settings-item-desc">Хто може бачити ваш профіль</p>
        </div>
        <select class="form-select settings-item-action-select" id="profileVisibility" data-settings-key="profileVisibility">
          <option value="everyone">Усі</option>
          <option value="friends">Лише друзі</option>
          <option value="nobody">Ніхто</option>
        </select>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Заблоковані користувачі</span>
          <p class="settings-item-desc" id="blockedUsersSummary">Список порожній</p>
        </div>
        <button type="button" class="btn btn-secondary settings-item-action" id="manageBlockedUsersBtn">Керувати</button>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Приховувати заблоковані чати</span>
          <p class="settings-item-desc">Заблоковані діалоги не показуються у списку чатів</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="hideBlockedChats" data-settings-key="hideBlockedChats" checked />
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

  'messages-settings': `
<div class="settings-section settings-subsection" id="messages-settings">
  <div class="settings-header settings-subsection-header">
    <button type="button" class="btn-back-subsection settings-subsection-back" aria-label="Назад">
      <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
        <path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"></path>
      </svg>
    </button>
    <h2 class="settings-subsection-title">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
      <span>Повідомлення</span>
    </h2>
  </div>

  <div class="settings-content">
    <div class="settings-group">
      <div class="settings-item">
        <div class="settings-item-label">
          <span>Enter для відправки</span>
          <p class="settings-item-desc">Натискання Enter відправляє повідомлення</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="enterToSend" data-settings-key="enterToSend" checked />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Автовідтворення медіа</span>
          <p class="settings-item-desc">Автоматично відтворювати відео та GIF</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="autoPlayMedia" data-settings-key="autoPlayMedia" checked />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Автозбереження медіа</span>
          <p class="settings-item-desc">Автоматично зберігати отримані фото та відео</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="autoSaveMedia" data-settings-key="autoSaveMedia" />
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
<div class="settings-section settings-subsection" id="appearance-settings">
  <div class="settings-header settings-subsection-header">
    <button type="button" class="btn-back-subsection settings-subsection-back" aria-label="Назад">
      <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
        <path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"></path>
      </svg>
    </button>
    <h2 class="settings-subsection-title">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"></circle>
        <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
      </svg>
      <span>Інтерфейс</span>
    </h2>
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
          <span>Режим теми</span>
          <p class="settings-item-desc">Світла, темна або автоматично за системою</p>
        </div>
        <select class="form-select settings-item-action-select" id="themeMode" data-settings-key="theme">
          <option value="system">Системна</option>
          <option value="light">Світла</option>
          <option value="dark">Темна</option>
        </select>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Анімації</span>
          <p class="settings-item-desc">Увімкнути анімації інтерфейсу</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="animationsEnabled" data-settings-key="animationsEnabled" checked />
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="settings-item">
        <div class="settings-item-label">
          <span>Компактний режим</span>
          <p class="settings-item-desc">Зменшити відступи між елементами</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="compactMode" data-settings-key="compactMode" />
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
  <div class="settings-content mini-games-content">
    <div class="mini-games-list" aria-label="Ігровий центр">
      <button type="button" class="mini-game-select active" data-mini-game-select="tapper" aria-pressed="true">
        <span class="mini-game-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
            <path d="M56,76a60,60,0,0,1,120,0,8,8,0,0,1-16,0,44,44,0,0,0-88,0,8,8,0,1,1-16,0Zm140,44a27.9,27.9,0,0,0-13.36,3.39A28,28,0,0,0,144,106.7V76a28,28,0,0,0-56,0v80l-3.82-6.13a28,28,0,0,0-48.41,28.17l29.32,50A8,8,0,1,0,78.89,220L49.6,170a12,12,0,1,1,20.78-12l.14.23,18.68,30A8,8,0,0,0,104,184V76a12,12,0,0,1,24,0v68a8,8,0,1,0,16,0V132a12,12,0,0,1,24,0v20a8,8,0,0,0,16,0v-4a12,12,0,0,1,24,0v36c0,21.61-7.1,36.3-7.16,36.42a8,8,0,0,0,3.58,10.73A7.9,7.9,0,0,0,208,232a8,8,0,0,0,7.16-4.42c.37-.73,8.85-18,8.85-43.58V148A28,28,0,0,0,196,120Z"></path>
          </svg>
        </span>
        <span>
          <span class="mini-game-title">Клікер</span>
          <span class="mini-game-sub">Тапай і збирай Orion Value</span>
        </span>
      </button>

      <button type="button" class="mini-game-select" data-mini-game-select="grid2048" aria-pressed="false">
        <span class="mini-game-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="2"/>
            <path d="M3 9h18M3 15h18M9 3v18M15 3v18" stroke="currentColor" stroke-width="1.8"/>
          </svg>
        </span>
        <span>
          <span class="mini-game-title">Orion 2048</span>
          <span class="mini-game-sub">Обʼєднуй плитки та заробляй</span>
        </span>
      </button>

      <button type="button" class="mini-game-select" data-mini-game-select="flappy" aria-pressed="false">
        <span class="mini-game-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
            <path d="M176,68a12,12,0,1,1-12-12A12,12,0,0,1,176,68Zm64,12a8,8,0,0,1-3.56,6.66L216,100.28V120A104.11,104.11,0,0,1,112,224H24a16,16,0,0,1-12.49-26l.1-.12L96,96.63V76.89C96,43.47,122.79,16.16,155.71,16H156a60,60,0,0,1,57.21,41.86l23.23,15.48A8,8,0,0,1,240,80Zm-22.42,0L201.9,69.54a8,8,0,0,1-3.31-4.64A44,44,0,0,0,156,32h-.22C131.64,32.12,112,52.25,112,76.89V99.52a8,8,0,0,1-1.85,5.13L24,208h26.9l70.94-85.12a8,8,0,1,1,12.29,10.24L71.75,208H112a88.1,88.1,0,0,0,88-88V96a8,8,0,0,1,3.56-6.66Z"></path>
          </svg>
        </span>
        <span>
          <span class="mini-game-title">Flappy Orion</span>
          <span class="mini-game-sub">Пролітай перешкоди</span>
        </span>
      </button>

      <button type="button" class="mini-game-select" data-mini-game-select="drift" aria-pressed="false">
        <span class="mini-game-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
            <path d="M149.26,159.26C155.09,173.82,163.5,176,168,176s12.91-2.18,18.74-16.74c3.39-8.48,5.26-19.58,5.26-31.26s-1.87-22.78-5.26-31.26C180.91,82.18,172.5,80,168,80s-12.91,2.18-18.74,16.74C145.87,105.22,144,116.32,144,128S145.87,150.78,149.26,159.26ZM168,96.2c2.62,2.06,8,13,8,31.8s-5.38,29.74-8,31.8c-2.62-2.06-8-13-8-31.8S165.38,98.26,168,96.2ZM232,216H196.41C213.12,197.73,224,165.47,224,128c0-58.32-26.35-104-60-104H92C58.35,24,32,69.68,32,128S58.35,232,92,232H232a8,8,0,0,0,0-16ZM193.74,63.93C202.93,80.91,208,103.67,208,128s-5.07,47.09-14.26,64.07C185.38,207.5,174.82,216,164,216s-21.38-8.5-29.74-23.93C125.07,175.09,120,152.33,120,128s5.07-47.09,14.26-64.07C142.62,48.5,153.18,40,164,40S185.38,48.5,193.74,63.93ZM48,128c0-2.5.07-5,.17-7.44L80,97.83l24.43,17.45c-.28,4.16-.43,8.41-.43,12.72a179.89,179.89,0,0,0,3.07,33.5l-22.42-16a8,8,0,0,0-9.3,0l-23.74,17A161,161,0,0,1,48,128ZM62.26,63.93C70.62,48.5,81.18,40,92,40h39.59c-11.9,13-20.84,33.12-25,57.16L84.65,81.49a8,8,0,0,0-9.3,0L50.49,99.25C52.85,86,56.83,74,62.26,63.93Zm0,128.14a100.08,100.08,0,0,1-5.94-13.32L80,161.83l33.94,24.24c4.6,12,10.6,22.22,17.65,29.93H92C81.18,216,70.62,207.5,62.26,192.07Z"></path>
          </svg>
        </span>
        <span>
          <span class="mini-game-title">Orion Drive</span>
          <span class="mini-game-sub">Дрифт і збір монет</span>
        </span>
      </button>
    </div>

    <section class="mini-game-panel coin-tapper-content active" data-mini-game-panel="tapper">
      <div class="coin-level-island" aria-label="Рівень гравця">
        <div class="coin-level-island-body">
          <span class="coin-level-island-label">Рівень</span>
          <strong class="coin-level-island-value" id="coinTapLevelValue">1</strong>
        </div>
      </div>

      <span class="coin-tapper-kicker">ORION VALUE</span>
      <div class="coin-tapper-balance-label">Загальний баланс</div>
      <div class="coin-tapper-balance" id="coinTapBalance">0,00</div>

      <button class="coin-tapper-button" id="coinTapBtn" type="button" aria-label="Заробити монети">
        <img class="coin-tapper-image" src="${orionValueAssetUrl}" alt="Orion Value" />
      </button>

      <div class="coin-tapper-rate">
        <span>1 тап</span>
        <strong>=</strong>
        <span id="coinTapRewardValue">0,01</span>
      </div>
    </section>

    <section class="mini-game-panel mini-game-view" data-mini-game-panel="grid2048">
      <div class="mini-game-view-header">
        <span class="mini-game-view-title">Orion 2048</span>
        <span class="mini-game-view-score">Рекорд: <strong id="grid2048Best">0</strong></span>
      </div>

      <div class="mini-game-stage">
        <div class="mini-game-score-current">
          Рахунок: <strong id="grid2048Score">0</strong> · Зароблено: <strong id="grid2048Earned">0,00</strong>
        </div>

        <div class="mini-game-canvas" id="grid2048Canvas" aria-live="polite">
          <div class="grid-2048" id="grid2048Board"></div>
          <button class="btn btn-primary mini-game-play-overlay grid-2048-replay" id="grid2048Replay" type="button" aria-label="Зіграти ще раз у Orion 2048">Ще раз</button>
        </div>
      </div>
    </section>

    <section class="mini-game-panel mini-game-view" data-mini-game-panel="flappy">
      <div class="mini-game-view-header">
        <span class="mini-game-view-title">Flappy Orion</span>
        <span class="mini-game-view-score">Рекорд: <strong id="flappyOrionBest">0</strong></span>
      </div>

      <div class="mini-game-stage">
        <div class="mini-game-canvas flappy-orion-canvas-wrap" id="flappyOrionCanvasWrap" aria-live="polite">
          <canvas
            class="flappy-orion-canvas"
            id="flappyOrionCanvas"
            data-sprite-src="${flappyOrionSpriteAssetUrl}"
            data-coin-src="${orionValueAssetUrl}"
            width="960"
            height="540"
          ></canvas>
          <button class="btn btn-primary mini-game-play-overlay" id="flappyOrionStart" type="button" aria-label="Старт гри Flappy Orion">Старт</button>
        </div>
      </div>
    </section>

    <section class="mini-game-panel mini-game-view" data-mini-game-panel="drift">
      <div class="mini-game-stage orion-drift-stage">
        <div class="mini-game-canvas orion-drift-canvas-wrap" id="orionDriftCanvasWrap" aria-live="polite">
          <canvas
            class="orion-drift-canvas"
            id="orionDriftCanvas"
            data-car-src="${orionDriveCarAssetUrl}"
            data-cone-src="${orionDriveConeAssetUrl}"
            data-box-src="${orionDriveBoxAssetUrl}"
            data-orb-src="${orionValueAssetUrl}"
            width="900"
            height="540"
          ></canvas>

          <div class="orion-drift-hud">
            <div class="orion-drift-orbs"><strong id="orionDriftOrbs">0</strong></div>
            <div class="orion-drift-main">
              <strong class="orion-drift-score" id="orionDriftScore">0</strong>
              <span class="orion-drift-multiplier" id="orionDriftMultiplier">x1.0</span>
              <span class="orion-drift-best">Рекорд: <strong id="orionDriftBest">0</strong></span>
            </div>
          </div>

          <div class="orion-drift-speedometer" aria-live="polite">
            <span class="orion-drift-speedometer-value" id="orionDriftSpeed">0</span>
            <span class="orion-drift-speedometer-unit">км/год</span>
          </div>

          <p class="orion-drift-status" id="orionDriftStatus">Відкритий режим: катайся вільно. Керування: стрілки або W/A/S/D.</p>

          <button class="orion-drift-start-overlay mini-game-play-overlay" id="orionDriftStart" type="button" aria-label="Старт гри Orion Drive">Старт</button>

          <div class="orion-drift-controls" aria-label="Мобільне керування Orion Drive">
            <div class="orion-drift-controls-group">
              <button class="orion-drift-control-btn" id="orionDriftSteerLeft" type="button" aria-label="Поворот ліворуч">
                <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
                  <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"></path>
                </svg>
              </button>
              <button class="orion-drift-control-btn" id="orionDriftSteerRight" type="button" aria-label="Поворот праворуч">
                <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
                  <path d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69l-58.35-58.34a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z"></path>
                </svg>
              </button>
            </div>
            <div class="orion-drift-controls-group">
              <button class="orion-drift-control-btn orion-drift-control-btn--pedal" id="orionDriftGas" type="button" aria-label="Газ">Газ</button>
              <button class="orion-drift-control-btn orion-drift-control-btn--pedal" id="orionDriftBrake" type="button" aria-label="Гальмо">Гальмо</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</div>
  `.trim(),

  'language-settings': `
<div class="settings-section settings-subsection" id="language-settings">
  <div class="settings-header settings-subsection-header">
    <button type="button" class="btn-back-subsection settings-subsection-back" aria-label="Назад">
      <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
        <path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"></path>
      </svg>
    </button>
    <h2 class="settings-subsection-title">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"></circle>
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
      </svg>
      <span>Мова</span>
    </h2>
  </div>

  <div class="settings-content">
    <div class="settings-group">
      <div class="settings-item">
        <div class="settings-item-label">
          <span>Мова інтерфейсу</span>
          <p class="settings-item-desc">Виберіть мову інтерфейсу додатку</p>
        </div>
        <select class="form-select settings-item-action-select" id="language" data-settings-key="language">
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

  'wallet': `
<div class="settings-section" id="wallet">
  <div class="calls-header">
    <h2>
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
        <path d="M216,64H56a8,8,0,0,1,0-16H192a8,8,0,0,0,0-16H56A24,24,0,0,0,32,56V184a24,24,0,0,0,24,24H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64Zm0,128H56a8,8,0,0,1-8-8V78.63A23.84,23.84,0,0,0,56,80H216Zm-48-60a12,12,0,1,1,12,12A12,12,0,0,1,168,132Z"></path>
      </svg>
      <span>Гаманець</span>
    </h2>
  </div>

  <div class="settings-content wallet-content">
    <section class="shop-balance-card wallet-balance-card">
      <span class="shop-kicker">ORION VALUE</span>
      <div class="shop-balance-meta">
        <div>
          <div class="shop-balance-label">Поточний баланс</div>
          <div class="shop-balance-value" id="walletBalanceValue">0,00</div>
        </div>
        <span class="shop-balance-badge" id="walletBalanceBadge">Транзакцій: 0</span>
      </div>
      <p class="shop-balance-note">Тут відображається історія витрат і поповнень монет.</p>
    </section>

    <section class="wallet-history-card">
      <div class="wallet-history-head">
        <h3>Історія транзакцій</h3>
        <span class="wallet-history-count" id="walletTransactionsCount">0</span>
      </div>
      <div class="wallet-history-list" id="walletTransactionsList"></div>
    </section>
  </div>
</div>
  `.trim(),

  'notifications-center': `
<div class="settings-section" id="notifications-center">
  <div class="calls-header">
    <h2>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Сповіщення</span>
    </h2>
  </div>

  <div class="calls-content">
    <div class="empty-state">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <h3>Непрочитаних повідомлень немає</h3>
      <p>Коли з'являться нові повідомлення, вони будуть тут.</p>
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
