import { Component } from 'react'

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error) {
    console.error('Diagnostic Clinic Simulator crashed during render.', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-error-shell" role="alert">
          <div className="app-error-card">
            <p className="eyebrow">Rendering Error</p>
            <h1>Diagnostic Clinic Simulator could not finish loading.</h1>
            <p>
              A runtime error interrupted the React render tree. Open the browser console for the exact stack trace,
              then refresh after the issue is corrected.
            </p>
            <pre>{this.state.error?.message ?? 'Unknown render error'}</pre>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}
