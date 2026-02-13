/**
 * Inline Chart Parser for React
 *
 * Parses message text with [CHART:id] markers and returns ordered content blocks
 * for rendering charts inline within the message text.
 */

/**
 * Parse message text with inline [CHART:id] markers.
 *
 * @param {string} messageText - Raw message text with [CHART:id] markers
 * @param {Array} charts - Array of chart payloads from message.charts or chartPayloads
 * @returns {Array} Ordered array of content blocks:
 *   - { type: 'text', content: '...' }
 *   - { type: 'chart', chartId: '...', payload: {...} }
 */
export function parseInlineCharts(messageText, charts) {
  // Return single text block if no charts or empty text
  if (!messageText || !charts || charts.length === 0) {
    return [{ type: 'text', content: messageText || '' }];
  }

  // Create chart lookup by id (handle both chart_id and chartId naming)
  const chartMap = new Map();
  charts.forEach(chart => {
    const id = chart.chart_id || chart.chartId;
    if (id) chartMap.set(id, chart);
  });

  // Regex to match [CHART:chart_id] markers
  const markerRegex = /\[CHART:([^\]]+)\]/g;

  const blocks = [];
  let lastIndex = 0;

  for (const match of messageText.matchAll(markerRegex)) {
    const [fullMatch, chartId] = match;
    const markerStart = match.index;

    // Add text before this marker
    if (markerStart > lastIndex) {
      const textBefore = messageText.slice(lastIndex, markerStart);
      if (textBefore.trim()) {
        blocks.push({ type: 'text', content: textBefore });
      }
    }

    // Add chart block if we have the payload
    const chartPayload = chartMap.get(chartId);
    if (chartPayload) {
      blocks.push({ type: 'chart', chartId, payload: chartPayload });
      chartMap.delete(chartId); // Mark as used
    }

    lastIndex = markerStart + fullMatch.length;
  }

  // Add remaining text after last marker
  if (lastIndex < messageText.length) {
    const textAfter = messageText.slice(lastIndex);
    if (textAfter.trim()) {
      blocks.push({ type: 'text', content: textAfter });
    }
  }

  // Add any remaining charts without markers (backward compatibility)
  // These charts don't have inline markers, so append at end
  chartMap.forEach((payload, chartId) => {
    blocks.push({ type: 'chart', chartId, payload });
  });

  return blocks;
}

/**
 * Check if message text contains inline chart markers.
 *
 * @param {string} messageText - Message text to check
 * @returns {boolean} True if inline markers found
 */
export function hasInlineChartMarkers(messageText) {
  if (!messageText) return false;
  return /\[CHART:[^\]]+\]/.test(messageText);
}
