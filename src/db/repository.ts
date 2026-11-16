import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  appPermissions,
  automations,
  conversationMessages,
  customVoiceProfiles,
  deviceFiles,
  mediaTracks,
  playlists,
  users,
  userSettings,
} from './schema.ts';
import { DEFAULT_APP_PERMISSIONS } from '../modules/installedAppsCatalog.ts';
import {
  COVER_ANGOLA,
  COVER_CHRISTIAN,
  COVER_FOCUS,
  DEFAULT_CUSTOM_VOICE_PROFILE,
  DEFAULT_SETTINGS,
  SEED_AUTOMATIONS,
  SEED_FILES,
  SEED_PLAYLISTS,
  SEED_TRACKS,
} from '../modules/seedData.ts';
import type {
  AutomationRoutine,
  ConversationEntry,
  CustomVoiceProfile,
  DeviceFile,
  FileCategory,
  GeminiPrebuiltVoice,
  InstalledAppPermission,
  MediaTrack,
  Playlist,
  UserSettings,
  VoiceSampleRecord,
} from '../types/nexus.ts';

export async function getOrCreateUser(uid: string, email: string, displayName?: string) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName ?? null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName ?? null,
        },
      })
      .returning();

    const user = result[0];
    await ensureUserSeedData(user.id);
    return user;
  } catch (error) {
    console.error('Database getOrCreateUser failed:', error);
    throw new Error('Falha ao sincronizar conta de utilizador.', { cause: error });
  }
}

async function ensureUserSeedData(userId: number) {
  const existingSettings = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));

  if (existingSettings.length === 0) {
    await db
      .insert(userSettings)
      .values({
        userId,
        assistantUserName: DEFAULT_SETTINGS.assistantUserName,
        voiceGender: DEFAULT_SETTINGS.voiceGender,
        speechRate: DEFAULT_SETTINGS.speechRate,
        responseVolume: DEFAULT_SETTINGS.responseVolume,
        language: DEFAULT_SETTINGS.language,
        wakeWord: DEFAULT_SETTINGS.wakeWord,
        wakeWordEnabled: DEFAULT_SETTINGS.wakeWordEnabled,
        silentMode: DEFAULT_SETTINGS.silentMode,
        theme: DEFAULT_SETTINGS.theme,
        offlineMode: DEFAULT_SETTINGS.offlineMode,
        highThinking: DEFAULT_SETTINGS.highThinking,
      })
      .onConflictDoNothing();
  }

  const existingTracks = await db
    .select()
    .from(mediaTracks)
    .where(eq(mediaTracks.userId, userId));

  if (existingTracks.length === 0) {
    const insertedTracks = await db
      .insert(mediaTracks)
      .values(
        SEED_TRACKS.map((t) => ({
          userId,
          trackNumber: t.trackNumber,
          title: t.title,
          artist: t.artist,
          album: t.album,
          category: t.category,
          durationSeconds: t.durationSeconds,
          coverUrl: t.coverUrl,
          sourceType: t.sourceType,
          fileHash: t.fileHash,
          playCount: t.playCount,
          lastPlayedAt: t.lastPlayedAt ? new Date(t.lastPlayedAt) : null,
        }))
      )
      .returning();

    const idMap = new Map<string, string>();
    SEED_TRACKS.forEach((seed, idx) => {
      if (insertedTracks[idx]) {
        idMap.set(seed.id, String(insertedTracks[idx].id));
      }
    });

    await db.insert(playlists).values(
      SEED_PLAYLISTS.map((pl) => ({
        userId,
        name: pl.name,
        category: pl.category,
        trackIdsJson: JSON.stringify(
          pl.trackIds.map((oldId) => idMap.get(oldId) ?? oldId)
        ),
      }))
    );
  }

  const existingFiles = await db
    .select()
    .from(deviceFiles)
    .where(eq(deviceFiles.userId, userId));

  if (existingFiles.length === 0) {
    await db.insert(deviceFiles).values(
      SEED_FILES.map((f) => ({
        userId,
        name: f.name,
        category: f.category,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
        folderPath: f.folderPath,
        contentPreview: JSON.stringify(f.pages),
        pageCount: f.pageCount,
        lastPage: f.lastPage,
        lastOpenedAt: f.lastOpenedAt ? new Date(f.lastOpenedAt) : null,
      }))
    );
  }

  const existingAutomations = await db
    .select()
    .from(automations)
    .where(eq(automations.userId, userId));

  if (existingAutomations.length === 0) {
    await db.insert(automations).values(
      SEED_AUTOMATIONS.map((a) => ({
        userId,
        name: a.name,
        triggerPhrase: a.triggerPhrase,
        description: a.description,
        stepsJson: JSON.stringify(a.steps),
        isActive: a.isActive,
      }))
    );
  }
}

