// Шаблони налаштувань для Orion

const orionValueAssetUrl = new URL('../Assets/Orion_value.png', import.meta.url).href;
const flappyOrionSpriteAssetUrl = new URL('../Assets/Flappy-Orion-Sprite.png', import.meta.url).href;
const orionDriveCarAssetUrl = new URL('../Assets/OrionDrive/Red-car.png', import.meta.url).href;
const orionDriveConeAssetUrl = new URL('../Assets/OrionDrive/Cone.png', import.meta.url).href;

export const settingsTemplates = {
  'profile': `
<div class="settings-section profile-page" id="profile">
  <div class="settings-content profile-content">
    <section class="profile-hero-card">
      <button class="profile-edit-inline" aria-label="Редагувати профіль">
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
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
          <span class="profile-status-pill" id="profileDisplayStatus" data-status="online">Онлайн</span>
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
          <button class="profile-action-btn" id="profileEditMainBtn" aria-label="Редагувати профіль">
            <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
              <path d="M227.31,73.37,182.63,28.69a16,16,0,0,0-22.63,0L36.69,152a15.86,15.86,0,0,0-4.51,8.64L24.27,204.1a8,8,0,0,0,9.31,9.31l43.46-7.91a15.86,15.86,0,0,0,8.64-4.51L209,77.69A16,16,0,0,0,227.31,73.37ZM72,188.29,42.93,193.6,48.24,164.5l88.82-88.83,23.79,23.79Zm100.17-100.17L148.37,64.34,171.31,41.4l23.79,23.79Z"></path>
            </svg>
            <span>Редагувати</span>
          </button>
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
              <path d="M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,0,0-160,0c0,35.35-8.25,62.4-13.8,71.95A16,16,0,0,0,48,200H96.1a32,32,0,0,0,63.8,0H208a16,16,0,0,0,13.8-24.06ZM128,216a16,16,0,0,1-15.16-10.67h30.32A16,16,0,0,1,128,216ZM48,184c7.9-13.65,16-43.94,16-80a64,64,0,0,1,128,0c0,36.05,8.1,66.35,16,80Z"></path>
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
            <span>Приватність</span>
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
              <path d="M128,24a104,104,0,1,0,104,104A104.11,104.11,0,0,0,128,24Zm79.21,96h-32.8a158.6,158.6,0,0,0-13.36-52.7A88.2,88.2,0,0,1,207.21,120ZM128,40c10.87,0,27.7,16.87,37.36,45.18A142.13,142.13,0,0,1,171.86,120H128Zm0,96h43.86a142.13,142.13,0,0,1-6.5,34.82C155.7,199.13,138.87,216,128,216Zm0-16V85.18C137.66,56.87,154.49,40,165.36,40ZM94.95,67.3A158.6,158.6,0,0,0,81.59,120H48.79A88.2,88.2,0,0,1,94.95,67.3ZM48.79,136h32.8a158.6,158.6,0,0,0,13.36,52.7A88.2,88.2,0,0,1,48.79,136ZM120,216c-10.87,0-27.7-16.87-37.36-45.18A142.13,142.13,0,0,1,76.14,136H120Zm0-96H76.14a142.13,142.13,0,0,1,6.5-34.82C92.3,56.87,109.13,40,120,40Zm41.05,68.7A158.6,158.6,0,0,0,174.41,136h32.8A88.2,88.2,0,0,1,161.05,188.7Z"></path>
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

	        <div class="shop-filter-panel-content">
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
        <button type="button" class="settings-item-action" id="desktopNotificationActionBtn">Перевірити</button>
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
        <button type="button" class="settings-item-action" id="manageBlockedUsersBtn">Керувати</button>
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
        <span id="coinTapRewardValue">0,01 монетки</span>
      </div>
    </section>

    <section class="mini-game-panel mini-game-view" data-mini-game-panel="signal">
      <div class="mini-game-view-header">
        <span class="mini-game-view-title">Полювання на сигнал</span>
        <span class="mini-game-view-score">Рекорд: <strong id="signalHuntBest">0</strong></span>
      </div>

      <div class="mini-game-stage">
        <div class="mini-game-score-current">
          Очки: <strong id="signalHuntScore">0</strong> · Час: <strong id="signalHuntTime">30</strong>с · Зароблено: <strong id="signalHuntEarned">0,00</strong>
        </div>

        <div class="mini-game-canvas signal-hunt-canvas" id="signalHuntCanvas" aria-live="polite">
          <button class="signal-hunt-target" id="signalHuntTarget" type="button" aria-label="Зловити сигнал">
            <svg width="22" height="22" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
              <path d="M128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-6.54-.67L40,216,52.47,178.6a8,8,0,0,0-.66-6.54A88,88,0,1,1,128,216Z"></path>
            </svg>
          </button>
          <p class="signal-hunt-status" id="signalHuntStatus">Натисни «Старт», щоб ловити сигнали повідомлень.</p>
        </div>

        <div class="mini-game-controls">
          <button class="btn btn-primary mini-game-btn" id="signalHuntStart" type="button">Старт</button>
          <span class="mini-game-hint">Клікай по іконці сигналу, поки вона не зникла.</span>
        </div>
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
        </div>

        <div class="mini-game-controls">
          <button class="btn btn-primary mini-game-btn" id="grid2048Restart" type="button">Нова гра</button>
          <span class="mini-game-hint">Керування: ← ↑ → ↓ або свайпи по полю.</span>
        </div>
      </div>
    </section>

    <section class="mini-game-panel mini-game-view" data-mini-game-panel="flappy">
      <div class="mini-game-view-header">
        <span class="mini-game-view-title">Flappy Orion</span>
        <span class="mini-game-view-score">Рекорд: <strong id="flappyOrionBest">0</strong></span>
      </div>

      <div class="mini-game-stage">
        <div class="mini-game-score-current">
          Очки: <strong id="flappyOrionScore">0</strong> · Монет: <strong id="flappyOrionCoins">0</strong> · Зароблено: <strong id="flappyOrionEarned">0,00</strong>
        </div>

        <div class="mini-game-canvas flappy-orion-canvas-wrap" id="flappyOrionCanvasWrap" aria-live="polite">
          <canvas
            class="flappy-orion-canvas"
            id="flappyOrionCanvas"
            data-sprite-src="${flappyOrionSpriteAssetUrl}"
            data-coin-src="${orionValueAssetUrl}"
            width="960"
            height="540"
          ></canvas>
          <p class="flappy-orion-status" id="flappyOrionStatus">Натисни «Старт», щоб полетіти. Клікай або тисни Space для стрибка.</p>
        </div>

        <div class="mini-game-controls">
          <button class="btn btn-primary mini-game-btn" id="flappyOrionStart" type="button">Старт</button>
          <span class="mini-game-hint">Оминай труби та збирай Orion Value монети.</span>
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
            data-orb-src="${orionValueAssetUrl}"
            width="900"
            height="540"
          ></canvas>

          <div class="orion-drift-hud">
            <div class="orion-drift-orbs">Сфери: <strong id="orionDriftOrbs">0</strong></div>
            <div class="orion-drift-main">
              <strong class="orion-drift-score" id="orionDriftScore">0</strong>
              <span class="orion-drift-multiplier" id="orionDriftMultiplier">x1.0</span>
              <span class="orion-drift-speed">Швидкість: <strong id="orionDriftSpeed">0</strong> км/год</span>
              <span class="orion-drift-best">Рекорд: <strong id="orionDriftBest">0</strong></span>
            </div>
          </div>

          <div class="orion-drift-boost">
            <span class="orion-drift-boost-label">Прискорення</span>
            <div class="orion-drift-boost-track">
              <span class="orion-drift-boost-fill" id="orionDriftBoostFill"></span>
            </div>
          </div>

          <p class="orion-drift-status" id="orionDriftStatus">Відкритий режим: катайся вільно. Керуй газом, гальмом і поворотом.</p>

          <button class="orion-drift-start-overlay" id="orionDriftStart" type="button">Старт</button>
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
