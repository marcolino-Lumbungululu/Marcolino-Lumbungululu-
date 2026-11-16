import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const userSettings = pgTable('user_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  assistantUserName: text('assistant_user_name').notNull().default('Utilizador'),
  voiceGender: text('voice_gender').notNull().default('feminina'),
  voiceUri: text('voice_uri'),
  speechRate: real('speech_rate').notNull().default(1.0),
  responseVolume: real('response_volume').notNull().default(0.85),
  language: text('language').notNull().default('pt-AO'),
  wakeWord: text('wake_word').notNull().default('NEXUS'),
  wakeWordEnabled: boolean('wake_word_enabled').notNull().default(false),
  silentMode: boolean('silent_mode').notNull().default(false),
  theme: text('theme').notNull().default('dark'),
  offlineMode: boolean('offline_mode').notNull().default(false),
  highThinking: boolean('high_thinking').notNull().default(false),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const conversationMessages = pgTable('conversation_messages', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  recognizedCommand: text('recognized_command'),
  intentAction: text('intent_action'),
  executionResult: text('execution_result'),
  thinkingSummary: text('thinking_summary'),
  mode: text('mode').notNull().default('online'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const mediaTracks = pgTable('media_tracks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  trackNumber: integer('track_number').notNull(),
  title: text('title').notNull(),
  artist: text('artist').notNull(),
  album: text('album').notNull(),
  category: text('category').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  coverUrl: text('cover_url'),
  sourceType: text('source_type').notNull().default('synth'),
  fileHash: text('file_hash'),
  playCount: integer('play_count').notNull().default(0),
  lastPlayedAt: timestamp('last_played_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const playlists = pgTable('playlists', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  category: text('category').notNull().default('Personalizada'),
  trackIdsJson: text('track_ids_json').notNull().default('[]'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const deviceFiles = pgTable('device_files', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull().default(0),
  folderPath: text('folder_path').notNull().default('/Documentos'),
  contentPreview: text('content_preview'),
  pageCount: integer('page_count').notNull().default(1),
  lastPage: integer('last_page').notNull().default(1),
  lastOpenedAt: timestamp('last_opened_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const automations = pgTable('automations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  triggerPhrase: text('trigger_phrase').notNull(),
  description: text('description').notNull(),
  stepsJson: text('steps_json').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  lastRunAt: timestamp('last_run_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const appPermissions = pgTable('app_permissions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  appId: text('app_id').notNull(),
  appName: text('app_name').notNull(),
  canLaunchByVoice: boolean('can_launch_by_voice').notNull().default(true),
  requireConfirmation: boolean('require_confirmation').notNull().default(false),
  allowMicrophone: boolean('allow_microphone').notNull().default(false),
  allowFiles: boolean('allow_files').notNull().default(false),
  allowNotifications: boolean('allow_notifications').notNull().default(true),
  allowBackground: boolean('allow_background').notNull().default(false),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const customVoiceProfiles = pgTable('custom_voice_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  voiceId: text('voice_id'),
  enabled: boolean('enabled').notNull().default(false),
  consentGranted: boolean('consent_granted').notNull().default(false),
  consentAcceptedAt: timestamp('consent_accepted_at'),
  ownerDisplayName: text('owner_display_name').notNull().default('Utilizador'),
  geminiVoiceName: text('gemini_voice_name').notNull().default('Kore'),
  fallbackVoiceUri: text('fallback_voice_uri'),
  expressiveness: real('expressiveness').notNull().default(1.0),
  speechRate: real('speech_rate').notNull().default(1.0),
  acousticStylePrompt: text('acoustic_style_prompt').notNull().default(''),
  calibrationStatus: text('calibration_status').notNull().default('nao_configurada'),
  aiDisclosureEnabled: boolean('ai_disclosure_enabled').notNull().default(true),
  samplesMetadataJson: text('samples_metadata_json').notNull().default('[]'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  customVoiceProfile: one(customVoiceProfiles, {
    fields: [users.id],
    references: [customVoiceProfiles.userId],
  }),
  messages: many(conversationMessages),
  tracks: many(mediaTracks),
  playlists: many(playlists),
  files: many(deviceFiles),
  automations: many(automations),
  appPermissions: many(appPermissions),
}));
