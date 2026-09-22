import { useEffect, useState } from 'react'

type HealthStatus = 'checking' | 'ok' | 'error'

function App() {
  const [status, setStatus] = useState<HealthStatus>('checking')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? setStatus('ok') : setStatus('error')))
      .catch(() => setStatus('error'))
  }, [])

  return (
    <main className="scaffold">
      <h1>REAL ONES</h1>
      <p>Projektgerüst steht.</p>
      <p className="status" data-status={status}>
        API: {status}
      </p>
    </main>
  )
}

export default App
