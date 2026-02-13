import React from 'react';

function formatDataSource(source) {
  if (!source) return null;

  const sourceLabels = {
    garmin_db: 'Garmin Health Data',
    blood_db: 'Blood Test Results',
    ufc_db: 'UFC Statistics',
    semantic_search: 'Search Results',
    llm_generated: 'AI Generated',
  };

  return sourceLabels[source] || source;
}

function formatTimestamp(isoString) {
  if (!isoString) return null;
  try {
    const date = new Date(isoString);
    return date.toLocaleString();
  } catch {
    return null;
  }
}

export default function ChartContainer({
  title,
  subtitle,
  dataSource,
  generatedAt,
  children,
  className = '',
}) {
  const formattedSource = formatDataSource(dataSource);
  const formattedTime = formatTimestamp(generatedAt);

  return (
    <div className={`chart-container ${className}`}>
      <div className="chart-container__header">
        <h3 className="chart-container__title">{title}</h3>
        {subtitle && <p className="chart-container__subtitle">{subtitle}</p>}
      </div>

      <div className="chart-container__body">{children}</div>

      {(formattedSource || formattedTime) && (
        <div className="chart-container__meta">
          {formattedSource && <span>Source: {formattedSource}</span>}
          {formattedTime && <span>Generated: {formattedTime}</span>}
        </div>
      )}
    </div>
  );
}
