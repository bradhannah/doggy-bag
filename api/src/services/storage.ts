import { readFile, writeFile, unlink, access, mkdir, readdir, copyFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, dirname } from 'node:path';

// Storage configuration
interface StorageConfig {
  basePath: string;
  entitiesDir: string;
  monthsDir: string;
  isDevelopment: boolean;
}

// Default configuration (development mode)
let config: StorageConfig = {
  basePath: 'data',
  entitiesDir: 'data/entities',
  monthsDir: 'data/months',
  isDevelopment: true,
};

export interface StorageService {
  readFile<T>(path: string): Promise<T | null>;
  writeFile<T>(path: string, data: T): Promise<void>;
  deleteFile(path: string): Promise<void>;
  fileExists(path: string): Promise<boolean>;
  ensureDirectory(path: string): Promise<void>;
  listFiles(path: string): Promise<string[]>;
  readJSON<T>(path: string): Promise<T | null>;
  writeJSON<T>(path: string, data: T): Promise<void>;
  copyFile(src: string, dest: string): Promise<void>;
  getConfig(): StorageConfig;
}

export class StorageServiceImpl implements StorageService {
  private static instance: StorageServiceImpl | null = null;
  private writeLocks: Map<string, Promise<void>> = new Map();

  /**
   * Initialize the storage service with a base path.
   * Must be called before getInstance() in production.
   * In development, defaults to './data'.
   */
  public static initialize(basePath?: string): void {
    const resolvedBasePath = basePath || process.env.DATA_DIR || 'data';
    const isDevelopment = !process.env.DATA_DIR;

    config = {
      basePath: resolvedBasePath,
      entitiesDir: join(resolvedBasePath, 'entities'),
      monthsDir: join(resolvedBasePath, 'months'),
      isDevelopment,
    };

    console.log(`[StorageService] Initialized with base path: ${resolvedBasePath}`);
    console.log(`[StorageService] Mode: ${isDevelopment ? 'development' : 'production'}`);

    // Reset instance to use new config
    StorageServiceImpl.instance = null;
  }

  /**
   * Switch to a new data directory at runtime.
   * Used after migration to point the server at the new location.
   */
  public static switchDataDirectory(newBasePath: string): void {
    console.log(`[StorageService] Switching data directory to: ${newBasePath}`);

    config = {
      basePath: newBasePath,
      entitiesDir: join(newBasePath, 'entities'),
      monthsDir: join(newBasePath, 'months'),
      isDevelopment: false, // Once switched to a custom path, treat as non-dev
    };

    // Reset instance so next getInstance() uses new config
    StorageServiceImpl.instance = null;

    console.log(`[StorageService] Data directory switched successfully`);
  }

  public static getInstance(): StorageService {
    if (!StorageServiceImpl.instance) {
      StorageServiceImpl.instance = new StorageServiceImpl();
    }
    return StorageServiceImpl.instance;
  }

  /**
   * Get the current storage configuration.
   */
  public static getConfig(): StorageConfig {
    return { ...config };
  }

  constructor() {
    this.initializeDirectories();
  }

  private async initializeDirectories() {
    await this.ensureDirectory(config.entitiesDir);
    await this.ensureDirectory(config.monthsDir);
  }

  /**
   * Resolve a relative path to an absolute path based on the configured base path.
   * If the path already starts with the base path, it's returned as-is.
   * If the path starts with 'data/', it's resolved relative to the base path.
   */
  private resolvePath(path: string): string {
    // If path is already absolute or starts with base path, use as-is
    if (path.startsWith('/') || path.startsWith(config.basePath)) {
      return path;
    }

    // Handle legacy 'data/...' paths - resolve relative to base path
    if (path.startsWith('data/')) {
      const relativePath = path.slice(5); // Remove 'data/' prefix
      return join(config.basePath, relativePath);
    }

    // Otherwise, resolve relative to base path
    return join(config.basePath, path);
  }

  /**
   * Serialize writes to the same file path to prevent race conditions.
   * Each write waits for any previous write to the same file to complete.
   */
  private async withWriteLock(resolvedPath: string, fn: () => Promise<void>): Promise<void> {
    const previous = this.writeLocks.get(resolvedPath) ?? Promise.resolve();
    const current = previous.then(fn, fn); // Run fn even if previous failed
    this.writeLocks.set(resolvedPath, current);

    try {
      await current;
    } finally {
      // Clean up if this is still the latest write for this path
      if (this.writeLocks.get(resolvedPath) === current) {
        this.writeLocks.delete(resolvedPath);
      }
    }
  }

  public getConfig(): StorageConfig {
    return StorageServiceImpl.getConfig();
  }

  public async readFile<T>(path: string): Promise<T | null> {
    const resolvedPath = this.resolvePath(path);
    try {
      const content = await readFile(resolvedPath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[StorageService] Failed to read file ${resolvedPath}:`, errorMessage);
      return null;
    }
  }

  public async writeFile<T>(path: string, data: T): Promise<void> {
    const resolvedPath = this.resolvePath(path);
    await this.withWriteLock(resolvedPath, async () => {
      await this.ensureDirectory(dirname(resolvedPath));
      const content = JSON.stringify(data, null, 2);
      await writeFile(resolvedPath, content, 'utf-8');
    });
  }

  public async deleteFile(path: string): Promise<void> {
    const resolvedPath = this.resolvePath(path);
    await this.withWriteLock(resolvedPath, async () => {
      try {
        await unlink(resolvedPath);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[StorageService] Failed to delete file ${resolvedPath}:`, errorMessage);
      }
    });
  }

  public async fileExists(path: string): Promise<boolean> {
    const resolvedPath = this.resolvePath(path);
    try {
      await access(resolvedPath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  public async ensureDirectory(path: string): Promise<void> {
    const resolvedPath = this.resolvePath(path);
    try {
      await mkdir(resolvedPath, { recursive: true });
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (error instanceof Error && 'code' in error && (error as any).code !== 'EEXIST') {
        const errorMessage = error.message;
        console.error(`[StorageService] Failed to create directory ${resolvedPath}:`, errorMessage);
      }
    }
  }

  public async listFiles(path: string): Promise<string[]> {
    const resolvedPath = this.resolvePath(path);
    try {
      const entries = await readdir(resolvedPath, { withFileTypes: true });
      return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[StorageService] Failed to list files in ${resolvedPath}:`, errorMessage);
      return [];
    }
  }

  public async readJSON<T>(path: string): Promise<T | null> {
    const data = await this.readFile<T>(path);
    return data;
  }

  public async writeJSON<T>(path: string, data: T): Promise<void> {
    await this.writeFile(path, data);
  }

  public async copyFile(src: string, dest: string): Promise<void> {
    const resolvedSrc = this.resolvePath(src);
    const resolvedDest = this.resolvePath(dest);
    await this.withWriteLock(resolvedDest, async () => {
      await this.ensureDirectory(dirname(resolvedDest));
      await copyFile(resolvedSrc, resolvedDest);
    });
  }
}
