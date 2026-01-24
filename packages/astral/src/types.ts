import type { FormRequestClass } from '@gravito/core'
import type { ZodSchema } from 'zod'

/**
 * OpenAPI Server object definition.
 * Describes the server environment (e.g., development, production).
 *
 * @public
 * @since 3.0.0
 */
export interface OpenAPIServer {
  /** The server URL, can include variables in brackets {}. */
  url: string
  /** An optional string describing the host designated by the URL. */
  description?: string
  /** A map between a variable name and its value. */
  variables?: Record<
    string,
    {
      /** The default value to use for substitution. */
      default: string
      /** An optional description for the server variable. */
      description?: string
      /** An enumeration of string values to be used if the substitution options are from a limited set. */
      enum?: string[]
    }
  >
}

/**
 * OpenAPI Security Scheme object definition.
 *
 * @public
 * @since 3.0.0
 */
export interface SecurityScheme {
  /** The type of the security scheme. */
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect' | 'mutualTLS'
  /** A short description for security scheme. */
  description?: string
  /** The name of the header, query or cookie parameter to be used. */
  name?: string
  /** The location of the API key (query, header or cookie). */
  in?: 'query' | 'header' | 'cookie'
  /** The name of the HTTP Authorization scheme to be used in the Authorization header. */
  scheme?: string
  /** A hint to the client to identify how the bearer token is formatted. */
  bearerFormat?: string
  /** An object containing configuration information for the flow types supported. */
  flows?: any
  /** OpenId Connect URL to discover OAuth2 configuration values. */
  openIdConnectUrl?: string
}

/**
 * Security Requirement object definition.
 * Lists the required security schemes to execute this operation.
 *
 * @public
 * @since 3.0.0
 */
export type SecurityRequirement = Record<string, string[]>

/**
 * External Documentation object definition.
 * Allows referencing an external resource for extended documentation.
 *
 * @public
 * @since 3.0.0
 */
export interface ExternalDocumentation {
  /** The URL for the target documentation. */
  url: string
  /** A short description of the target documentation. */
  description?: string
}

/**
 * OpenAPI Example object definition.
 * Provides example values for parameters or request bodies.
 *
 * @public
 * @since 3.0.0
 */
export interface ExampleObject {
  /** Short description for the example. */
  summary?: string
  /** Long description for the example. */
  description?: string
  /** Embedded literal example. */
  value?: any
  /** A URL that points to the literal example. */
  externalValue?: string
}

/**
 * Media Type object definition.
 * Provides schema and examples for a particular media type.
 *
 * @public
 * @since 3.0.0
 */
export interface MediaTypeObject {
  /** The schema defining the content of the request, response, or parameter. */
  schema?: ZodSchema | any
  /** Example of the media type. */
  example?: any
  /** Examples of the media type. */
  examples?: Record<string, ExampleObject>
  /** A map between a property name and its encoding information. */
  encoding?: Record<string, any>
}

/**
 * Request Body object definition.
 *
 * @public
 * @since 3.0.0
 */
export interface RequestBodyObject {
  /** A brief description of the request body. */
  description?: string
  /** The content of the request body. Keyed by media type. */
  content: Record<string, MediaTypeObject>
  /** Determines if the request body is required in the request. */
  required?: boolean
}

/**
 * Operation definition for a specific route/method in an API contract.
 * Describes the metadata, input/output validation, and documentation for a single endpoint.
 *
 * @public
 * @since 3.0.0
 */
export interface AstralOperation {
  /** Short summary of the operation. */
  summary?: string
  /** Detailed description of the operation. */
  description?: string
  /** Tags for categorization in the documentation UI. */
  tags?: string[]
  /**
   * Input validation schema.
   * Can be a `FormRequest` class (automatic inference) or a Zod schema.
   */
  input?: FormRequestClass | ZodSchema
  /**
   * Output validation schema for successful responses.
   * If an array of schemas is provided, it will be documented as an array of items.
   */
  output?: ZodSchema | ZodSchema[]
  /**
   * Map of error status codes to their respective descriptions or schemas.
   * Key is the HTTP status code (e.g., 404), value is either a string description or a schema.
   */
  errors?: Record<number, string | ZodSchema>
  /** HTTP status code for a successful response (default: 200). */
  status?: number
  /**
   * Schema for path parameters.
   * Keyed by the parameter name in the route path (e.g., ':id').
   */
  params?: Record<string, ZodSchema>
  /** Unique operation identifier across the whole API. */
  operationId?: string
  /** Marks the operation as deprecated. */
  deprecated?: boolean
  /** Security requirements for this specific operation. Overrides global security. */
  security?: SecurityRequirement[]
  /** Custom request body definition (overrides inferred `input` if provided). */
  requestBody?: RequestBodyObject
  /** Request and response examples for documentation. */
  examples?: {
    /** Examples for the request body. */
    request?: Record<string, ExampleObject>
    /** Examples for the responses, keyed by status code. */
    response?: Record<string, ExampleObject>
  }
  /** External documentation reference for this operation. */
  externalDocs?: ExternalDocumentation
}

