import React from 'react';
import './css/ChartUI.css';

export default function ChartErrorDisplay({ error, chartType, title, onDismiss }) {
  if (!error) {
    return null;
  }

  return (
    <div className="chart-error">
      <div className="chart-error__icon" aria-hidden>
        <svg viewBox="0 0 24 24">
          <path
            d="M12 8v4m0 4h.01M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="chart-error__content">
        <p className="chart-error__title">
          Failed to generate {title || chartType || 'chart'}
        </p>
        <p className="chart-error__message">{error}</p>
      </div>
      {onDismiss && (
        <button type="button" className="chart-error__dismiss" onClick={onDismiss} aria-label="Dismiss chart error">
          ×
        </button>
      )}
    </div>
  );
}
