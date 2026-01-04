// Error Types - Standardized error handling for backend

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id?: string) {
    super(id ? `${resource} with id ${id} not found` : `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class StorageError extends Error {
  constructor(
    message: string,
    public path?: string
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class ReadOnlyError extends Error {
  constructor(month: string) {
    super(`Month ${month} is read-only. Unlock it to make changes.`);
    this.name = 'ReadOnlyError';
  }
}

export interface ErrorDetails {
  message: string;
  type: string;
  field?: string;
  path?: string;
}

export function formatErrorForUser(error: unknown): string {
  if (error instanceof ValidationError) {
    return error.message;
  }

  if (error instanceof NotFoundError) {
    return error.message;
  }

  if (error instanceof StorageError) {
    return 'Failed to save data. Please try again.';
  }

  if (error instanceof ConflictError) {
    return error.message;
  }

  if (error instanceof ReadOnlyError) {
    return error.message;
  }

  if (error instanceof Error) {
    return 'An error occurred. Please try again.';
  }

  return 'An unknown error occurred';
}

export function formatErrorForDev(error: unknown): ErrorDetails {
  if (error instanceof ValidationError) {
    return {
      message: error.message,
      type: 'ValidationError',
      field: error.field,
    };
  }

  if (error instanceof NotFoundError) {
    return {
      message: error.message,
      type: 'NotFoundError',
    };
  }

  if (error instanceof StorageError) {
    return {
      message: error.message,
      type: 'StorageError',
      path: error.path,
    };
  }

  if (error instanceof ConflictError) {
    return {
      message: error.message,
      type: 'ConflictError',
    };
  }

  if (error instanceof ReadOnlyError) {
    return {
      message: error.message,
      type: 'ReadOnlyError',
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      type: 'Error',
    };
  }

  return {
    message: 'Unknown error',
    type: 'Unknown',
  };
}
