// Family Members Store
// Manages family member entities for insurance claims

import { writable, derived } from 'svelte/store';
import { apiClient } from '$lib/api/client';
import type { FamilyMember } from '../types/insurance';

type FamilyMembersState = {
  members: FamilyMember[];
  loading: boolean;
  error: string | null;
};

const initialState: FamilyMembersState = {
  members: [],
  loading: false,
  error: null,
};

const store = writable<FamilyMembersState>(initialState);

// Derived stores
export const familyMembers = derived(store, (s) => s.members);
export const familyMembersLoading = derived(store, (s) => s.loading);
export const familyMembersError = derived(store, (s) => s.error);

// Active members only (sorted alphabetically by name)
export const activeMembers = derived(familyMembers, (members) =>
  members.filter((m) => m.is_active).sort((a, b) => a.name.localeCompare(b.name))
);

// Inactive members
export const inactiveMembers = derived(familyMembers, (members) =>
  members.filter((m) => !m.is_active)
);

// Create data type
export interface FamilyMemberData {
  name: string;
}

export async function loadFamilyMembers() {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const data = await apiClient.get('/api/family-members');
    const members = (data || []) as FamilyMember[];
    store.update((s) => ({ ...s, members, loading: false }));
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to load family members');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function createFamilyMember(data: FamilyMemberData) {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const newMember = await apiClient.post('/api/family-members', data);
    await loadFamilyMembers();
    return newMember as FamilyMember;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to create family member');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function updateFamilyMember(
  id: string,
  updates: Partial<FamilyMemberData> & { is_active?: boolean }
) {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    const updated = await apiClient.put('/api/family-members', id, updates);
    await loadFamilyMembers();
    return updated as FamilyMember;
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to update family member');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export async function deleteFamilyMember(id: string) {
  store.update((s) => ({ ...s, loading: true, error: null }));

  try {
    await apiClient.delete('/api/family-members', id);
    await loadFamilyMembers();
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Failed to delete family member');
    store.update((s) => ({ ...s, loading: false, error: err.message }));
    throw err;
  }
}

export function clearFamilyMembersError() {
  store.update((s) => ({ ...s, error: null }));
}

// Get member by ID (synchronous lookup from store)
export function getMemberById(id: string): FamilyMember | undefined {
  let result: FamilyMember | undefined;
  store.subscribe((s) => {
    result = s.members.find((m) => m.id === id);
  })();
  return result;
}

export const familyMembersStore = store;
