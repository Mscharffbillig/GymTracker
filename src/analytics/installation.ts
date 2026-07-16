import AsyncStorage from '@react-native-async-storage/async-storage';

const INSTALL_ID_KEY = '@gymtracker/installationId';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getInstallationId(): Promise<string> {
  const existing = await AsyncStorage.getItem(INSTALL_ID_KEY);
  if (existing) return existing;
  const newId = generateUUID();
  await AsyncStorage.setItem(INSTALL_ID_KEY, newId);
  return newId;
}

export async function clearInstallationId(): Promise<void> {
  await AsyncStorage.removeItem(INSTALL_ID_KEY);
}

// Exposed for testing only
export { INSTALL_ID_KEY };
