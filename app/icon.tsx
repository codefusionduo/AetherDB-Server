import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 20,
          background: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          border: '1.5px solid rgba(168, 85, 247, 0.6)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 0 10px rgba(168, 85, 247, 0.4)',
        }}
      >
        {/* Glow Aura */}
        <div
          style={{
            position: 'absolute',
            width: '24px',
            height: '24px',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.6) 0%, rgba(6, 182, 212, 0.2) 60%, transparent 80%)',
            borderRadius: '50%',
          }}
        />

        {/* Suku AI Mascot SVG */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Bot Head */}
          <rect
            x="3"
            y="5"
            width="18"
            height="14"
            rx="4"
            fill="url(#sukuGrad)"
            stroke="#c084fc"
            strokeWidth="1.2"
          />
          {/* Antenna */}
          <line x1="12" y1="2" x2="12" y2="5" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="2" r="1.2" fill="#38bdf8" />
          {/* Left Eye */}
          <circle cx="8" cy="11" r="1.8" fill="#38bdf8" />
          {/* Right Eye */}
          <circle cx="16" cy="11" r="1.8" fill="#38bdf8" />
          {/* Smile / Neural wave */}
          <path
            d="M9 15C10 16.2 14 16.2 15 15"
            stroke="#34d399"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="sukuGrad" x1="3" y1="5" x2="21" y2="19" gradientUnits="userSpaceOnUse">
              <stop stopColor="#581c87" />
              <stop offset="0.5" stopColor="#3b0764" />
              <stop offset="1" stopColor="#0f172a" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
