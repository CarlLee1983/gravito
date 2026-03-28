/**
 * @fileoverview Disk space guard to prevent disk exhaustion
 */

import { statfs } from 'node:fs/promises'
import { dirname } from 'node:path'
import { ForgeError } from '../errors/ForgeError'
import { ForgeErrorCodes } from '../errors/codes'

/**
 * Disk space info
 */
export interface DiskInfo {
  available: number
  total: number
  free: number
}

/**
 * DiskSpaceGuard
 *
 * Checks available disk space before processing large files.
 */
export class DiskSpaceGuard {
  /**
   * Get disk space information for a given path
   *
   * @param path - The path to check
   * @returns Disk information
   */
  static async getSpaceInfo(path: string): Promise<DiskInfo> {
    try {
      // statfs provides block level info
      const stats = await statfs(path)
      const bsize = stats.bsize || 1024

      return {
        available: Number(stats.bavail) * bsize,
        total: Number(stats.blocks) * bsize,
        free: Number(stats.bfree) * bsize,
      }
    } catch (error) {
      // Fallback if statfs fails (e.g. older Node/OS)
      // On macOS/Linux we could try spawning 'df'
      console.warn(`[DiskSpaceGuard] statfs failed for ${path}:`, error)
      return { available: Infinity, total: Infinity, free: Infinity }
    }
  }

  /**
   * Check if there is enough space for a file of a given size
   *
   * @param path - The path to check
   * @param requiredSize - The required size in bytes
   * @param multiplier - Buffer multiplier (default 2x for processing)
   * @returns True if there is enough space
   */
  static async hasEnoughSpace(
    path: string,
    requiredSize: number,
    multiplier = 2
  ): Promise<boolean> {
    const info = await this.getSpaceInfo(dirname(path))
    // We typically need at least twice the size (input + output)
    return info.available > requiredSize * multiplier
  }

  /**
   * Guard a directory for a task
   *
   * @param path - The directory path
   * @param minimumBytes - Minimum bytes required
   * @throws {Error} If space is insufficient
   */
  static async check(path: string, minimumBytes: number): Promise<void> {
    const info = await this.getSpaceInfo(path)
    if (info.available < minimumBytes) {
      const availableMB = Math.round(info.available / 1024 / 1024)
      const requiredMB = Math.round(minimumBytes / 1024 / 1024)
      throw new ForgeError(507, ForgeErrorCodes.DISK_SPACE_INSUFFICIENT, {
        message: `Insufficient disk space in ${path}. Available: ${availableMB}MB, Required: ${requiredMB}MB`,
      })
    }
  }
}
