import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ 
      padding: '2rem', 
      textAlign: 'center',
      fontFamily: 'system-ui, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      color: 'white'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
        🏀 Fast NBA Court Dashboard
      </h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem', maxWidth: '600px' }}>
        Interactive basketball court with instant play matching and real-time animation.
        Drag players, find the best historical plays, and watch animations launch automatically.
      </p>
      
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href="/dashboard/court" style={{
          background: '#ff6b35',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: '8px',
          textDecoration: 'none',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          transition: 'transform 0.2s'
        }}>
          🚀 Launch NBA Court
        </Link>
        
        <a href="http://localhost:5001/api/nba/health" 
           target="_blank" 
           rel="noopener noreferrer"
           style={{
             background: 'rgba(255,255,255,0.2)',
             color: 'white',
             padding: '1rem 2rem',
             borderRadius: '8px',
             textDecoration: 'none',
             fontSize: '1.1rem',
             border: '1px solid rgba(255,255,255,0.3)'
           }}>
          📊 Check API Status
        </a>
      </div>
      
      <div style={{ 
        marginTop: '3rem', 
        padding: '1rem', 
        background: 'rgba(0,0,0,0.2)', 
        borderRadius: '8px',
        maxWidth: '500px'
      }}>
        <h3>Performance Features:</h3>
        <ul style={{ textAlign: 'left', lineHeight: '1.6' }}>
          <li>⚡ Play matching: &lt;50ms (was 10-15 seconds)</li>
          <li>🎬 Instant animation launches</li>
          <li>💾 Smart caching for replay</li>
          <li>📱 Real-time UI feedback</li>
        </ul>
      </div>
    </div>
  );
}