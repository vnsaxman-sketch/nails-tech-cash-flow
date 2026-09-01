import type { AppSettings, IncomeEntry } from "./types";

const INCOME_STORAGE_KEY = "hairsalon-barber-income-entries-v1";
const SETTINGS_STORAGE_KEY = "hairsalon-barber-income-settings-v1";

const defaultSettings: AppSettings = {
  biweeklyStartDate: new Date().toISOString().slice(0, 10),
};

export function loadIncomeEntries(): IncomeEntry[] {
  const saved = localStorage.getItem(INCOME_STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as IncomeEntry[];
  } catch {
    return [];
  }
}

export function saveIncomeEntries(entries: IncomeEntry[]) {
  localStorage.setItem(INCOME_STORAGE_KEY, JSON.stringify(entries));
}

export function loadSettings(): AppSettings {
  const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);

  if (!saved) {
    return defaultSettings;
  }

  try {
    return {
      ...defaultSettings,
      ...JSON.parse(saved),
    } as AppSettings;
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function replaceAllData(
  entries: IncomeEntry[],
  settings: AppSettings,
) {
  saveIncomeEntries(entries);
  saveSettings(settings);
}

