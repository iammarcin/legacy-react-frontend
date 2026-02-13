import React from 'react';
import './css/ChartUI.css';

const CHART_TYPE_LABELS = {
  bar: 'bar chart',
  line: 'line chart',
  pie: 'pie chart',
  area: 'area chart',
  scatter: 'scatter plot',
  mermaid: 'diagram'
};

export default function ChartLoadingIndicator({ chartType, title }) {
  const label = CHART_TYPE_LABELS[chartType] || 'visualization';

  return (
    <div className="chart-loading-indicator">
      <div className="chart-loading-indicator__icon" aria-hidden>
        <svg viewBox="0 0 24 24" className="chart-loading-indicator__icon-svg">
          <path
            d="M6 20v-7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7h2V4h3v16h3V8h2v12h2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="chart-loading-indicator__text">
        <p>Generating {label}...</p>
        {title && <span>{title}</span>}
      </div>
      <div className="chart-loading-indicator__spinner" aria-hidden>
        <span />
      </div>
    </div>
  );
}
