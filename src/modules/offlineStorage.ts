import type {
  AutomationRoutine,
  ConversationEntry,
  CustomVoiceProfile,
  DeviceFile,
  InstalledAppPermission,
  Playlist,
  UserSettings,
} from '../types/nexus.ts';

const OFFLINE_CACHE_KEY = 'nexus_offline_workspace_v1';

export interface OfflineWorkspaceSnapshot {
  settings?: UserSettings;
  customVoiceProfile?: CustomVoiceProfile;
  messages?: ConversationEntry[];
  files?: DeviceFile[];
  playlists?: Playlist[];
  automations?: AutomationRoutine[];
  appPermissions?: InstalledAppPermission[];
  savedAt: string;
}

export function loadOfflineWorkspaceSnapshot(): OfflineWorkspaceSnapshot | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(OFFLINE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfflineWorkspaceSnapshot;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function saveOfflineWorkspaceSnapshot(
  snapshot: Omit<OfflineWorkspaceSnapshot, 'savedAt'>
): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    // Strip transient blob: URLs before serializing files so offline cache stays clean
    const safeFiles = snapshot.files?.map((f) =>
      f.objectUrl && f.objectUrl.startsWith('blob:')
        ? { ...f, objectUrl: undefined }
        : f
    );
    // Keep up to 4 compact voice samples in localStorage (skip huge blobs if >1.2MB)
    const safeVoice = snapshot.customVoiceProfile
      ? {
          ...snapshot.customVoiceProfile,
          samples: snapshot.customVoiceProfile.samples.slice(0, 4).map((s) =>
            s.audioDataUrl && s.audioDataUrl.length > 350000
              ? { ...s, audioDataUrl: undefined }
              : s
          ),
        }
      : undefined;
    const payload: OfflineWorkspaceSnapshot = {
      ...snapshot,
      customVoiceProfile: safeVoice,
      files: safeFiles,
      messages: snapshot.messages?.slice(-50),
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota issues silently
  }
}
