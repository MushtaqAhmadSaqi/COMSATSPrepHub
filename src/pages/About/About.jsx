import React from 'react';
import PageHeader from '../../components/PageHeader/PageHeader';
import './About.css';

const CONTRIBUTORS = [
  { name: 'Moeed Ali Syed', role: 'Active Contributor', image: '/Moeed.jpeg' },
  { name: 'M Umar Shafiq Somro', role: 'Active Contributor', image: '/Umar.png' },
  { name: 'Wazir M. Maikal', role: 'Active Contributor', image: '/wazir.jpeg' },
  { name: 'Syed Saifullah', role: 'Active Contributor', image: '/Saif.jpeg' }
];

/* Target aspect ratios for team photos — prevents CLS */
const PHOTO_SIZE = { width: 56, height: 56 };
const FOUNDER_SIZE = { width: 120, height: 120 };

export default function About() {
  return (
    <div className="about-container">
      <PageHeader
        badge="Our Team"
        title="Meet the Team"
        subtitle="Built by students, for students. We're passionate about helping COMSATS students excel academically through better tools."
      />

      {/* Founder Card */}
      <div className="founder-card">
        <img
          src="/My-image.webp"
          alt="Mushtaq Ahmad Saqi — Founder & Lead Developer"
          className="founder-avatar"
          width={FOUNDER_SIZE.width}
          height={FOUNDER_SIZE.height}
          decoding="async"
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
              alt={`${c.name} — ${c.role}`}
              className="contributor-avatar"
              width={PHOTO_SIZE.width}
              height={PHOTO_SIZE.height}
              loading="lazy"
              decoding="async"
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
