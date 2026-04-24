import { setupMobileSwipeBack } from '../../shared/gestures/swipe-handlers.js';
import { getContactColor } from '../../shared/helpers/ui-helpers.js';
import { buildApiUrl } from '../../shared/api/api-url.js';
import { applyThemeBranding } from '../../shared/helpers/theme-branding.js';
import {
  normalizeUiLanguage,
  translateUiText,
  applyUiLocalizationToDocument
} from '../../shared/i18n/ui-localization.js';

export class ChatAppCoreMethods {
  readRawStorageWithLegacy(primaryKey, legacyKey = '') {
    const primary = String(primaryKey || '').trim();
    const legacy = String(legacyKey || '').trim();
    if (!primary) return '';
    const primaryValue = localStorage.getItem(primary);
    if (primaryValue != null && primaryValue !== '') return primaryValue;
    if (!legacy) return primaryValue || '';
    const legacyValue = localStorage.getItem(legacy);
    if (legacyValue != null && legacyValue !== '') {
      try {
        localStorage.setItem(primary, legacyValue);
      } catch {
        // Ignore storage migration failures.
      }
      return legacyValue;
    }
    return primaryValue || '';
  }

  readJsonStorageWithLegacy(primaryKey, legacyKey, fallback) {
    const rawValue = this.readRawStorageWithLegacy(primaryKey, legacyKey);
    if (!rawValue) return fallback;
    try {
      return JSON.parse(rawValue);
    } catch {
      try {
        localStorage.removeItem(primaryKey);
        if (legacyKey) localStorage.removeItem(legacyKey);
      } catch {
        // Ignore storage cleanup failures.
      }
      return fallback;
    }
  }

  writeRawStorageWithLegacy(primaryKey, legacyKey, value) {
    try {
      localStorage.setItem(primaryKey, value);
    } catch {
      // Ignore storage write errors.
    }
    if (!legacyKey) return;
    try {
      localStorage.setItem(legacyKey, value);
    } catch {
      // Ignore legacy storage write errors.
    }
  }

  readJsonStorage(key, fallback) {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) return fallback;

