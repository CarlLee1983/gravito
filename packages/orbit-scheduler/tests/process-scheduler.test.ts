import { beforeAll, describe, expect, test, spyOn } from 'bun:test'
import { SchedulerManager } from '../src/SchedulerManager'
import { MemoryLockStore } from '../src/locks/MemoryLockStore'
import { LockManager } from '../src/locks/LockManager'
import { Process } from '../src/process/Process'

describe('Scheduler Manager - Process & Modes', () => {
    let lockManager: LockManager

    beforeAll(() => {
        lockManager = new LockManager(new MemoryLockStore())
    })

    test('exec() schedules a process task', async () => {
        const scheduler = new SchedulerManager(lockManager)
        const task = scheduler.exec('test-cmd', 'echo "hello"')

        expect(task).toBeDefined()
        expect(task.getTask().command).toBe('echo "hello"')
    })

    test('Mode A: Broadcast - Executes on matching node role', async () => {
        const scheduler = new SchedulerManager(lockManager, undefined, undefined, 'api')

        // Mock Process.run
        const processSpy = spyOn(Process, 'run').mockResolvedValue({
            exitCode: 0, stdout: 'ok', stderr: '', success: true
        })

        const task = scheduler.exec('api-cleanup', 'echo "clean"')
            .onNode('api')
            .getTask()

        await scheduler.runTask(task)

        expect(processSpy).toHaveBeenCalled()
        expect(processSpy.mock.calls[0]).toEqual(['echo "clean"'])

        processSpy.mockRestore()
    })

    test('Mode A: Broadcast - Skips on non-matching node role', async () => {
        const scheduler = new SchedulerManager(lockManager, undefined, undefined, 'worker')

        const processSpy = spyOn(Process, 'run').mockResolvedValue({
            exitCode: 0, stdout: 'ok', stderr: '', success: true
        })

        const task = scheduler.exec('api-cleanup-skip', 'echo "clean"')
            .onNode('api')
            .getTask()

        await scheduler.runTask(task)

        expect(processSpy).not.toHaveBeenCalled()
        processSpy.mockRestore()
    })

    test('Mode B: Single-point - Executes with lock', async () => {
        const scheduler = new SchedulerManager(lockManager, undefined, undefined, 'worker')

        const processSpy = spyOn(Process, 'run').mockResolvedValue({
            exitCode: 0, stdout: 'ok', stderr: '', success: true
        })

        const task = scheduler.exec('db-migration', 'echo "migrate"')
            .onNode('worker')
            .onOneServer()
            .getTask()

        await scheduler.runTask(task)

        expect(processSpy).toHaveBeenCalled()
        processSpy.mockRestore()
    })
})
