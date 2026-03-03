/**
 * Runtime archive adapter implementations.
 *
 * @module runtime/archive
 * @since 3.2.0
 */
import type { ArchiveFromDirectoryOptions, RuntimeArchiveAdapter } from './types'
/**
 * 取得封裝操作 adapter
 * @public
 */
export declare function getArchiveAdapter(): RuntimeArchiveAdapter
/**
 * 將目錄封裝為歸檔檔案
 * @public
 */
export declare function archiveFromDirectory(
  dirPath: string,
  archivePath: string,
  options?: ArchiveFromDirectoryOptions
): Promise<Uint8Array>
