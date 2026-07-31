import { useState } from 'react'
import './App.css'

// Injected at image build time by the Jenkins pipeline, so every deployment
// visibly differs from the last one.
const BUILD = import.meta.env.VITE_BUILD_NUMBER || 'local'
const COMMIT = import.meta.env.VITE_GIT_COMMIT || 'dev'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <h1>React Vite on Amazon EKS</h1>
      <p className="tagline">Deployed automatically by a Jenkins CI/CD pipeline</p>

      <p className="cd-banner">
        Continuous deployment verified &mdash; this line reached the cluster
        without anyone pressing Build.
      </p>

      <div className="card">
        <button onClick={() => setCount((c) => c + 1)}>
          count is {count}
        </button>
        <p className="hint">
          Edit <code>src/App.jsx</code>, push to Git, and the pipeline redeploys this page.
        </p>
      </div>

      <dl className="meta">
        <div>
          <dt>Build</dt>
          <dd>#{BUILD}</dd>
        </div>
        <div>
          <dt>Commit</dt>
          <dd>{COMMIT}</dd>
        </div>
      </dl>

      <footer>Ayesha Mohapatra &middot; 23BCSA91</footer>
    </div>
  )
}

export default App
