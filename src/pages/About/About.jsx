import React from 'react';
import './About.css';

export default function About() {
  const contributors = [
    { name: 'Moeed Ali Syed', role: 'Active Contributor', image: '/Moeed.jpeg' },
    { name: 'M Umar Shafiq Somro', role: 'Active Contributor', image: '/Umar.png' },
    { name: 'Wazir M. Maikal', role: 'Active Contributor', image: '/wazir.jpeg' },
    { name: 'Syed Saifullah', role: 'Active Contributor', image: '/Saif.jpeg' }
  ];

  return (
    <div className="about-container">
      <div className="about-header">
        <h1 className="about-title">Meet the Team</h1>
        <p className="about-subtitle">
          Built by students, for students. Helping COMSATS students excel academically.
        </p>
      </div>

      <div className="founder-card">
        <img src="/My-image.webp" alt="Mushtaq Ahmad Saqi" className="founder-avatar" />
        <div className="founder-info">
          <div className="founder-role">Founder & Lead Developer</div>
          <h3>Mushtaq Ahmad Saqi</h3>
          <p className="founder-bio">
            Dedicated to bridging the gap between academic pressure and digital efficiency.
            Designed and built this platform from scratch to ensure students have a distraction-free study environment.
          </p>
        </div>
      </div>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Contributors</h2>
      <div className="contributors-grid">
        {contributors.map((c, index) => (
          <div key={index} className="contributor-card">
            <img src={c.image} alt={c.name} className="contributor-avatar" />
            <div>
              <div className="contributor-name">{c.name}</div>
              <div className="contributor-role">{c.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
