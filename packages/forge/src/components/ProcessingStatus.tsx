/**
 * @fileoverview React component for displaying processing status
 */

import { useEffect, useState } from 'react'
import type { ProcessingStatus as ProcessingStatusType } from '../types'

/**
 * ProcessingStatus component props
 */
export interface ProcessingStatusProps {
  /**
   * Job ID for status tracking
   */
  jobId: string

  /**
   * SSE endpoint path (default: /forge/status/:jobId/stream)
   */
  statusEndpoint?: string

  /**
   * CSS class name
   */
  className?: string
}

/**
 * ProcessingStatus component
 *
 * Displays processing status with progress bar and messages.
 */
export function ProcessingStatus({ jobId, statusEndpoint, className }: ProcessingStatusProps) {
  const [status, setStatus] = useState<ProcessingStatusType | null>(null)

  useEffect(() => {
    const endpoint = statusEndpoint || `/forge/status/${jobId}/stream`
    const eventSource = new EventSource(endpoint)

    eventSource.onmessage = (event) => {
      try {
        const newStatus = JSON.parse(event.data) as ProcessingStatusType
        setStatus(newStatus)

        if (newStatus.status === 'completed' || newStatus.status === 'failed') {
          eventSource.close()
        }
      } catch (error) {
        console.error('[ProcessingStatus] Error parsing status:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('[ProcessingStatus] SSE error:', error)
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [jobId, statusEndpoint])

  if (!status) {
    return <div className={className}>Loading...</div>
  }

  return (
    <div className={className}>
      <div style={{ marginBottom: '8px' }}>
        <strong>Status:</strong> {status.status}
      </div>
      {status.status === 'processing' && (
        <>
          <div
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e0e0e0',
              borderRadius: '4px',
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
          <div style={{ fontSize: '14px', color: '#666' }}>
            {status.progress}% {status.message && `- ${status.message}`}
          </div>
        </>
      )}
      {status.status === 'completed' && (
        <div style={{ color: '#4CAF50' }}>Processing completed!</div>
      )}
      {status.status === 'failed' && (
        <div style={{ color: '#f44336' }}>Processing failed: {status.error}</div>
      )}
    </div>
  )
}
