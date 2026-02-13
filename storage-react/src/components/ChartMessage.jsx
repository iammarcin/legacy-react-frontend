import React, { memo } from 'react';
import Visualization from './Visualization';
import './css/ChartUI.css';
import config from '../config';

function ChartMessage({ chartPayload }) {
  if (!chartPayload) {
    return null;
  }

  if (config.VERBOSE_SUPERB === 1) {
    console.log('[ChartMessage] Rendering chart payload', chartPayload);
  }

  return (
    <div className="chart-message">
      <Visualization chartPayload={chartPayload} />
    </div>
  );
}

// Memoize to prevent re-renders when parent chatContent updates
// Only re-render if chartPayload actually changes
export default memo(ChartMessage, (prevProps, nextProps) => {
  // Return true if props are equal (skip re-render)
  // Compare by chart_id for stable identity
  return prevProps.chartPayload?.chart_id === nextProps.chartPayload?.chart_id;
});
