import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test';
import { FamilyMembersServiceImpl } from './family-members-service';
import { StorageServiceImpl } from './storage';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { FamilyMember } from '../types';

describe('FamilyMembersService', () => {
  let service: FamilyMembersServiceImpl;
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), `family-members-test-${Date.now()}`);
    await mkdir(join(testDir, 'entities'), { recursive: true });
    StorageServiceImpl.initialize(testDir);
  });

  beforeEach(async () => {
    await writeFile(join(testDir, 'entities', 'family-members.json'), JSON.stringify([]));
    await writeFile(join(testDir, 'entities', 'insurance-plans.json'), JSON.stringify([]));
    service = new FamilyMembersServiceImpl();
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test('create keeps the plan order (primary first), without duplicates', async () => {
    const member = await service.create({
      name: 'Brad',
      plans: ['canada-life', 'empire-life', 'canada-life'],
    });
    expect(member.plans).toEqual(['canada-life', 'empire-life']);
    expect((await service.getById(member.id))!.plans).toEqual(['canada-life', 'empire-life']);
  });

  test('create without plans starts with none', async () => {
    const member = await service.create({ name: 'Zane' } as Omit<
      FamilyMember,
      'id' | 'created_at' | 'updated_at' | 'is_active'
    >);
    expect(member.plans).toEqual([]);
  });

  test('plans must be a list of plan IDs', () => {
    const result = service.validate({ name: 'Brad', plans: 'canada-life' as unknown as string[] });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Plans must be a list of plan IDs');
  });
});
