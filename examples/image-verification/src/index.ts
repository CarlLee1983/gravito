import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { type ForgeService, OrbitForge } from '@gravito/forge'
import { OrbitStorage, type StorageProvider } from '@gravito/nebula'
import { Job, OrbitStream } from '@gravito/stream'
import { type GravitoContext, PlanetCore } from 'gravito-core'

// Global core reference for Jobs running in the same process
let appCore: PlanetCore

// 1. Define Mock Remote Storage Providers (unchanged)
class S3MockProvider implements StorageProvider {
  constructor(private bucket: string) { }

  async put(key: string, data: Blob | Buffer | string): Promise<void> {
    console.log(`[S3 MOCK] Uploading to bucket "${this.bucket}": ${key}`)
    const path = join(process.cwd(), 'storage/s3-sim', key)
    const dir = path.substring(0, path.lastIndexOf('/'))
    await mkdir(dir, { recursive: true })
    await Bun.write(path, data)
    console.log(`[S3 MOCK] Successfully uploaded to s3://${this.bucket}/${key}`)
  }

  async get(key: string): Promise<Blob | null> {
    return Bun.file(join(process.cwd(), 'storage/s3-sim', key))
  }

  async delete(key: string): Promise<void> {
    const fs = await import('node:fs/promises')
    await fs.unlink(join(process.cwd(), 'storage/s3-sim', key))
  }

  getUrl(key: string): string {
    return `https://${this.bucket}.s3.amazonaws.com/${key}`
  }
}

class GCSMockProvider implements StorageProvider {
  constructor(private bucket: string) { }

  async put(key: string, data: Blob | Buffer | string): Promise<void> {
    console.log(`[GCS MOCK] Uploading to bucket "${this.bucket}": ${key}`)
    const path = join(process.cwd(), 'storage/gcs-sim', key)
    const dir = path.substring(0, path.lastIndexOf('/'))
    await mkdir(dir, { recursive: true })
    await Bun.write(path, data)
    console.log(`[GCS MOCK] Successfully uploaded to gs://${this.bucket}/${key}`)
  }

  async get(key: string): Promise<Blob | null> {
    return Bun.file(join(process.cwd(), 'storage/gcs-sim', key))
  }

  async delete(key: string): Promise<void> {
    const fs = await import('node:fs/promises')
    await fs.unlink(join(process.cwd(), 'storage/gcs-sim', key))
  }

  getUrl(key: string): string {
    return `https://storage.googleapis.com/${this.bucket}/${key}`
  }
}

// 2. Define the Job for Image Processing
interface ProcessImageJobData {
  jobId: string
  source: string // Base64 encoded image data
  filename: string
  mimeType: string
  target: string // 's3' or 'gcs'
  remoteKeyPrefix: string
}

class ProcessImageJob extends Job {
  constructor(public data: ProcessImageJobData) {
    super()
  }

