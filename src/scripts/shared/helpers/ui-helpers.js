// UI допоміжні функції

const ALERT_VARIANT_CLASSES = ['is-error', 'is-notice'];

function setAlertVariant(overlay, variant = 'error') {
  overlay.classList.remove(...ALERT_VARIANT_CLASSES);
  if (variant === 'notice') {
    overlay.classList.add('is-notice');
    return;
  }
  overlay.classList.add('is-error');
}

function clearAlertVariant(overlay) {
  overlay.classList.remove(...ALERT_VARIANT_CLASSES);
}

/**
 * Показати alert-повідомлення
 * @param {string} message - Текст повідомлення
 * @param {string} title - Заголовок
 * @returns {Promise<void>}
 */
export function showAlert(message, title = 'Помилка') {
  const overlay = document.getElementById('alertOverlay');
  const titleEl = document.getElementById('alertTitle');
  const messageEl = document.getElementById('alertMessage');
  const okBtn = document.getElementById('alertOkBtn');
  const cancelBtn = document.getElementById('alertCancelBtn');
  const closeBtn = document.getElementById('alertCloseBtn');

  if (!overlay || !titleEl || !messageEl || !okBtn || !cancelBtn || !closeBtn) {
    alert(message);
    return Promise.resolve();
  }

  titleEl.textContent = title;
  messageEl.textContent = message;
  cancelBtn.style.display = 'none';
  setAlertVariant(overlay, 'error');

  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');

  return new Promise(resolve => {
    const cleanup = () => {
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
      clearAlertVariant(overlay);
      okBtn.removeEventListener('click', onOk);
      closeBtn.removeEventListener('click', onOk);
      overlay.removeEventListener('click', onOverlay);
      document.removeEventListener('keydown', onEnter);
    };
    const onOk = () => {
      cleanup();
      resolve();
    };
    const onOverlay = (e) => {
      if (e.target === overlay) onOk();
    };
    const onEnter = (e) => {
      if (e.key === 'Enter') onOk();
    };
    okBtn.addEventListener('click', onOk);
    closeBtn.addEventListener('click', onOk);
    overlay.addEventListener('click', onOverlay);
    document.addEventListener('keydown', onEnter);
  });
}

/**
 * Показати інформаційне повідомлення
 * @param {string} message - Текст повідомлення
 * @param {string} title - Заголовок
 * @returns {Promise<void>}
 */
export function showNotice(message, title = 'Повідомлення') {
  const overlay = document.getElementById('alertOverlay');
  const titleEl = document.getElementById('alertTitle');
  const messageEl = document.getElementById('alertMessage');
  const okBtn = document.getElementById('alertOkBtn');
  const cancelBtn = document.getElementById('alertCancelBtn');
  const closeBtn = document.getElementById('alertCloseBtn');

  if (!overlay || !titleEl || !messageEl || !okBtn || !cancelBtn || !closeBtn) {
    alert(message);
    return Promise.resolve();
  }

  titleEl.textContent = title;
  messageEl.textContent = message;
  cancelBtn.style.display = 'none';
  setAlertVariant(overlay, 'notice');

  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');

  return new Promise(resolve => {
    const cleanup = () => {
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
      clearAlertVariant(overlay);
      okBtn.removeEventListener('click', onOk);
      closeBtn.removeEventListener('click', onOk);
      overlay.removeEventListener('click', onOverlay);
      document.removeEventListener('keydown', onEnter);
    };
    const onOk = () => {
      cleanup();
      resolve();
    };
    const onOverlay = (e) => {
      if (e.target === overlay) onOk();
    };
    const onEnter = (e) => {
      if (e.key === 'Enter') onOk();
    };
    okBtn.addEventListener('click', onOk);
    closeBtn.addEventListener('click', onOk);
    overlay.addEventListener('click', onOverlay);
    document.addEventListener('keydown', onEnter);
  });
}

/**
 * Показати діалог підтвердження
 * @param {string} message - Текст повідомлення
 * @param {string} title - Заголовок
 * @returns {Promise<boolean>}
 */
