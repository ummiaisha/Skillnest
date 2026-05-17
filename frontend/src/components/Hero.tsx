'use client';

export default function Hero() {
  return (
    <section className="hero">
      <div className="container">
        <span className="badge" style={{ marginBottom: '1.5rem', display: 'inline-block' }}>
          Welcome to the Future of Learning
        </span>
        <h1>Master Your Next <br /><span className="premium-gradient">Digital Superpower</span></h1>
        <p>Join 50,000+ students learning world-class skills from industry experts. Start your journey today with Skillnest.</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <a href="#courses" className="btn btn-primary">Browse Courses</a>
          <button className="btn" style={{ border: '1px solid var(--border)', color: 'white' }}>Watch Demo</button>
        </div>
      </div>
    </section>
  );
}