export async function getUserWorkspace(userId: number) {
  try {
    const [
      settingsRows,
      messageRows,
      trackRows,
      playlistRows,
      fileRows,
      autoRows,
      permRows,
      voiceRows,
    ] = await Promise.all([
      db.select().from(userSettings).where(eq(userSettings.userId, userId)),
      db
        .select()
        .from(conversationMessages)
        .where(eq(conversationMessages.userId, userId))
        .orderBy(conversationMessages.createdAt),
      db
        .select()
        .from(mediaTracks)
        .where(eq(mediaTracks.userId, userId))
        .orderBy(mediaTracks.trackNumber),
      db
        .select()
        .from(playlists)
        .where(eq(playlists.userId, userId))
        .orderBy(playlists.createdAt),
      db
        .select()
        .from(deviceFiles)
        .where(eq(deviceFiles.userId, userId))
        .orderBy(desc(deviceFiles.createdAt)),
      db
        .select()
        .from(automations)
        .where(eq(automations.userId, userId))
        .orderBy(automations.id),
      db
        .select()
        .from(appPermissions)
        .where(eq(appPermissions.userId, userId)),
      db
        .select()
        .from(customVoiceProfiles)
        .where(eq(customVoiceProfiles.userId, userId)),
    ]);

    const s = settingsRows[0];
    const settings: UserSettings = s
      ? {
          assistantUserName: s.assistantUserName,
          voiceGender: s.voiceGender === 'masculina' ? 'masculina' : 'feminina',
          voiceUri: s.voiceUri ?? null,
          speechRate: s.speechRate,
          responseVolume: s.responseVolume,
          language: (s.language as UserSettings['language']) || 'pt-AO',
          wakeWord: s.wakeWord,
          wakeWordEnabled: s.wakeWordEnabled,
          silentMode: s.silentMode,
          theme: s.theme === 'light' ? 'light' : 'dark',
          offlineMode: s.offlineMode,
          highThinking: s.highThinking,
        }
      : DEFAULT_SETTINGS;

    const messages: ConversationEntry[] = messageRows.map((m) => ({
      id: String(m.id),
      role: (m.role as ConversationEntry['role']) || 'assistant',
      content: m.content,
      recognizedCommand: m.recognizedCommand,
      intentAction: m.intentAction,
      executionResult: m.executionResult,
      thinkingSummary: m.thinkingSummary,
      mode: (m.mode as ConversationEntry['mode']) || 'online',
      createdAt: m.createdAt?.toISOString() ?? new Date().toISOString(),
    }));

    const tracks: MediaTrack[] = trackRows.map((t) => ({
      id: String(t.id),
      trackNumber: t.trackNumber,
      title: t.title,
      artist: t.artist,
      album: t.album,
      category: t.category,
      durationSeconds: t.durationSeconds,
      coverUrl:
        t.coverUrl ||
        (t.category === 'Música Cristã'
          ? COVER_CHRISTIAN
          : t.category === 'Semba & Kizomba'
          ? COVER_ANGOLA
          : COVER_FOCUS),
      sourceType: t.sourceType === 'local' ? 'local' : 'synth',
      fileHash: t.fileHash ?? `${t.title}-${t.artist}`,
      playCount: t.playCount,
      lastPlayedAt: t.lastPlayedAt?.toISOString() ?? null,
      synthProfile: SEED_TRACKS.find((st) => st.title === t.title)?.synthProfile,
    }));

    const parsedPlaylists: Playlist[] = playlistRows.map((p) => ({
      id: String(p.id),
      name: p.name,
      category: p.category,
      trackIds: safeJsonArray<string>(p.trackIdsJson),
      createdAt: p.createdAt?.toISOString() ?? new Date().toISOString(),
    }));

    const files: DeviceFile[] = fileRows.map((f) => {
      const pages = safeJsonArray<string>(f.contentPreview ?? '[]');
      return {
        id: String(f.id),
        name: f.name,
        category: (f.category as FileCategory) || 'PDF',
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
        folderPath: f.folderPath,
        pages: pages.length > 0 ? pages : ['Documento guardado no dispositivo.'],
        pageCount: f.pageCount,
        lastPage: f.lastPage,
        lastOpenedAt: f.lastOpenedAt?.toISOString() ?? null,
        createdAt: f.createdAt?.toISOString() ?? new Date().toISOString(),
      };
    });

    const parsedAutomations: AutomationRoutine[] = autoRows.map((a) => ({
      id: String(a.id),
      name: a.name,
      triggerPhrase: a.triggerPhrase,
      description: a.description,
      steps: safeJsonArray(a.stepsJson),
      isActive: a.isActive,
      lastRunAt: a.lastRunAt?.toISOString() ?? null,
    }));

    const permById = new Map(permRows.map((p) => [p.appId, p]));
    const mergedAppPermissions: InstalledAppPermission[] = DEFAULT_APP_PERMISSIONS.map((def) => {
      const saved = permById.get(def.id);
      if (!saved) return def;
      return {
        ...def,
        canLaunchByVoice: saved.canLaunchByVoice,
        requireConfirmation: saved.requireConfirmation,
        allowMicrophone: saved.allowMicrophone,
        allowFiles: saved.allowFiles,
        allowNotifications: saved.allowNotifications,
        allowBackground: saved.allowBackground,
      };
    });

    const v = voiceRows[0];
    const customVoiceProfile: CustomVoiceProfile = v
      ? {
          voiceId: v.voiceId ?? null,
          enabled: v.enabled,
          consentGranted: v.consentGranted,
          consentAcceptedAt: v.consentAcceptedAt?.toISOString() ?? null,
          ownerDisplayName: v.ownerDisplayName || 'Utilizador',
          geminiVoiceName:
            (v.geminiVoiceName as GeminiPrebuiltVoice) ||
            DEFAULT_CUSTOM_VOICE_PROFILE.geminiVoiceName,
          fallbackVoiceUri: v.fallbackVoiceUri ?? null,
          expressiveness: v.expressiveness,
          speechRate: v.speechRate,
          acousticStylePrompt:
            v.acousticStylePrompt || DEFAULT_CUSTOM_VOICE_PROFILE.acousticStylePrompt,
          calibrationStatus:
            (v.calibrationStatus as CustomVoiceProfile['calibrationStatus']) ||
            'nao_configurada',
          aiDisclosureEnabled: v.aiDisclosureEnabled,
          samples: safeJsonArray<VoiceSampleRecord>(v.samplesMetadataJson),
          updatedAt: v.updatedAt?.toISOString() ?? null,
        }
      : DEFAULT_CUSTOM_VOICE_PROFILE;

    return {
      settings,
      messages,
      tracks,
      playlists: parsedPlaylists,
      files,
      automations: parsedAutomations,
      appPermissions: mergedAppPermissions,
      customVoiceProfile,
    };
  } catch (error) {
    console.error('Database getUserWorkspace failed:', error);
    throw new Error('Não foi possível carregar os dados do espaço de trabalho.', {
      cause: error,
    });
  }
}

