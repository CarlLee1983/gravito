/**
 * Performance Reporter
 *
 * Generates comprehensive performance reports comparing BunWorker and SandboxedWorker
 */

export interface BenchmarkResult {
  name: string
  runtime: 'bun' | 'node'
  metric: string
  value: number
  unit: string
  timestamp: number
}

export interface PerformanceReport {
  title: string
  timestamp: string
  environment: {
    runtime: string
    platform: string
    nodeVersion?: string
    bunVersion?: string
  }
  results: BenchmarkResult[]
  comparisons: PerformanceComparison[]
  summary: string
}

export interface PerformanceComparison {
  metric: string
  bun: {
    value: number
    unit: string
  }
  node: {
    value: number
    unit: string
  }
  improvement: {
    percentage: number
    direction: 'faster' | 'slower' | 'equal'
  }
}

/**
 * Performance Reporter for generating benchmark reports
 */
export class PerformanceReporter {
  private results: BenchmarkResult[] = []

  /**
   * Record a benchmark result
   */
  recordResult(result: BenchmarkResult): void {
    this.results.push(result)
  }

  /**
   * Record multiple results
   */
  recordResults(results: BenchmarkResult[]): void {
    this.results.push(...results)
  }

  /**
   * Generate a performance comparison report
   */
  generateReport(): PerformanceReport {
    const bunResults = this.results.filter((r) => r.runtime === 'bun')
    const nodeResults = this.results.filter((r) => r.runtime === 'node')

    const comparisons = this.compareResults(bunResults, nodeResults)

    return {
      title: 'Bun Workers vs SandboxedWorker Performance Report',
      timestamp: new Date().toISOString(),
      environment: this.getEnvironmentInfo(),
      results: this.results,
      comparisons,
      summary: this.generateSummary(comparisons),
    }
  }

  /**
   * Compare results between Bun and Node.js
   */
  private compareResults(
    bunResults: BenchmarkResult[],
    nodeResults: BenchmarkResult[]
  ): PerformanceComparison[] {
    const comparisons: PerformanceComparison[] = []

    // Group results by metric
    const metricsMap = new Map<string, { bun?: BenchmarkResult; node?: BenchmarkResult }>()

    for (const result of bunResults) {
      if (!metricsMap.has(result.metric)) {
        metricsMap.set(result.metric, {})
      }
      metricsMap.get(result.metric)!.bun = result
    }

    for (const result of nodeResults) {
      if (!metricsMap.has(result.metric)) {
        metricsMap.set(result.metric, {})
      }
      metricsMap.get(result.metric)!.node = result
    }

    // Generate comparisons
    for (const [metric, results] of metricsMap.entries()) {
      if (results.bun && results.node) {
        const improvement = this.calculateImprovement(results.bun.value, results.node.value)

        comparisons.push({
          metric,
          bun: {
            value: results.bun.value,
            unit: results.bun.unit,
          },
          node: {
            value: results.node.value,
            unit: results.node.unit,
          },
          improvement,
        })
      }
    }

    return comparisons
  }

  /**
   * Calculate improvement percentage
   */
  private calculateImprovement(
    bunValue: number,
    nodeValue: number
  ): { percentage: number; direction: 'faster' | 'slower' | 'equal' } {
    if (bunValue === nodeValue) {
      return { percentage: 0, direction: 'equal' }
    }

    // For throughput metrics (higher is better), check if bun > node
    const percentage = Math.abs((bunValue - nodeValue) / nodeValue) * 100

    // Assume throughput metrics (messages, jobs) - higher is better
    // If bun > node, it's faster
    const direction = bunValue > nodeValue ? 'faster' : 'slower'

    return { percentage: Math.round(percentage * 100) / 100, direction }
  }

  /**
   * Get environment information
   */
  private getEnvironmentInfo(): PerformanceReport['environment'] {
    const env: PerformanceReport['environment'] = {
      runtime: typeof Bun !== 'undefined' ? 'Bun' : 'Node.js',
      platform: typeof process !== 'undefined' ? process.platform : 'unknown',
    }

    if (typeof process !== 'undefined') {
      env.nodeVersion = process.version
    }

    if (typeof Bun !== 'undefined') {
      env.bunVersion = Bun.version
    }

    return env
  }

