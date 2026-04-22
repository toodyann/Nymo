// UI допоміжні функції
import { resolveUiLanguage, translateUiText } from '../i18n/ui-localization.js';

const ALERT_VARIANT_CLASSES = ['is-error', 'is-notice', 'is-warning'];

function setAlertVariant(overlay, variant = 'error') {
  overlay.classList.remove(...ALERT_VARIANT_CLASSES);
  if (variant === 'notice') {
    overlay.classList.add('is-notice');
    return;
  }
  if (variant === 'warning') {
    overlay.classList.add('is-warning');
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
export function showAlert(message, title = 'Помилка', { okText = 'OK', variant = 'error' } = {}) {
  const uiLanguage = resolveUiLanguage();
  const localizedTitle = uiLanguage === 'en'
    ? (String(title || '').trim() === 'Помилка' ? 'Error' : translateUiText(title, uiLanguage))
    : title;
  const localizedMessage = translateUiText(message, uiLanguage);
  const localizedOkText = translateUiText(okText, uiLanguage);
  const overlay = document.getElementById('alertOverlay');
  const titleEl = document.getElementById('alertTitle');
  const messageEl = document.getElementById('alertMessage');
  const okBtn = document.getElementById('alertOkBtn');
  const cancelBtn = document.getElementById('alertCancelBtn');
  const closeBtn = document.getElementById('alertCloseBtn');

  if (!overlay || !titleEl || !messageEl || !okBtn || !cancelBtn || !closeBtn) {
    alert(localizedMessage);
    return Promise.resolve();
  }

  titleEl.textContent = localizedTitle;
  messageEl.textContent = localizedMessage;
  const previousOkText = okBtn.textContent;
  okBtn.textContent = String(localizedOkText || 'OK');
  cancelBtn.style.display = 'none';
  const safeVariant = variant === 'notice' || variant === 'warning' ? variant : 'error';
  setAlertVariant(overlay, safeVariant);

  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');

  return new Promise(resolve => {
    const cleanup = () => {
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
      clearAlertVariant(overlay);
      okBtn.textContent = previousOkText;
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
  const uiLanguage = resolveUiLanguage();
  const localizedTitle = uiLanguage === 'en'
    ? (String(title || '').trim() === 'Повідомлення' ? 'Notice' : translateUiText(title, uiLanguage))
    : title;
  const localizedMessage = translateUiText(message, uiLanguage);
  const overlay = document.getElementById('alertOverlay');
  const titleEl = document.getElementById('alertTitle');
  const messageEl = document.getElementById('alertMessage');
  const okBtn = document.getElementById('alertOkBtn');
  const cancelBtn = document.getElementById('alertCancelBtn');
  const closeBtn = document.getElementById('alertCloseBtn');

  if (!overlay || !titleEl || !messageEl || !okBtn || !cancelBtn || !closeBtn) {
    alert(localizedMessage);
    return Promise.resolve();
  }

  titleEl.textContent = localizedTitle;
  messageEl.textContent = localizedMessage;
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
  const uiLanguage = resolveUiLanguage();
  const localizedTitle = uiLanguage === 'en'
    ? (String(title || '').trim() === 'Підтвердження' ? 'Confirmation' : translateUiText(title, uiLanguage))
    : title;
  const localizedMessage = translateUiText(message, uiLanguage);
  const overlay = document.getElementById('alertOverlay');
  const titleEl = document.getElementById('alertTitle');
  const messageEl = document.getElementById('alertMessage');
  const okBtn = document.getElementById('alertOkBtn');
  const cancelBtn = document.getElementById('alertCancelBtn');
  const closeBtn = document.getElementById('alertCloseBtn');

  if (!overlay || !titleEl || !messageEl || !okBtn || !cancelBtn || !closeBtn) {
    return Promise.resolve(confirm(localizedMessage));
  }

  titleEl.textContent = localizedTitle;
  messageEl.textContent = localizedMessage;
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
 * Показати діалог підтвердження з додатковою опцією (чекбоксом).
 * @param {string} message - Текст повідомлення
 * @param {object} options
 * @param {string} [options.title='Підтвердження'] - Заголовок
 * @param {string} [options.optionLabel=''] - Текст опції
 * @param {boolean} [options.optionChecked=false] - Стан опції за замовчуванням
 * @param {string} [options.confirmText='OK'] - Текст кнопки підтвердження
 * @param {string} [options.cancelText='Скасувати'] - Текст кнопки скасування
 * @returns {Promise<{confirmed: boolean, optionChecked: boolean}>}
 */
export function showConfirmWithOption(
  message,
  {
    title = 'Підтвердження',
    optionLabel = '',
    optionChecked = false,
    confirmText = 'OK',
    cancelText = 'Скасувати'
  } = {}
) {
  const uiLanguage = resolveUiLanguage();
  const localizedTitle = uiLanguage === 'en'
    ? (String(title || '').trim() === 'Підтвердження' ? 'Confirmation' : translateUiText(title, uiLanguage))
    : title;
  const localizedMessage = translateUiText(message, uiLanguage);
  const localizedOptionLabel = translateUiText(optionLabel, uiLanguage);
  const localizedConfirmText = translateUiText(confirmText, uiLanguage);
  const localizedCancelText = uiLanguage === 'en'
    ? (String(cancelText || '').trim() === 'Скасувати' ? 'Cancel' : translateUiText(cancelText, uiLanguage))
    : cancelText;
  const overlay = document.getElementById('alertOverlay');
  const titleEl = document.getElementById('alertTitle');
  const messageEl = document.getElementById('alertMessage');
  const okBtn = document.getElementById('alertOkBtn');
  const cancelBtn = document.getElementById('alertCancelBtn');
  const closeBtn = document.getElementById('alertCloseBtn');

  if (!overlay || !titleEl || !messageEl || !okBtn || !cancelBtn || !closeBtn) {
    const confirmed = confirm(localizedMessage);
    return Promise.resolve({ confirmed, optionChecked: false });
  }

  titleEl.textContent = localizedTitle;
  messageEl.textContent = '';
  const textEl = document.createElement('div');
  textEl.className = 'alert-message-text';
  textEl.textContent = localizedMessage;
  messageEl.appendChild(textEl);

  let optionInput = null;
  const safeOptionLabel = String(localizedOptionLabel || '').trim();
  if (safeOptionLabel) {
    const optionId = `alertConfirmOption-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optionEl = document.createElement('label');
    optionEl.className = 'alert-confirm-option';
    optionEl.setAttribute('for', optionId);

    optionInput = document.createElement('input');
    optionInput.type = 'checkbox';
    optionInput.id = optionId;
    optionInput.className = 'alert-confirm-option-input';
    optionInput.checked = Boolean(optionChecked);

    const optionText = document.createElement('span');
    optionText.className = 'alert-confirm-option-text';
    optionText.textContent = safeOptionLabel;

    optionEl.appendChild(optionInput);
    optionEl.appendChild(optionText);
    messageEl.appendChild(optionEl);
  }

  const previousOkText = okBtn.textContent;
  const previousCancelText = cancelBtn.textContent;
  okBtn.textContent = localizedConfirmText;
  cancelBtn.textContent = localizedCancelText;
  cancelBtn.style.display = 'inline-flex';
  setAlertVariant(overlay, 'error');

  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');

  return new Promise(resolve => {
    const cleanup = () => {
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
      clearAlertVariant(overlay);
      messageEl.textContent = '';
      okBtn.textContent = previousOkText;
      cancelBtn.textContent = previousCancelText;
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      closeBtn.removeEventListener('click', onCancel);
      overlay.removeEventListener('click', onOverlay);
      document.removeEventListener('keydown', onEnter);
    };
    const getOptionState = () => Boolean(optionInput?.checked);
    const onOk = () => {
      const checked = getOptionState();
      cleanup();
      resolve({ confirmed: true, optionChecked: checked });
    };
    const onCancel = () => {
      const checked = getOptionState();
      cleanup();
      resolve({ confirmed: false, optionChecked: checked });
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
  const gradients = [
    ['#FF6B6B', '#F06595'],
    ['#4ECDC4', '#45B7D1'],
    ['#45B7D1', '#6C5CE7'],
    ['#FFA07A', '#FF6B6B'],
    ['#98D8C8', '#6FCF97'],
    ['#F7DC6F', '#FFB347'],
    ['#BB8FCE', '#8E44AD'],
    ['#85C1E9', '#4ECDC4'],
    ['#FF9F43', '#FF6B6B'],
    ['#6FCF97', '#45B7D1']
  ];

  const safeName = String(name || '').trim();
  const length = safeName.length || 1;
  const [c1, c2] = gradients[length % gradients.length];
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
