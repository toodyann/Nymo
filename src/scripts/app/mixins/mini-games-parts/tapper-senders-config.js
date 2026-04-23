const DEFAULT_AUTO_SENDERS_CONFIG_KEY = 'orionTapAutoSendersConfigV4';
const DEFAULT_AUTO_SENDERS_CONFIG_SIZE = 10;

const TAP_SENDER_MALE_NAME_POOL = [
  'Денис',
  'Тарас',
  'Ілля',
  'Роман',
  'Назар',
  'Борис',
  'Руслан',
  'Арсен',
  'Максим',
  'Влад',
  'Андрій',
  'Остап'
];

const TAP_SENDER_FEMALE_NAME_POOL = [
  'Марта',
  'Злата',
  'Олеся',
  'Ангеліна',
  'Вікторія',
  'Ліля',
  'Єва',
  'Дарина',
  'Катерина',
  'Юлія',
  'Софія',
  'Аліса'
];

const TAP_SENDER_NEUTRAL_NAME_POOL = [
  'Саша',
  'Женя',
  'Тоні',
  'Кім',
  'Нікі',
  'Рен',
  'Лео',
  'Дані',
  'Арі',
  'Макс'
];

const TAP_SENDER_NAME_POOL = [
  ...TAP_SENDER_MALE_NAME_POOL,
  ...TAP_SENDER_FEMALE_NAME_POOL,
  ...TAP_SENDER_NEUTRAL_NAME_POOL
];

const TAP_SENDER_ROLE_POOL = [
  'Швидкі відповіді',
  'Підтримка VIP-чату',
  'Продажі в direct',
  'Контент для стрічки',
  'Нічна зміна',
  'Оператор груп',
  'Робота з лідами',
  'Ведення коментарів',
  'Преміум діалоги',
  'Автовідповіді'
];

const TAP_SENDER_ECONOMY_PRESETS = [
  {
    baseCostCents: 120,
    costGrowth: 1.12,
    baseMessagesPerSecond: 0.8,
    coinsPerMessageCents: 1,
    upgradeBaseCostCents: 170,
    upgradeGrowth: 1.17,
    messageBonusPerLevel: 0.28,
    tier: 'Starter'
  },
  {
    baseCostCents: 240,
    costGrowth: 1.125,
    baseMessagesPerSecond: 1.7,
    coinsPerMessageCents: 1,
    upgradeBaseCostCents: 200,
    upgradeGrowth: 1.175,
    messageBonusPerLevel: 0.31,
    tier: 'Starter'
  },
  {
    baseCostCents: 960,
    costGrowth: 1.13,
    baseMessagesPerSecond: 3.8,
    coinsPerMessageCents: 2,
    upgradeBaseCostCents: 540,
    upgradeGrowth: 1.18,
    messageBonusPerLevel: 0.34,
    tier: 'Pro'
  },
  {
    baseCostCents: 1700,
    costGrowth: 1.135,
    baseMessagesPerSecond: 6.9,
    coinsPerMessageCents: 2,
    upgradeBaseCostCents: 980,
    upgradeGrowth: 1.19,
    messageBonusPerLevel: 0.37,
    tier: 'Pro'
  },
  {
    baseCostCents: 4300,
    costGrowth: 1.14,
    baseMessagesPerSecond: 11.8,
    coinsPerMessageCents: 3,
    upgradeBaseCostCents: 2520,
    upgradeGrowth: 1.2,
    messageBonusPerLevel: 0.4,
    tier: 'Elite'
  },
  {
    baseCostCents: 9000,
    costGrowth: 1.145,
    baseMessagesPerSecond: 18.6,
    coinsPerMessageCents: 4,
    upgradeBaseCostCents: 6200,
    upgradeGrowth: 1.21,
    messageBonusPerLevel: 0.44,
    tier: 'Elite'
  },
  {
    baseCostCents: 14500,
    costGrowth: 1.15,
    baseMessagesPerSecond: 26.4,
    coinsPerMessageCents: 4,
    upgradeBaseCostCents: 10000,
    upgradeGrowth: 1.22,
    messageBonusPerLevel: 0.48,
    tier: 'Elite'
  },
  {
    baseCostCents: 27000,
    costGrowth: 1.155,
    baseMessagesPerSecond: 37.5,
    coinsPerMessageCents: 5,
    upgradeBaseCostCents: 19800,
    upgradeGrowth: 1.23,
    messageBonusPerLevel: 0.53,
    tier: 'Elite'
  },
  {
    baseCostCents: 39000,
    costGrowth: 1.16,
    baseMessagesPerSecond: 52.8,
    coinsPerMessageCents: 5,
    upgradeBaseCostCents: 30800,
    upgradeGrowth: 1.24,
    messageBonusPerLevel: 0.58,
    tier: 'Elite'
  },
  {
    baseCostCents: 65000,
    costGrowth: 1.165,
    baseMessagesPerSecond: 74.2,
    coinsPerMessageCents: 6,
    upgradeBaseCostCents: 57000,
    upgradeGrowth: 1.25,
    messageBonusPerLevel: 0.64,
    tier: 'Elite'
  }
];

