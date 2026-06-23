import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('VaultBox render error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-vault-50 p-6">
          <div className="max-w-lg rounded-lg border border-red-200 bg-white p-6 shadow-sm">
            <h1 className="text-lg font-bold text-red-700">VaultBox failed to load</h1>
            <p className="mt-2 text-sm text-vault-600">{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-md bg-gold-500 px-4 py-2 text-sm font-medium text-white hover:bg-gold-400"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}