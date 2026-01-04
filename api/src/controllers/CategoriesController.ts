import {
  Controller,
  Route,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Path,
  Response,
  Tags,
  SuccessResponse,
  Example,
} from 'tsoa';
import type { Category } from '../types';
import type {
  CreateCategoryRequest,
  UpdateCategoryRequest,
  ReorderCategoriesRequest,
  ApiError,
} from '../types/requests';

/**
 * Controller for managing categories for bills and incomes
 */
@Route('api/categories')
@Tags('Categories')
export class CategoriesController extends Controller {
  /**
   * Get all categories
   * @summary List all categories
   */
  @Get()
  @SuccessResponse(200, 'OK')
  @Example<Category[]>([
    {
      id: 'cat-utilities',
      name: 'Utilities',
      type: 'bill',
      color: '#3b82f6',
      sort_order: 0,
      is_predefined: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
  ])
  public async getCategories(): Promise<Category[]> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Create a new category
   * @summary Create a category
   */
  @Post()
  @SuccessResponse(201, 'Created')
  @Response<ApiError>(400, 'Bad Request')
  public async createCategory(@Body() body: CreateCategoryRequest): Promise<Category> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Update an existing category
   * @summary Update a category
   * @param id The category ID
   */
  @Put('{id}')
  @SuccessResponse(200, 'OK')
  @Response<ApiError>(400, 'Bad Request')
  @Response<ApiError>(404, 'Not Found')
  public async updateCategory(
    @Path() id: string,
    @Body() body: UpdateCategoryRequest
  ): Promise<Category> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Delete a category
   * @summary Delete a category
   * @param id The category ID
   */
  @Delete('{id}')
  @SuccessResponse(204, 'No Content')
  @Response<ApiError>(404, 'Not Found')
  public async deleteCategory(@Path() id: string): Promise<void> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Reorder categories
   * @summary Reorder categories
   */
  @Put('reorder')
  @SuccessResponse(200, 'OK')
  @Response<ApiError>(400, 'Bad Request')
  public async reorderCategories(@Body() body: ReorderCategoriesRequest): Promise<Category[]> {
    throw new Error('Not implemented - use existing handlers');
  }
}
