/**
 * @fileoverview VideoProcessor 邊界測試
 *
 * Phase 5: 補充 VideoProcessor 的以下邊界覆蓋：
 * - constructor() wasmMode 選項
 * - getMetadata() 正常流程 + Blob 輸入
 * - process() Blob 輸入（建立 / 清理 temp file）
 * - buildFFmpegArgs() GPU 加速
 * - buildFFmpegArgs() HLS 選項
 * - buildFFmpegArgs() watermark + overlay
 * - getWatermarkFilter() 各位置（top-left, top-right, bottom-left, bottom-right, center）
 * - getWatermarkFilter() opacity + scale
 * - getRotationFilter() 各角度（90, 180, 270, 其他）
 * - buildFFmpegArgs() rotate 合併已有 vf
 */

import { beforeAll, describe, expect, it, jest, mock } from 'bun:test'
import { createMockRuntimeAdapter, createMockVideoAdapter } from './helpers/mocks'

// Mock adapters 以避免實際執行 FFmpeg / ImageMagick
class AdapterMock {
  async execute(_args: string[], options: { output?: string } = {}): Promise<void> {
    if (options.output) {
      await Bun.write(options.output, 'data')
    }
  }
  async probe(): Promise<Record<string, unknown>> {
    return { duration: 120, width: 1920, height: 1080, codec: 'h264' }
  }
}

// 追蹤 FFmpegWasmAdapter 是否被實例化
let wasmAdapterInstantiated = false
class WasmAdapterMock extends AdapterMock {
  constructor() {
    super()
    wasmAdapterInstantiated = true
  }
}

mock.module('../src/adapters/ImageMagickAdapter', () => ({
  ImageMagickAdapter: AdapterMock,
}))
mock.module('../src/adapters/FFmpegAdapter', () => ({
  FFmpegAdapter: AdapterMock,
}))
mock.module('../src/adapters/FFmpegWasmAdapter', () => ({
  FFmpegWasmAdapter: WasmAdapterMock,
}))

let VideoProcessor: typeof import('../src/processors/VideoProcessor').VideoProcessor

beforeAll(async () => {
  ;({ VideoProcessor } = await import('../src/processors/VideoProcessor'))
})

/**
 * 建立 VideoProcessor 並替換 adapter 和 runtime 為 mock
 */
function createProcessorWithMocks(options: { wasmMode?: boolean; tempDir?: string } = {}) {
  const processor = new VideoProcessor({
    tempDir: options.tempDir || '/tmp/forge-video-test',
    wasmMode: options.wasmMode,
  })

  const { adapter: mockAdapter, executeCalls } = createMockVideoAdapter()
  const mockRuntime = createMockRuntimeAdapter()

  // 替換 adapter 和 runtime
  ;(processor as any).adapter = mockAdapter
  ;(processor as any).runtime = mockRuntime

  return { processor, mockAdapter, mockRuntime, executeCalls }
}

describe('VideoProcessor - constructor', () => {
  it('wasmMode 啟用時使用 FFmpegWasmAdapter', () => {
    wasmAdapterInstantiated = false
    const processor = new VideoProcessor({ wasmMode: true })

    expect(wasmAdapterInstantiated).toBe(true)
    expect(processor).toBeDefined()
  })

  it('預設使用 FFmpegAdapter（非 wasm）', () => {
    wasmAdapterInstantiated = false
    const processor = new VideoProcessor()

    expect(wasmAdapterInstantiated).toBe(false)
    expect(processor).toBeDefined()
  })
})

