import type { UserProgress } from "~/types/progress";

const STORAGE_KEY = "kana-progress";
const SELECTED_GROUPS_KEY = "kana-selected-groups";

export function saveProgress(progress: UserProgress): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error("Failed to save progress:", error);
  }
}

export function loadProgress(): UserProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as UserProgress;
    // Ensure backward compatibility - if old format exists, extract only kanaCards
    if (parsed.kanaCards) {
      return { kanaCards: parsed.kanaCards };
    }
    return null;
  } catch (error) {
    console.error("Failed to load progress:", error);
    return null;
  }
}

export function clearProgress(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear progress:", error);
  }
}

export function saveSelectedGroups(selectedGroups: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    const groupsArray = Array.from(selectedGroups);
    localStorage.setItem(SELECTED_GROUPS_KEY, JSON.stringify(groupsArray));
  } catch (error) {
    console.error("Failed to save selected groups:", error);
  }
}

export function loadSelectedGroups(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(SELECTED_GROUPS_KEY);
    if (!stored) return new Set();
    const groupsArray = JSON.parse(stored) as string[];
    return new Set(groupsArray);
  } catch (error) {
    console.error("Failed to load selected groups:", error);
    return new Set();
  }
}