  /**
   * Generate summary text
   */
  private generateSummary(comparisons: PerformanceComparison[]): string {
    let summary = 'Performance Summary:\n\n'

    let improvements = 0
    let regressions = 0
    let equal = 0

    for (const comp of comparisons) {
      if (comp.improvement.direction === 'faster') {
        improvements++
      } else if (comp.improvement.direction === 'slower') {
        regressions++
      } else {
        equal++
      }
    }

    summary += `✅ Improvements: ${improvements}\n`
    summary += `❌ Regressions: ${regressions}\n`
    summary += `➖ Equal: ${equal}\n\n`

    // Find best improvements
    const topImprovements = [...comparisons]
      .sort((a, b) => b.improvement.percentage - a.improvement.percentage)
      .slice(0, 3)

    if (topImprovements.length > 0) {
      summary += 'Top 3 Improvements:\n'
      for (const comp of topImprovements) {
        if (comp.improvement.direction === 'faster') {
          summary += `  • ${comp.metric}: ${comp.improvement.percentage.toFixed(1)}% faster\n`
        }
      }
    }

    return summary
  }

  /**
   * Generate markdown report
   */
  generateMarkdown(): string {
    const report = this.generateReport()

    let markdown = `# ${report.title}\n\n`
    markdown += `Generated: ${report.timestamp}\n\n`

    markdown += '## Environment\n\n'
    markdown += `- **Runtime**: ${report.environment.runtime}\n`
    markdown += `- **Platform**: ${report.environment.platform}\n`
    if (report.environment.nodeVersion) {
      markdown += `- **Node.js**: ${report.environment.nodeVersion}\n`
    }
    if (report.environment.bunVersion) {
      markdown += `- **Bun**: ${report.environment.bunVersion}\n`
    }

    markdown += '\n## Performance Comparisons\n\n'
    markdown += '| Metric | Bun | Node.js | Improvement |\n'
    markdown += '|--------|-----|---------|-------------|\n'

    for (const comp of report.comparisons) {
      const improvementStr =
        comp.improvement.direction === 'equal'
          ? '—'
          : `${comp.improvement.percentage.toFixed(1)}% ${comp.improvement.direction === 'faster' ? '🚀' : '❌'}`

      markdown += `| ${comp.metric} | ${comp.bun.value.toFixed(2)} ${comp.bun.unit} | ${comp.node.value.toFixed(2)} ${comp.node.unit} | ${improvementStr} |\n`
    }

    markdown += '\n## Summary\n\n'
    markdown += report.summary

    return markdown
  }

  /**
   * Generate JSON report
   */
  generateJSON(): string {
    const report = this.generateReport()
    return JSON.stringify(report, null, 2)
  }

  /**
   * Export results to CSV format
   */
  generateCSV(): string {
    let csv = 'Metric,Runtime,Value,Unit,Timestamp\n'

    for (const result of this.results) {
      csv += `"${result.metric}","${result.runtime}","${result.value}","${result.unit}","${new Date(result.timestamp).toISOString()}"\n`
    }

    return csv
  }

  /**
   * Clear recorded results
   */
  clear(): void {
    this.results = []
  }

  /**
   * Get recorded results
   */
  getResults(): BenchmarkResult[] {
    return [...this.results]
  }
}

/**
 * Helper function to create a performance reporter with sample data
 */
export function createSampleReport(): PerformanceReport {
  const reporter = new PerformanceReporter()

  // Sample message passing results
  reporter.recordResults([
    {
      name: 'Message Passing - Bun',
      runtime: 'bun',
      metric: 'Message Throughput (1000 msgs)',
      value: 45,
      unit: 'ms',
      timestamp: Date.now(),
    },
    {
      name: 'Message Passing - Node.js',
      runtime: 'node',
      metric: 'Message Throughput (1000 msgs)',
      value: 180,
      unit: 'ms',
      timestamp: Date.now(),
    },
  ])

  // Sample memory results
  reporter.recordResults([
    {
      name: 'Memory - Bun 4 workers',
      runtime: 'bun',
      metric: 'Memory Usage (4 workers)',
      value: 28,
      unit: 'MB',
      timestamp: Date.now(),
    },
    {
      name: 'Memory - Node.js 4 workers',
      runtime: 'node',
      metric: 'Memory Usage (4 workers)',
      value: 42,
      unit: 'MB',
      timestamp: Date.now(),
    },
  ])

  // Sample concurrency results
  reporter.recordResults([
    {
      name: 'Concurrent Jobs - Bun',
      runtime: 'bun',
      metric: 'Job Queueing (100 jobs)',
      value: 12,
      unit: 'ms',
      timestamp: Date.now(),
    },
    {
      name: 'Concurrent Jobs - Node.js',
      runtime: 'node',
      metric: 'Job Queueing (100 jobs)',
      value: 15,
      unit: 'ms',
      timestamp: Date.now(),
    },
  ])

  return reporter.generateReport()
}