describe('VideoProcessor - getMetadata()', () => {
  it('正常流程：string input 調用 adapter.probe()', async () => {
    const { processor, mockAdapter } = createProcessorWithMocks()

    const result = await processor.getMetadata({
      source: '/tmp/test.mp4',
      filename: 'test.mp4',
      mimeType: 'video/mp4',
    })

    expect(mockAdapter.probe).toHaveBeenCalledWith('/tmp/test.mp4')
    expect(result).toEqual({
      duration: 120,
      width: 1920,
      height: 1080,
      codec: 'h264',
    })
  })

  it('Blob input 建立 temp file、調用 probe、cleanup temp file', async () => {
    const { processor, mockAdapter, mockRuntime } = createProcessorWithMocks()
    const videoBlob = new Blob(['fake video data'], { type: 'video/mp4' })

    const result = await processor.getMetadata({
      source: videoBlob,
      filename: 'clip.mp4',
    })

    // writeFile 被呼叫（建立 temp file）
    expect(mockRuntime.writeFile).toHaveBeenCalled()

    // probe 被呼叫
    expect(mockAdapter.probe).toHaveBeenCalled()

    // deleteFile 被呼叫（cleanup temp file）
    expect(mockRuntime.deleteFile).toHaveBeenCalled()

    expect(result).toBeDefined()
  })

  it('Blob input 且無 filename 時使用隨機檔名', async () => {
    const { processor, mockRuntime } = createProcessorWithMocks()
    const videoBlob = new Blob(['fake video data'])

    await processor.getMetadata({
      source: videoBlob,
      // 不提供 filename
    })

    // writeFile 被呼叫，路徑應包含 .tmp 副檔名
    const writeCall = mockRuntime.writeFile.mock.calls[0]
    expect(writeCall[0]).toMatch(/\.tmp$/)
  })
})

describe('VideoProcessor - process() Blob input', () => {
  it('Blob input 建立 temp file、執行 ffmpeg、cleanup', async () => {
    const { processor, mockAdapter, mockRuntime } = createProcessorWithMocks()
    const videoBlob = new Blob(['fake video data'], { type: 'video/mp4' })

    const output = await processor.process(
      { source: videoBlob, filename: 'clip.mp4' },
      { format: 'mp4' }
    )

    // writeFile 被呼叫（建立 temp input file）
    expect(mockRuntime.writeFile).toHaveBeenCalled()

    // adapter.execute 被呼叫
    expect(mockAdapter.execute).toHaveBeenCalled()

    // stat 被呼叫（取得 output size）
    expect(mockRuntime.stat).toHaveBeenCalled()

    // deleteFile 被呼叫（cleanup temp input）
    expect(mockRuntime.deleteFile).toHaveBeenCalled()

    expect(output.mimeType).toBe('video/mp4')
    expect(output.size).toBe(1024)
  })
})

describe('VideoProcessor - buildFFmpegArgs() GPU 加速', () => {
  it('gpu: true 時使用 h264_nvenc 編碼器', async () => {
    const { processor, executeCalls } = createProcessorWithMocks()

    await processor.process({ source: '/tmp/input.mp4', mimeType: 'video/mp4' }, { gpu: true })

    const args = executeCalls[0].args
    const codecIdx = args.indexOf('-c:v')
    expect(codecIdx).not.toBe(-1)
    expect(args[codecIdx + 1]).toBe('h264_nvenc')
  })

  it('指定 codec 時優先使用 codec（忽略 gpu）', async () => {
    const { processor, executeCalls } = createProcessorWithMocks()

    await processor.process(
      { source: '/tmp/input.mp4', mimeType: 'video/mp4' },
      { codec: 'libx265', gpu: true }
    )

    const args = executeCalls[0].args
    const codecIdx = args.indexOf('-c:v')
    expect(args[codecIdx + 1]).toBe('libx265')
  })

  it('未指定 codec 和 gpu 時使用預設 libx264', async () => {
    const { processor, executeCalls } = createProcessorWithMocks()

    await processor.process({ source: '/tmp/input.mp4', mimeType: 'video/mp4' }, {})

    const args = executeCalls[0].args
    const codecIdx = args.indexOf('-c:v')
    expect(args[codecIdx + 1]).toBe('libx264')
  })
})