  async handle(): Promise<void> {
    const { jobId, source, filename, mimeType, target, remoteKeyPrefix } = this.data

    // Reconstruct File from base64
    const buffer = Buffer.from(source, 'base64')
    const file = new File([buffer], filename, { type: mimeType })

    // Use global appCore instead of this.core
    // Note: We can't easily access context variables from container in a Job
    // This is a simplified demo - in production, you'd pass the processed data differently
    const forge = (appCore as any)._forgeService as ForgeService
    const localStore = (appCore as any)._localStorage as StorageProvider
    const remoteStore = (appCore as any)._remoteStorages?.[target] as StorageProvider

    if (!forge || !localStore || !remoteStore) {
      throw new Error('Services not initialized')
    }

    console.log(`[JOB - ${jobId}] Processing image: ${filename} for target: ${target}`)

    try {
      // 1. Process Image using Forge (Resize and Convert to WebP)
      const processed = await forge.process(
        {
          source: file,
          filename: filename,
          mimeType: mimeType,
        },
        {
          width: 800,
          format: 'webp',
        }
      )

      // 2. Upload to Local Storage (for preview)
      const localKey = `processed/${Date.now()}-${filename}.webp`
      const processedFile = processed.path ? Bun.file(processed.path) : (processed as any).buffer
      if (!processedFile) {
        throw new Error('Processed file path is missing')
      }

      await localStore.put(localKey, processedFile)
      const localUrl = localStore.getUrl(localKey)

      // 3. Upload to Remote Storage (S3/GCS Simulation)
      const remoteKey = `${remoteKeyPrefix}/${new Date().toISOString().split('T')[0]}/${filename}.webp`
      await remoteStore.put(remoteKey, processedFile)
      const remoteUrl = remoteStore.getUrl(remoteKey)

      console.log(`[JOB - ${jobId}] ✅ Image processed and uploaded to ${target.toUpperCase()}`)
      // Update job status (Forge's status store can be used for this)
      const statusStore = forge.getStatusStore()
      if (statusStore) {
        await statusStore.set({
          jobId,
          status: 'completed',
          progress: 100,
          result: {
            url: remoteUrl,
            path: localUrl, // Using localUrl for path for demo purposes
            size: await processedFile.size, // Assuming Bun.file has size, or use processed.size
            mimeType: 'image/webp',
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      }
    } catch (err: any) {
      console.error(`[JOB - ${jobId}] ❌ Processing failed:`, err)
      const statusStore = forge.getStatusStore()
      if (statusStore) {
        await statusStore.set({
          jobId,
          status: 'failed',
          progress: 0,
          error: err.message,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      }
      throw err // Re-throw to mark job as failed in stream
    }
  }
}

// 3. Boot Gravito Planet
const core = await PlanetCore.boot({
  config: {
    stream: {
      default: 'default', // Use memory driver for demo
      jobs: {
        ProcessImageJob: ProcessImageJob,
      },
    },
  },
  orbits: [
    new OrbitStream({ autoStartWorker: true, workerOptions: { queues: ['default'] } }), // Queue system with auto-start worker

    // Storage Engine (Configured with Multiple Providers)
    new OrbitStorage({
      exposeAs: 'storage',
      local: { root: './storage/local', baseUrl: '/storage' },
    }),

    // Remote Storage Simulations
    new OrbitStorage({
      exposeAs: 's3',
      provider: new S3MockProvider('my-production-bucket'),
    }),

    new OrbitStorage({
      exposeAs: 'gcs',
      provider: new GCSMockProvider('my-asset-bucket'),
    }),

    // Forge Engine (File Processing)
    new OrbitForge({
      image: {
        imagemagickPath: 'magick',
        tempDir: './storage/tmp',
      },
      sse: { enabled: true }, // Enable SSE for status updates
    }),
  ],
})

// Assign initialized core to global variable for Job access
appCore = core

const router = core.router

// 4. Define Routes
router.get('/', (c: GravitoContext) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Gravito Image Verification (Queued)</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen flex items-center justify-center">
        <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl">
            <h1 class="text-3xl font-bold mb-6 text-gray-800">Gravito Image Processor (Queued)</h1>
            
            <div class="space-y-6">
                <div class="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors cursor-pointer" id="dropzone">
                    <p class="text-gray-500">Drag & drop an image here, or click to select</p>
                    <input type="file" id="fileInput" class="hidden" accept="image/*">
                </div>

                <div class="flex gap-4">
                    <button id="uploadS3" class="flex-1 bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition">Upload to S3 (Sim)</button>
                    <button id="uploadGCS" class="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition">Upload to GCS (Sim)</button>
                </div>

                <div id="statusArea" class="hidden">
                    <div class="flex items-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-lg">
                        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700"></div>
                        <span id="statusText">正在上傳...</span>
                    </div>
                </div>

                <div id="result" class="hidden space-y-4">
                    <h3 class="text-lg font-semibold">處理結果:</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-sm text-gray-500 mb-1">本地預覽 (Processed)</p>
                            <img id="localPreview" class="rounded border">
                        </div>
                        <div>
                            <p class="text-sm text-gray-500 mb-1">遠端模擬 URL</p>
                            <div id="remoteUrl" class="text-xs break-all bg-gray-50 p-2 border rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script>
            const dropzone = document.getElementById('dropzone');
            const fileInput = document.getElementById('fileInput');
            const statusArea = document.getElementById('statusArea');
            const statusText = document.getElementById('statusText');
            const resultArea = document.getElementById('result');
            const localPreview = document.getElementById('localPreview');
            const remoteUrlDiv = document.getElementById('remoteUrl');
            let selectedFile = null;
            let currentJobId = null;

            dropzone.onclick = () => fileInput.click();
            
            fileInput.onchange = (e) => {
                selectedFile = e.target.files[0];
                if (selectedFile) {
                    dropzone.innerHTML = '<p class="text-blue-600 font-medium">' + selectedFile.name + '</p>';
                }
            };

            async function handleUpload(target) {
                if (!selectedFile) return alert('請先選擇一個圖片');
                
                statusArea.classList.remove('hidden');
                resultArea.classList.add('hidden');
                statusText.innerText = '圖片上傳中...';

                const formData = new FormData();
                formData.append('image', selectedFile);
                formData.append('target', target);

                try {
                    const res = await fetch('/upload', {
                        method: 'POST',
                        body: formData
                    });
                    const data = await res.json();
                    
                    if (data.error) throw new Error(data.error);

                    currentJobId = data.jobId;
                    statusText.innerText = '任務已排隊 (ID: ' + currentJobId + ')，等待處理...';
                    
                    // Start SSE to listen for job status updates
                    const eventSource = new EventSource('/forge/status/' + currentJobId + '/stream');

                    eventSource.onmessage = (event) => {
                        const statusUpdate = JSON.parse(event.data);
                        console.log('Job Status Update:', statusUpdate);
                        statusText.innerText = '[' + statusUpdate.status.toUpperCase() + '] ' + (statusUpdate.message || '處理中...');

                        if (statusUpdate.status === 'completed') {
                            localPreview.src = statusUpdate.result.path;
                            remoteUrlDiv.innerText = statusUpdate.result.url;
                            resultArea.classList.remove('hidden');
                            statusArea.classList.add('hidden');
                            eventSource.close();
                        } else if (statusUpdate.status === 'failed') {
                            alert('圖片處理失敗: ' + statusUpdate.error);
                            statusArea.classList.add('hidden');
                            eventSource.close();
                        }
                    };

                    eventSource.onerror = (err) => {
                        console.error('EventSource failed:', err);
                        alert('無法取得任務狀態更新。');
                        statusArea.classList.add('hidden');
                        eventSource.close();
                    };

                } catch (err) {
                    alert('上傳失敗: ' + err.message);
                    statusArea.classList.add('hidden');
                }
            }

            document.getElementById('uploadS3').onclick = () => handleUpload('s3');
            document.getElementById('uploadGCS').onclick = () => handleUpload('gcs');
        </script>
    </body>
    </html>
  `)
})

router.post('/upload', async (c: GravitoContext) => {
  const body = (await c.req.parseBody()) as { image?: File; target?: string }
  const image = body.image
  const target = body.target as string // 's3' or 'gcs'

  if (!(image instanceof File)) {
    return c.json({ error: 'No image uploaded' }, 400)
  }

  // Read file as ArrayBuffer, then convert to base64 for job data
  const buffer = await image.arrayBuffer()
  const base64Image = Buffer.from(buffer).toString('base64')

  const jobId = crypto.randomUUID()
  const queue = c.get('queue') // Get queue (QueueManager) service from context

  if (!queue) {
    return c.json({ error: 'Queue service not available' }, 500)
  }

  try {
    // Push job to queue
    await queue.push(
      new ProcessImageJob({
        jobId,
        source: base64Image,
        filename: image.name,
        mimeType: image.type,
        target: target,
        remoteKeyPrefix: target === 's3' ? 'uploads/s3' : 'uploads/gcs',
      })
    )

    // Immediately return job ID for status tracking
    return c.json({ jobId, message: 'Image processing job dispatched.' })
  } catch (err: any) {
    console.error('Job dispatch failed:', err)
    return c.json({ error: `Failed to dispatch image processing job: ${err.message}` }, 500)
  }
})

// Serve local storage files
router.get('/storage/*', async (c: GravitoContext) => {
  const path = c.req.path.replace('/storage/', '')
  const storage = c.get('storage') as StorageProvider
  const file = await storage.get(path)
  if (!file) {
    return c.text('Not Found', 404)
  }
  return c.body(file)
})

const server = core.liftoff(3001)
console.log('🚀 Image Verification Site running at http://localhost:3001')

export default server
