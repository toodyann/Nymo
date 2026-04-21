const tapPersonsAvatarModules = import.meta.glob('../../../../Assets/Persons/*.{png,jpg,jpeg,webp,avif,svg}', {
  import: 'default'
});

const TAP_PERSONS_AVATAR_POOL = Object.keys(tapPersonsAvatarModules)
  .map((path) => ({
    path: String(path || '').trim(),
    key: String(path || '').split('/').pop()?.replace(/\.[^.]+$/, '') || ''
  }))
  .filter((entry) => entry.key && entry.path)
  .sort((a, b) => a.key.localeCompare(b.key, 'uk-UA'));

const TAP_PERSONS_AVATAR_IMPORTER_BY_KEY = new Map(
  TAP_PERSONS_AVATAR_POOL.map((entry) => [entry.key, tapPersonsAvatarModules[entry.path]])
);

const TAP_AUTO_AWAY_START_TS_KEY = 'orionTapAutoAwayStartTs';
const TAP_AUTO_PENDING_REWARD_CENTS_KEY = 'orionTapAutoPendingRewardCents';
const TAP_AUTO_PENDING_REWARD_SECONDS_KEY = 'orionTapAutoPendingRewardSeconds';

export {
  TAP_PERSONS_AVATAR_POOL,
  TAP_PERSONS_AVATAR_IMPORTER_BY_KEY,
  TAP_AUTO_AWAY_START_TS_KEY,
  TAP_AUTO_PENDING_REWARD_CENTS_KEY,
  TAP_AUTO_PENDING_REWARD_SECONDS_KEY
};