const TAP_SENDER_AVATAR_ARCHETYPE_PREFIXES = [
  'diverse_people_man_dark_short_hair_skin',
  'diverse_people_man_cornrows_short_hair_skin',
  'diverse_people_man_native_indigenous_long_hair_skin',
  'diverse_people_man_vitiligo_curly_hair_skin',
  'diverse_people_woman_curly_long_hair_skin',
  'diverse_people_woman_native_indigenous_braids_skin',
  'diverse_people_woman_cornrows_piercing_skin',
  'diverse_people_woman_vitiligo_curly_hair_skin',
  'diverse_people_nonbinary_red_short_hair_skin',
  'diverse_people_nonbinary_lgbtq_blonde_skin',
  'diverse_people_boy_long_hair_skin',
  'diverse_people_girl_red_braid_skin'
];

const shuffleArray = (value) => {
  const source = Array.isArray(value) ? [...value] : [];
  for (let index = source.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    [source[index], source[nextIndex]] = [source[nextIndex], source[index]];
  }
  return source;
};

const getPrioritizedAvatarPool = (avatarPool = []) => {
  const source = Array.isArray(avatarPool) ? avatarPool.filter(Boolean) : [];
  if (!source.length) return [];

  const byKey = new Map(source.map((entry) => [String(entry.key || '').trim(), entry]));
  const pickedKeys = new Set();
  const picked = [];

  TAP_SENDER_AVATAR_ARCHETYPE_PREFIXES.forEach((prefix) => {
    const variants = shuffleArray(
      source.filter((entry) => String(entry?.key || '').startsWith(prefix))
    );
    const first = variants.find((entry) => entry?.key && !pickedKeys.has(entry.key));
    if (!first) return;
    picked.push(first);
    pickedKeys.add(first.key);
  });

  const rest = shuffleArray(source).filter((entry) => {
    const key = String(entry?.key || '').trim();
    return key && byKey.has(key) && !pickedKeys.has(key);
  });

  return [...picked, ...rest];
};

const getSenderNameGroupByAvatarKey = (avatarKey = '') => {
  const key = String(avatarKey || '').trim().toLowerCase();
  if (!key) return 'neutral';
  if (key.includes('nonbinary')) return 'neutral';
  if (key.includes('woman') || key.includes('girl')) return 'female';
  if (key.includes('man') || key.includes('boy')) return 'male';
  return 'neutral';
};

const getSenderNamePoolByGroup = (group = 'neutral') => {
  if (group === 'male') return TAP_SENDER_MALE_NAME_POOL;
  if (group === 'female') return TAP_SENDER_FEMALE_NAME_POOL;
  return TAP_SENDER_NEUTRAL_NAME_POOL;
};

