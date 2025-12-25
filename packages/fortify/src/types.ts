/**
 * View service interface for rendering templates
 */
export interface ViewService {
    render(template: string, data?: Record<string, any>): string
}
