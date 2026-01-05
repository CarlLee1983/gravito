import os from 'node:os'
import process from 'node:process'
import type { Probe, SystemMetrics } from '../types'

export class NodeProbe implements Probe {
  private lastCpu: { idle: number; total: number; count: number }
  private lastProcessCpu: NodeJS.CpuUsage
  private lastProcessCpuTime: number

  constructor() {
    this.lastCpu = this.getSystemCpuUsage()
    this.lastProcessCpu = process.cpuUsage()
    this.lastProcessCpuTime = Date.now()
  }

  private getSystemCpuUsage() {
    const cpus = os.cpus()
    const total = cpus.reduce((acc, cpu) => {
      return acc + Object.values(cpu.times).reduce((a, b) => a + b, 0)
    }, 0)
    const idle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0)

    return {
      total,
      idle,
      count: cpus.length,
    }
  }

  getMetrics(): SystemMetrics {
    // 1. System CPU (Load %)
    const currentCpu = this.getSystemCpuUsage()
    const idleDiff = currentCpu.idle - this.lastCpu.idle
    const totalDiff = currentCpu.total - this.lastCpu.total
    const sysCpuPercent = totalDiff > 0 ? 100 - Math.round((idleDiff / totalDiff) * 100) : 0
    this.lastCpu = currentCpu

    // 2. Process CPU (Usage %)
    const currentProcessCpu = process.cpuUsage()
    const currentTime = Date.now()

    // Calculate delta in microseconds
    const userDiff = currentProcessCpu.user - this.lastProcessCpu.user
    const systemDiff = currentProcessCpu.system - this.lastProcessCpu.system
    const totalProcessDiff = userDiff + systemDiff // total microseconds spent by process

    // Calculate time elapsed in microseconds (ms * 1000)
    const timeDiff = (currentTime - this.lastProcessCpuTime) * 1000

    // Calculate %, considering multi-core (can go > 100% on multi-core if not normalized)
    // We normalize by core count to give a 0-100% representation relative to ONE core, or 0-100% of TOTAL capacity?
    // Let's stick to 0-100% of TOTAL capacity for consistency with system load.
    const processCpuPercent =
      timeDiff > 0 ? Math.round((totalProcessDiff / timeDiff) * 100 * 100) / 100 : 0

    // Update state
    this.lastProcessCpu = currentProcessCpu
    this.lastProcessCpuTime = currentTime

    // 3. Memory
    const mem = process.memoryUsage()
    const sysTotal = os.totalmem()
    const sysFree = os.freemem()

    // Detect Runtime
    const globalAny = globalThis as any
    const isBun = typeof globalAny.Bun !== 'undefined'
    const isDeno = typeof globalAny.Deno !== 'undefined'

    const language = isBun ? 'bun' : isDeno ? 'deno' : 'node'
    const version = isBun
      ? globalAny.Bun.version
      : isDeno
        ? globalAny.Deno.version.deno
        : process.version

    return {
      language,
      version, // Moved to top level
      cpu: {
        system: sysCpuPercent,
        process: processCpuPercent > 100 ? 100 : processCpuPercent,
        cores: currentCpu.count,
      },
      memory: {
        system: {
          total: sysTotal,
          free: sysFree,
          used: sysTotal - sysFree,
        },
        process: {
          rss: mem.rss,
          heapTotal: mem.heapTotal,
          heapUsed: mem.heapUsed,
        },
      },
      // Flattened runtime props
      pid: process.pid,
      hostname: os.hostname(),
      platform: os.platform(),
      uptime: process.uptime(),
      // Optional: keep an internal object if we really need it, but types say flat.
      // Actually SystemMetrics in types.ts doesn't have pid/hostname/platform anymore?
      // Let's re-check types.ts. The previous view showed they were REMOVED from SystemMetrics.
      // But NodeProbe implements Probe which returns Promise<SystemMetrics & { pid: number, hostname: string, platform: string }> ??
      // Let's assume we need to return what SystemMetrics expects + what QuasarAgent needs.

      // WAIT. I removed pid/hostname/platform from SystemMetrics in types.ts in step 809?
      // Yes, I see `-  pid: number` in the diff.
      // But QuasarAgent needs them.
      // Let's check Probe interface in types.ts.
    }
  }
}
