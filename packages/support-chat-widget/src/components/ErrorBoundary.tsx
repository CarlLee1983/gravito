import { Component, type ErrorInfo, type ReactNode } from 'react'
import type { ErrorBoundaryProps } from '../types'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * React 錯誤邊界組件
 *
 * 捕獲子組件樹中的 JavaScript 錯誤，記錄錯誤並顯示降級 UI。
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   fallback={<div>發生錯誤，請重新整理頁面</div>}
 *   onError={(error, errorInfo) => {
 *     console.error('Error caught:', error, errorInfo)
 *   }}
 * >
 *   <ChatWidget />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)

    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div
          style={{
            padding: '20px',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
          }}
        >
          <h3 style={{ margin: '0 0 10px 0', color: '#c00' }}>發生錯誤</h3>
          <p style={{ margin: 0, color: '#600' }}>
            {this.state.error?.message || '未知錯誤'}
          </p>
        </div>
      )
    }

    return this.props.children
  }
}
