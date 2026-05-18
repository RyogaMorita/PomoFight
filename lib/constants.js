// ── ランクティア ─────────────────────────────────────────────
export const TIERS = [
  { min: 2000, label: 'LEGEND',  emoji: '👑', color: '#ff6b35' },
  { min: 1500, label: 'DIAMOND', emoji: '💎', color: '#00bcd4' },
  { min: 1000, label: 'GOLD',    emoji: '🏅', color: '#c9a227' },
  { min: 500,  label: 'SILVER',  emoji: '🥈', color: '#90a4ae' },
  { min: 0,    label: 'BRONZE',  emoji: '🥉', color: '#a1887f' },
]
export function getTier(rank) {
  return TIERS.find(t => rank >= t.min) ?? TIERS[TIERS.length - 1]
}

// ── プロフィールアイコン ──────────────────────────────────────
export const PROFILE_ICONS = {
  bear: require('../assets/profile_icon/bear_icon.png'),
  cat:  require('../assets/profile_icon/cat_icon.png'),
  dog:  require('../assets/profile_icon/dog_icon.png'),
}

// ── 木 ──────────────────────────────────────────────────────
export const TREE_IMAGES = {
  1:  require('../assets/trees/tree_1.png'),
  2:  require('../assets/trees/tree_2.png'),
  3:  require('../assets/trees/tree_3.png'),
  4:  require('../assets/trees/tree_4.png'),
  5:  require('../assets/trees/tree_5.png'),
  6:  require('../assets/trees/tree_6.png'),
  7:  require('../assets/trees/tree_7.png'),
  8:  require('../assets/trees/tree_8.png'),
  9:  require('../assets/trees/tree_9.png'),
  10: require('../assets/trees/tree_10.png'),
}

// ── 魚 ──────────────────────────────────────────────────────
export const FISH_IMAGES = {
  1: require('../assets/fish/fish_1.png'),
  2: require('../assets/fish/fish_2.png'),
  3: require('../assets/fish/fish_3.png'),
  4: require('../assets/fish/fish_4.png'),
  5: require('../assets/fish/fish_5.png'),
  6: require('../assets/fish/fish_6.png'),
}

// ── ステータスバッジ ──────────────────────────────────────────
export const STATUS_BADGES = {
  first_pomo: { emoji: '🌱', label: '初ポモドーロ' },
  pomo_10:    { emoji: '🌿', label: '10ポモ' },
  pomo_50:    { emoji: '🌳', label: '50ポモ' },
  pomo_100:   { emoji: '🌲', label: '100ポモ' },
  pomo_300:   { emoji: '🌲🌲', label: '300ポモ' },
  first_win:  { emoji: '⚔️', label: '初勝利' },
  win_10:     { emoji: '🏅', label: '10勝' },
  win_50:     { emoji: '🏆', label: '50勝' },
  win_100:    { emoji: '👑', label: '100勝' },
  rank_500:   { emoji: '🥈', label: 'シルバー到達' },
  rank_1000:  { emoji: '🥇', label: 'ゴールド到達' },
  rank_2000:  { emoji: '💎', label: 'ダイヤ到達' },
  seed:       { emoji: '🌱', label: '集中の種' },
}
