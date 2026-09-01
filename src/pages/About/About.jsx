import React from 'react';
import './About.css';

const CONTRIBUTORS = [
  { name: 'Moeed Ali Syed', role: 'Active Contributor', image: '/Moeed.jpeg' },
  { name: 'M Umar Shafiq Somro', role: 'Active Contributor', image: '/Umar.png' },
  { name: 'Wazir M. Maikal', role: 'Active Contributor', image: '/wazir.jpeg' },
  { name: 'Syed Saifullah', role: 'Active Contributor', image: '/Saif.jpeg' }
];

export default function About() {
  return (
    <div className="about-container">
      {/* Header */}
      <div className="about-header">
        <div className="about-badge">
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>groups</span>
          Our Team
        </div>
        <h1 className="about-title">Meet the Team</h1>
        <p className="about-subtitle">
          Built by students, for students. We're passionate about helping COMSATS
          students excel academically through better tools.
        </p>
      </div>

      {/* Founder Card */}
      <div className="founder-card">
        <img
          src="/My-image.webp"
          alt="Mushtaq Ahmad Saqi"
          className="founder-avatar"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
        <div className="founder-info">
          <div className="founder-role-badge">
            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>star</span>
            Founder & Lead Developer
          </div>
          <h3>Mushtaq Ahmad Saqi</h3>
          <p className="founder-bio">
            Dedicated to bridging the gap between academic pressure and digital efficiency.
            Designed and built this platform from scratch to ensure students have a
            distraction-free, resource-rich study environment. Every feature is crafted
            with students' real needs in mind.
          </p>
        </div>
      </div>

      {/* Contributors */}
      <h2 className="contributors-title">Contributors</h2>
      <div className="contributors-grid">
        {CONTRIBUTORS.map((c, index) => (
          <div
            key={index}
            className="contributor-card"
            style={{ animationDelay: `${0.2 + index * 0.07}s` }}
          >
            <img
              src={c.image}
              alt={c.name}
              className="contributor-avatar"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=0ea5e9&color=fff&size=56`;
              }}
            />
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