export async function updateUserSettings(userId: number, patch: Partial<UserSettings>) {
  try {
    const result = await db
      .insert(userSettings)
      .values({
        userId,
        ...patch,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          ...patch,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database updateUserSettings failed:', error);
    throw new Error('Falha ao guardar as definições.', { cause: error });
  }
}

export async function saveConversationMessage(
  userId: number,
  entry: Omit<ConversationEntry, 'id' | 'createdAt'>
) {
  try {
    const result = await db
      .insert(conversationMessages)
      .values({
        userId,
        role: entry.role,
        content: entry.content,
        recognizedCommand: entry.recognizedCommand ?? null,
        intentAction: entry.intentAction ?? null,
        executionResult: entry.executionResult ?? null,
        thinkingSummary: entry.thinkingSummary ?? null,
        mode: entry.mode,
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database saveConversationMessage failed:', error);
    throw new Error('Falha ao registar mensagem no histórico.', { cause: error });
  }
}

export async function clearConversationHistory(userId: number) {
  try {
    await db
      .delete(conversationMessages)
      .where(eq(conversationMessages.userId, userId));
  } catch (error) {
    console.error('Database clearConversationHistory failed:', error);
    throw new Error('Falha ao limpar o histórico.', { cause: error });
  }
}

export async function createPlaylistRecord(
  userId: number,
  name: string,
  category: string,
  trackIds: string[]
) {
  try {
    const result = await db
      .insert(playlists)
      .values({
        userId,
        name,
        category,
        trackIdsJson: JSON.stringify(trackIds),
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database createPlaylistRecord failed:', error);
    throw new Error('Falha ao criar lista de reprodução.', { cause: error });
  }
}

export async function deleteTrackRecord(userId: number, trackId: number) {
  try {
    await db
      .delete(mediaTracks)
      .where(and(eq(mediaTracks.id, trackId), eq(mediaTracks.userId, userId)));
  } catch (error) {
    console.error('Database deleteTrackRecord failed:', error);
    throw new Error('Falha ao remover música.', { cause: error });
  }
}

export async function recordTrackPlay(userId: number, trackId: number, currentCount: number) {
  try {
    await db
      .update(mediaTracks)
      .set({
        playCount: currentCount + 1,
        lastPlayedAt: new Date(),
      })
      .where(and(eq(mediaTracks.id, trackId), eq(mediaTracks.userId, userId)));
  } catch (error) {
    console.error('Database recordTrackPlay failed:', error);
    throw new Error('Falha ao atualizar contagem de reprodução.', { cause: error });
  }
}

export async function updateFilePageProgress(
  userId: number,
  fileId: number,
  lastPage: number
) {
  try {
    await db
      .update(deviceFiles)
      .set({
        lastPage,
        lastOpenedAt: new Date(),
      })
      .where(and(eq(deviceFiles.id, fileId), eq(deviceFiles.userId, userId)));
  } catch (error) {
    console.error('Database updateFilePageProgress failed:', error);
    throw new Error('Falha ao guardar página atual do documento.', { cause: error });
  }
}

export async function saveDeviceFileRecord(
  userId: number,
  file: Omit<DeviceFile, 'id' | 'createdAt'>
) {
  try {
    const result = await db
      .insert(deviceFiles)
      .values({
        userId,
        name: file.name,
        category: file.category,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        folderPath: file.folderPath,
        contentPreview: JSON.stringify(file.pages),
        pageCount: file.pageCount,
        lastPage: file.lastPage,
        lastOpenedAt: file.lastOpenedAt ? new Date(file.lastOpenedAt) : null,
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database saveDeviceFileRecord failed:', error);
    throw new Error('Falha ao guardar ficheiro na biblioteca.', { cause: error });
  }
}

export async function createAutomationRecord(
  userId: number,
  routine: Omit<AutomationRoutine, 'id' | 'lastRunAt'>
) {
  try {
    const result = await db
      .insert(automations)
      .values({
        userId,
        name: routine.name,
        triggerPhrase: routine.triggerPhrase,
        description: routine.description,
        stepsJson: JSON.stringify(routine.steps),
        isActive: routine.isActive,
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database createAutomationRecord failed:', error);
    throw new Error('Falha ao criar automação.', { cause: error });
  }
}

export async function markAutomationExecuted(userId: number, automationId: number) {
  try {
    await db
      .update(automations)
      .set({ lastRunAt: new Date() })
      .where(and(eq(automations.id, automationId), eq(automations.userId, userId)));
  } catch (error) {
    console.error('Database markAutomationExecuted failed:', error);
    throw new Error('Falha ao registar execução da automação.', { cause: error });
  }
}

export async function upsertAppPermissionRecord(
  userId: number,
  perm: InstalledAppPermission
) {
  try {
    const existing = await db
      .select()
      .from(appPermissions)
      .where(and(eq(appPermissions.userId, userId), eq(appPermissions.appId, perm.id)));

    if (existing.length > 0) {
      await db
        .update(appPermissions)
        .set({
          appName: perm.name,
          canLaunchByVoice: perm.canLaunchByVoice,
          requireConfirmation: perm.requireConfirmation,
          allowMicrophone: perm.allowMicrophone,
          allowFiles: perm.allowFiles,
          allowNotifications: perm.allowNotifications,
          allowBackground: perm.allowBackground,
          updatedAt: new Date(),
        })
        .where(eq(appPermissions.id, existing[0].id));
    } else {
      await db.insert(appPermissions).values({
        userId,
        appId: perm.id,
        appName: perm.name,
        canLaunchByVoice: perm.canLaunchByVoice,
        requireConfirmation: perm.requireConfirmation,
        allowMicrophone: perm.allowMicrophone,
        allowFiles: perm.allowFiles,
        allowNotifications: perm.allowNotifications,
        allowBackground: perm.allowBackground,
      });
    }
  } catch (error) {
    console.error('Database upsertAppPermissionRecord failed:', error);
    throw new Error('Falha ao guardar permissão do aplicativo.', { cause: error });
  }
}

export async function upsertCustomVoiceProfileRecord(
  userId: number,
  profile: CustomVoiceProfile
) {
  try {
    const compactSamples = (profile.samples ?? []).map((s) => ({
      ...s,
      audioDataUrl: undefined,
    }));
    const values = {
      userId,
      voiceId: profile.voiceId ?? null,
      enabled: Boolean(profile.enabled),
      consentGranted: Boolean(profile.consentGranted),
      consentAcceptedAt: profile.consentAcceptedAt ? new Date(profile.consentAcceptedAt) : null,
      ownerDisplayName: profile.ownerDisplayName || 'Utilizador',
      geminiVoiceName: profile.geminiVoiceName || 'Kore',
      fallbackVoiceUri: profile.fallbackVoiceUri ?? null,
      expressiveness: Number(profile.expressiveness ?? 1.0),
      speechRate: Number(profile.speechRate ?? 1.0),
      acousticStylePrompt: profile.acousticStylePrompt ?? '',
      calibrationStatus: profile.calibrationStatus ?? 'nao_configurada',
      aiDisclosureEnabled: Boolean(profile.aiDisclosureEnabled),
      samplesMetadataJson: JSON.stringify(compactSamples),
      updatedAt: new Date(),
    };
    const result = await db
      .insert(customVoiceProfiles)
      .values(values)
      .onConflictDoUpdate({
        target: customVoiceProfiles.userId,
        set: values,
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database upsertCustomVoiceProfileRecord failed:', error);
    throw new Error('Falha ao guardar o perfil de voz personalizada.', { cause: error });
  }
}

export async function deleteCustomVoiceProfileRecord(userId: number) {
  try {
    await db
      .delete(customVoiceProfiles)
      .where(eq(customVoiceProfiles.userId, userId));
  } catch (error) {
    console.error('Database deleteCustomVoiceProfileRecord failed:', error);
    throw new Error('Falha ao eliminar a configuração da voz personalizada.', { cause: error });
  }
}

function safeJsonArray<T>(raw: string): T[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