/**
 * A resource contract that maps a base path to various operations (CRUD or custom).
 * Serves as the central definition for a group of related API endpoints.
 *
 * @public
 * @since 3.0.0
 */
export interface AstralResource {
  /** The base resource path (e.g., '/users'). */
  path: string
  /** Default tags applied to all operations in this resource. */
  tags?: string[]
  /** Map of operation names ('index', 'show', 'store', etc.) to their definitions. */
  operations: {
    /** List resources (GET /) */
    index?: AstralOperation
    /** Get a single resource (GET /:id) */
    show?: AstralOperation
    /** Create a resource (POST /) */
    store?: AstralOperation
    /** Update a resource (PUT /:id) */
    update?: AstralOperation
    /** Delete a resource (DELETE /:id) */
    destroy?: AstralOperation
    /** Custom named operations or fallback keys. */
    [key: string]: AstralOperation | undefined
  }
}

/**
 * OpenAPI Tag object definition.
 *
 * @public
 * @since 3.0.0
 */
export interface TagObject {
  /** The name of the tag. */
  name: string
  /** A short description for the tag. */
  description?: string
  /** Additional external documentation for this tag. */
  externalDocs?: ExternalDocumentation
}

/**
 * OpenAPI Components object definition.
 * Holds a set of reusable objects for different aspects of the OAS.
 *
 * @public
 * @since 3.0.0
 */
export interface ComponentsObject {
  /** Reusable schemas (models). */
  schemas?: Record<string, ZodSchema | any>
  /** Reusable responses. */
  responses?: Record<string, any>
  /** Reusable parameters. */
  parameters?: Record<string, any>
  /** Reusable examples. */
  examples?: Record<string, ExampleObject>
  /** Reusable request bodies. */
  requestBodies?: Record<string, RequestBodyObject>
  /** Reusable headers. */
  headers?: Record<string, any>
  /** Reusable security schemes. */
  securitySchemes?: Record<string, SecurityScheme>
  /** Reusable links. */
  links?: Record<string, any>
  /** Reusable callbacks. */
  callbacks?: Record<string, any>
}

/**
 * Global configuration for the Astral OpenAPI orbit.
 *
 * @public
 * @since 3.0.0
 */
export interface AstralConfig {
  /** The title of the API. */
  title?: string
  /** The version of the API (semver recommended). */
  version?: string
  /** A short description of the API. */
  description?: string
  /** List of resource contracts to be included in the documentation. */
  contracts?: AstralResource[]
  /** The URL path where the Swagger UI will be served (default: '/docs'). */
  uiPath?: string
  /** The URL path where the OpenAPI JSON spec will be served (default: '/openapi.json'). */
  jsonPath?: string
  /** Shorthand for `uiPath`. */
  path?: string
  /** An array of Server Objects, which provide connectivity information to a target server. */
  servers?: OpenAPIServer[]
  /** A declaration of which security mechanisms can be used across the API. */
  securitySchemes?: Record<string, SecurityScheme>
  /** A declaration of which security requirements must be met to use the API. */
  security?: SecurityRequirement[]
  /** A list of tags used by the specification with additional metadata. */
  tags?: TagObject[]
  /** Global external documentation reference. */
  externalDocs?: ExternalDocumentation
  /** An element to hold various schemas for the specification. */
  components?: ComponentsObject
}

/**
 * Type utility to infer the input type from an `AstralOperation`.
 *
 * @template T - The AstralOperation type.
 * @public
 */
export type InferInput<T extends AstralOperation> = T['input'] extends ZodSchema<infer U> ? U : any

/**
 * Type utility to infer the output type from an `AstralOperation`.
 * Supports both single schemas and arrays of schemas.
 *
 * @template T - The AstralOperation type.
 * @public
 */
export type InferOutput<T extends AstralOperation> =
  T['output'] extends ZodSchema<infer U>
    ? U
    : T['output'] extends Array<infer Item>
      ? Item extends ZodSchema<infer V>
        ? V[]
        : any
      : any

/**
 * Type utility to infer the path parameters type from an `AstralOperation`.
 *
 * @template T - The AstralOperation type.
 * @public
 */
export type InferParams<T extends AstralOperation> =
  T['params'] extends Record<string, ZodSchema>
    ? { [K in keyof T['params']]: T['params'][K] extends ZodSchema<infer U> ? U : any }
    : Record<string, any>

/**
 * Type utility to infer the error response types from an `AstralOperation`.
 *
 * @template T - The AstralOperation type.
 * @public
 */
export type InferErrors<T extends AstralOperation> =
  T['errors'] extends Record<number, any>
    ? { [K in keyof T['errors']]: T['errors'][K] extends ZodSchema<infer U> ? U : T['errors'][K] }
    : Record<number, any>
