# Media Processing Pipelines

`@gravito/forge` uses a fluent pipeline API to define complex media transformation chains. This guide covers how to build and execute these pipelines within your Satellites.

## 1. Video Transcoding Pipeline

Video processing is often slow and resource-heavy. Always prefer the `processAsync` method for production.

```typescript
import { Forge } from '@gravito/forge'

const pipeline = forge.createVideoPipeline()
  .resize(1920, 1080)
  .bitrate('5000k')
  .fps(30)
  .format('mp4')
  .onProgress((p) => console.log(`Transcoding: ${p}%`))

// Execute (returns a Job handle in async mode)
const result = await pipeline.execute(fileInput)
```

## 2. Image Optimization Pipeline

Create multiple versions of an image (e.g., thumbnail, mobile, desktop) in a single pass.

```typescript
const imagePipeline = forge.createImagePipeline()
  .resize(800, 600)
  .format('webp')
  .quality(85)
  .stripMetadata() // Remove EXIF for privacy/size

await imagePipeline.execute(imageInput)
```

## 3. Distributed Processing Strategy

In a **Galaxy Architecture**, you should separate your `Forge` API from your `Forge` Workers.

- **API Node**: Receives the file, creates a `processAsync` job, and returns a `jobId`.
- **Worker Node**: Listens to the `@gravito/stream` queue, performs the heavy lifting, and updates the status in `Plasma`.

```typescript
// Worker setup
const worker = new ForgeWorker({
  concurrency: 2, // Limit concurrent FFmpeg processes per node
  tempDir: '/mnt/fast-ssd/forge'
})
await worker.start()
```

## 4. Real-time Feedback via SSE

Forge provides a built-in SSE endpoint to let your frontend know when a job is done.

```typescript
// Register the progress route in Photon
app.get('/api/media/status/:jobId', forge.sseHandler())
```

## 5. Storage Auto-Sync (Nebula Integration)

Once processing is complete, Forge can automatically move the resulting file to your permanent storage.

```typescript
forge.configure({
  storage: {
    disk: 's3-media',
    path: (job) => `processed/${job.userId}/${job.filename}`
  }
})
```