describe('VideoProcessor - buildFFmpegArgs() HLS 選項', () => {
  it('hls: true 時使用預設 HLS 參數', async () => {
    const { processor, executeCalls } = createProcessorWithMocks()

    await processor.process({ source: '/tmp/input.mp4', mimeType: 'video/mp4' }, { hls: true })

    const args = executeCalls[0].args

    // 輸出格式為 HLS
    expect(args).toContain('-f')
    expect(args[args.indexOf('-f') + 1]).toBe('hls')

    // 預設 segment time = 10
    expect(args).toContain('-hls_time')
    expect(args[args.indexOf('-hls_time') + 1]).toBe('10')

    // 預設 playlist size = 0
    expect(args).toContain('-hls_list_size')
    expect(args[args.indexOf('-hls_list_size') + 1]).toBe('0')

    // 有 segment filename
    expect(args).toContain('-hls_segment_filename')
  })

  it('hls: object 時使用自訂 HLS 參數', async () => {
    const { processor, executeCalls } = createProcessorWithMocks()

    await processor.process(
      { source: '/tmp/input.mp4', mimeType: 'video/mp4' },
      { hls: { segmentTime: 5, playlistSize: 10 } }
    )

    const args = executeCalls[0].args

    expect(args[args.indexOf('-hls_time') + 1]).toBe('5')
    expect(args[args.indexOf('-hls_list_size') + 1]).toBe('10')
  })

  it('hls 啟用時輸出副檔名為 m3u8', async () => {
    const { processor } = createProcessorWithMocks()

    const output = await processor.process(
      { source: '/tmp/input.mp4', mimeType: 'video/mp4' },
      { hls: true }
    )

    // 路徑應包含 .m3u8 副檔名
    expect(output.path).toMatch(/\.m3u8$/)
  })
})

describe('VideoProcessor - buildFFmpegArgs() watermark + overlay', () => {
  it('watermark 使用 string source', async () => {
    const { processor, executeCalls } = createProcessorWithMocks()

    await processor.process(
      { source: '/tmp/input.mp4', mimeType: 'video/mp4' },
      {
        watermark: {
          source: '/tmp/watermark.png',
          position: 'bottom-right',
        },
      }
    )

    const args = executeCalls[0].args

    // 應有兩個 -i 輸入（原始視頻 + watermark）
    const inputIndices = args.reduce<number[]>((acc, arg, i) => {
      if (arg === '-i') acc.push(i)
      return acc
    }, [])
    expect(inputIndices).toHaveLength(2)

    // 應包含 filter_complex
    expect(args).toContain('-filter_complex')
  })

  it('watermark 使用 Blob source 建立 temp file', async () => {
    const { processor, mockRuntime } = createProcessorWithMocks()
    const watermarkBlob = new Blob(['fake png'])

    await processor.process(
      { source: '/tmp/input.mp4', mimeType: 'video/mp4' },
      {
        watermark: {
          source: watermarkBlob,
          position: 'top-left',
        },
      }
    )

    // writeFile 被呼叫以建立 watermark temp file
    expect(mockRuntime.writeFile).toHaveBeenCalled()

    // deleteFile 被呼叫以清理 watermark temp file
    expect(mockRuntime.deleteFile).toHaveBeenCalled()
  })
})

