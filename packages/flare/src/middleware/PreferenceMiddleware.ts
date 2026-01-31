/**
 * User preference middleware for notification channels.
 *
 * This middleware filters notification channels and notification types based on user settings,
 * allowing users to customize how they receive notifications.
 *
 * @packageDocumentation
 */

import type { Notification } from '../Notification'
import type { Notifiable, NotificationPreference } from '../types'
import { type ChannelMiddleware, MiddlewarePriority } from '../types/middleware'

/**
 * User preference middleware for filtering notification channels.
 *
 * This middleware filters notifications based on user preferences, supporting:
 * - Enabling specific channels (enabledChannels)
 * - Disabling specific channels (disabledChannels, takes precedence over enabledChannels)
 * - Disabling specific notification types (disabledNotifications)
 *
 * @example
 * ```typescript
 * // Using Notifiable preferences
 * const middleware = new PreferenceMiddleware();
 * manager.use(middleware);
 *
 * // Using custom preference provider
 * const dbProvider: NotificationPreference = {
 *   async getUserPreferences(notifiable) {
 *     return await db.getUserPrefs(notifiable.getNotifiableId());
 *   }
 * };
 * const middleware = new PreferenceMiddleware(dbProvider);
 * manager.use(middleware);
 * ```
 *
 * @public
 */
export class PreferenceMiddleware implements ChannelMiddleware {
  /**
   * Middleware name.
   */
  readonly name = 'preference'

  /**
   * Middleware priority (medium priority for validation).
   */
  readonly priority = MiddlewarePriority.VALIDATION

  /**
   * Create a new PreferenceMiddleware instance.
   *
   * @param preferenceProvider - Optional preference provider; uses Notifiable method if not provided.
   * @param logger - Optional logger instance for recording errors.
   *
   * @example
   * ```typescript
   * // Without provider (reads from Notifiable.getNotificationPreferences)
   * const middleware = new PreferenceMiddleware();
   *
   * // Using database provider and logger
   * const middleware = new PreferenceMiddleware(new DatabasePreferenceProvider(), logger);
   * ```
   */
  constructor(
    private preferenceProvider?: NotificationPreference,
    private logger?: { error: (message: string, ...args: unknown[]) => void }
  ) {}

  /**
   * Handle the notification and apply user preference filtering.
   *
   * Processes the notification and filters based on user preferences:
   * 1. If notification type is in disabledNotifications, it is skipped.
   * 2. If channel is in disabledChannels, it is skipped.
   * 3. If enabledChannels is set, only channels in that list are allowed.
   * 4. If preference loading fails, the notification is allowed as a fallback.
   *
   * @param notification - The notification to send.
   * @param notifiable - The recipient.
   * @param channel - The channel name.
   * @param next - Callback to proceed to the next middleware or send operation.
   * @returns A promise that resolves when processing is complete.
   */
  async handle(
    notification: Notification,
    notifiable: Notifiable,
    channel: string,
    next: () => Promise<void>
  ): Promise<void> {
    try {
      // Fetch user preferences
      const preferences = await this.getPreferences(notifiable)

      // Allow all if no preferences are defined
      if (!preferences) {
        await next()
        return
      }

      // Check if notification type is disabled
      if (this.isNotificationDisabled(notification, preferences)) {
        return
      }

      // Check if channel is allowed
      if (!this.isChannelAllowed(channel, preferences)) {
        return
      }

      await next()
    } catch (error) {
      // Fallback: log error but allow notification to proceed if preferences fail to load
      const errorMessage =
        `[PreferenceMiddleware] Failed to load preferences for ${notifiable.getNotifiableId()}, ` +
        `allowing notification to proceed:`

      if (this.logger) {
        this.logger.error(errorMessage, error)
      } else {
        console.error(errorMessage, error)
      }

      await next()
    }
  }

  /**
   * Get user preferences from Notifiable or custom provider.
   *
   * Priority: Notifiable.getNotificationPreferences > preferenceProvider.
   *
   * @param notifiable - The recipient.
   * @returns The user preferences or null if not found.
   */
  private async getPreferences(notifiable: Notifiable): Promise<{
    enabledChannels?: string[]
    disabledChannels?: string[]
    disabledNotifications?: string[]
  } | null> {
    // Prefer Notifiable's own method
    if (notifiable.getNotificationPreferences) {
      const prefs = await notifiable.getNotificationPreferences()
      return prefs || null
    }

    // Use custom provider
    if (this.preferenceProvider) {
      const prefs = await this.preferenceProvider.getUserPreferences(notifiable)
      return prefs || null
    }

    return null
  }

  /**
   * Check if notification type is disabled by user.
   *
   * @param notification - The notification instance.
   * @param preferences - User preferences.
   * @returns True if the notification is disabled.
   */
  private isNotificationDisabled(
    notification: Notification,
    preferences: {
      disabledNotifications?: string[]
    }
  ): boolean {
    const { disabledNotifications } = preferences

    if (!disabledNotifications || disabledNotifications.length === 0) {
      return false
    }

    const notificationName = notification.constructor.name
    return disabledNotifications.includes(notificationName)
  }

  /**
   * Check if channel is allowed by user preferences.
   *
   * Priority:
   * 1. disabledChannels (if listed, it is denied)
   * 2. enabledChannels (if set, only listed are allowed)
   * 3. Allow all if neither are set.
   *
   * @param channel - The channel name.
   * @param preferences - User preferences.
   * @returns True if the channel is allowed.
   */
  private isChannelAllowed(
    channel: string,
    preferences: {
      enabledChannels?: string[]
      disabledChannels?: string[]
    }
  ): boolean {
    const { enabledChannels, disabledChannels } = preferences

    // disabledChannels takes highest priority
    if (disabledChannels && disabledChannels.length > 0) {
      if (disabledChannels.includes(channel)) {
        return false
      }
    }

    // enabledChannels check
    if (enabledChannels && enabledChannels.length > 0) {
      return enabledChannels.includes(channel)
    }

    // If enabledChannels is an empty array, deny everything
    if (enabledChannels !== undefined && enabledChannels.length === 0) {
      return false
    }

    return true
  }
}
