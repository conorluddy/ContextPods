/**
 * Base error class for Context-Pods errors
 */
export class ContextPodsError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ContextPodsError';
  }
}

/**
 * Error thrown when a pod configuration is invalid
 */
export class ConfigurationError extends ContextPodsError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', details);
    this.name = 'ConfigurationError';
  }
}

/**
 * Error thrown when a template is not found or invalid
 */
export class TemplateError extends ContextPodsError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'TEMPLATE_ERROR', details);
    this.name = 'TemplateError';
  }
}

/**
 * Error thrown during pod generation
 */
export class GenerationError extends ContextPodsError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'GENERATION_ERROR', details);
    this.name = 'GenerationError';
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends ContextPodsError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}