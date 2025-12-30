// Combo configuration: thresholds, multipliers, and timer durations
export interface ComboConfig {
  threshold: number; // Minimum combo count for this tier
  multiplier: number; // Damage multiplier
  timerMs: number; // Mana timer duration in milliseconds
}

export const COMBO_CONFIGS: ComboConfig[] = [
  { threshold: 5, multiplier: 2.0, timerMs: 3000 }, // 3 seconds for 5+ combo
  { threshold: 3, multiplier: 1.5, timerMs: 5000 }, // 5 seconds for 3-4 combo
  { threshold: 0, multiplier: 1, timerMs: 7000 }, // 7 seconds for 0-2 combo (no multiplier)
];

// Helper function to get combo config for a given combo count
export function getComboConfig(comboCount: number): ComboConfig {
  // Find the first config where comboCount >= threshold (configs should be sorted descending)
  return (
    COMBO_CONFIGS.find((config) => comboCount >= config.threshold) ??
    COMBO_CONFIGS[COMBO_CONFIGS.length - 1]!
  );
}
