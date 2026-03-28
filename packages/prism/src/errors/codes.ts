export const PrismErrorCodes = {
  // Template/render errors
  TEMPLATE_MAX_INCLUDE_DEPTH: 'prism.template_max_include_depth',
  TEMPLATE_MAX_COMPONENT_DEPTH: 'prism.template_max_component_depth',
  TEMPLATE_COMPILE_ERROR: 'prism.template_compile_error',
  VIEW_NOT_FOUND: 'prism.view_not_found',
  // Image errors
  IMAGE_ALT_REQUIRED: 'prism.image_alt_required',
  IMAGE_SRC_REQUIRED: 'prism.image_src_required',
  // Route errors
  ROUTE_MISSING_CATCH_ALL_PARAM: 'prism.route_missing_catch_all_param',
  ROUTE_MISSING_PARAM: 'prism.route_missing_param',
  // Helper errors
  HELPER_MISSING_PARAM: 'prism.helper_missing_param',
  PLUGIN_ERROR: 'prism.plugin_error',
  RENDER_ERROR: 'prism.render_error',
} as const

export type PrismErrorCode = (typeof PrismErrorCodes)[keyof typeof PrismErrorCodes]
