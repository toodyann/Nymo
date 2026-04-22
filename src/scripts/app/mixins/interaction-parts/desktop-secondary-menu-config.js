import { normalizeUiLanguage, translateUiText } from '../../../shared/i18n/ui-localization.js';

const DESKTOP_SECONDARY_MENU_CONFIG = 
{
      navChats: {
        title: 'Чати',
        groups: [
          {
            title: 'РОЗМОВИ',
            items: [
              { label: 'Центр повідомлень', action: 'open-chats-home', icon: 'bell' },
              { label: 'Конфіденційність', section: 'privacy-settings', parentSection: 'messenger-settings', icon: 'shield' },
              { label: 'Повідомлення', section: 'messages-settings', parentSection: 'messenger-settings', icon: 'chat' }
            ]
          },
          {
            title: 'ПЕРСОНАЛІЗАЦІЯ',
            items: [
              { label: 'Інтерфейс', section: 'appearance-settings', parentSection: 'messenger-settings', icon: 'paint' },
              { label: 'Мова', section: 'language-settings', parentSection: 'messenger-settings', icon: 'globe' }
            ]
          }
        ]
      },
      navCalls: {
        title: 'Дзвінки',
        groups: [
          {
            title: 'ТЕЛЕФОНІЯ',
            items: [
              { label: 'Історія дзвінків', section: 'calls', icon: 'phone' },
              { label: 'Сповіщення', section: 'notifications-center', icon: 'bell' }
            ]
          }
        ]
      },
      navShop: {
        title: 'Магазин',
        groups: [
          {
            title: 'КАТАЛОГ',
            items: [
              { label: 'Усі товари', section: 'messenger-settings', parentSection: 'messenger-settings', icon: 'store', shopCategory: 'all' },
              { label: 'Аватар', section: 'messenger-settings', parentSection: 'messenger-settings', icon: 'user', shopCategory: 'frame' },
              { label: 'Фон', section: 'messenger-settings', parentSection: 'messenger-settings', icon: 'image', shopCategory: 'aura' },
              { label: 'Анімація', section: 'messenger-settings', parentSection: 'messenger-settings', icon: 'sparkles', shopCategory: 'motion' },
              { label: 'Значки', section: 'messenger-settings', parentSection: 'messenger-settings', icon: 'badge', shopCategory: 'badge' },
              { label: 'Авто Nymo Drive', section: 'messenger-settings', parentSection: 'messenger-settings', icon: 'drift', shopCategory: 'car' },
              { label: 'Дим Nymo Drive', section: 'messenger-settings', parentSection: 'messenger-settings', icon: 'smoke', shopCategory: 'smoke' }
            ]
          },
          {
            title: 'АКАУНТ',
            items: [
              { label: 'Мої предмети', section: 'profile-items', parentSection: 'messenger-settings', icon: 'cube' }
            ]
          }
        ]
      },
      navWallet: {
        title: 'Гаманець',
        groups: [
          {
            title: 'ФІНАНСИ',
            items: [
              { label: 'Гаманець і транзакції', section: 'wallet', icon: 'wallet', walletView: 'ledger' },
              { label: 'Аналітика', section: 'wallet', icon: 'chart', walletView: 'analytics' }
            ]
          }
        ]
      },
      navSettings: {
        title: 'Налаштування',
        groups: [
          {
            title: 'СПІЛКУВАННЯ',
            items: [
              { label: 'Сповіщення', section: 'notifications-settings', parentSection: 'messenger-settings', icon: 'bell' },
              { label: 'Конфіденційність', section: 'privacy-settings', parentSection: 'messenger-settings', icon: 'shield' },
              { label: 'Повідомлення', section: 'messages-settings', parentSection: 'messenger-settings', icon: 'chat' }
            ]
          },
          {
            title: 'ІНТЕРФЕЙС',
            items: [
              { label: 'Інтерфейс', section: 'appearance-settings', parentSection: 'messenger-settings', icon: 'paint' },
              { label: 'Мова', section: 'language-settings', parentSection: 'messenger-settings', icon: 'globe' }
            ]
          },
          {
            title: 'ПРОФІЛЬ',
            items: [
              { label: 'Мої предмети', section: 'profile-items', parentSection: 'messenger-settings', icon: 'cube' }
            ]
          }
        ]
      },
      navFaq: {
        title: 'FAQ',
        groups: [
          {
            title: 'ОСНОВНЕ',
            items: [
              { label: 'Огляд', section: 'faq-settings', parentSection: 'settings-home', icon: 'question', faqSection: 'overview' },
              { label: 'Швидкий старт', section: 'faq-settings', parentSection: 'settings-home', icon: 'sparkles', faqSection: 'getting-started' },
              { label: 'Навігація', section: 'faq-settings', parentSection: 'settings-home', icon: 'globe', faqSection: 'navigation' },
              { label: 'Профіль і акаунт', section: 'faq-settings', parentSection: 'settings-home', icon: 'user', faqSection: 'profile' },
              { label: 'Чати і дзвінки', section: 'faq-settings', parentSection: 'settings-home', icon: 'chat', faqSection: 'chats' },
              { label: 'Магазин і Nymo Value', section: 'faq-settings', parentSection: 'settings-home', icon: 'store', faqSection: 'shop' },
              { label: 'Гаманець', section: 'faq-settings', parentSection: 'settings-home', icon: 'wallet', faqSection: 'wallet' }
            ]
          },
          {
            title: 'ДОДАТКОВО',
            items: [
              { label: 'Персоналізація', section: 'faq-settings', parentSection: 'settings-home', icon: 'paint', faqSection: 'customization' },
              { label: 'Налаштування', section: 'faq-settings', parentSection: 'settings-home', icon: 'gear', faqSection: 'settings' },
              { label: 'Ігри та Nymo Drive', section: 'faq-settings', parentSection: 'settings-home', icon: 'drift', faqSection: 'games' },
              { label: 'Mobile версія', section: 'faq-settings', parentSection: 'settings-home', icon: 'sliders', faqSection: 'mobile' },
              { label: 'Якщо щось не так', section: 'faq-settings', parentSection: 'settings-home', icon: 'warning', faqSection: 'troubleshooting' }
            ]
          }
        ]
      },
      navGames: {
        title: 'Ігри',
        groups: [
          {
            title: 'ІГРОВИЙ ЦЕНТР',
            items: [
              { label: 'Клікер', section: 'mini-games', icon: 'clicker', miniGameView: 'tapper' },
              { label: 'Nymo 2048', section: 'mini-games', icon: 'grid2048', miniGameView: 'grid2048' },
              { label: 'Flappy Nymo', section: 'mini-games', icon: 'flappy', miniGameView: 'flappy' },
              { label: 'Nymo Drive', section: 'mini-games', icon: 'drift', miniGameView: 'drift' }
            ]
          },
          {
            title: 'АКАУНТ',
            items: [
              { label: 'Мої предмети', section: 'profile-items', parentSection: 'mini-games', icon: 'cube' },
              { label: 'Мій профіль', section: 'profile', parentSection: 'profile', icon: 'user' }
            ]
          }
        ]
      },
      navProfile: {
        title: 'Профіль',
        groups: [
          {
            title: 'ОСНОВНЕ',
            items: [
              { label: 'Мій профіль', section: 'profile', parentSection: 'profile', icon: 'user' },
              { label: 'Налаштування профілю', section: 'profile-settings', parentSection: 'profile', icon: 'profileSettings' },
              { label: 'Мої предмети', section: 'profile-items', parentSection: 'profile', icon: 'cube' }
            ]
          },
          {
            title: 'ПРИВАТНІСТЬ',
            items: [
              { label: 'Конфіденційність', section: 'privacy-settings', parentSection: 'profile', icon: 'shield' },
              { label: 'Сповіщення', section: 'notifications-settings', parentSection: 'profile', icon: 'bell' }
            ]
          }
        ]
      }
    }
;

function localizeDesktopSecondarySection(sectionConfig, language = 'uk') {
  if (!sectionConfig || typeof sectionConfig !== 'object') return sectionConfig;
  if (normalizeUiLanguage(language) !== 'en') return sectionConfig;

  const groups = Array.isArray(sectionConfig.groups)
    ? sectionConfig.groups.map((group) => ({
      ...group,
      title: translateUiText(group?.title || '', language),
      items: Array.isArray(group?.items)
        ? group.items.map((item) => ({
          ...item,
          label: translateUiText(item?.label || '', language)
        }))
        : []
    }))
    : [];

  return {
    ...sectionConfig,
    title: translateUiText(sectionConfig.title || '', language),
    groups
  };
}

export function getDesktopSecondaryMenuConfigByNav(targetNavId = '', language = 'uk') {
  const safeTarget = String(targetNavId || '').trim();
  const section = DESKTOP_SECONDARY_MENU_CONFIG[safeTarget] || DESKTOP_SECONDARY_MENU_CONFIG.navSettings;
  return localizeDesktopSecondarySection(section, language);
}
