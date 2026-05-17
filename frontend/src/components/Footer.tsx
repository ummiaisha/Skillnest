'use client';

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', padding: '4rem 0', marginTop: '4rem' }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <div className="logo" style={{ marginBottom: '1.5rem' }}>SKILLNEST</div>
        <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>
          © {new Date().getFullYear()} Skillnest Education Inc. Built for the modern web.
        </p>
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
          <a href="#" style={{ color: '#71717a', fontSize: '0.8rem', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="#" style={{ color: '#71717a', fontSize: '0.8rem', textDecoration: 'none' }}>Terms of Service</a>
          <a href="#" style={{ color: '#71717a', fontSize: '0.8rem', textDecoration: 'none' }}>Help Center</a>
        </div>
      </div>
    </footer>
  );
}
