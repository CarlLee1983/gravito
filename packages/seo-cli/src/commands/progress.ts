import pc from 'picocolors'

export interface ProgressCommandOptions {
  jobId: string
  storage?: 'memory' | 'redis'
  redisUrl?: string
}

/**
 * 查詢生成進度
 */
export async function progressCommand(options: ProgressCommandOptions) {
  try {
    // 這裡需要根據 storage 類型載入對應的進度儲存
    // 簡化實作：提示使用者使用 API endpoint
    console.log(pc.yellow('⚠️  Progress query is not yet fully implemented in seo-cli'))
    console.log(pc.dim('   Consider using OrbitSitemap API endpoints:'))
    console.log(pc.dim(`   GET /admin/sitemap/status/${options.jobId}`))
    console.log(pc.dim('   Or use OrbitSitemap.progressStorage in your application'))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(pc.red('\n❌ Failed to query progress:'), message)
    process.exit(1)
  }
}