describe('VideoProcessor - getWatermarkFilter() 各位置', () => {
  it('top-left 位置', async () => {
    const { processor, executeCalls } = createProcessorWithMocks()

    await processor.process(
      { source: '/tmp/input.mp4', mimeType: 'video/mp4' },
      {
        watermark: {
          source: '/tmp/wm.png',
          position: 'top-left',
          x: 20,
          y: 15,
        },
      }
    )

    const args = executeCalls[0].args
    const filterIdx = args.indexOf('-filter_complex')
    const filter = args[filterIdx + 1]

    expect(filter).toContain('overlay=x=20:y=15')
  })

  it('top-right 位置', async () => {
    const { processor, executeCalls } = createProcessorWithMocks()

    await processor.process(
      { source: '/tmp/input.mp4', mimeType: 'video/mp4' },
      {
        watermark: {
          source: '/tmp/wm.png',
          position: 'top-right',
          x: 10,
          y: 10,
        },
      }
    )

    const args = executeCalls[0].args
    const filterIdx = args.indexOf('-filter_complex')
    const filter = args[filterIdx + 1]

    expect(filter).toContain('x=main_w-overlay_w-10')
    expect(filter).toContain('y=10')
  })

  it('bottom-left 位置', async () => {
    const { processor, executeCalls } = createProcessorWithMocks()

    await processor.process(
      { source: '/tmp/input.mp4', mimeType: 'video/mp4' },
      {
        watermark: {
          source: '/tmp/wm.png',
          position: 'bottom-left',
          x: 5,
          y: 5,
        },
      }
    )

    const args = executeCalls[0].args
    const filterIdx = args.indexOf('-filter_complex')
    const filter = args[filterIdx + 1]

    expect(filter).toContain('x=5')
    expect(filter).toContain('y=main_h-overlay_h-5')
  })

  it('bottom-right 位置（預設）', async () => {
    const { processor, executeCalls } = createProcessorWithMocks()

    await processor.process(
      { source: '/tmp/input.mp4', mimeType: 'video/mp4' },
      {
        watermark: {
          source: '/tmp/wm.png',
          position: 'bottom-right',
        },
      }
    )

    const args = executeCalls[0].args
    const filterIdx = args.indexOf('-filter_complex')
    const filter = args[filterIdx + 1]

    // 預設 x=10, y=10
    expect(filter).toContain('x=main_w-overlay_w-10')
    expect(filter).toContain('y=main_h-overlay_h-10')
  })

  it('center 位置', async () => {
    const { processor, executeCalls } = createProcessorWithMocks()

    await processor.process(
      { source: '/tmp/input.mp4', mimeType: 'video/mp4' },
      {
        watermark: {
          source: '/tmp/wm.png',
          position: 'center',
        },
      }
    )

    const args = executeCalls[0].args
    const filterIdx = args.indexOf('-filter_complex')
    const filter = args[filterIdx + 1]

    expect(filter).toContain('x=(main_w-overlay_w)/2')
    expect(filter).toContain('y=(main_h-overlay_h)/2')
  })
})

describe('VideoProcessor - getWatermarkFilter() opacity + scale', () => {
  it('opacity 參數', async () => {
    const { processor, executeCalls } = createProcessorWithMocks()

    await processor.process(
      { source: '/tmp/input.mp4', mimeType: 'video/mp4' },
      {
        watermark: {
          source: '/tmp/wm.png',
          position: 'bottom-right',
          opacity: 0.5,
        },
      }
    )

    const args = executeCalls[0].args
    const filterIdx = args.indexOf('-filter_complex')
    const filter = args[filterIdx + 1]

    // 應包含 format=rgba 和 colorchannelmixer
    expect(filter).toContain('format=rgba')
    expect(filter).toContain('colorchannelmixer=aa=0.5')
    expect(filter).toContain('[wm]')
  })

  it('scale 參數', async () => {
    const { processor, executeCalls } = createProcessorWithMocks()

    await processor.process(
      { source: '/tmp/input.mp4', mimeType: 'video/mp4' },
      {
        watermark: {
          source: '/tmp/wm.png',
          position: 'top-left',
          scale: 0.2,
        },
      }
    )

    const args = executeCalls[0].args
    const filterIdx = args.indexOf('-filter_complex')
    const filter = args[filterIdx + 1]

    // 應包含 scale 參數
    expect(filter).toContain('scale=iw*0.2:-1')
    expect(filter).toContain('[wm]')
  })

  it('同時使用 opacity 和 scale', async () => {
    const { processor, executeCalls } = createProcessorWithMocks()

    await processor.process(
      { source: '/tmp/input.mp4', mimeType: 'video/mp4' },
      {
        watermark: {
          source: '/tmp/wm.png',
          position: 'center',
          opacity: 0.8,
          scale: 0.3,
        },
      }
    )

    const args = executeCalls[0].args
    const filterIdx = args.indexOf('-filter_complex')
    const filter = args[filterIdx + 1]

    // 應同時包含 scale 和 opacity
    expect(filter).toContain('scale=iw*0.3:-1')
    expect(filter).toContain('colorchannelmixer=aa=0.8')
    expect(filter).toContain('[1:v]')
    expect(filter).toContain('[wm]')
  })

  it('無 opacity 和 scale 時使用簡單 overlay', async () => {
    const { processor, executeCalls } = createProcessorWithMocks()

    await processor.process(
      { source: '/tmp/input.mp4', mimeType: 'video/mp4' },
      {
        watermark: {
          source: '/tmp/wm.png',
          position: 'top-left',
          x: 10,
          y: 10,
        },
      }
    )

    const args = executeCalls[0].args
    const filterIdx = args.indexOf('-filter_complex')
    const filter = args[filterIdx + 1]

    // 簡單 overlay: [0:v][1:v]overlay=...
    expect(filter).toContain('[0:v][1:v]overlay=')
    expect(filter).not.toContain('[wm]')
  })
})

