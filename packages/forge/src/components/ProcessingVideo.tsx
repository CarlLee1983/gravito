/**
 * @fileoverview React component for displaying processing video with real-time status
 */

import { useEffect, useState } from 'react'
import type { FileOutput, ProcessingStatus } from '../types'

/**
 * ProcessingVideo component props
 */
export interface ProcessingVideoProps {
  /**
   * Job ID for status tracking
   */
  jobId: string

  /**
   * Placeholder video URL (shown while processing)
   */
  placeholder?: string

  /**
   * CSS class name
   */
  className?: string

  /**
   * SSE endpoint path (default: /forge/status/:jobId/stream)
   */
  statusEndpoint?: string

  /**
   * Callback when processing completes
   */
  onComplete?: (result: FileOutput) => void

  /**
   * Callback when processing fails
   */
  onError?: (error: Error) => void
}

/**
 * ProcessingVideo component
 *
 * Displays a video with real-time processing status via SSE.
 * Shows progress overlay while processing and updates to final video when complete.
 */
export function ProcessingVideo({
  jobId,
  placeholder,
  className,
  statusEndpoint,
  onComplete,
  onError,
}: ProcessingVideoProps) {
  const [status, setStatus] = useState<ProcessingStatus | null>(null)
  const [videoSrc, setVideoSrc] = useState<string | null>(placeholder || null)

  useEffect(() => {
    const endpoint = statusEndpoint || `/forge/status/${jobId}/stream`
    const eventSource = new EventSource(endpoint)

    eventSource.onmessage = (event) => {
      try {
        const newStatus = JSON.parse(event.data) as ProcessingStatus
        setStatus(newStatus)

        if (newStatus.status === 'completed' && newStatus.result) {
          setVideoSrc(newStatus.result.url)
          onComplete?.(newStatus.result)
          eventSource.close()
        } else if (newStatus.status === 'failed') {
          onError?.(new Error(newStatus.error || 'Processing failed'))
          eventSource.close()
        }
      } catch (error) {
        console.error('[ProcessingVideo] Error parsing status:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('[ProcessingVideo] SSE error:', error)
      eventSource.close()
      onError?.(new Error('Failed to connect to status stream'))
    }

    return () => {
      eventSource.close()
    }
  }, [jobId, statusEndpoint, onComplete, onError])

  return (
    <div className={className} style={{ position: 'relative' }}>
      {status?.status === 'processing' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: '80%',
              height: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              borderRadius: '2px',
              overflow: 'hidden',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                width: `${status.progress}%`,
                height: '100%',
                backgroundColor: '#4CAF50',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <span style={{ fontSize: '14px' }}>
            {status.progress}% {status.message && `- ${status.message}`}
          </span>
        </div>
      )}
      {videoSrc && (
        // biome-ignore lint/a11y/useMediaCaption: Preview video component, captions not available
        <video src={videoSrc} controls style={{ width: '100%', height: 'auto', display: 'block' }}>
          Your browser does not support the video tag.
        </video>
      )}
    </div>
  )
}