    try {
      return JSON.parse(rawValue);
    } catch (error) {
      console.warn(`Invalid JSON in localStorage for key "${key}", resetting value.`);
      localStorage.removeItem(key);
      return fallback;
    }
  }

  loadUserProfile() {
    const data = this.readJsonStorageWithLegacy('nymo_user', 'orion_user', null);
    if (data && typeof data === 'object') {
      const avatarImage = String(data.avatarImage || data.avatarUrl || '').trim();
      const userId = String(data.id || data.userId || data._id || '').trim();
      return {
        id: userId,
        name: data.name || 'Користувач Nymo',
        email: data.email || 'user@example.com',
        status: data.status || 'online',
        bio: data.bio || 'Вітаю!',
        birthDate: data.birthDate || '',
        createdAt: data.createdAt || new Date().toISOString(),
        avatarColor: data.avatarColor || '',
        avatarImage,
        avatarUrl: avatarImage,
        equippedAvatarFrame: data.equippedAvatarFrame || '',
        equippedProfileAura: data.equippedProfileAura || '',
        equippedProfileMotion: data.equippedProfileMotion || '',
        equippedProfileBadge: data.equippedProfileBadge || '',
        equippedChatBackground: data.equippedChatBackground || '',
        equippedDriveCar: data.equippedDriveCar || '',
        equippedDriveSmokeColor: data.equippedDriveSmokeColor || ''
      };
    }
    return {
      id: '',
      name: 'Користувач Nymo',
      email: 'user@example.com',
      status: 'online',
      bio: 'Вітаю!',
      birthDate: '',
      createdAt: new Date().toISOString(),
      avatarColor: '',
      avatarImage: '',
      avatarUrl: '',
      equippedAvatarFrame: '',
      equippedProfileAura: '',
      equippedProfileMotion: '',
      equippedProfileBadge: '',
      equippedChatBackground: '',
      equippedDriveCar: '',
      equippedDriveSmokeColor: ''
    };
  }

  saveUserProfile(userData) {
    const avatarImage = this.getAvatarImage(userData?.avatarImage || userData?.avatarUrl);
    const nextUserData = {
      ...(this.user && typeof this.user === 'object' ? this.user : {}),
      ...userData,
      id: String(userData?.id || userData?.userId || userData?._id || this.user?.id || '').trim(),
      avatarImage,
      avatarUrl: avatarImage
    };
    this.user = nextUserData;
    this.writeRawStorageWithLegacy('nymo_user', 'orion_user', JSON.stringify(nextUserData));
    this.updateProfileMenuButton();
    this.updateProfileDisplay();
    this.applyChatBackground(document);
  }

  formatCoinBalance(value, wholeDigits = 1) {
    const cents = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
    const minWholeDigits = Number.isFinite(wholeDigits) ? Math.max(1, Math.floor(wholeDigits)) : 1;
    const whole = String(Math.floor(cents / 100)).padStart(minWholeDigits, '0');
    const fraction = String(cents % 100).padStart(2, '0');
    return `${whole},${fraction}`;
  }

  formatShopIslandBalance(value) {
    return this.formatCoinBalance(value, 1);
  }

  getWalletTransactionTitleHints() {
    const stored = this.readJsonStorageWithLegacy(
      'nymo_wallet_tx_title_hints',
      'orion_wallet_tx_title_hints',
      []
    );
    if (!Array.isArray(stored)) return [];
    return stored
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => {
        const amountCents = Number.parseInt(entry.amountCents, 10);
        const title = String(entry.title || '').trim();
        const createdAt = String(entry.createdAt || '').trim();
        if (!Number.isFinite(amountCents) || amountCents === 0) return null;
        if (!title || !createdAt) return null;
        return {
          id: String(entry.id || `${createdAt}-${Math.random().toString(16).slice(2, 10)}`).trim(),
          amountCents: Math.trunc(amountCents),
          title,
          createdAt,
          subtitle: String(entry.subtitle || '').trim(),
          category: String(entry.category || '').trim(),
          type: String(entry.type || '').trim(),
          direction: String(entry.direction || '').trim(),
          game: String(entry.game || '').trim(),
          item: String(entry.item || '').trim(),
          source: String(entry.source || '').trim(),
          details: String(entry.details || '').trim()
        };
      })
      .filter(Boolean)
      .slice(0, 500);
  }

  saveWalletTransactionTitleHints(entries) {
    const safeEntries = Array.isArray(entries) ? entries.slice(0, 500) : [];
    try {
      this.writeRawStorageWithLegacy(
        'nymo_wallet_tx_title_hints',
        'orion_wallet_tx_title_hints',
        JSON.stringify(safeEntries)
      );
    } catch {
      // Ignore storage failures.
    }
    return safeEntries;
  }

  addWalletTransactionTitleHint({
    amountCents = 0,
    title = '',
    subtitle = '',
    createdAt = '',
    category = '',
    type = '',
    direction = '',
    game = '',
    item = '',
    source = '',
    details = ''
  } = {}) {
    const safeAmount = Number.isFinite(amountCents) ? Math.trunc(amountCents) : 0;
    const safeTitle = String(title || '').trim();
    const safeCreatedAt = String(createdAt || new Date().toISOString()).trim();
    if (!safeAmount || !safeTitle) return null;
    const nextEntry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
      amountCents: safeAmount,
      title: safeTitle,
      subtitle: String(subtitle || '').trim(),
      createdAt: safeCreatedAt,
      category: String(category || '').trim(),
      type: String(type || '').trim(),
      direction: String(direction || '').trim(),
      game: String(game || '').trim(),
      item: String(item || '').trim(),
      source: String(source || '').trim(),
      details: String(details || '').trim()
    };
    const history = this.getWalletTransactionTitleHints();
    history.unshift(nextEntry);
    this.saveWalletTransactionTitleHints(history);
    return nextEntry;
  }

  isWalletTransactionTitleGeneric(value, { currency = '' } = {}) {
    const raw = String(value || '').trim();
    if (!raw) return true;
    const token = raw.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
    const normalizedCurrency = String(currency || '').trim().toLowerCase();
    if (normalizedCurrency && token === normalizedCurrency) return true;
    const isDateLikeToken = /^\d{4}(?:[-/.:\s]\d{2}){2}(?:[t\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:z|[+-]\d{2}:?\d{2})?)?$/.test(token);
    if (isDateLikeToken) return true;
    const genericTokens = new Set([
      'adjustment',
      'transaction',
      'transactions',
      'general',
      'wallet',
      'поповнення балансу',
      'списання балансу',
      'транзакція',
      'коригування',
      'дохід',
      'coin',
      'coins',
      'nymo value',
      'value'
    ]);
    return genericTokens.has(token);
  }

  applyWalletTransactionTitleHints(entries = []) {
    const safeEntries = Array.isArray(entries) ? entries : [];
    if (!safeEntries.length) return [];

    const hints = this.getWalletTransactionTitleHints();
    if (!hints.length) return safeEntries;
    const consumedHintIds = new Set();
    const currency = this.getWalletCurrencyCode();
    const parseTimeMs = (value) => {
      const ts = new Date(value).getTime();
      return Number.isFinite(ts) ? ts : 0;
    };
    const pickPatchValue = (current, hinted) => {
      if (String(current || '').trim()) return current;
      const next = String(hinted || '').trim();
      return next || current;
    };
    const patchableFieldEntries = [
      ['subtitle', 'subtitle'],
      ['category', 'category'],
      ['type', 'type'],
      ['direction', 'direction'],
      ['game', 'game'],
      ['item', 'item'],
      ['source', 'source'],
      ['details', 'details']
    ];

    return safeEntries.map((entry) => {
      if (!entry || typeof entry !== 'object') return entry;
      const isGenericTitle = this.isWalletTransactionTitleGeneric(entry.title, { currency });
      const canPatchMetadata = !String(entry.subtitle || '').trim()
        || !String(entry.game || '').trim()
        || !String(entry.item || '').trim()
        || !String(entry.source || '').trim();
      if (!isGenericTitle && !canPatchMetadata) return entry;

      const entryAmount = Number(entry.amountCents) || 0;
      if (!entryAmount) return entry;
      const entryTime = parseTimeMs(entry.createdAt);
      if (!entryTime) return entry;

      let bestHint = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      hints.forEach((hint) => {
        if (!hint || typeof hint !== 'object') return;
        if (consumedHintIds.has(hint.id)) return;
        const hintAmount = Number(hint.amountCents) || 0;
        if (hintAmount !== entryAmount) return;
        const hintTime = parseTimeMs(hint.createdAt);
        if (!hintTime) return;
        const distance = Math.abs(hintTime - entryTime);
        if (distance > 5 * 60 * 1000) return;
        if (distance < bestDistance) {
          bestDistance = distance;
          bestHint = hint;
        }
      });

      if (!bestHint) return entry;
      consumedHintIds.add(bestHint.id);

      const patchedEntry = {
        ...entry,
        title: isGenericTitle ? String(bestHint.title || '').trim() || entry.title : entry.title
      };
      patchableFieldEntries.forEach(([field, hintField]) => {
        patchedEntry[field] = pickPatchValue(patchedEntry[field], bestHint[hintField]);
      });
      return patchedEntry;
    });
  }

  getWalletCurrencyCode() {
    const dynamic = String(this.walletCurrencyCode || '').trim().toUpperCase();
    if (dynamic) return dynamic;
    return 'COIN';
  }

  extractWalletCurrencyCode(payload) {
    const root = payload && typeof payload === 'object' ? payload : {};
    const candidates = [
      root?.currency,
      root?.wallet?.currency,
      root?.data?.currency,
      root?.data?.wallet?.currency,
      root?.result?.currency,
      root?.result?.wallet?.currency
    ];
    for (const candidate of candidates) {
      const code = String(candidate || '').trim().toUpperCase();
      if (!code) continue;
      if (/^[A-Z0-9_-]{2,12}$/.test(code)) return code;
    }
    return '';
  }

  getWalletApiHeaders({ json = false } = {}) {
    if (typeof this.getApiHeaders === 'function') {
      const headers = this.getApiHeaders({ json });
      if (headers && typeof headers === 'object') {
        const normalized = { ...headers };
        if (!String(normalized['X-User-Id'] || '').trim()) {
          const fallbackUserId = String(this.user?.id || this.user?.userId || this.user?._id || '').trim();
          if (fallbackUserId) normalized['X-User-Id'] = fallbackUserId;
        }
        return normalized;
      }
    }
    const fallback = {};
    if (json) fallback['Content-Type'] = 'application/json';
    const fallbackUserId = String(this.user?.id || this.user?.userId || this.user?._id || '').trim();
    if (fallbackUserId) fallback['X-User-Id'] = fallbackUserId;
    return fallback;
  }

  getWalletAmountMinorUnits(value) {
    if (value == null) return NaN;
    if (typeof value === 'object') {
      const nestedCandidates = [
        value.amountMinor,
        value.balanceMinor,
        value.amount,
        value.balance,
        value.value
      ];
      for (const candidate of nestedCandidates) {
        const nested = this.getWalletAmountMinorUnits(candidate);
        if (Number.isFinite(nested)) return nested;
      }
      return NaN;
    }
    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  isLikelyNetworkPolicyError(error) {
    const message = String(error?.message || error || '').trim().toLowerCase();
    if (!message) return false;
    return (
      message.includes('failed to fetch') ||
      message.includes('networkerror') ||
      message.includes('load failed') ||
      message.includes('network request failed') ||
      message.includes('cors') ||
      message.includes('preflight')
    );
  }

  extractWalletBalanceMinorUnits(payload) {
    const root = payload && typeof payload === 'object' ? payload : {};
    const candidates = [
      root?.balanceMinor,
      root?.balanceAmount,
      root?.balance,
      root?.amount,
      root?.wallet,
      root?.data,
      root?.data?.wallet,
      root?.result,
      root?.result?.wallet
    ];

    for (const candidate of candidates) {
      const parsed = this.getWalletAmountMinorUnits(candidate);
      if (!Number.isFinite(parsed)) continue;
      return Math.max(0, parsed);
    }
    return null;
  }

  normalizeWalletTransactionsPayload(payload) {
    const root = payload && typeof payload === 'object' ? payload : {};
    const pickTransactionArray = (source) => {
      if (!source) return null;
      if (Array.isArray(source)) return source;
      if (typeof source !== 'object') return null;

      const directCandidates = [
        source.transactions,
        source.items,
        source.history,
        source.results,
        source.data,
        source.rows,
        source.records,
        source.entries,
        source.docs,
        source.list
      ];
      for (const candidate of directCandidates) {
        if (Array.isArray(candidate)) return candidate;
      }

      const nestedCandidates = [
        source.data,
        source.result,
        source.wallet,
        source.payload
      ];
      for (const nested of nestedCandidates) {
        if (!nested || typeof nested !== 'object') continue;
        const nestedList = [
          nested.transactions,
          nested.items,
          nested.history,
          nested.results,
          nested.data,
          nested.rows,
          nested.records,
          nested.entries,
          nested.docs,
          nested.list
        ].find(Array.isArray);
        if (Array.isArray(nestedList)) return nestedList;
      }

      return null;
    };

    const preferredSources = [
      root?.data,
      root?.result,
      root?.wallet,
      root?.wallet?.history,
      root
    ];

    let rawList = null;
    for (const source of preferredSources) {
      const picked = pickTransactionArray(source);
      if (Array.isArray(picked)) {
        rawList = picked;
        break;
      }
    }

    if (!Array.isArray(rawList)) return [];

    const typeDirectionMap = {
      purchase: -1,
      buy: -1,
      debit: -1,
      expense: -1,
      transfer_out: -1,
      transfer: -1,
      earn: 1,
      reward: 1,
      credit: 1,
      income: 1,
      topup: 1,
      transfer_in: 1
    };
    const typeTitleMap = {
      earn: 'Дохід',
      purchase: 'Покупка',
      transfer_in: 'Вхідний переказ',
      transfer_out: 'Вихідний переказ',
      adjustment: ''
    };

    const normalizeLabel = (value) => String(value || '').trim().replace(/\s+/g, ' ');
    const normalizeToken = (value) => normalizeLabel(value).toLowerCase().replace(/[_-]+/g, ' ');
    const genericLabelSet = new Set([
      'adjustment',
      'transaction',
      'transactions',
      'general',
      'wallet',
      'income',
      'expense',
      'credit',
      'debit',
      'reward',
      'earn',
      'purchase',
      'topup',
      'transfer',
      'payment',
      'coin',
      'coins',
      'nymo value',
      'value',
      'транзакція',
      'коригування',
      'зарахування',
      'списання'
    ]);
    const ignoredTokenSet = new Set([
      'null',
      'undefined',
      'n a',
      'na',
      'ok',
      'done',
      'true',
      'false'
    ]);
    const noisePatterns = [
      /^[0-9]+$/,
      /^[0-9a-f]{24,64}$/i,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      /^[0-9a-f]{8}\s+[0-9a-f]{4}\s+[0-9a-f]{4}\s+[0-9a-f]{4}\s+[0-9a-f]{12}$/i,
      /^[0-9a-f]{6,}(?:\s+[0-9a-f]{4,}){2,}$/i,
      /^https?:\/\//i,
      /^\d{4}(?:[-/.:\s]\d{2}){2}(?:[t\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:z|[+-]\d{2}:?\d{2})?)?$/i,
      /^\+?\d{8,}$/,
      /^[a-z]{2,6}:[\w-]+$/i
    ];
    const isNoiseToken = (token) => {
      if (!token) return true;
      if (ignoredTokenSet.has(token)) return true;
      return noisePatterns.some((pattern) => pattern.test(token));
    };
    const isGenericToken = (token) => {
      if (!token) return true;
      if (genericLabelSet.has(token)) return true;
      return (
        token.endsWith(' adjustment')
        || token.startsWith('adjustment ')
        || token.endsWith(' transaction')
        || token.startsWith('transaction ')
      );
    };

    const toReadableTransactionTitle = (value) => {
      const rawLabel = normalizeLabel(value);
      if (!rawLabel) return '';
      const rawToken = rawLabel.toLowerCase().replace(/\s+/g, ' ');
      if (/^\d{4}(?:[-/.:\s]\d{2}){2}(?:[t\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:z|[+-]\d{2}:?\d{2})?)?$/.test(rawToken)) {
        return '';
      }
      const clean = rawLabel.replace(/[_-]+/g, ' ');
      if (!clean) return '';
      const key = clean.toLowerCase();

      if (/flappy/.test(key)) return 'Гра: Flappy Nymo';
      if (/2048/.test(key)) return 'Гра: Nymo 2048';
      if (/orion\s*drive|nymo\s*drive|drift|race/.test(key)) return 'Гра: Nymo Drive';
      if (/clicker|tapper|tap|клікер/.test(key)) return 'Гра: Клікер';
      if (/shop|store|purchase|buy|catalog/.test(key)) return 'Магазин';
      if (/sell|sale/.test(key)) return 'Продаж предмета';
      if (/referral|invite/.test(key)) return 'Реферальний бонус';
      if (/daily|bonus|reward|quest/.test(key)) return 'Бонус';
      if (/deposit|top up|topup|refill/.test(key)) return 'Поповнення балансу';
      if (/withdraw|cashout|spend|expense|debit/.test(key)) return 'Списання балансу';

      return clean;
    };

    const maybeParseJsonString = (value) => {
      if (typeof value !== 'string') return null;
      const text = value.trim();
      if (!text || text.length < 2) return null;
      if (!((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']')))) {
        return null;
      }
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    };

    const readNestedValue = (source, path) => {
      if (!source || typeof source !== 'object') return undefined;
      if (!path) return undefined;
      const chunks = Array.isArray(path)
        ? path.filter(Boolean)
        : String(path).split('.').map((item) => item.trim()).filter(Boolean);
      if (!chunks.length) return undefined;
      let cursor = source;
      for (const chunk of chunks) {
        if (!cursor || typeof cursor !== 'object') return undefined;
        cursor = cursor[chunk];
      }
      return cursor;
    };

    const toMeaningfulLabel = (value, { allowGeneric = false, allowNoise = false } = {}) => {
      const normalized = normalizeLabel(value);
      if (!normalized) return '';
      const token = normalizeToken(normalized);
      if (!token) return '';
      if (!allowNoise && isNoiseToken(token)) return '';
      if (!allowGeneric && isGenericToken(token)) return '';
      return normalized;
    };

    const pickMeaningfulLabel = (sources = [], paths = [], { allowGeneric = false, allowNoise = false } = {}) => {
      const safeSources = Array.isArray(sources) ? sources : [];
      const safePaths = Array.isArray(paths) ? paths : [];
      for (const source of safeSources) {
        if (!source || typeof source !== 'object') continue;
        for (const path of safePaths) {
          const raw = readNestedValue(source, path);
          if (raw && typeof raw === 'object') {
            const candidate = toMeaningfulLabel(
              raw.name
              || raw.nickname
              || raw.displayName
              || raw.username
              || raw.tag
              || raw.title
              || raw.label
              || raw.mobile
              || raw.phone
              || '',
              { allowGeneric, allowNoise }
            );
            if (candidate) return candidate;
            continue;
          }
          const candidate = toMeaningfulLabel(raw, { allowGeneric, allowNoise });
          if (candidate) return candidate;
        }
      }
      return '';
    };

    const extractEntityReference = (sources = [], {
      entityPaths = [],
      namePaths = [],
      idPaths = []
    } = {}) => {
      const safeSources = Array.isArray(sources) ? sources : [];
      const displayName = pickMeaningfulLabel(safeSources, [
        ...entityPaths,
        ...namePaths
      ]);
      const identifier = pickMeaningfulLabel(safeSources, [
        ...idPaths,
        ...entityPaths.map((path) => `${path}.id`),
        ...entityPaths.map((path) => `${path}.userId`),
        ...entityPaths.map((path) => `${path}._id`),
        ...entityPaths.map((path) => `${path}.uuid`),
        ...entityPaths.map((path) => `${path}.uid`)
      ], { allowGeneric: true, allowNoise: true });
      if (!displayName && !identifier) return '';
      if (displayName) return displayName;
      if (identifier.length <= 18) return `ID ${identifier}`;
      return `ID ${identifier.slice(0, 7)}...${identifier.slice(-4)}`;
    };

    const toGameLabel = (value) => {
      const clean = normalizeLabel(value).replace(/^гра:\s*/i, '');
      if (!clean) return '';
      const token = normalizeToken(clean);
      if (!token) return '';
      if (/flappy/.test(token)) return 'Flappy Nymo';
      if (/2048/.test(token)) return 'Nymo 2048';
      if (/orion\s*drive|nymo\s*drive|drift|race/.test(token)) return 'Nymo Drive';
      if (/clicker|tapper|tap|клікер/.test(token)) return 'Клікер';
      if (/game|гра/.test(token)) return clean;
      return '';
    };

    const collectObjectTitleCandidates = (source, depth = 0, seen = new WeakSet()) => {
      if (!source || depth > 4) return [];
      if (typeof source !== 'object') return [];
      if (seen.has(source)) return [];
      seen.add(source);
      const candidates = [];
      const keys = [
        'title',
        'name',
        'label',
        'description',
        'reason',
        'message',
        'source',
        'event',
        'type',
        'kind',
        'category',
        'action',
        'operation',
        'operationType',
        'sourceType',
        'source_name',
        'eventName',
        'eventType',
        'code',
        'slug',
        'provider',
        'system',
        'product',
        'feature',
        'module',
        'game',
        'app'
      ];

      keys.forEach((key) => {
        const value = source[key];
        if (typeof value === 'string' || typeof value === 'number') {
          const asString = String(value);
          candidates.push(asString);
          const parsed = maybeParseJsonString(asString);
          if (parsed && typeof parsed === 'object') {
            candidates.push(...collectObjectTitleCandidates(parsed, depth + 1, seen));
          }
          return;
        }
        if (Array.isArray(value)) {
          value.forEach((item) => {
            if (typeof item === 'string' || typeof item === 'number') {
              const asString = String(item);
              candidates.push(asString);
              const parsed = maybeParseJsonString(asString);
              if (parsed && typeof parsed === 'object') {
                candidates.push(...collectObjectTitleCandidates(parsed, depth + 1, seen));
              }
              return;
            }
            if (item && typeof item === 'object') {
              candidates.push(...collectObjectTitleCandidates(item, depth + 1, seen));
            }
          });
          return;
        }
        if (value && typeof value === 'object') {
          candidates.push(...collectObjectTitleCandidates(value, depth + 1, seen));
        }
      });

      Object.keys(source).forEach((key) => {
        const keyToken = String(key || '').trim().toLowerCase();
        const value = source[key];
        const shouldIgnoreIdLikeValue = /(^|[_-])(id|uuid|txid|transactionid|userid|chatid|messageid)$/.test(keyToken);
        const shouldIgnoreDateLikeValue = /(^|[_-])(createdat|updatedat|timestamp|datetime|date|time|issuedat|expiresat)$/.test(keyToken);
        if (typeof value === 'string' || typeof value === 'number') {
          const asString = String(value);
          const valueToken = normalizeToken(asString);
          if (shouldIgnoreIdLikeValue && isNoiseToken(normalizeToken(asString))) {
            return;
          }
          if (shouldIgnoreDateLikeValue && isNoiseToken(valueToken)) {
            return;
          }
          candidates.push(asString);
          const parsed = maybeParseJsonString(asString);
          if (parsed && typeof parsed === 'object') {
            candidates.push(...collectObjectTitleCandidates(parsed, depth + 1, seen));
          }
          return;
        }
        if (Array.isArray(value)) {
          value.forEach((item) => {
            if (typeof item === 'string' || typeof item === 'number') {
              const asString = String(item);
              candidates.push(asString);
              const parsed = maybeParseJsonString(asString);
              if (parsed && typeof parsed === 'object') {
                candidates.push(...collectObjectTitleCandidates(parsed, depth + 1, seen));
              }
              return;
            }
            if (item && typeof item === 'object') {
              candidates.push(...collectObjectTitleCandidates(item, depth + 1, seen));
            }
          });
          return;
        }
        if (value && typeof value === 'object') {
          candidates.push(...collectObjectTitleCandidates(value, depth + 1, seen));
        }
      });

      return candidates;
    };

    const normalizeComparableUserId = (value) => String(value || '').trim().toLowerCase();
    const selfUserIdNormalized = normalizeComparableUserId(
      (typeof this.getAuthUserId === 'function' ? this.getAuthUserId() : '')
      || this.user?.id
      || this.user?.userId
      || this.user?._id
      || ''
    );
    const knownUserNameById = new Map();
    if (typeof this.collectKnownUsersForSearch === 'function') {
      const knownUsers = this.collectKnownUsersForSearch();
      if (Array.isArray(knownUsers)) {
        knownUsers.forEach((user) => {
          const id = normalizeComparableUserId(user?.id);
          const name = String(user?.name || '').trim();
          if (!id || !name || name === 'Користувач') return;
          knownUserNameById.set(id, name);
        });
      }
    }
    const toShortIdLabel = (identifier) => {
      const safeId = String(identifier || '').trim();
      if (!safeId) return '';
      if (safeId.length <= 18) return `ID ${safeId}`;
      return `ID ${safeId.slice(0, 7)}...${safeId.slice(-4)}`;
    };
    const resolveTransferPartyById = (identifier) => {
      const safeId = String(identifier || '').trim();
      if (!safeId) return '';
      const normalizedId = normalizeComparableUserId(safeId);
      if (selfUserIdNormalized && normalizedId === selfUserIdNormalized) return 'Ви';
      const knownName = knownUserNameById.get(normalizedId);
      if (knownName) return knownName;
      if (typeof this.getCachedUserName === 'function') {
        const cachedName = String(this.getCachedUserName(safeId) || '').trim();
        if (cachedName && cachedName !== 'Користувач') return cachedName;
      }
      return toShortIdLabel(safeId);
    };
    const fromEntityPaths = [
      'sender',
      'from',
      'fromUser',
      'sourceUser',
      'payer',
      'initiator',
      'actor',
      'author',
      'owner',
      'meta.fromUser',
      'metadata.fromUser',
      'details.fromUser',
      'payload.fromUser',
      'source.fromUser'
    ];
    const fromNamePaths = [
      'senderName',
      'fromName',
      'fromUserName',
      'senderNickname',
      'fromNickname',
      'senderTag',
      'fromTag',
      'actorName',
      'authorName',
      'ownerName',
      'meta.senderName',
      'meta.fromName',
      'metadata.senderName',
      'metadata.fromName',
      'details.senderName',
      'details.fromName',
      'payload.senderName',
      'payload.fromName'
    ];
    const fromIdPaths = [
      'senderId',
      'fromId',
      'fromUserId',
      'sourceUserId',
      'payerId',
      'initiatorId',
      'actorId',
      'authorId',
      'ownerId',
      'sender_id',
      'from_id',
      'from_user_id',
      'source_user_id',
      'payer_id',
      'initiator_id',
      'actor_id',
      'author_id',
      'owner_id',
      'meta.senderId',
      'meta.fromId',
      'meta.fromUserId',
      'metadata.senderId',
      'metadata.fromId',
      'metadata.fromUserId',
      'details.senderId',
      'details.fromId',
      'details.fromUserId',
      'payload.senderId',
      'payload.fromId',
      'payload.fromUserId',
      'source.senderId',
      'source.fromId',
      'source.fromUserId',
      'sender.id',
      'sender.userId',
      'from.id',
      'from.userId',
      'fromUser.id',
      'fromUser.userId',
      'initiator.id',
      'initiator.userId'
    ];
    const toEntityPaths = [
      'receiver',
      'to',
      'toUser',
      'targetUser',
      'recipient',
      'beneficiary',
      'destination',
      'meta.toUser',
      'metadata.toUser',
      'details.toUser',
      'payload.toUser',
      'source.toUser'
    ];
    const toNamePaths = [
      'receiverName',
      'toName',
      'toUserName',
      'recipientName',
      'receiverNickname',
      'toNickname',
      'receiverTag',
      'toTag',
      'beneficiaryName',
      'destinationName',
      'meta.receiverName',
      'meta.toName',
      'metadata.receiverName',
      'metadata.toName',
      'details.receiverName',
      'details.toName',
      'payload.receiverName',
      'payload.toName'
    ];
    const toIdPaths = [
      'receiverId',
      'toId',
      'toUserId',
      'targetUserId',
      'recipientId',
      'beneficiaryId',
      'destinationUserId',
      'receiver_id',
      'to_id',
      'to_user_id',
      'target_user_id',
      'recipient_id',
      'beneficiary_id',
      'destination_user_id',
      'meta.receiverId',
      'meta.toId',
      'meta.toUserId',
      'metadata.receiverId',
      'metadata.toId',
      'metadata.toUserId',
      'details.receiverId',
      'details.toId',
      'details.toUserId',
      'payload.receiverId',
      'payload.toId',
      'payload.toUserId',
      'source.receiverId',
      'source.toId',
      'source.toUserId',
      'receiver.id',
      'receiver.userId',
      'to.id',
      'to.userId',
      'toUser.id',
      'toUser.userId',
      'recipient.id',
      'recipient.userId'
    ];

    const normalizedEntries = rawList
      .map((entry, index) => {
        if (!entry || typeof entry !== 'object') return null;
        const amountRaw = this.getWalletAmountMinorUnits(
          entry.amountMinor
          ?? entry.amount
          ?? entry.delta
          ?? entry.value
          ?? entry.change
          ?? entry.priceAmount
        );
        if (!Number.isFinite(amountRaw) || amountRaw === 0) return null;

        const directionRaw = String(entry.direction || entry.flow || '').trim().toLowerCase();
        const typeRaw = String(entry.type || entry.kind || entry.category || '').trim().toLowerCase();
        let signedAmount = amountRaw;

        if (signedAmount > 0) {
          if (['debit', 'expense', 'out', 'withdraw'].includes(directionRaw)) {
            signedAmount = -signedAmount;
          } else if (typeDirectionMap[typeRaw] === -1) {
            signedAmount = -signedAmount;
          }
        } else if (signedAmount < 0) {
          if (['credit', 'income', 'in', 'deposit'].includes(directionRaw)) {
            signedAmount = Math.abs(signedAmount);
          } else if (typeDirectionMap[typeRaw] === 1) {
            signedAmount = Math.abs(signedAmount);
          }
        }

        const createdAt = String(
          entry.createdAt
          || entry.timestamp
          || entry.date
          || new Date().toISOString()
        ).trim();
        const fallbackTitle = typeRaw ? typeRaw.replace(/[_-]+/g, ' ') : 'Транзакція';
        const noteRaw = normalizeLabel(entry.note ?? entry.memo ?? '');
        const noteToken = normalizeToken(noteRaw);
        const titleFromNote = noteRaw && !isNoiseToken(noteToken) && !isGenericToken(noteToken)
          ? toReadableTransactionTitle(noteRaw)
          : '';
        const scopedSources = [
          entry,
          entry.source,
          entry.origin,
          entry.context,
          entry.meta,
          entry.metadata,
          entry.details,
          entry.payload,
          entry.data,
          entry.reference,
          entry.event,
          entry.transaction
        ].filter((source) => source && typeof source === 'object');
        const directCandidates = [
          entry.title,
          entry.description,
          entry.reason,
          entry.note,
          entry.label,
          entry.message,
          entry.sourceTitle,
          entry.sourceName,
          entry.operationName,
          entry.operationTitle,
          entry.activity,
          entry.eventName,
          entry.eventType,
          entry.displayName,
          entry.purpose,
          entry.subtype,
          entry.transactionType,
          entry.kindLabel
        ];
        const nestedCandidates = scopedSources.flatMap((source) => collectObjectTitleCandidates(source));
        const allCandidates = [...directCandidates, ...nestedCandidates]
          .map((value) => toReadableTransactionTitle(value))
          .map((value) => normalizeLabel(value))
          .filter(Boolean);
        const titleFromPayload = allCandidates.find((candidate) => {
          const token = normalizeToken(candidate);
          if (!token) return false;
          if (isNoiseToken(token)) return false;
          if (isGenericToken(token)) return false;
          return true;
        }) || '';
        const fallbackByType = String(typeTitleMap[typeRaw] || '').trim();
        const fallbackByDirection = signedAmount > 0 ? 'Поповнення балансу' : 'Списання балансу';
        const fallbackResolvedTitle = titleFromNote
          || titleFromPayload
          || fallbackByType
          || (!isGenericToken(normalizeToken(fallbackTitle)) ? toReadableTransactionTitle(fallbackTitle) : '')
          || fallbackByDirection
          || 'Транзакція';
        const gameLabel = toGameLabel(
          pickMeaningfulLabel(scopedSources, [
            'game',
            'gameName',
            'miniGame',
            'gameTitle',
            'sourceGame',
            'meta.game',
            'meta.gameName',
            'metadata.game',
            'metadata.gameName',
            'details.game',
            'details.gameName',
            'payload.game',
            'payload.gameName',
            'source.game',
            'source.gameName'
          ], { allowGeneric: true })
          || titleFromPayload
          || titleFromNote
          || typeRaw
        );
        const itemLabel = pickMeaningfulLabel(scopedSources, [
          'itemName',
          'itemTitle',
          'productName',
          'productTitle',
          'product.name',
          'product.title',
          'item.name',
          'item.title',
          'meta.itemName',
          'meta.productName',
          'metadata.itemName',
          'metadata.productName',
          'details.itemName',
          'details.productName',
          'payload.itemName',
          'payload.productName',
          'source.itemName',
          'source.productName'
        ]);
        const fromIdRaw = pickMeaningfulLabel(scopedSources, fromIdPaths, { allowGeneric: true, allowNoise: true });
        const toIdRaw = pickMeaningfulLabel(scopedSources, toIdPaths, { allowGeneric: true, allowNoise: true });
        const fromRefFromEntity = extractEntityReference(scopedSources, {
          entityPaths: fromEntityPaths,
          namePaths: fromNamePaths,
          idPaths: fromIdPaths
        });
        const toRefFromEntity = extractEntityReference(scopedSources, {
          entityPaths: toEntityPaths,
          namePaths: toNamePaths,
          idPaths: toIdPaths
        });
        const fromRefById = resolveTransferPartyById(fromIdRaw);
        const toRefById = resolveTransferPartyById(toIdRaw);
        const fromRef = (
          (fromRefById && !fromRefById.startsWith('ID ')) ? fromRefById
            : (fromRefFromEntity || fromRefById)
        );
        const toRef = (
          (toRefById && !toRefById.startsWith('ID ')) ? toRefById
            : (toRefFromEntity || toRefById)
        );
        const detailLabel = pickMeaningfulLabel(scopedSources, [
          'description',
          'reason',
          'note',
          'memo',
          'message',
          'purpose',
          'meta.reason',
          'meta.note',
          'metadata.reason',
          'metadata.note',
          'details.reason',
          'details.note',
          'payload.reason',
          'payload.note'
        ]);
        const semanticHaystack = normalizeToken([
          typeRaw,
          entry.type,
          entry.kind,
          entry.category,
          entry.transactionType,
          entry.operationType,
          entry.action,
          titleFromPayload,
          titleFromNote,
          detailLabel,
          gameLabel,
          itemLabel
        ].join(' '));
        const isTransfer = /(transfer|переказ|перевод|send|receive|p2p)/.test(semanticHaystack);
        const isPurchase = /(purchase|buy|shop|store|checkout|order|catalog|покуп|придбан)/.test(semanticHaystack);
        const isSale = /(sale|sell|sold|resale|продаж)/.test(semanticHaystack);
        const isGame = Boolean(gameLabel) || /(clicker|tapper|flappy|2048|drive|drift|game|гра|reward|bonus|quest)/.test(semanticHaystack);

        let title = fallbackResolvedTitle;
        let subtitle = '';
        if (isTransfer) {
          const normalizedFromId = normalizeComparableUserId(fromIdRaw);
          const normalizedToId = normalizeComparableUserId(toIdRaw);
          const fromCounterparty = (
            selfUserIdNormalized
            && normalizedFromId
            && normalizedFromId !== selfUserIdNormalized
          )
            ? resolveTransferPartyById(fromIdRaw)
            : '';
          const toCounterparty = (
            selfUserIdNormalized
            && normalizedToId
            && normalizedToId !== selfUserIdNormalized
          )
            ? resolveTransferPartyById(toIdRaw)
            : '';
          if (signedAmount > 0) {
            const incomingFrom = fromCounterparty || fromRef;
            title = incomingFrom ? `Переказ від ${incomingFrom}` : 'Вхідний переказ';
            if (toRef) subtitle = `Отримувач: ${toRef}`;
          } else {
            const outgoingTo = toCounterparty || toRef;
            title = outgoingTo ? `Переказ для ${outgoingTo}` : 'Вихідний переказ';
            if (fromRef) subtitle = `Відправник: ${fromRef}`;
          }
        } else if (isPurchase || (signedAmount < 0 && itemLabel && /(shop|store|catalog|item|product|куп)/.test(semanticHaystack))) {
          title = itemLabel ? `Покупка: ${itemLabel}` : 'Покупка';
          if (gameLabel) subtitle = `Розділ: ${gameLabel}`;
        } else if (isSale || (signedAmount > 0 && itemLabel && /(sale|sell|прод)/.test(semanticHaystack))) {
          title = itemLabel ? `Продаж: ${itemLabel}` : 'Продаж';
          if (toRef) subtitle = `Покупець: ${toRef}`;
          else if (gameLabel) subtitle = `Розділ: ${gameLabel}`;
        } else if (isGame) {
          title = gameLabel ? `Гра: ${gameLabel}` : (signedAmount > 0 ? 'Ігрова нагорода' : 'Ігрова витрата');
          if (itemLabel && normalizeToken(itemLabel) !== normalizeToken(gameLabel)) {
            subtitle = `Подія: ${itemLabel}`;
          }
        }
        if (!subtitle && detailLabel) {
          const detailToken = normalizeToken(detailLabel);
          const titleToken = normalizeToken(title);
          if (detailToken && detailToken !== titleToken) {
            subtitle = detailLabel;
          }
        }
        if (!subtitle && !isTransfer && fromRef && signedAmount > 0) {
          subtitle = `Від: ${fromRef}`;
        }
        if (!subtitle && !isTransfer && toRef && signedAmount < 0) {
          subtitle = `Кому: ${toRef}`;
        }
        const category = String(typeRaw || entry.category || 'general').trim() || 'general';
        const id = String(entry.id || entry.txId || entry.transactionId || `${createdAt}-${index}`).trim();

        return {
          id,
          amountCents: Math.trunc(signedAmount),
          createdAt,
          title,
          subtitle,
          category,
          type: typeRaw,
          direction: signedAmount > 0 ? 'credit' : 'debit',
          game: gameLabel,
          item: itemLabel,
          from: fromRef,
          to: toRef,
          source: normalizeLabel(
            entry.sourceName
            || entry.sourceTitle
            || (typeof entry.source === 'string' || typeof entry.source === 'number' ? entry.source : '')
          ),
          details: detailLabel
        };
      })
      .filter(Boolean)
      .slice(0, 200);
    return this.applyWalletTransactionTitleHints(normalizedEntries).slice(0, 200);
  }

  async refreshCoinWalletFromBackend({ includeTransactions = false, silent = true, force = false } = {}) {
    const headers = this.getWalletApiHeaders();
    if (!String(headers?.['X-User-Id'] || '').trim()) return null;

    const currency = this.getWalletCurrencyCode();
    const encodedCurrency = encodeURIComponent(currency);
    const now = Date.now();
    const walletSuccessTtlMs = 15_000;
    const transactionsSuccessTtlMs = 20_000;
    const walletFailureCooldownMs = 30_000;
    const transactionsFailureCooldownMs = 30_000;
    const walletNetworkPolicyCooldownMs = 180_000;

    if (!force) {
      if (this.walletRefreshPromise) {
        if (this.walletRefreshIncludesTransactions || !includeTransactions) {
          return this.walletRefreshPromise;
        }
        return this.walletRefreshPromise.then(() => this.refreshCoinWalletFromBackend({
          includeTransactions: true,
          silent,
          force: true
        }));
      }

      const walletRetryAfter = Number(this.walletRefreshRetryAfterTs || 0);
      if (walletRetryAfter > now) {
        return {
          balance: this.getTapBalanceCents(),
          currency,
          cached: true,
          skipped: 'wallet-backoff'
        };
      }

      const walletNetworkRetryAfter = Number(this.walletNetworkPolicyRetryAfterTs || 0);
      if (walletNetworkRetryAfter > now) {
        return {
          balance: this.getTapBalanceCents(),
          currency,
          cached: true,
          skipped: 'wallet-network-policy-backoff'
        };
      }

      if (includeTransactions) {
        const txRetryAfter = Number(this.walletTransactionsRetryAfterTs || 0);
        if (txRetryAfter > now) {
          return {
            balance: this.getTapBalanceCents(),
            currency,
            cached: true,
            skipped: 'transactions-backoff'
          };
        }
      }

      const walletLastRefreshAt = Number(this.walletLastRefreshAt || 0);
      const walletIsFresh = walletLastRefreshAt > 0 && (now - walletLastRefreshAt) < walletSuccessTtlMs;
      if (walletIsFresh) {
        if (!includeTransactions) {
          return {
            balance: this.getTapBalanceCents(),
            currency,
            cached: true,
            skipped: 'wallet-cache'
          };
        }
        const txLastRefreshAt = Number(this.walletLastTransactionsRefreshAt || 0);
        const transactionsAreFresh = txLastRefreshAt > 0 && (now - txLastRefreshAt) < transactionsSuccessTtlMs;
        if (transactionsAreFresh) {
          return {
            balance: this.getTapBalanceCents(),
            currency,
            cached: true,
            skipped: 'transactions-cache'
          };
        }
      }
    }

    const refreshTask = (async () => {
      const walletResponse = await fetch(buildApiUrl(`/wallet/me?currency=${encodedCurrency}`), {
        headers
      });
      if (!walletResponse.ok) {
        this.walletRefreshRetryAfterTs = Date.now() + walletFailureCooldownMs;
        if (!silent) {
          console.warn(`[wallet] GET /wallet/me failed with status ${walletResponse.status}`);
        }
        return {
          balance: this.getTapBalanceCents(),
          currency,
          cached: true,
          failed: true,
          status: walletResponse.status
        };
      }

      const walletPayload = await walletResponse.json().catch(() => ({}));
      const backendCurrency = this.extractWalletCurrencyCode(walletPayload);
      if (backendCurrency) {
        this.walletCurrencyCode = backendCurrency;
      }
      const nextBalance = this.extractWalletBalanceMinorUnits(walletPayload);
      if (Number.isFinite(nextBalance)) {
        this.coinLastSyncedBalanceCents = nextBalance;
        this.setTapBalanceCents(nextBalance, { syncBackend: false });
      }
      this.walletRefreshRetryAfterTs = 0;
      this.walletNetworkPolicyRetryAfterTs = 0;
      this.walletLastRefreshAt = Date.now();

      if (includeTransactions) {
        const txResponse = await fetch(buildApiUrl(`/wallet/me/transactions?currency=${encodedCurrency}`), {
          headers
        });
        if (txResponse.ok) {
          const txPayload = await txResponse.json().catch(() => ({}));
          const normalized = this.normalizeWalletTransactionsPayload(txPayload);
          const hintPatched = this.applyWalletTransactionTitleHints(normalized);
          this.saveCoinTransactionHistory(hintPatched);
          this.walletTransactionsRetryAfterTs = 0;
          this.walletLastTransactionsRefreshAt = Date.now();
        } else if (!silent) {
          this.walletTransactionsRetryAfterTs = Date.now() + transactionsFailureCooldownMs;
          console.warn(`[wallet] GET /wallet/me/transactions failed with status ${txResponse.status}`);
        } else {
          this.walletTransactionsRetryAfterTs = Date.now() + transactionsFailureCooldownMs;
        }
      }

      return {
        balance: this.getTapBalanceCents(),
        currency
      };
    })().catch((error) => {
      if (this.isLikelyNetworkPolicyError(error)) {
        const retryAt = Date.now() + walletNetworkPolicyCooldownMs;
        this.walletRefreshRetryAfterTs = retryAt;
        this.walletTransactionsRetryAfterTs = retryAt;
        this.walletNetworkPolicyRetryAfterTs = retryAt;
      } else {
        this.walletRefreshRetryAfterTs = Date.now() + walletFailureCooldownMs;
      }
      if (!silent) {
        console.warn('[wallet] Failed to refresh wallet from backend:', error);
      }
      return {
        balance: this.getTapBalanceCents(),
        currency,
        cached: true,
        failed: true
      };
    });

    this.walletRefreshPromise = refreshTask;
    this.walletRefreshIncludesTransactions = Boolean(includeTransactions);

    return refreshTask.finally(() => {
      if (this.walletRefreshPromise === refreshTask) {
        this.walletRefreshPromise = null;
        this.walletRefreshIncludesTransactions = false;
      }
    });
  }

  async syncCoinBalanceToBackend(balanceCents, { silent = true, transactionMeta = null } = {}) {
    const headers = this.getWalletApiHeaders({ json: true });
    if (!String(headers?.['X-User-Id'] || '').trim()) return false;

    const safeBalance = Number.isFinite(balanceCents) ? Math.max(0, Math.floor(balanceCents)) : 0;
    const now = Date.now();
    const retryAfter = Number(this.walletSetBalanceRetryAfterTs || 0);
    const canTrySetBalance = retryAfter <= 0 || now >= retryAfter;
    const knownSynced = Number(this.coinLastSyncedBalanceCents);
    const hasKnownSynced = Number.isFinite(knownSynced);
    const transactionDeltaRaw = Number(transactionMeta?.amountCents);
    const positiveTransactionDelta = Number.isFinite(transactionDeltaRaw) && transactionDeltaRaw > 0
      ? Math.trunc(transactionDeltaRaw)
      : 0;
    const positiveDelta = hasKnownSynced ? Math.max(0, safeBalance - knownSynced) : 0;
    const tryEarnFallbackFirst = false;

    if (!this.walletSetBalancePayloadKey) {
      try {
        this.walletSetBalancePayloadKey = String(this.readRawStorageWithLegacy(
          'nymo_wallet_set_balance_payload_key',
          'orion_wallet_set_balance_payload_key'
        ) || '').trim();
      } catch {
        // Ignore storage read errors.
      }
    }
    if (!this.walletSetBalanceCurrency) {
      try {
        this.walletSetBalanceCurrency = String(this.readRawStorageWithLegacy(
          'nymo_wallet_set_balance_currency',
          'orion_wallet_set_balance_currency'
        ) || '').trim().toUpperCase();
      } catch {
        // Ignore storage read errors.
      }
    }

    const preferredCurrency = String(this.walletSetBalanceCurrency || '').trim().toUpperCase();
    const currencyCandidates = [...new Set([
      preferredCurrency,
      this.getWalletCurrencyCode(),
      'COIN'
    ].map((item) => String(item || '').trim().toUpperCase()).filter(Boolean))];
    const payloadFactoryByKey = {
      balance: (currency) => ({ currency, balance: safeBalance }),
      balanceAmount: (currency) => ({ currency, balanceAmount: safeBalance }),
      newBalance: (currency) => ({ currency, newBalance: safeBalance }),
      balanceString: (currency) => ({ currency, balance: String(safeBalance) })
    };
    const payloadKeyOrder = ['balanceString', 'balance', 'balanceAmount', 'newBalance'];
    const preferredPayloadKey = String(this.walletSetBalancePayloadKey || '').trim();
    const payloadKeys = payloadKeyOrder.includes(preferredPayloadKey)
      ? [preferredPayloadKey, ...payloadKeyOrder.filter((key) => key !== preferredPayloadKey)]
      : payloadKeyOrder;

    const requestJsonSafe = async (endpoint, payload) => {
      const response = await fetch(buildApiUrl(endpoint), {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      return { response, data };
    };

    const tryEarnFallback = async () => false;

    if (tryEarnFallbackFirst) {
      const earned = await tryEarnFallback();
      if (earned) return true;
    }

    try {
      let lastStatus = 0;
      let lastDetails = '';
      for (const currency of currencyCandidates) {
        for (const payloadKey of payloadKeys) {
          const payloadFactory = payloadFactoryByKey[payloadKey];
          if (typeof payloadFactory !== 'function') continue;
          const payload = payloadFactory(currency);
          const { response, data } = await requestJsonSafe('/wallet/me/set-balance', payload);
          if (response.ok) {
            const responseCurrency = this.extractWalletCurrencyCode(data);
            if (responseCurrency) this.walletCurrencyCode = responseCurrency;
            this.walletSetBalanceCurrency = currency;
            this.walletSetBalancePayloadKey = payloadKey;
            try {
              this.writeRawStorageWithLegacy(
                'nymo_wallet_set_balance_currency',
                'orion_wallet_set_balance_currency',
                this.walletSetBalanceCurrency
              );
              this.writeRawStorageWithLegacy(
                'nymo_wallet_set_balance_payload_key',
                'orion_wallet_set_balance_payload_key',
                this.walletSetBalancePayloadKey
              );
            } catch {
              // Ignore storage write errors.
            }
            this.coinLastSyncedBalanceCents = safeBalance;
            this.walletSetBalanceRetryAfterTs = 0;
            return true;
          }

          lastStatus = response.status;
          lastDetails = String(data?.message || data?.error || '').trim();
          if (![400, 404, 405, 422].includes(response.status)) {
            if (!silent) {
              console.warn(`[wallet] POST /wallet/me/set-balance failed with status ${response.status}${lastDetails ? `: ${lastDetails}` : ''}`);
            }
            return false;
          }
        }
      }

      if ([400, 404, 405, 422].includes(lastStatus)) {
        this.walletSetBalanceRetryAfterTs = Date.now() + 60_000;
      }

      if (!silent) {
        const details = lastDetails ? `: ${lastDetails}` : '';
        console.warn(`[wallet] POST /wallet/me/set-balance failed with status ${lastStatus || 400}${details}`);
      }
      return false;
    } catch (error) {
      if (!silent) {
        console.warn('[wallet] Failed to sync balance to backend:', error);
      }
      return false;
    }
  }

  scheduleCoinBalanceBackendSync({ deltaCents = null, transactionMeta = null } = {}) {
    const headers = this.getWalletApiHeaders();
    if (!String(headers?.['X-User-Id'] || '').trim()) return;

    const nextBalance = this.getTapBalanceCents();
    this.pendingCoinBalanceSyncValue = nextBalance;
    if (transactionMeta && typeof transactionMeta === 'object') {
      const safeTitle = String(transactionMeta.title || '').trim();
      const safeCategory = String(transactionMeta.category || '').trim();
      const safeSubtitle = String(transactionMeta.subtitle || '').trim();
      const safeType = String(transactionMeta.type || '').trim();
      const safeDirection = String(transactionMeta.direction || '').trim();
      const safeGame = String(transactionMeta.game || '').trim();
      const safeItem = String(transactionMeta.item || '').trim();
      const safeSource = String(transactionMeta.source || '').trim();
      const safeDetails = String(transactionMeta.details || '').trim();
      const safeAmountFromMeta = Number(transactionMeta.amountCents);
      const safeAmount = Number.isFinite(deltaCents)
        ? Math.trunc(deltaCents)
        : (Number.isFinite(safeAmountFromMeta) ? Math.trunc(safeAmountFromMeta) : 0);

      if (safeTitle && safeAmount !== 0) {
        const nextMeta = {
          title: safeTitle,
          subtitle: safeSubtitle,
          category: safeCategory || 'general',
          type: safeType,
          direction: safeDirection || (safeAmount > 0 ? 'credit' : 'debit'),
          game: safeGame,
          item: safeItem,
          source: safeSource,
          details: safeDetails,
          amountCents: safeAmount
        };
        this.pendingCoinBalanceSyncMeta = nextMeta;
        const hintQueue = Array.isArray(this.pendingCoinBalanceSyncHintQueue)
          ? this.pendingCoinBalanceSyncHintQueue
          : [];
        hintQueue.push({
          ...nextMeta,
          createdAt: new Date().toISOString()
        });
        this.pendingCoinBalanceSyncHintQueue = hintQueue.slice(-40);
      }
    }
    if (this.coinBalanceSyncTimer) {
      window.clearTimeout(this.coinBalanceSyncTimer);
    }
    this.coinBalanceSyncTimer = window.setTimeout(() => {
      const valueToSync = Number(this.pendingCoinBalanceSyncValue);
      const metaToSync = this.pendingCoinBalanceSyncMeta && typeof this.pendingCoinBalanceSyncMeta === 'object'
        ? { ...this.pendingCoinBalanceSyncMeta }
        : null;
      const hintQueue = Array.isArray(this.pendingCoinBalanceSyncHintQueue)
        ? [...this.pendingCoinBalanceSyncHintQueue]
        : [];
      this.pendingCoinBalanceSyncValue = null;
      this.pendingCoinBalanceSyncMeta = null;
      this.pendingCoinBalanceSyncHintQueue = [];
      this.coinBalanceSyncTimer = null;
      if (!Number.isFinite(valueToSync)) return;
      hintQueue.forEach((hintEntry) => {
        if (!hintEntry || typeof hintEntry !== 'object') return;
        const hintTitle = String(hintEntry.title || '').trim();
        const hintAmount = Number(hintEntry.amountCents);
        if (!hintTitle || !Number.isFinite(hintAmount) || Math.trunc(hintAmount) === 0) return;
        this.addWalletTransactionTitleHint({
          amountCents: Math.trunc(hintAmount),
          title: hintTitle,
          subtitle: String(hintEntry.subtitle || '').trim(),
          category: String(hintEntry.category || '').trim(),
          type: String(hintEntry.type || '').trim(),
          direction: String(hintEntry.direction || '').trim(),
          game: String(hintEntry.game || '').trim(),
          item: String(hintEntry.item || '').trim(),
          source: String(hintEntry.source || '').trim(),
          details: String(hintEntry.details || '').trim(),
          createdAt: String(hintEntry.createdAt || new Date().toISOString())
        });
      });
      this.syncCoinBalanceToBackend(valueToSync, {
        silent: true,
        transactionMeta: metaToSync
      }).catch(() => {});
    }, 450);
  }

  getTapLevelThreshold(level = 1) {
    const safeLevel = Number.isFinite(level) && level >= 1 ? Math.floor(level) : 1;
    return Math.floor(100 * Math.pow(1.25, safeLevel - 1));
  }

  getTapTotalClicks() {
    try {
      const raw = window.localStorage.getItem('orionTapTotalClicks');
      const value = Number.parseInt(raw || '0', 10);
      return Number.isFinite(value) && value >= 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  setTapTotalClicks(value) {
    const safeValue = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
    this.tapTotalClicks = safeValue;
    try {
      window.localStorage.setItem('orionTapTotalClicks', String(safeValue));
    } catch {
      // Ignore storage failures and keep the in-memory value.
    }
  }

  getTapAutoMinersState() {
    const rawState = this.readJsonStorage('orionTapAutoMinersState', {});
    if (!rawState || typeof rawState !== 'object' || Array.isArray(rawState)) {
      return {};
    }

    const safeState = {};
    Object.entries(rawState).forEach(([minerId, minerState]) => {
      if (!minerState || typeof minerState !== 'object' || Array.isArray(minerState)) return;
      const count = Number.parseInt(minerState.count, 10);
      const upgradeLevel = Number.parseInt(minerState.upgradeLevel, 10);
      safeState[minerId] = {
        count: Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0,
        upgradeLevel: Number.isFinite(upgradeLevel) && upgradeLevel >= 0 ? Math.floor(upgradeLevel) : 0
      };
    });

    return safeState;
  }

  setTapAutoMinersState(value) {
    const nextState = value && typeof value === 'object' && !Array.isArray(value)
      ? value
      : {};
    const safeState = {};
    Object.entries(nextState).forEach(([minerId, minerState]) => {
      if (!minerState || typeof minerState !== 'object' || Array.isArray(minerState)) return;
      const count = Number.parseInt(minerState.count, 10);
      const upgradeLevel = Number.parseInt(minerState.upgradeLevel, 10);
      safeState[minerId] = {
        count: Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0,
        upgradeLevel: Number.isFinite(upgradeLevel) && upgradeLevel >= 0 ? Math.floor(upgradeLevel) : 0
      };
    });

    this.tapAutoMinersState = safeState;
    try {
      window.localStorage.setItem('orionTapAutoMinersState', JSON.stringify(safeState));
    } catch {
      // Ignore storage failures and keep in-memory state.
    }
    return safeState;
  }

  getTapLevelStats(totalClicks = this.getTapTotalClicks()) {
    const safeClicks = Number.isFinite(totalClicks) && totalClicks >= 0 ? Math.floor(totalClicks) : 0;
    let remainingClicks = safeClicks;
    let level = 1;
    let tapsPerLevel = this.getTapLevelThreshold(level);

    while (remainingClicks >= tapsPerLevel) {
      remainingClicks -= tapsPerLevel;
      level += 1;
      tapsPerLevel = this.getTapLevelThreshold(level);
    }

    const rewardPerTapCents = level;
    const currentLevelClicks = remainingClicks;
    const levelProgress = tapsPerLevel > 0 ? currentLevelClicks / tapsPerLevel : 0;

    return {
      level,
      tapsPerLevel,
      totalClicks: safeClicks,
      currentLevelClicks,
      levelProgress,
      rewardPerTapCents
    };
  }

  getTapBalanceCents() {
    try {
      const raw = window.localStorage.getItem('orionTapBalanceCents');
      const value = Number.parseInt(raw || '0', 10);
      return Number.isFinite(value) && value >= 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  setTapBalanceCents(value, options = {}) {
    const shouldSyncBackend = options?.syncBackend !== false;
    const transactionMeta = options?.transactionMeta && typeof options.transactionMeta === 'object'
      ? options.transactionMeta
      : null;
    const safeValue = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
    const previousValue = Number.isFinite(this.tapBalanceCents)
      ? Math.max(0, Math.floor(this.tapBalanceCents))
      : this.getTapBalanceCents();
    const hasChanged = safeValue !== previousValue;
    this.tapBalanceCents = safeValue;
    try {
      window.localStorage.setItem('orionTapBalanceCents', String(safeValue));
    } catch {
      // Ignore storage failures and keep the in-memory value.
    }
    const balanceTargets = document.querySelectorAll('#coinTapBalance, #shopBalanceValue, #walletBalanceValue');
    balanceTargets.forEach(el => {
      el.textContent = this.formatCoinBalance(safeValue);
    });
    document.querySelectorAll('#shopIslandBalance').forEach(el => {
      el.textContent = this.formatShopIslandBalance(safeValue);
    });

    if (shouldSyncBackend && hasChanged) {
      this.scheduleCoinBalanceBackendSync({
        deltaCents: safeValue - previousValue,
        transactionMeta
      });
    }
  }

  getCoinTransactionHistory() {
    const stored = this.readJsonStorageWithLegacy(
      'nymo_coin_transactions',
      'orion_coin_transactions',
      []
    );
    if (!Array.isArray(stored)) return [];
    const normalizeHistoryTitle = (title, amountCents) => {
      const clean = String(title || '').trim();
      const token = clean.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
      const isDateLike = /^\d{4}(?:[-/.:\s]\d{2}){2}(?:[t\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:z|[+-]\d{2}:?\d{2})?)?$/.test(token);
      const looksLikeUuid = (
        /^[0-9a-f]{8}[-\s][0-9a-f]{4}[-\s][0-9a-f]{4}[-\s][0-9a-f]{4}[-\s][0-9a-f]{12}$/i.test(clean)
        || /^[0-9a-f]{8}\s+[0-9a-f]{4}\s+[0-9a-f]{4}\s+[0-9a-f]{4}\s+[0-9a-f]{12}$/i.test(token)
      );
      if (!clean) return amountCents > 0 ? 'Поповнення балансу' : 'Списання балансу';
      if (looksLikeUuid) return amountCents > 0 ? 'Поповнення балансу' : 'Списання балансу';
      if (isDateLike) return amountCents > 0 ? 'Поповнення балансу' : 'Списання балансу';
      if (
        token === 'adjustment'
        || token === 'transaction'
        || token === 'transactions'
        || token === 'general'
        || token === 'wallet'
        || token === 'coin'
        || token === 'coins'
        || token === 'коригування'
        || token === 'транзакція'
      ) {
        return amountCents > 0 ? 'Поповнення балансу' : 'Списання балансу';
      }
      return clean;
    };
    return stored
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => {
        const amountCents = Number.parseInt(entry.amountCents, 10);
        if (!Number.isFinite(amountCents) || amountCents === 0) return null;
        const createdAt = typeof entry.createdAt === 'string' && entry.createdAt
          ? entry.createdAt
          : new Date().toISOString();
        const title = normalizeHistoryTitle(entry.title, amountCents);
        const category = typeof entry.category === 'string' && entry.category.trim()
          ? entry.category.trim()
          : 'general';
        const id = typeof entry.id === 'string' && entry.id
          ? entry.id
          : `${createdAt}-${Math.random().toString(16).slice(2, 10)}`;
        const subtitle = typeof entry.subtitle === 'string' ? entry.subtitle.trim() : '';
        const details = typeof entry.details === 'string' ? entry.details.trim() : '';
        const type = typeof entry.type === 'string' ? entry.type.trim() : '';
        const direction = typeof entry.direction === 'string' ? entry.direction.trim() : '';
        const game = typeof entry.game === 'string' ? entry.game.trim() : '';
        const item = typeof entry.item === 'string' ? entry.item.trim() : '';
        const from = typeof entry.from === 'string' ? entry.from.trim() : '';
        const to = typeof entry.to === 'string' ? entry.to.trim() : '';
        const source = typeof entry.source === 'string' ? entry.source.trim() : '';
        return {
          id,
          amountCents,
          createdAt,
          title,
          subtitle,
          category,
          details,
          type,
          direction,
          game,
          item,
          from,
          to,
          source
        };
      })
      .filter(Boolean)
      .slice(0, 200);
  }

  saveCoinTransactionHistory(entries) {
    const safeEntries = Array.isArray(entries) ? entries.slice(0, 200) : [];
    try {
      this.writeRawStorageWithLegacy(
        'nymo_coin_transactions',
        'orion_coin_transactions',
        JSON.stringify(safeEntries)
      );
    } catch {
      // Ignore storage failures and keep runtime flow.
    }
    return safeEntries;
  }

  addCoinTransaction({
    amountCents = 0,
    title = 'Транзакція',
    subtitle = '',
    category = 'general',
    details = '',
    type = '',
    direction = '',
    game = '',
    item = '',
    from = '',
    to = '',
    source = ''
  } = {}) {
    const safeAmount = Number.isFinite(amountCents) ? Math.trunc(amountCents) : 0;
    if (!safeAmount) return null;

    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
      amountCents: safeAmount,
      createdAt: new Date().toISOString(),
      title: typeof title === 'string' && title.trim() ? title.trim() : 'Транзакція',
      subtitle: typeof subtitle === 'string' ? subtitle.trim() : '',
      category: typeof category === 'string' && category.trim() ? category.trim() : 'general',
      details: typeof details === 'string' ? details.trim() : '',
      type: typeof type === 'string' ? type.trim() : '',
      direction: typeof direction === 'string' ? direction.trim() : '',
      game: typeof game === 'string' ? game.trim() : '',
      item: typeof item === 'string' ? item.trim() : '',
      from: typeof from === 'string' ? from.trim() : '',
      to: typeof to === 'string' ? to.trim() : '',
      source: typeof source === 'string' ? source.trim() : ''
    };

    const history = this.getCoinTransactionHistory();
    history.unshift(entry);
    this.saveCoinTransactionHistory(history);
    return entry;
  }

  applyCoinTransaction(deltaCents, title, options = {}) {
    const safeDelta = Number.isFinite(deltaCents) ? Math.trunc(deltaCents) : 0;
    if (!safeDelta) return false;

    const currentBalance = this.getTapBalanceCents();
    const nextBalance = Math.max(0, currentBalance + safeDelta);
    const appliedDelta = nextBalance - currentBalance;
    if (!appliedDelta) return false;

    const safeTitle = typeof title === 'string' && title.trim() ? title.trim() : '';
    const safeCategory = typeof options.category === 'string' && options.category.trim()
      ? options.category.trim()
      : 'general';
    const safeSubtitle = typeof options.subtitle === 'string' ? options.subtitle.trim() : '';
    const safeType = typeof options.type === 'string' ? options.type.trim() : '';
    const safeGame = typeof options.game === 'string' ? options.game.trim() : '';
    const safeItem = typeof options.item === 'string' ? options.item.trim() : '';
    const safeSource = typeof options.source === 'string' ? options.source.trim() : '';
    const safeDetails = typeof options.details === 'string' ? options.details.trim() : '';

    this.setTapBalanceCents(nextBalance, { syncBackend: false });
    if (options.record !== false) {
      this.addCoinTransaction({
        amountCents: appliedDelta,
        title,
        subtitle: safeSubtitle,
        category: safeCategory,
        type: safeType,
        direction: appliedDelta > 0 ? 'credit' : 'debit',
        game: safeGame,
        item: safeItem,
        source: safeSource,
        details: safeDetails
      });
    }
    if (safeTitle) {
      this.addWalletTransactionTitleHint({
        amountCents: appliedDelta,
        title: safeTitle,
        subtitle: safeSubtitle,
        category: safeCategory,
        type: safeType,
        direction: appliedDelta > 0 ? 'credit' : 'debit',
        game: safeGame,
        item: safeItem,
        source: safeSource,
        details: safeDetails,
        createdAt: new Date().toISOString()
      });
    }

    const headers = this.getWalletApiHeaders();
    if (String(headers?.['X-User-Id'] || '').trim()) {
      this.syncCoinBalanceToBackend(nextBalance, {
        silent: true,
        transactionMeta: {
          amountCents: appliedDelta,
          title: safeTitle,
          subtitle: safeSubtitle,
          category: safeCategory,
          type: safeType,
          direction: appliedDelta > 0 ? 'credit' : 'debit',
          game: safeGame,
          item: safeItem,
          source: safeSource,
          details: safeDetails
        }
      })
        .then((ok) => {
          if (!ok) {
            this.scheduleCoinBalanceBackendSync();
          }
        })
        .catch(() => {
          this.scheduleCoinBalanceBackendSync();
        });
    } else {
      this.scheduleCoinBalanceBackendSync();
    }
    return true;
  }

  getShopCatalog() {
    return [
      {
        id: 'frame_solar',
        type: 'frame',
        effect: 'solar',
        title: 'Solar Ring',
        description: 'Тепла золота рамка навколо аватарки.',
        price: 250
      },
      {
        id: 'frame_neon',
        type: 'frame',
        effect: 'neon',
        title: 'Neon Pulse',
        description: 'Світловий контур із холодним акцентом.',
        price: 420
      },
      {
        id: 'frame_crystal',
        type: 'frame',
        effect: 'crystal',
        title: 'Crystal Edge',
        description: 'Світлий кристалічний обідок для аватара.',
        price: 560
      },
      {
        id: 'frame_ember',
        type: 'frame',
        effect: 'ember',
        title: 'Ember Loop',
        description: 'Теплий вогняний акцент для яскравого профілю.',
        price: 640
      },
      {
        id: 'frame_mint',
        type: 'frame',
        effect: 'mint',
        title: 'Mint Orbit',
        description: 'Свіжий м’ятний обідок з м’яким сяйвом.',
        price: 720
      },
      {
        id: 'frame_shadow',
        type: 'frame',
        effect: 'shadow',
        title: 'Shadow Loop',
        description: 'Глибокий темний контур для стриманого стилю.',
        price: 810
      },
      {
        id: 'aura_aurora',
        type: 'aura',
        effect: 'aurora',
        title: 'Aurora Glow',
        description: 'М’яке сяйво для картки профілю.',
        price: 680
      },
      {
        id: 'aura_cosmic',
        type: 'aura',
        effect: 'cosmic',
        title: 'Cosmic Wave',
        description: 'Космічний перелив у фоні профілю.',
        price: 860
      },
      {
        id: 'aura_sunset',
        type: 'aura',
        effect: 'sunset',
        title: 'Sunset Mist',
        description: 'Тепла помаранчева аура для hero-блоку.',
        price: 990
      },
      {
        id: 'aura_frost',
        type: 'aura',
        effect: 'frost',
        title: 'Frost Veil',
        description: 'Холодний скляний серпанок для спокійного вигляду.',
        price: 1080
      },
      {
        id: 'aura_sunbeam',
        type: 'aura',
        effect: 'sunbeam',
        title: 'Sunbeam Dust',
        description: 'Теплий золотий підсвіт із м’яким світлом.',
        price: 1190
      },
      {
        id: 'aura_midnight',
        type: 'aura',
        effect: 'midnight',
        title: 'Midnight Flow',
        description: 'Глибокий нічний перелив з темним акцентом.',
        price: 1320
      },
      {
        id: 'motion_glint',
        type: 'motion',
        effect: 'glint',
        title: 'Silver Drift',
        description: 'Світловий перелив, що м’яко проходить по картці профілю.',
        price: 940
      },
      {
        id: 'motion_orbit',
        type: 'motion',
        effect: 'orbit',
        title: 'Orbit Pulse',
        description: 'Плаваючі світлові хвилі для живого фону hero-блоку.',
        price: 1180
      },
      {
        id: 'motion_prism',
        type: 'motion',
        effect: 'prism',
        title: 'Prism Flow',
        description: 'Повільний призматичний рух із переливом по всій картці.',
        price: 1410
      },
      {
        id: 'badge_spark',
        type: 'badge',
        effect: 'spark',
        title: 'Spark Dot',
        description: 'Яскравий акцент-іскра, що з’являється після імені.',
        price: 360
      },
      {
        id: 'badge_comet',
        type: 'badge',
        effect: 'comet',
        title: 'Comet Tag',
        description: 'Мініатюрна комета праворуч від ніка в стилі Nymo.',
        price: 430
      },
      {
        id: 'badge_crown',
        type: 'badge',
        effect: 'crown',
        title: 'Crown Mark',
        description: 'Стримана корона, яка додає статусу біля імені.',
        price: 540
      },
      {
        id: 'badge_orbit',
        type: 'badge',
        effect: 'orbit',
        title: 'Orbit Mark',
        description: 'Планетарний значок для впізнаваного вигляду профілю.',
        price: 620
      },
      {
        id: 'chatbg_nebula',
        type: 'chat_bg',
        effect: 'nebula',
        title: 'Nebula Haze',
        description: 'Космічний серпанок з мʼякими світловими плямами.',
        price: 520
      },
      {
        id: 'chatbg_graphite',
        type: 'chat_bg',
        effect: 'graphite',
        title: 'Graphite Grain',
        description: 'Темний матовий фон із легким зерном.',
        price: 430
      },
      {
        id: 'chatbg_aurora',
        type: 'chat_bg',
        effect: 'aurora',
        title: 'Aurora Sweep',
        description: 'Плавний північний градієнт у стилі Nymo.',
        price: 690
      },
      {
        id: 'chatbg_sunset',
        type: 'chat_bg',
        effect: 'sunset',
        title: 'Sunset Glow',
        description: 'Теплий захід із мʼяким світлом для діалогу.',
        price: 610
      },
      {
        id: 'chatbg_grid',
        type: 'chat_bg',
        effect: 'grid',
        title: 'Subtle Grid',
        description: 'Ледь помітна сітка для акуратного техно-вайбу.',
        price: 480
      }
    ];
  }

  loadShopInventory() {
    const stored = this.readJsonStorageWithLegacy(
      'nymo_shop_inventory',
      'orion_shop_inventory',
      []
    );
    return Array.isArray(stored) ? stored : [];
  }

  saveShopInventory(items) {
    const uniqueItems = [...new Set(Array.isArray(items) ? items : [])];
    this.writeRawStorageWithLegacy(
      'nymo_shop_inventory',
      'orion_shop_inventory',
      JSON.stringify(uniqueItems)
    );
    return uniqueItems;
  }

  getShopItem(itemId) {
    return this.getShopCatalog().find(item => item.id === itemId) || null;
  }

  applyAvatarDecoration(avatarEl) {
    if (!avatarEl) return;
    const frame = this.user?.equippedAvatarFrame || '';
    if (frame) {
      avatarEl.dataset.avatarFrame = frame;
    } else {
      avatarEl.removeAttribute('data-avatar-frame');
    }
    avatarEl.classList.toggle('has-avatar-frame', Boolean(frame));
  }

  applyProfileAura(cardEl) {
    if (!cardEl) return;
    const aura = this.user?.equippedProfileAura || '';
    if (aura) {
      cardEl.dataset.profileAura = aura;
    } else {
      cardEl.removeAttribute('data-profile-aura');
    }
    cardEl.classList.toggle('has-profile-aura', Boolean(aura));
  }

  applyProfileMotion(cardEl) {
    if (!cardEl) return;
    const motion = this.user?.equippedProfileMotion || '';
    if (motion) {
      cardEl.dataset.profileMotion = motion;
    } else {
      cardEl.removeAttribute('data-profile-motion');
    }
    cardEl.classList.toggle('has-profile-motion', Boolean(motion));
  }

  getProfileBadgeDefinition(effect) {
    const definitions = {
      spark: {
        label: 'Spark',
        path: 'M144 24l14 50 50 14-50 14-14 50-14-50-50-14 50-14 14-50zm-72 120l9 31 31 9-31 9-9 31-9-31-31-9 31-9 9-31z'
      },
      comet: {
        label: 'Comet',
        path: 'M208 112a72 72 0 11-72-72 8 8 0 010 16 56 56 0 1056 56 8 8 0 0116 0zM48 208l44-12-32-32-12 44zm54.34-65.66l11.32 11.32 82.34-82.34a8 8 0 00-11.32-11.32z'
      },
      crown: {
        label: 'Crown',
        path: 'M40 184l16-96 48 40 24-56 24 56 48-40 16 96H40zm18.88-16h138.24l-8.77-52.6-42.23 35.2a8 8 0 01-12.31-2.6L128 99.75 122.19 148a8 8 0 01-12.31 2.6l-42.23-35.2z'
      },
      orbit: {
        label: 'Orbit',
        path: 'M128 56a40 40 0 110 80 40 40 0 010-80zm0 16a24 24 0 100 48 24 24 0 000-48zm0-40c55.23 0 100 17.91 100 40s-44.77 40-100 40-100-17.91-100-40 44.77-40 100-40zm0 16c-51.34 0-84 16.18-84 24s32.66 24 84 24 84-16.18 84-24-32.66-24-84-24zm56 88c24.3 7.31 40 19.1 40 32 0 22.09-44.77 40-100 40s-100-17.91-100-40c0-12.9 15.7-24.69 40-32a8 8 0 114.61 15.32C51.14 156.58 40 162.66 40 168c0 7.82 32.66 24 84 24s84-16.18 84-24c0-5.34-11.14-11.42-28.61-16.68A8 8 0 11184 136z'
      }
    };
    return definitions[effect] || null;
  }

  getProfileBadgeMarkup(effect, extraClass = '') {
    const badge = this.getProfileBadgeDefinition(effect);
    if (!badge) return '';
    const className = ['profile-badge-chip', extraClass].filter(Boolean).join(' ');
    const safeLabel = this.escapeAttr(badge.label);
    return `
      <span class="${className}" data-profile-badge="${this.escapeAttr(effect)}" title="${safeLabel}" aria-label="${safeLabel}">
        <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
          <path d="${badge.path}"></path>
        </svg>
      </span>
    `.trim();
  }

  applyProfileBadge(containerEl) {
    if (!containerEl) return;
    const badge = this.user?.equippedProfileBadge || '';
    containerEl.innerHTML = badge ? this.getProfileBadgeMarkup(badge) : '';
    containerEl.classList.toggle('has-badge', Boolean(badge));
    containerEl.toggleAttribute('hidden', !badge);
  }

  applyChatBackground(root = document) {
    const appEl = root?.querySelector?.('.nymo-app, .orion-app') || document.querySelector('.nymo-app, .orion-app');
    if (!appEl) return;
    const background = String(this.user?.equippedChatBackground || '').trim();
    if (background) {
      appEl.dataset.chatBg = background;
    } else {
      appEl.removeAttribute('data-chat-bg');
    }
    appEl.classList.toggle('has-chat-bg', Boolean(background));
  }

  syncProfileCosmetics(root = document) {
    root.querySelectorAll('.profile-avatar-large').forEach(avatarEl => {
      this.applyAvatarDecoration(avatarEl);
    });
    root.querySelectorAll('#profile .profile-hero-card').forEach(cardEl => {
      this.applyProfileAura(cardEl);
      this.applyProfileMotion(cardEl);
    });
    root.querySelectorAll('#profile .profile-name-badges').forEach(containerEl => {
      this.applyProfileBadge(containerEl);
    });
    this.applyChatBackground(root);
  }

  updateProfileMenuButton() {
    const navProfile = document.getElementById('navProfile');
    const avatarEl = navProfile?.querySelector('.nav-avatar');
    const railAvatarEl = document.getElementById('desktopRailAccountAvatar');

    const name = this.user?.name || 'Користувач Nymo';

    this.applyUserAvatarToElement(avatarEl, name);
    this.applyUserAvatarToElement(railAvatarEl, name);
  }

  getInitials(name) {
    return name
      .split(' ')
      .filter(Boolean)
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  escapeAttr(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  getAvatarImage(value) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!normalized) return '';
    if (/^(?:https?:|data:|blob:)/i.test(normalized)) return normalized;
    if (/^\/?(?:storage|upload|uploads)\//i.test(normalized)) {
      const path = normalized.startsWith('/') ? normalized : `/${normalized}`;
      return buildApiUrl(path);
    }
    return normalized;
  }

  getChatAvatarMeta(chat = null) {
    const source = chat && typeof chat === 'object' ? chat : {};
    const name = String(source?.name || 'Користувач').trim() || 'Користувач';
    const avatarImage = this.getAvatarImage(source?.avatarImage || source?.avatarUrl);
    const avatarColor = avatarImage ? String(source?.avatarColor || '').trim() : this.getContactColor(name);
    return {
      name,
      avatarImage,
      avatarColor,
      initials: this.getInitials(name)
    };
  }

  applyChatAvatarToElement(avatarEl, chat = null) {
    if (!avatarEl) return;
    const { avatarImage, avatarColor, initials } = this.getChatAvatarMeta(chat);
    if (avatarImage) {
      avatarEl.textContent = '';
      avatarEl.style.backgroundImage = `url("${this.escapeAttr(avatarImage)}")`;
      avatarEl.style.backgroundColor = 'transparent';
      return;
    }
    avatarEl.style.backgroundImage = '';
    avatarEl.style.backgroundColor = '';
    avatarEl.textContent = initials;
    avatarEl.style.background = avatarColor;
  }

  getChatAvatarHtml(chat = null, className = 'message-avatar') {
    const { avatarImage, avatarColor, initials } = this.getChatAvatarMeta(chat);
    const isDesktopSecondaryAvatar = String(className || '').includes('desktop-secondary-chat-avatar');
    const isChatListAvatar = String(className || '').includes('chat-avatar');
    const chatStatus = String(chat?.status || '').trim().toLowerCase();
    const normalizedStatus = typeof this.normalizePresenceStatus === 'function'
      ? this.normalizePresenceStatus(chat?.status || chatStatus)
      : chatStatus;
    const showActivityIndicator = Boolean(
      (isDesktopSecondaryAvatar || isChatListAvatar)
      && !chat?.isGroup
      && normalizedStatus === 'online'
    );
    const activityIndicatorHtml = showActivityIndicator
      ? '<span class="avatar-activity-indicator online" aria-hidden="true"></span>'
      : '';
    if (avatarImage) {
      const safeUrl = this.escapeAttr(avatarImage);
      return `<div class="${className} is-image" style="background-image: url(&quot;${safeUrl}&quot;); background-color: transparent;">${activityIndicatorHtml}</div>`;
    }
    const safeInitials = typeof this.escapeHtml === 'function' ? this.escapeHtml(initials) : initials;
    return `<div class="${className}" style="background: ${avatarColor}">${safeInitials}${activityIndicatorHtml}</div>`;
  }

  applyUserAvatarToElement(avatarEl, name = '') {
    if (!avatarEl) return;
    const displayName = name || this.user?.name || 'Користувач Nymo';
    const userAvatarImage = this.getAvatarImage(this.user?.avatarImage || this.user?.avatarUrl);
    if (userAvatarImage) {
      this.user.avatarImage = userAvatarImage;
      this.user.avatarUrl = userAvatarImage;
      avatarEl.textContent = '';
      avatarEl.style.backgroundImage = `url("${this.escapeAttr(userAvatarImage)}")`;
      avatarEl.style.backgroundColor = 'transparent';
    } else {
      const fallbackAvatarColor = this.getContactColor(displayName);
      this.user.avatarColor = fallbackAvatarColor;
      avatarEl.style.backgroundImage = '';
      avatarEl.style.backgroundColor = '';
      avatarEl.textContent = this.getInitials(displayName);
      avatarEl.style.background = fallbackAvatarColor;
    }
  }

  getUserAvatarHtml() {
    const userAvatarImage = this.getAvatarImage(this.user?.avatarImage || this.user?.avatarUrl);
    if (userAvatarImage) {
      this.user.avatarImage = userAvatarImage;
      this.user.avatarUrl = userAvatarImage;
      const safeUrl = this.escapeAttr(userAvatarImage);
      return `<div class="message-avatar is-image" style="background-image: url(&quot;${safeUrl}&quot;);"></div>`;
    }
    const displayName = this.user?.name || 'Користувач Nymo';
    const initials = this.getInitials(displayName);
    const fallbackAvatarColor = this.getContactColor(displayName);
    this.user.avatarColor = fallbackAvatarColor;
    return `<div class="message-avatar" style="background: ${fallbackAvatarColor}">${initials}</div>`;
  }

  renderProfileAvatar(avatarEl) {
    if (!avatarEl) return;
    const name = this.user?.name || 'Користувач Nymo';
    const imageEl = avatarEl.querySelector('.profile-avatar-image');
    const initialsEl = avatarEl.querySelector('.profile-avatar-initials');

    const userAvatarImage = this.getAvatarImage(this.user?.avatarImage || this.user?.avatarUrl);
    if (userAvatarImage) {
      this.user.avatarImage = userAvatarImage;
      this.user.avatarUrl = userAvatarImage;
      if (imageEl) {
        imageEl.src = userAvatarImage;
        imageEl.style.display = 'block';
      }
      if (initialsEl) initialsEl.style.display = 'none';
      avatarEl.style.background = 'transparent';
    } else {
      if (imageEl) imageEl.style.display = 'none';
      if (initialsEl) {
        initialsEl.textContent = this.getInitials(name);
        initialsEl.style.display = 'flex';
      }
      const fallbackAvatarColor = this.getContactColor(name);
      this.user.avatarColor = fallbackAvatarColor;
      avatarEl.style.background = fallbackAvatarColor;
    }

    this.applyAvatarDecoration(avatarEl);
  }

  updateProfileDisplay() {
    const profileSection = document.getElementById('profile');
    if (!profileSection) return;

    const profileName = profileSection.querySelector('#profileDisplayName');
    const profileHandle = profileSection.querySelector('#profileDisplayHandle');
    const profileStatus = profileSection.querySelector('#profileDisplayStatus');
    const profileBio = profileSection.querySelector('#profileDisplayBio');
    const profileEmail = profileSection.querySelector('#profileDisplayEmail');
    const profileDob = profileSection.querySelector('#profileDisplayDob');
    const profileUserId = profileSection.querySelector('#profileDisplayUserId');
    const profileStatChats = profileSection.querySelector('#profileStatChats');
    const profileStatMessages = profileSection.querySelector('#profileStatMessages');
    const profileStatCompletion = profileSection.querySelector('#profileStatCompletion');
    const profileStatMemberSince = profileSection.querySelector('#profileStatMemberSince');
    const avatarDiv = profileSection.querySelector('.profile-avatar-large');
    const handleValue = `@${String(this.user?.name || 'nymo.user')
      .trim()
      .toLowerCase()
      .replace(/['`’]/g, '')
      .replace(/[^a-z0-9а-яіїєґ]+/gi, '.')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '') || 'nymo.user'}`;
    const statusLabelMap = {
      online: 'Онлайн',
      away: 'Не на місці',
      dnd: 'Не турбувати',
      offline: 'Офлайн'
    };
    const statusValue = String(this.user?.status || 'online').toLowerCase();
    const profileIdSource = `${this.user?.email || ''}|${this.user?.name || ''}`;
    let profileIdHash = 0;
    for (let i = 0; i < profileIdSource.length; i += 1) {
      profileIdHash = (profileIdHash * 31 + profileIdSource.charCodeAt(i)) >>> 0;
    }
    const profileId = `OR-${String(profileIdHash % 1000000).padStart(6, '0')}`;
    const chatsCount = Array.isArray(this.chats) ? this.chats.length : 0;
    const messagesCount = Array.isArray(this.chats)
      ? this.chats.reduce((total, chat) => total + (Array.isArray(chat?.messages) ? chat.messages.length : 0), 0)
      : 0;
    const completenessFilled = [
      Boolean(String(this.user?.name || '').trim()),
      Boolean(String(this.user?.email || '').trim()),
      Boolean(String(this.user?.bio || '').trim()),
      Boolean(String(this.user?.birthDate || '').trim()),
      Boolean(String(this.user?.avatarImage || this.user?.avatarUrl || '').trim())
        || Boolean(String(this.user?.avatarColor || '').trim())
    ].filter(Boolean).length;
    const completeness = Math.round((completenessFilled / 5) * 100);
    const createdAt = String(this.user?.createdAt || '').trim();
    const createdAtDate = createdAt ? new Date(createdAt) : null;
    const memberSince = createdAtDate && !Number.isNaN(createdAtDate.getTime())
      ? new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric' }).format(createdAtDate)
      : 'цього місяця';

    if (profileName) profileName.textContent = this.user.name;
    if (profileHandle) profileHandle.textContent = handleValue;
    if (profileStatus) {
      profileStatus.textContent = '';
      profileStatus.setAttribute('aria-label', statusLabelMap[statusValue] || statusLabelMap.online);
      profileStatus.dataset.status = statusValue || 'online';
    }
    if (profileBio) profileBio.textContent = this.user.bio || '';
    if (profileEmail) profileEmail.textContent = this.user.email || '';
    if (profileDob) profileDob.textContent = this.formatBirthDate(this.user.birthDate);
    if (profileUserId) profileUserId.textContent = profileId;
    if (profileStatChats) profileStatChats.textContent = String(chatsCount);
    if (profileStatMessages) profileStatMessages.textContent = String(messagesCount);
    if (profileStatCompletion) profileStatCompletion.textContent = `${completeness}%`;
    if (profileStatMemberSince) profileStatMemberSince.textContent = memberSince;

    this.renderProfileAvatar(avatarDiv);
    this.applyProfileAura(profileSection.querySelector('.profile-hero-card'));
    this.applyProfileMotion(profileSection.querySelector('.profile-hero-card'));
    this.applyProfileBadge(profileSection.querySelector('#profileNameBadges'));
  }

  formatBirthDate(value) {
    if (!value) return '—';
    const dateObj = new Date(`${value}T00:00:00`);
    if (Number.isNaN(dateObj.getTime())) return '—';
    const language = normalizeUiLanguage(this.settings?.language || 'uk');
    const locale = language === 'en' ? 'en-US' : 'uk-UA';
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(dateObj);
  }

  loadSettings() {
    const saved = this.readJsonStorageWithLegacy('nymo_settings', 'orion_settings', null);
    if (saved && typeof saved === 'object') {
      return saved;
    }
    return {
      soundNotifications: true,
      desktopNotifications: true,
      showOnlineStatus: true,
      showTypingIndicator: true,
      vibrationEnabled: true,
      messagePreview: true,
      readReceipts: true,
      lastSeen: true,
      twoFactorAuth: true,
      profileVisibility: 'friends',
      hideBlockedChats: true,
      enterToSend: true,
      autoPlayMedia: true,
      autoSaveMedia: false,
      animationsEnabled: true,
      compactMode: false,
      language: 'uk',
      fontSize: 'medium',
      theme: 'system'
    };
  }

  saveSettings(settingsData) {
    this.settings = settingsData;
    this.writeRawStorageWithLegacy('nymo_settings', 'orion_settings', JSON.stringify(settingsData));
  }

  applySettingsToUI() {
    const root = document.documentElement;
    const settings = this.settings || {};
    const uiLanguage = normalizeUiLanguage(settings.language || 'uk');
    root.classList.toggle('no-animations', settings.animationsEnabled === false);
    root.classList.toggle('compact-mode', settings.compactMode === true);
    root.classList.toggle('no-message-preview', settings.messagePreview === false);
    root.setAttribute('lang', uiLanguage);
    if (typeof this.updateRealtimePrivacyState === 'function') {
      this.updateRealtimePrivacyState();
    }
    this.updateProfileDisplay();
    applyUiLocalizationToDocument(uiLanguage);
  }

  translateUiText(value) {
    return translateUiText(value, this.settings?.language || 'uk');
  }

  // Метод-обгортка для імпортованої функції
  getContactColor(name) {
    return getContactColor(name);
  }

  syncThemeToggleCheckboxes() {
    const isDark = document.documentElement.classList.contains('dark-theme');
    document.querySelectorAll('#themeToggleCheckbox').forEach((checkbox) => {
      checkbox.checked = isDark;
    });
  }

  applySystemTheme() {
    const prefersDark = window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false;
    document.documentElement.classList.toggle('dark-theme', prefersDark);
    applyThemeBranding();
    this.syncThemeToggleCheckboxes();
  }

  bindSystemThemeListener() {
    if (!window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    if (this.themeMediaQuery && this.themeMediaQueryHandler) {
      if (typeof this.themeMediaQuery.removeEventListener === 'function') {
        this.themeMediaQuery.removeEventListener('change', this.themeMediaQueryHandler);
      } else if (typeof this.themeMediaQuery.removeListener === 'function') {
        this.themeMediaQuery.removeListener(this.themeMediaQueryHandler);
      }
    }

    this.themeMediaQuery = mediaQuery;
    this.themeMediaQueryHandler = () => {
      if (this.settings?.theme === 'system') {
        this.applySystemTheme();
      }
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', this.themeMediaQueryHandler);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(this.themeMediaQueryHandler);
    }
  }

  loadTheme() {
    const themeMode = this.settings?.theme || 'system';
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark-theme');
      localStorage.setItem('nymo_theme', 'dark');
      localStorage.setItem('orion_theme', 'dark');
      this.syncThemeToggleCheckboxes();
    } else if (themeMode === 'light') {
      document.documentElement.classList.remove('dark-theme');
      localStorage.setItem('nymo_theme', 'light');
      localStorage.setItem('orion_theme', 'light');
      this.syncThemeToggleCheckboxes();
    } else {
      this.settings = { ...(this.settings || {}), theme: 'system' };
      this.writeRawStorageWithLegacy('nymo_settings', 'orion_settings', JSON.stringify(this.settings));
      this.applySystemTheme();
    }
    applyThemeBranding();
    this.bindSystemThemeListener();
  }

  toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark-theme');
    const nextTheme = isDark ? 'dark' : 'light';
    localStorage.setItem('nymo_theme', nextTheme);
    localStorage.setItem('orion_theme', nextTheme);
    this.settings = { ...(this.settings || {}), theme: isDark ? 'dark' : 'light' };
    this.writeRawStorageWithLegacy('nymo_settings', 'orion_settings', JSON.stringify(this.settings));
    applyThemeBranding();
    this.syncThemeToggleCheckboxes();
    if (!this.currentChat && window.innerWidth > 768) {
      this.restoreBottomNavToHome({ animate: false });
    }
  }

  getChatsStorageKey() {
    const userId = typeof this.getAuthUserId === 'function' ? this.getAuthUserId() : '';
    if (userId) return `nymo_chats:${userId}`;
    return 'nymo_chats';
  }

  getLegacyChatsStorageKey() {
    const userId = typeof this.getAuthUserId === 'function' ? this.getAuthUserId() : '';
    if (userId) return `orion_chats:${userId}`;
    return 'orion_chats';
  }

  loadChats() {
    const primaryKey = this.getChatsStorageKey();
    const stored = this.readJsonStorageWithLegacy(primaryKey, this.getLegacyChatsStorageKey(), null);
    if (Array.isArray(stored)) {
      return stored.map((chat) => {
        if (!chat || typeof chat !== 'object') return chat;
        const participantId = String(chat.participantId || '').trim();
        const groupParticipants = Array.isArray(chat.groupParticipants) ? chat.groupParticipants : [];
        const members = Array.isArray(chat.members) ? chat.members : [];
        let isGroup = chat.isGroup;
        if (typeof this.normalizeBooleanLike === 'function') {
          isGroup = this.normalizeBooleanLike(isGroup, false);
        } else if (typeof isGroup === 'string') {
          const normalized = isGroup.trim().toLowerCase();
          isGroup = !['false', '0', 'no', 'off'].includes(normalized) && Boolean(normalized);
        } else {
          isGroup = Boolean(isGroup);
        }

        // Legacy repair: some direct chats were persisted as groups.
        if (isGroup && participantId && groupParticipants.length <= 1 && members.length <= 1) {
          isGroup = false;
        }

        return {
          ...chat,
          messages: Array.isArray(chat.messages)
            ? chat.messages.filter((message) => message?.transientMediaDraft !== true)
            : [],
          isGroup,
          participantId: participantId || null
        };
      });
    }
    return [];
  }

  saveChats() {
    const sanitizedChats = Array.isArray(this.chats)
      ? this.chats.map((chat) => {
        if (!chat || typeof chat !== 'object') return chat;
        const messages = Array.isArray(chat.messages) ? chat.messages : [];
        const sanitizedMessages = messages
          .filter((message) => message?.transientMediaDraft !== true)
          .map((message) => {
            if (!message || typeof message !== 'object') return message;
            const nextMessage = { ...message };
            delete nextMessage.transientMediaDraft;
            delete nextMessage.failed;
            delete nextMessage.mediaErrorMessage;
            return nextMessage;
          });
        return {
          ...chat,
          messages: sanitizedMessages
        };
      })
      : [];
    localStorage.setItem(this.getChatsStorageKey(), JSON.stringify(sanitizedChats));
  }

  setupModalEnterHandlers() {
    const newChatModal = document.getElementById('newChatModal');
    if (newChatModal) {
      newChatModal.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && newChatModal.classList.contains('active')) {
          const input = e.target;
          if (input.id === 'newContactInput' || input.id === 'groupMembersInput') {
            e.preventDefault();
            this.createNewChat();
          }
        }
      });
    }

    const groupInfoModal = document.getElementById('groupInfoModal');
    if (groupInfoModal) {
      groupInfoModal.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey && groupInfoModal.classList.contains('active')) {
          e.preventDefault();
          this.saveGroupInfo();
        }
      });
    }

    const groupAppearanceModal = document.getElementById('groupAppearanceModal');
    if (groupAppearanceModal) {
      groupAppearanceModal.addEventListener('keydown', (e) => {
        if (!groupAppearanceModal.classList.contains('active')) return;
        if (e.key === 'Enter' && !e.shiftKey) {
          const target = e.target;
          if (target?.id === 'groupAppearanceNameInput') {
            e.preventDefault();
            this.saveGroupAppearance();
          }
        }
      });
    }

    const addToGroupModal = document.getElementById('addToGroupModal');
    if (addToGroupModal) {
      addToGroupModal.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && addToGroupModal.classList.contains('active')) {
          e.preventDefault();
          this.confirmAddToGroup();
        }
      });
    }
  }

  setupMobileCopyProtection() {
    if (this.mobileCopyProtectionBound) return;
    this.mobileCopyProtectionBound = true;

    const isMobileViewport = () => (
      window.innerWidth <= 900
      || window.matchMedia('(pointer: coarse)').matches
      || navigator.maxTouchPoints > 0
    );
    const isEditableTarget = (target) => {
      if (!(target instanceof Element)) return false;
      return Boolean(
        target.closest(
          'input, textarea, [contenteditable="true"], [contenteditable=""], [contenteditable=true]'
        )
      );
    };

    const syncClass = () => {
      document.documentElement.classList.toggle('mobile-copy-lock', isMobileViewport());
    };
    this.mobileCopyLockSyncHandler = syncClass;
    syncClass();
    window.addEventListener('resize', syncClass, { passive: true });

    this.mobileCopyContextMenuHandler = (event) => {
      if (!isMobileViewport()) return;
      const target = event.target;
      if (isEditableTarget(target)) return;
      event.preventDefault();
    };

    this.mobileCopySelectStartHandler = (event) => {
      if (!isMobileViewport()) return;
      const target = event.target;
      if (isEditableTarget(target)) return;
      event.preventDefault();
    };

    this.mobileCopySelectionChangeHandler = () => {
      if (!isMobileViewport()) return;
      const activeElement = document.activeElement;
      if (isEditableTarget(activeElement)) return;
      const selection = window.getSelection?.();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
      selection.removeAllRanges();
    };

    this.mobileCopyEventHandler = (event) => {
      if (!isMobileViewport()) return;
      event.preventDefault();
    };

    this.mobileCutEventHandler = (event) => {
      if (!isMobileViewport()) return;
      event.preventDefault();
    };

    document.addEventListener('contextmenu', this.mobileCopyContextMenuHandler, { capture: true });
    document.addEventListener('selectstart', this.mobileCopySelectStartHandler, { capture: true });
    document.addEventListener('selectionchange', this.mobileCopySelectionChangeHandler, { capture: true });
    document.addEventListener('copy', this.mobileCopyEventHandler, { capture: true });
    document.addEventListener('cut', this.mobileCutEventHandler, { capture: true });
  }

  init() {
    this.setupEventListeners();
    this.setupModalEnterHandlers();
    this.setupMobileCopyProtection();
    this.ensureBottomNavHomeAnchor();
    this.restoreBottomNavToHome({ animate: false });
    this.setupDesktopChatWheelScroll();
    this.renderChatsList();
    this.applyFontSize(this.settings.fontSize);
    this.applySettingsToUI();
    this.updateProfileMenuButton();
    this.applyChatBackground(document);
    this.updateBottomNavIndicator();
    this.setupMobileSwipeBack();
    this.setupBottomNavReveal();
    this.setMobilePageScrollLock(false);
    if (window.innerWidth > 768 && typeof this.openDesktopSecondaryMenu === 'function') {
      this.openDesktopSecondaryMenu('navChats', { activateFirst: true });
    }
    if (window.innerWidth <= 768) {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    window.addEventListener('resize', () => {
      this.updateBottomNavIndicator();
      this.handleBottomNavResize();
      this.applyMobileChatViewportLayout();
    });

    this.mobileTouchMoveLockHandler = (event) => {
      if (window.innerWidth > 900) return;
      const appEl = document.querySelector('.orion-app');
      if (!appEl || !appEl.classList.contains('chat-active')) return;
      const messages = document.getElementById('messagesContainer');
      const chatsList = document.getElementById('chatsList');
      const sidebar = document.querySelector('.sidebar');
      const imageViewer = document.getElementById('imageViewerOverlay');
      if (!messages) return;
      const target = event.target;
      const withinMessages = target instanceof Node && messages.contains(target);
      const withinChatsList = target instanceof Node && chatsList?.contains(target);
      const withinSidebar = target instanceof Node && sidebar?.contains(target);
      const withinImageViewer = target instanceof Node && imageViewer?.contains(target);
      if (!withinMessages && !withinChatsList && !withinSidebar && !withinImageViewer) {
        event.preventDefault();
      }
    };
    document.addEventListener('touchmove', this.mobileTouchMoveLockHandler, { passive: false });

    if (typeof this.initializeServerChatSync === 'function') {
      this.initializeServerChatSync();
    }

    if (typeof this.consumeProfileQrDeepLinkFromUrl === 'function') {
      window.setTimeout(() => {
        this.consumeProfileQrDeepLinkFromUrl();
      }, 120);
    }

    this.refreshCoinWalletFromBackend({ includeTransactions: false, silent: true }).catch(() => {});

  }

  setupDesktopChatWheelScroll() {
    const messagesContainer = document.getElementById('messagesContainer');
    const chatContainer = document.getElementById('chatContainer');
    if (!messagesContainer || !chatContainer) return;

    chatContainer.addEventListener('wheel', (event) => {
      if (window.innerWidth <= 900) return;
      if (messagesContainer.scrollHeight <= messagesContainer.clientHeight) return;

      const target = event.target instanceof Element ? event.target : null;
      const shouldSkip = target?.closest('textarea, input, .message-input-area, .chat-menu, .message-context-menu, .modal, .emoji-picker');
      if (shouldSkip) return;

      messagesContainer.scrollTop += event.deltaY;
      event.preventDefault();
    }, { passive: false });

    document.addEventListener('wheel', (event) => {
      if (window.innerWidth <= 900) return;
      if (!this.currentChat) return;
      if (!chatContainer.classList.contains('active')) return;
      if (messagesContainer.scrollHeight <= messagesContainer.clientHeight) return;
      if (event.ctrlKey) return;

      const target = event.target instanceof Element ? event.target : null;
      if (!target || !chatContainer.contains(target)) return;

      const shouldSkip = target.closest('textarea, input, .message-input-area, .chat-menu, .message-context-menu, .modal, .emoji-picker');
      if (shouldSkip) return;

      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (Math.abs(delta) < 0.1) return;

      messagesContainer.scrollTop += delta;
      event.preventDefault();
    }, { passive: false, capture: true });
  }

  // Метод-обгортка для імпортованої функції setupMobileSwipeBack
  setupMobileSwipeBack() {
    setupMobileSwipeBack(this);
  }

}
