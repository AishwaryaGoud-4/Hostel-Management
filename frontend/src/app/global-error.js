'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#17140f', color: '#f5ece3', fontFamily: 'sans-serif' }}>
          <h2>Something went wrong!</h2>
          <p style={{ color: '#e15554', margin: '16px 0' }}>{error?.message || 'An unexpected error occurred.'}</p>
          <button 
            onClick={() => reset()}
            style={{ padding: '10px 20px', backgroundColor: '#e2725b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
