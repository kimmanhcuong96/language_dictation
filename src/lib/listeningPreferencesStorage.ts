import { defaultListeningPreferences, normalizeListeningPreferences, type ListeningPreferences } from "./listeningPreferences";

const STORAGE_PREFIX = "me2listen-listening-preferences-v1";

export function loadLocalListeningPreferences(profileId: string): ListeningPreferences {
  try { return normalizeListeningPreferences(JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}:${profileId}`) ?? "null")); }
  catch { return { ...defaultListeningPreferences }; }
}

export function saveLocalListeningPreferences(profileId: string, preferences: ListeningPreferences) {
  localStorage.setItem(`${STORAGE_PREFIX}:${profileId}`, JSON.stringify(preferences));
}