describe('VideoProcessor - getRotationFilter() 各角度', () => {
  it('90 度旋轉', async () => {
    const { processor, executeCalls } = createProcessorWithMocks()

    await processor.process({ source: '/tmp/input.mp4', mimeType: 'video/mp4' }, { rotate: 90 })

    const args = executeCalls[0].args
    const vfIdx = args.indexOf('-vf')
    expect(vfIdx).not.toBe(-1)
    expect(args[vfIdx + 1]).toBe('transpose=1')
  })

  it('180 度旋轉', async () => {
    const { processor, executeCalls } = createProcessorWithMocks()

    await processor.process({ source: '/tmp/input.mp4', mimeType: 'video/mp4' }, { rotate: 180 })

    const args = executeCalls[0].args
    const vfIdx = args.indexOf('-vf')
    expect(vfIdx).not.toBe(-1)
    expect(args[vfIdx + 1]).toBe('transpose=1,transpose=1')
  })

  it('270 度旋轉', async () => {
    const { processor, executeCalls } = createProcessorWithMocks()

    await processor.process({ source: '/tmp/input.mp4', mimeType: 'video/mp4' }, { rotate: 270 })

    const args = executeCalls[0].args
    const vfIdx = args.indexOf('-vf')
    expect(vfIdx).not.toBe(-1)
    expect(args[vfIdx + 1]).toBe('transpose=2')
  })

  it('不支援的角度（如 45 度）不加 rotation filter', async () => {
    const { processor, executeCalls } = createProcessorWithMocks()

    await processor.process({ source: '/tmp/input.mp4', mimeType: 'video/mp4' }, { rotate: 45 })

    const args = executeCalls[0].args
    // 不應有 -vf 參數（因為沒有 resize 也沒有有效的 rotate）
    expect(args).not.toContain('-vf')
  })
})

describe('VideoProcessor - buildFFmpegArgs() rotate 合併已有 vf', () => {
  it('同時有 resize 和 rotate 時參數正確合併', async () => {
    const { processor, executeCalls } = createProcessorWithMocks()

    await processor.process(
      { source: '/tmp/input.mp4', mimeType: 'video/mp4' },
      { width: 1280, height: 720, rotate: 90 }
    )

    const args = executeCalls[0].args

    // 應只有一個 -vf，包含 scale 和 transpose
    const vfIndices = args.reduce<number[]>((acc, arg, i) => {
      if (arg === '-vf') acc.push(i)
      return acc
    }, [])
    expect(vfIndices).toHaveLength(1)

    const vfValue = args[vfIndices[0] + 1]
    expect(vfValue).toContain('scale=1280:720')
    expect(vfValue).toContain('transpose=1')
    expect(vfValue).toBe('scale=1280:720,transpose=1')
  })

  it('只有 width 時 scale 使用 -1 做高度自動計算', async () => {
    const { processor, executeCalls } = createProcessorWithMocks()

    await processor.process({ source: '/tmp/input.mp4', mimeType: 'video/mp4' }, { width: 640 })

    const args = executeCalls[0].args
    const vfIdx = args.indexOf('-vf')
    expect(args[vfIdx + 1]).toBe('scale=640:-1')
  })

  it('只有 height 時 scale 使用 -1 做寬度自動計算', async () => {
    const { processor, executeCalls } = createProcessorWithMocks()

    await processor.process({ source: '/tmp/input.mp4', mimeType: 'video/mp4' }, { height: 480 })

    const args = executeCalls[0].args
    const vfIdx = args.indexOf('-vf')
    expect(args[vfIdx + 1]).toBe('scale=-1:480')
  })
})

