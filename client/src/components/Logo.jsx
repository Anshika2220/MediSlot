// client/src/components/Logo.jsx
export default function Logo({ size = 'md', showSubtitle = true }) {
  const iconSizes = {
    sm: 28,
    md: 36,
    lg: 48,
  };

  const textSizes = {
    sm: '1.1rem',
    md: '1.35rem',
    lg: '1.8rem',
  };

  const pixel = iconSizes[size] || 36;

  return (
    <div className="flex items-center gap-3 select-none">
      <svg
        width={pixel}
        height={pixel}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform hover:scale-105"
      >
        {/* Surface background */}
        <rect width="48" height="48" rx="12" fill="#222222" stroke="#393939" strokeWidth="2" />

        {/* Slot Grid Calendar Base */}
        <rect x="10" y="11" width="28" height="26" rx="5" fill="#282828" stroke="#393939" strokeWidth="1.5" />
        <path d="M10 18h28" stroke="#393939" strokeWidth="1.5" />

        {/* Top Rings in Orchid Yellow */}
        <circle cx="17" cy="11" r="1.5" fill="#D6C65A" />
        <circle cx="31" cy="11" r="1.5" fill="#D6C65A" />

        {/* Medical Cross in Accent */}
        <path d="M24 22v10M19 27h10" stroke="#D6C65A" strokeWidth="2.5" strokeLinecap="round" />

        {/* Status Dot */}
        <circle cx="37" cy="11" r="2" fill="#D6C65A" />
      </svg>

      <div className="flex flex-col">
        <span
          style={{
            fontSize: textSizes[size] || '1.35rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#F2F2F2',
            lineHeight: 1.1,
          }}
        >
          Medi<span style={{ color: '#D6C65A' }}>Slot</span>
        </span>
        {showSubtitle && (
          <span
            style={{
              fontSize: '0.68rem',
              color: '#A0A0A0',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontWeight: 500,
              marginTop: '2px',
            }}
          >
            Clinic Booking & AI
          </span>
        )}
      </div>
    </div>
  );
}
