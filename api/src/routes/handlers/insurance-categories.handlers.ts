// Insurance Categories API Handlers

import {
  InsuranceCategoriesService,
  InsuranceCategoriesServiceImpl,
} from '../../services/insurance-categories-service';
import { InsuranceClaimsServiceImpl } from '../../services/insurance-claims-service';
import { formatErrorForUser } from '../../utils/errors';

const categoriesService: InsuranceCategoriesService = new InsuranceCategoriesServiceImpl();

export function createInsuranceCategoriesHandlerGET() {
  return async () => {
    try {
      const categories = await categoriesService.getAll();

      return new Response(JSON.stringify(categories), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[InsuranceCategoriesHandler] GET failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to load insurance categories',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createInsuranceCategoriesHandlerPOST() {
  return async (request: Request) => {
    try {
      const body = await request.json();
      const validation = categoriesService.validate(body);

      if (!validation.isValid) {
        return new Response(
          JSON.stringify({
            error: 'Validation failed',
            details: validation.errors,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const newCategory = await categoriesService.create(body);

      return new Response(JSON.stringify(newCategory), {
        headers: { 'Content-Type': 'application/json' },
        status: 201,
      });
    } catch (error) {
      console.error('[InsuranceCategoriesHandler] POST failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to create insurance category',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createInsuranceCategoriesHandlerPUT() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing category ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const body = await request.json();

      // Check if attempting to modify predefined category name
      const existingCategory = await categoriesService.getById(id);
      if (existingCategory?.is_predefined && body.name && body.name !== existingCategory.name) {
        return new Response(
          JSON.stringify({
            error: 'Cannot modify the name of a predefined category',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 403,
          }
        );
      }

      const updatedCategory = await categoriesService.update(id, body);

      if (!updatedCategory) {
        return new Response(
          JSON.stringify({
            error: 'Insurance category not found',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      return new Response(JSON.stringify(updatedCategory), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[InsuranceCategoriesHandler] PUT failed:', error);

      // Handle specific error for predefined category modification
      const errorMessage = formatErrorForUser(error);
      if (errorMessage.includes('predefined')) {
        return new Response(
          JSON.stringify({
            error: errorMessage,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 403,
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          message: 'Failed to update insurance category',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

export function createInsuranceCategoriesHandlerDELETE() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing category ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Check if category is predefined
      const category = await categoriesService.getById(id);
      if (category?.is_predefined) {
        return new Response(
          JSON.stringify({
            error: 'Cannot delete a predefined category',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 403,
          }
        );
      }

      // Check if category has existing claims
      const claimsService = new InsuranceClaimsServiceImpl();
      const claims = await claimsService.getAll({ category_id: id });

      if (claims.length > 0) {
        return new Response(
          JSON.stringify({
            error: 'Cannot delete category with existing claims',
            details: `This category has ${claims.length} claim(s) associated with it`,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 409,
          }
        );
      }

      await categoriesService.delete(id);

      return new Response(null, {
        status: 204,
      });
    } catch (error) {
      console.error('[InsuranceCategoriesHandler] DELETE failed:', error);

      // Handle specific error for predefined category deletion
      const errorMessage = formatErrorForUser(error);
      if (errorMessage.includes('predefined')) {
        return new Response(
          JSON.stringify({
            error: errorMessage,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 403,
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          message: 'Failed to delete insurance category',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}