describe('VideoProcessor - buildFFmpegArgs() quality (CRF)', () => {
  it('quality 設定時加入 -crf 參數', async () => {
    const { processor, executeCalls } = createProcessorWithMocks()

    await processor.process({ source: '/tmp/input.mp4', mimeType: 'video/mp4' }, { quality: 23 })

    const args = executeCalls[0].args
    expect(args).toContain('-crf')
    expect(args[args.indexOf('-crf') + 1]).toBe('23')
  })
})

describe('VideoProcessor - getOutputMimeType()', () => {
  it('mp4 格式回傳 video/mp4', async () => {
    const { processor } = createProcessorWithMocks()

    const output = await processor.process(
      { source: '/tmp/input.mp4', mimeType: 'video/mp4' },
      { format: 'mp4' }
    )

    expect(output.mimeType).toBe('video/mp4')
  })

  it('webm 格式回傳 video/webm', async () => {
    const { processor } = createProcessorWithMocks()

    const output = await processor.process(
      { source: '/tmp/input.mp4', mimeType: 'video/mp4' },
      { format: 'webm' }
    )

    expect(output.mimeType).toBe('video/webm')
  })

  it('mov 格式回傳 video/quicktime', async () => {
    const { processor } = createProcessorWithMocks()

    const output = await processor.process(
      { source: '/tmp/input.mp4', mimeType: 'video/mp4' },
      { format: 'mov' }
    )

    expect(output.mimeType).toBe('video/quicktime')
  })

  it('avi 格式回傳 video/x-msvideo', async () => {
    const { processor } = createProcessorWithMocks()

    const output = await processor.process(
      { source: '/tmp/input.mp4', mimeType: 'video/mp4' },
      { format: 'avi' }
    )

    expect(output.mimeType).toBe('video/x-msvideo')
  })

  it('mkv 格式回傳 video/x-matroska', async () => {
    const { processor } = createProcessorWithMocks()

    const output = await processor.process(
      { source: '/tmp/input.mp4', mimeType: 'video/mp4' },
      { format: 'mkv' }
    )

    expect(output.mimeType).toBe('video/x-matroska')
  })

  it('未知格式回傳 video/mp4（預設）', async () => {
    const { processor } = createProcessorWithMocks()

    const output = await processor.process(
      { source: '/tmp/input.mp4', mimeType: 'video/mp4' },
      { format: 'flv' }
    )

    expect(output.mimeType).toBe('video/mp4')
  })
})

describe('VideoProcessor - buildFFmpegArgs() 完整性', () => {
  it('args 以 -y（overwrite）和 outputPath 結尾', async () => {
    const { processor, executeCalls } = createProcessorWithMocks()

    await processor.process({ source: '/tmp/input.mp4', mimeType: 'video/mp4' }, {})

    const args = executeCalls[0].args

    // 倒數第二個應為 -y
    expect(args[args.length - 2]).toBe('-y')

    // 最後一個應為 output path
    expect(args[args.length - 1]).toMatch(/\.mp4$/)
  })

  it('args 包含預設 audio codec -c:a aac', async () => {
    const { processor, executeCalls } = createProcessorWithMocks()

    await processor.process({ source: '/tmp/input.mp4', mimeType: 'video/mp4' }, {})

    const args = executeCalls[0].args
    const audioIdx = args.indexOf('-c:a')
    expect(audioIdx).not.toBe(-1)
    expect(args[audioIdx + 1]).toBe('aac')
  })
})