export function showConfirm(message, title = 'Підтвердження') {
  const overlay = document.getElementById('alertOverlay');
  const titleEl = document.getElementById('alertTitle');
  const messageEl = document.getElementById('alertMessage');
  const okBtn = document.getElementById('alertOkBtn');
  const cancelBtn = document.getElementById('alertCancelBtn');
  const closeBtn = document.getElementById('alertCloseBtn');

  if (!overlay || !titleEl || !messageEl || !okBtn || !cancelBtn || !closeBtn) {
    return Promise.resolve(confirm(message));
  }

  titleEl.textContent = title;
  messageEl.textContent = message;
  cancelBtn.style.display = 'inline-flex';
  setAlertVariant(overlay, 'error');

  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');

  return new Promise(resolve => {
    const cleanup = () => {
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
      clearAlertVariant(overlay);
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      closeBtn.removeEventListener('click', onCancel);
      overlay.removeEventListener('click', onOverlay);
      document.removeEventListener('keydown', onEnter);
    };
    const onOk = () => {
      cleanup();
      resolve(true);
    };
    const onCancel = () => {
      cleanup();
      resolve(false);
    };
    const onOverlay = (e) => {
      if (e.target === overlay) onCancel();
    };
    const onEnter = (e) => {
      if (e.key === 'Enter') onOk();
    };
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    closeBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click', onOverlay);
    document.addEventListener('keydown', onEnter);
  });
}

/**
 * Налаштування emoji picker
 */
export function setupEmojiPicker(insertAtCursor) {
  const emojiBtn = document.querySelector('.btn-emoji');
  const inputWrapper = document.querySelector('.input-wrapper');
  const input = document.getElementById('messageInput');

  if (!emojiBtn || !inputWrapper || !input) return;

  const picker = document.createElement('div');
  picker.className = 'emoji-picker';
  picker.style.display = 'none';

  const emojis = ['😀','😁','😂','🤣','😊','😍','😅','😎','😢','😡','👍','👎','🙌','🎉','❤️','😄','🤔','🤷','🙈','🔥','✨','🤝','🥳','🤩','👏'];

  emojis.forEach(e => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'emoji-item';
    btn.textContent = e;
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      insertAtCursor(input, e);
      input.focus();
      picker.style.display = 'none';
    });
    picker.appendChild(btn);
  });

  inputWrapper.appendChild(picker);

  emojiBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    picker.style.display = picker.style.display === 'none' ? 'grid' : 'none';
  });

  document.addEventListener('click', (e) => {
    if (!inputWrapper.contains(e.target)) {
      picker.style.display = 'none';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') picker.style.display = 'none';
  });
}

/**
 * Вставити текст в позицію курсора
 * @param {HTMLInputElement} input - Елемент введення
 * @param {string} text - Текст для вставки
 */
export function insertAtCursor(input, text) {
  const start = input.selectionStart || 0;
  const end = input.selectionEnd || 0;
  const value = input.value || '';
  input.value = value.slice(0, start) + text + value.slice(end);
  const pos = start + text.length;
  input.setSelectionRange(pos, pos);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Екранування HTML
 * @param {string} text - Текст для екранування
 * @returns {string}
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Генерація кольору для контакту
 * @param {string} name - Ім'я контакту
 * @returns {string} - CSS gradient
 */
export function getContactColor(name) {
  const baseColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E9', '#FF9F43', '#6FCF97'
  ];

  if (!name) return baseColors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const idx1 = Math.abs(hash) % baseColors.length;
  const idx2 = Math.abs((hash >> 3)) % baseColors.length;
  const c1 = baseColors[idx1];
  const c2 = baseColors[idx2];
  return `linear-gradient(135deg, ${c1}, ${c2})`;
}

/**
 * Форматування дати та часу повідомлення
 * @param {string} dateStr - Дата
 * @param {string} timeStr - Час
 * @returns {string}
 */
export function formatMessageDateTime(dateStr, timeStr) {
  const today = new Date();
  const msgDate = new Date(dateStr + 'T00:00:00');
  
  const isToday = msgDate.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = msgDate.toDateString() === yesterday.toDateString();
  
  if (isToday) return timeStr;
  if (isYesterday) return `Вчора, ${timeStr}`;
  return `${dateStr}, ${timeStr}`;
}
