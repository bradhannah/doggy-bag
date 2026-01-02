// Settings model for configurable data storage

/**
 * Application settings stored via Tauri Store plugin.
 * These are persisted separately from user data.
 */
export interface AppSettings {
  /** Absolute path to user's data storage root. Empty string = use default. */
  dataDirectory: string;
  
  /** Settings format version for future migrations */
  version: string;
}

/**
 * Runtime storage configuration derived from settings/environment.
 */
export interface StorageConfig {
  /** Root path for all file operations */
  basePath: string;
  
  /** Path to entities directory: {basePath}/entities */
  entitiesDir: string;
  
  /** Path to months directory: {basePath}/months */
  monthsDir: string;
  
  /** Whether this is a development environment */
  isDevelopment: boolean;
}

/**
 * Result of validating a directory for use as data storage.
 */
export interface DirectoryValidation {
  /** Whether the directory can be used */
  isValid: boolean;
  
  /** Whether the directory exists */
  exists: boolean;
  
  /** Whether the directory is writable */
  isWritable: boolean;
  
  /** Whether data already exists at this location */
  hasExistingData: boolean;
  
  /** List of existing data files found */
  existingFiles: string[];
  
  /** Error message if not valid */
  error?: string;
}

/**
 * Result of a data migration operation.
 */
export interface MigrationResult {
  /** Whether the migration succeeded */
  success: boolean;
  
  /** Number of entity files copied */
  entityFilesCopied: number;
  
  /** Number of month files copied */
  monthFilesCopied: number;
  
  /** List of files that were copied */
  filesCopied: string[];
  
  /** Error message if failed */
  error?: string;
  
  /** Source directory */
  sourceDir: string;
  
  /** Destination directory */
  destDir: string;
}

/**
 * Current settings response from the API.
 */
export interface SettingsResponse {
  /** Current data directory path */
  dataDirectory: string;
  
  /** Whether running in development mode */
  isDevelopment: boolean;
  
  /** Application version */
  version: string;
}

/**
 * Data directory response from the API.
 */
export interface DataDirectoryResponse {
  /** Current data directory path */
  path: string;
  
  /** Entities subdirectory path */
  entitiesDir: string;
  
  /** Months subdirectory path */
  monthsDir: string;
  
  /** Whether running in development mode */
  isDevelopment: boolean;
  
  /** Whether the directory is writable */
  isWritable: boolean;
}

/** Migration mode options */
export type MigrationMode = 'copy' | 'fresh' | 'use_existing';

/**
 * Request to migrate data to a new directory.
 */
export interface MigrationRequest {
  /** Source directory path */
  sourceDir: string;
  
  /** Destination directory path */
  destDir: string;
  
  /** Migration mode: copy, fresh, or use_existing */
  mode: MigrationMode;
}
