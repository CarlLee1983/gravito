/**
 * Options for the Beam (RPC) client.
 * @public
 */
export interface BeamOptions {
  /**
   * Custom headers to include in every request.
   * Can be either a static object or a function (sync/async) that returns headers.
   */
  headers?:
  | Record<string, string>
  | (() => Record<string, string> | Promise<Record<string, string>>)
}
