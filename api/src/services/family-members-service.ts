// Family Members Service - CRUD operations for family members

import { StorageServiceImpl } from './storage';
import type { StorageService } from './storage';
import type { FamilyMember, ValidationResult } from '../types';

const STORAGE_PATH = 'data/entities/family-members.json';

export interface FamilyMembersService {
  getAll(): Promise<FamilyMember[]>;
  getById(id: string): Promise<FamilyMember | null>;
  getActive(): Promise<FamilyMember[]>;
  create(
    data: Omit<FamilyMember, 'id' | 'created_at' | 'updated_at' | 'is_active'>
  ): Promise<FamilyMember>;
  update(
    id: string,
    updates: Partial<Omit<FamilyMember, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<FamilyMember | null>;
  delete(id: string): Promise<void>;
  validate(data: Partial<FamilyMember>): ValidationResult;
}

export class FamilyMembersServiceImpl implements FamilyMembersService {
  private storage: StorageService;

  constructor() {
    this.storage = StorageServiceImpl.getInstance();
  }

  public async getAll(): Promise<FamilyMember[]> {
    try {
      const members = (await this.storage.readJSON<FamilyMember[]>(STORAGE_PATH)) || [];
      // Sort alphabetically by name
      return members.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('[FamilyMembersService] Failed to load members:', error);
      return [];
    }
  }

  public async getById(id: string): Promise<FamilyMember | null> {
    try {
      const members = await this.getAll();
      return members.find((member) => member.id === id) || null;
    } catch (error) {
      console.error('[FamilyMembersService] Failed to get member:', error);
      return null;
    }
  }

  public async getActive(): Promise<FamilyMember[]> {
    const members = await this.getAll();
    return members.filter((member) => member.is_active);
  }

  public async create(
    data: Omit<FamilyMember, 'id' | 'created_at' | 'updated_at' | 'is_active'>
  ): Promise<FamilyMember> {
    try {
      const validation = this.validate(data);
      if (!validation.isValid) {
        throw new Error('Validation failed: ' + validation.errors.join(', '));
      }

      const members = await this.getAll();

      // Check for duplicate name (case-insensitive)
      const duplicateName = members.find(
        (m) => m.name.toLowerCase().trim() === data.name.toLowerCase().trim()
      );
      if (duplicateName) {
        throw new Error(`A family member with the name "${data.name}" already exists`);
      }

      const now = new Date().toISOString();
      const newMember: FamilyMember = {
        ...data,
        name: data.name.trim(),
        id: crypto.randomUUID(),
        is_active: true,
        created_at: now,
        updated_at: now,
      };

      members.push(newMember);
      await this.storage.writeJSON(STORAGE_PATH, members);

      console.log('[FamilyMembersService] Created member:', newMember.name);
      return newMember;
    } catch (error) {
      console.error('[FamilyMembersService] Failed to create member:', error);
      throw error;
    }
  }

  public async update(
    id: string,
    updates: Partial<Omit<FamilyMember, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<FamilyMember | null> {
    try {
      const members = await this.getAll();
      const index = members.findIndex((member) => member.id === id);

      if (index === -1) {
        console.warn(`[FamilyMembersService] Member ${id} not found`);
        return null;
      }

      // Check for duplicate name if name is being updated
      if (updates.name !== undefined) {
        const duplicateName = members.find(
          (m) => m.id !== id && m.name.toLowerCase().trim() === updates.name!.toLowerCase().trim()
        );
        if (duplicateName) {
          throw new Error(`A family member with the name "${updates.name}" already exists`);
        }
      }

      const now = new Date().toISOString();
      const updatedMember: FamilyMember = {
        ...members[index],
        ...updates,
        name: updates.name ? updates.name.trim() : members[index].name,
        updated_at: now,
      };

      // Validate the merged data
      const validation = this.validate(updatedMember);
      if (!validation.isValid) {
        throw new Error('Validation failed: ' + validation.errors.join(', '));
      }

      members[index] = updatedMember;
      await this.storage.writeJSON(STORAGE_PATH, members);

      console.log('[FamilyMembersService] Updated member:', updatedMember.name);
      return updatedMember;
    } catch (error) {
      console.error('[FamilyMembersService] Failed to update member:', error);
      throw error;
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      const members = await this.getAll();
      const member = members.find((m) => m.id === id);

      if (!member) {
        throw new Error('Family member not found');
      }

      // Note: Handler should check for existing claims before allowing delete
      const filtered = members.filter((m) => m.id !== id);
      await this.storage.writeJSON(STORAGE_PATH, filtered);

      console.log('[FamilyMembersService] Deleted member:', member.name);
    } catch (error) {
      console.error('[FamilyMembersService] Failed to delete member:', error);
      throw error;
    }
  }

  public validate(data: Partial<FamilyMember>): ValidationResult {
    const errors: string[] = [];

    // Name is required and must be non-empty
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('Name is required and must be non-empty');
    }

    // Name should be reasonable length
    if (data.name && data.name.trim().length > 100) {
      errors.push('Name must be 100 characters or less');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
