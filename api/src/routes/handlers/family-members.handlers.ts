// Family Members API Handlers

import type { FamilyMembersService } from '../../services/family-members-service';
import { FamilyMembersServiceImpl } from '../../services/family-members-service';

// Singleton service instance
let familyMembersService: FamilyMembersService;

function getService(): FamilyMembersService {
  if (!familyMembersService) {
    familyMembersService = new FamilyMembersServiceImpl();
  }
  return familyMembersService;
}

// For testing - allows injecting a mock service
export function setTestService(service: FamilyMembersService): void {
  familyMembersService = service;
}

// GET /api/family-members - Get all family members
export async function handleGetAllFamilyMembers(): Promise<Response> {
  try {
    const members = await getService().getAll();
    return new Response(JSON.stringify(members), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[FamilyMembersHandler] Error getting all members:', error);
    return new Response(JSON.stringify({ error: 'Failed to get family members' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// GET /api/family-members/active - Get active family members
export async function handleGetActiveFamilyMembers(): Promise<Response> {
  try {
    const members = await getService().getActive();
    return new Response(JSON.stringify(members), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[FamilyMembersHandler] Error getting active members:', error);
    return new Response(JSON.stringify({ error: 'Failed to get active family members' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// GET /api/family-members/:id - Get a specific family member
export async function handleGetFamilyMember(id: string): Promise<Response> {
  try {
    const member = await getService().getById(id);
    if (!member) {
      return new Response(JSON.stringify({ error: 'Family member not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(member), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[FamilyMembersHandler] Error getting member:', error);
    return new Response(JSON.stringify({ error: 'Failed to get family member' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// POST /api/family-members - Create a new family member
export async function handleCreateFamilyMember(request: Request): Promise<Response> {
  try {
    const body = await request.json();

    // Validate request body
    const validation = getService().validate(body);
    if (!validation.isValid) {
      return new Response(JSON.stringify({ error: validation.errors.join(', ') }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const member = await getService().create(body);
    return new Response(JSON.stringify(member), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create family member';
    console.error('[FamilyMembersHandler] Error creating member:', error);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// PUT /api/family-members/:id - Update a family member
export async function handleUpdateFamilyMember(id: string, request: Request): Promise<Response> {
  try {
    const body = await request.json();

    const member = await getService().update(id, body);
    if (!member) {
      return new Response(JSON.stringify({ error: 'Family member not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(member), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update family member';
    console.error('[FamilyMembersHandler] Error updating member:', error);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// DELETE /api/family-members/:id - Delete a family member
export async function handleDeleteFamilyMember(id: string): Promise<Response> {
  try {
    // Check if member exists
    const member = await getService().getById(id);
    if (!member) {
      return new Response(JSON.stringify({ error: 'Family member not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // TODO: Check if there are claims using this family member
    // For now, allow deletion - in production, should soft delete or prevent

    await getService().delete(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete family member';
    console.error('[FamilyMembersHandler] Error deleting member:', error);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