const getStringHash = (value = '') => {
  const source = String(value || '');
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const pickSenderNameByAvatar = ({ entry, index, usedNames }) => {
  const safeEntry = entry && typeof entry === 'object' ? entry : {};
  const group = getSenderNameGroupByAvatarKey(safeEntry.avatarKey);
  const primaryPool = getSenderNamePoolByGroup(group);
  const fallbackPool = TAP_SENDER_NAME_POOL;
  const seed = getStringHash(`${safeEntry.id || ''}|${safeEntry.avatarKey || ''}|${index}`);

  const pickFromPool = (pool) => {
    if (!Array.isArray(pool) || !pool.length) return '';
    const startOffset = seed % pool.length;
    for (let step = 0; step < pool.length; step += 1) {
      const candidate = String(pool[(startOffset + step) % pool.length] || '').trim();
      if (!candidate) continue;
      if (!usedNames.has(candidate)) {
        usedNames.add(candidate);
        return candidate;
      }
    }
    return '';
  };

  const picked = pickFromPool(primaryPool) || pickFromPool(fallbackPool);
  if (picked) return picked;
  const fallback = `Агент ${index + 1}`;
  usedNames.add(fallback);
  return fallback;
};

const normalizeSenderConfigEntry = (entry, index) => {
  const preset = TAP_SENDER_ECONOMY_PRESETS[Math.max(0, Math.min(index, TAP_SENDER_ECONOMY_PRESETS.length - 1))];
  const safeEntry = entry && typeof entry === 'object' ? entry : {};
  const avatarKey = String(safeEntry.avatarKey || '').trim();

  return {
    id: String(safeEntry.id || `sender_slot_${index + 1}`).trim() || `sender_slot_${index + 1}`,
    title: String(safeEntry.title || TAP_SENDER_NAME_POOL[index % TAP_SENDER_NAME_POOL.length] || `Агент ${index + 1}`).trim(),
    role: String(safeEntry.role || TAP_SENDER_ROLE_POOL[index % TAP_SENDER_ROLE_POOL.length] || 'Веде діалоги').trim(),
    tier: String(safeEntry.tier || preset.tier || 'Starter').trim(),
    avatarKey,
    avatarSrc: '',
    baseCostCents: Number.isFinite(Number(safeEntry.baseCostCents))
      ? Math.max(1, Math.floor(Number(safeEntry.baseCostCents)))
      : preset.baseCostCents,
    costGrowth: Number.isFinite(Number(safeEntry.costGrowth))
      ? Math.max(1.01, Number(safeEntry.costGrowth))
      : preset.costGrowth,
    baseMessagesPerSecond: Number.isFinite(Number(safeEntry.baseMessagesPerSecond))
      ? Math.max(0.1, Number(safeEntry.baseMessagesPerSecond))
      : preset.baseMessagesPerSecond,
    coinsPerMessageCents: Number.isFinite(Number(safeEntry.coinsPerMessageCents))
      ? Math.max(1, Math.floor(Number(safeEntry.coinsPerMessageCents)))
      : preset.coinsPerMessageCents,
    upgradeBaseCostCents: Number.isFinite(Number(safeEntry.upgradeBaseCostCents))
      ? Math.max(1, Math.floor(Number(safeEntry.upgradeBaseCostCents)))
      : preset.upgradeBaseCostCents,
    upgradeGrowth: Number.isFinite(Number(safeEntry.upgradeGrowth))
      ? Math.max(1.01, Number(safeEntry.upgradeGrowth))
      : preset.upgradeGrowth,
    messageBonusPerLevel: Number.isFinite(Number(safeEntry.messageBonusPerLevel))
      ? Math.max(0.05, Number(safeEntry.messageBonusPerLevel))
      : preset.messageBonusPerLevel
  };
};

const applyTapSenderNamePalette = (config) => {
  const safeConfig = Array.isArray(config) ? config : [];
  const usedNames = new Set();
  return safeConfig.map((entry, index) => {
    const safeEntry = entry && typeof entry === 'object' ? entry : {};
    const mappedName = pickSenderNameByAvatar({
      entry: safeEntry,
      index,
      usedNames
    });
    return {
      ...safeEntry,
      title: mappedName
    };
  });
};

const createRandomTapSendersConfig = ({ avatarPool = [], size = DEFAULT_AUTO_SENDERS_CONFIG_SIZE } = {}) => {
  const shuffledAvatars = getPrioritizedAvatarPool(avatarPool);
  const shuffledRoles = shuffleArray(TAP_SENDER_ROLE_POOL);
  const usedNames = new Set();

  return Array.from({ length: size }, (_, index) => {
    const preset = TAP_SENDER_ECONOMY_PRESETS[Math.max(0, Math.min(index, TAP_SENDER_ECONOMY_PRESETS.length - 1))];
    const avatar = shuffledAvatars[index] || null;
    const name = pickSenderNameByAvatar({
      entry: {
        id: `sender_slot_${index + 1}`,
        avatarKey: avatar?.key || ''
      },
      index,
      usedNames
    });
    const role = shuffledRoles[index] || TAP_SENDER_ROLE_POOL[index % TAP_SENDER_ROLE_POOL.length] || 'Веде діалоги';

    return normalizeSenderConfigEntry({
      id: `sender_slot_${index + 1}`,
      title: name,
      role,
      tier: preset.tier,
      avatarKey: avatar?.key || '',
      baseCostCents: preset.baseCostCents,
      costGrowth: preset.costGrowth,
      baseMessagesPerSecond: preset.baseMessagesPerSecond,
      coinsPerMessageCents: preset.coinsPerMessageCents,
      upgradeBaseCostCents: preset.upgradeBaseCostCents,
      upgradeGrowth: preset.upgradeGrowth,
      messageBonusPerLevel: preset.messageBonusPerLevel
    }, index);
  });
};

const loadTapSendersConfig = ({ storageKey, size }) => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
    if (!Array.isArray(parsed) || parsed.length !== size) return null;
    return applyTapSenderNamePalette(parsed.map((entry, index) => normalizeSenderConfigEntry(entry, index)));
  } catch {
    return null;
  }
};

const saveTapSendersConfig = ({ storageKey, size, config }) => {
  const safeConfig = Array.isArray(config) ? config.slice(0, size) : [];
  const serializableConfig = applyTapSenderNamePalette(
    safeConfig.map((entry, index) => normalizeSenderConfigEntry(entry, index))
  );
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(serializableConfig));
  } catch {
    // Ignore storage failures.
  }
  return serializableConfig;
};

export function loadOrCreateTapSendersConfig({
  avatarPool = [],
  storageKey = DEFAULT_AUTO_SENDERS_CONFIG_KEY,
  size = DEFAULT_AUTO_SENDERS_CONFIG_SIZE
} = {}) {
  const loaded = loadTapSendersConfig({ storageKey, size });
  if (loaded) return loaded;

  return saveTapSendersConfig({
    storageKey,
    size,
    config: createRandomTapSendersConfig({ avatarPool, size })
  });
}
