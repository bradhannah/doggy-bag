import { mkdir, readdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { StorageServiceImpl, type StorageService } from './storage';
import { runWithDataAccess } from './data-access';
import { requestStorage } from './request-cache';
import { StorageError } from '../utils/errors';
import type { BackupFileData, MonthlyData, ValidationResult } from '../types';

const CORE_ENTITIES = {
  bills: 'bills.json',
  incomes: 'incomes.json',
  payment_sources: 'payment-sources.json',
  categories: 'categories.json',
} as const;
const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const validDocumentPath = (path: string) =>
  (path.startsWith('documents/') || path.startsWith('data/documents/')) &&
  !path.includes('\\') &&
  !path.includes('\0') &&
  path.split('/').every((part) => part !== '' && part !== '.' && part !== '..');

export interface BackupService {
  exportBackup(): Promise<BackupFileData>;
  importBackup(data: BackupFileData): Promise<void>;
  validateBackup(data: BackupFileData): ValidationResult;
}

export class BackupServiceImpl implements BackupService {
  private static instance: BackupServiceImpl | null = null;
  private storage: StorageService;

  public static getInstance(): BackupService {
    return (this.instance ??= new BackupServiceImpl());
  }

  constructor() {
    this.storage = StorageServiceImpl.getInstance();
  }

  public exportBackup(): Promise<BackupFileData> {
    return runWithDataAccess(async () => {
      const core = {} as Pick<BackupFileData, keyof typeof CORE_ENTITIES>;
      for (const key of Object.keys(CORE_ENTITIES) as (keyof typeof CORE_ENTITIES)[]) {
        const value = (await this.storage.readJSON(`data/entities/${CORE_ENTITIES[key]}`)) ?? [];
        if (!Array.isArray(value)) throw new StorageError(`Invalid collection: ${key}`);
        core[key] = value;
      }

      const entities: Record<string, unknown> = {};
      const coreFiles = new Set<string>(Object.values(CORE_ENTITIES));
      for (const file of await this.storage.listFiles('data/entities')) {
        if (!file.endsWith('.json') || coreFiles.has(file)) continue;
        const value = await this.storage.readJSON(`data/entities/${file}`);
        if (value === null) throw new StorageError(`Unable to back up entity: ${file}`);
        entities[file] = value;
      }

      const months: MonthlyData[] = [];
      for (const file of await this.storage.listFiles('data/months')) {
        if (!file.endsWith('.json')) continue;
        const value = await this.storage.readJSON<MonthlyData>(`data/months/${file}`);
        if (!value) throw new StorageError(`Unable to back up month: ${file}`);
        months.push(value);
      }

      const documents: Record<string, string> = {};
      const documentsRoot = this.storage.getConfig().basePath;
      const visit = async (relative: string, optionalRoot = false): Promise<void> => {
        let entries;
        try {
          entries = await readdir(join(documentsRoot, relative), { withFileTypes: true });
        } catch (error) {
          if (optionalRoot && (error as NodeJS.ErrnoException).code === 'ENOENT') return;
          throw error;
        }
        for (const entry of entries) {
          const path = relative ? `${relative}/${entry.name}` : entry.name;
          if (entry.isDirectory()) await visit(path);
          else if (entry.isFile())
            documents[path] = (await readFile(join(documentsRoot, path))).toString('base64');
          else throw new StorageError(`Cannot back up unsupported document entry: ${path}`);
        }
      };
      // Insurance's existing uploader uses data/documents beneath the configured
      // directory. Preserve both layouts, including identical filenames.
      await visit('documents', true);
      await visit('data/documents', true);

      const backup: BackupFileData = {
        schema_version: 2,
        export_date: new Date().toISOString(),
        ...core,
        months,
        entities,
        documents,
      };
      const validation = this.validateBackup(backup);
      if (!validation.isValid) throw new StorageError(validation.errors.join(', '));
      await this.storage.writeJSON('data/doggybag-backup.json', backup);
      return backup;
    });
  }

  public importBackup(data: BackupFileData): Promise<void> {
    return runWithDataAccess(async () => {
      const validation = this.validateBackup(data);
      if (!validation.isValid)
        throw new Error(`Invalid backup data: ${validation.errors.join(', ')}`);

      const entities = { ...data.entities };
      for (const key of Object.keys(CORE_ENTITIES) as (keyof typeof CORE_ENTITIES)[]) {
        entities[CORE_ENTITIES[key]] = data[key];
      }

      if (data.schema_version !== 2) {
        // Legacy files contain only core budget data. Do not erase domains they
        // were never capable of exporting.
        for (const [file, value] of Object.entries(entities)) {
          await this.storage.writeJSON(`data/entities/${file}`, value);
        }
        for (const month of data.months ?? []) {
          await this.storage.writeJSON(`data/months/${month.month}.json`, month);
        }
        return;
      }

      // Prepare and validate the whole snapshot before replacing live directories.
      const base = this.storage.getConfig().basePath;
      const staging = join(base, `.restore-${crypto.randomUUID()}`);
      const folders = ['entities', 'months', 'documents', 'data/documents'] as const;
      const previousPath = (folder: string) =>
        join(staging, `previous-${folder.replaceAll('/', '-')}`);
      const moved: string[] = [];
      const installed: string[] = [];
      try {
        for (const folder of folders) await mkdir(join(staging, folder), { recursive: true });
        for (const [file, value] of Object.entries(entities)) {
          await writeFile(join(staging, 'entities', file), JSON.stringify(value, null, 2));
        }
        for (const month of data.months) {
          await writeFile(
            join(staging, 'months', `${month.month}.json`),
            JSON.stringify(month, null, 2)
          );
        }
        for (const [path, content] of Object.entries(data.documents!)) {
          const target = join(staging, path);
          await mkdir(dirname(target), { recursive: true });
          await writeFile(target, Buffer.from(content, 'base64'));
        }
        for (const folder of folders) {
          try {
            await rename(join(base, folder), previousPath(folder));
            moved.push(folder);
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
          }
          await mkdir(dirname(join(base, folder)), { recursive: true });
          await rename(join(staging, folder), join(base, folder));
          installed.push(folder);
        }
      } catch (error) {
        for (const folder of [...folders].reverse()) {
          if (installed.includes(folder))
            await rm(join(base, folder), { recursive: true, force: true });
          if (moved.includes(folder)) await rename(previousPath(folder), join(base, folder));
        }
        await rm(staging, { recursive: true, force: true });
        throw error;
      }
      requestStorage.getStore()?.clear();
      await rm(staging, { recursive: true, force: true });
    });
  }

  public validateBackup(data: BackupFileData): ValidationResult {
    const errors: string[] = [];
    if (!isObject(data)) return { isValid: false, errors: ['Backup must be an object'] };
    if (!data.export_date) errors.push('export_date is required');
    for (const key of Object.keys(CORE_ENTITIES) as (keyof typeof CORE_ENTITIES)[]) {
      if (!Array.isArray(data[key])) errors.push(`${key} must be an array`);
    }
    if (data.months !== undefined && !Array.isArray(data.months))
      errors.push('months must be an array if provided');
    if (Array.isArray(data.months)) {
      const seen = new Set<string>();
      for (const month of data.months) {
        if (
          !month ||
          !/^\d{4}-(0[1-9]|1[0-2])$/.test(month.month) ||
          seen.has(month.month) ||
          !Array.isArray(month.bill_instances) ||
          !Array.isArray(month.income_instances) ||
          !Array.isArray(month.variable_expenses) ||
          !Array.isArray(month.free_flowing_expenses) ||
          !isObject(month.bank_balances)
        ) {
          errors.push('months must contain unique valid monthly records');
          break;
        }
        seen.add(month.month);
      }
    }
    if (data.schema_version !== undefined && data.schema_version !== 2)
      errors.push('Unsupported backup version');
    if (
      data.schema_version === 2 &&
      (!isObject(data.entities) || !isObject(data.documents) || !Array.isArray(data.months))
    ) {
      errors.push('Version 2 backups require entities, documents and months');
    }
    if (data.entities !== undefined) {
      if (!isObject(data.entities)) errors.push('entities must be a file map');
      else
        for (const file of Object.keys(data.entities)) {
          if (
            !/^[a-zA-Z0-9_-]+\.json$/.test(file) ||
            Object.values(CORE_ENTITIES).some((core) => core === file)
          ) {
            errors.push(`Invalid additional entity filename: ${file}`);
          }
        }
    }
    if (data.documents !== undefined) {
      if (!isObject(data.documents)) errors.push('documents must be a file map');
      else
        for (const [path, content] of Object.entries(data.documents)) {
          if (
            !validDocumentPath(path) ||
            typeof content !== 'string' ||
            Buffer.from(content, 'base64').toString('base64') !== content
          ) {
            errors.push(`Invalid document: ${path}`);
          }
        }
    }
    return { isValid: errors.length === 0, errors };
  }
}
