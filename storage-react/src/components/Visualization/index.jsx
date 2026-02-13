import React, { memo } from 'react';
import ChartRenderer from './ChartRenderer';
import MermaidRenderer from './MermaidRenderer';
import ChartContainer from './ChartContainer';
import './visualization.css';

function Visualization({ chartPayload }) {
  if (!chartPayload) {
    return null;
  }

  const {
    chart_type,
    title,
    subtitle,
    data,
    mermaid_code,
    options = {},
    data_source,
    generated_at,
  } = chartPayload;

  if (chart_type === 'mermaid') {
    return (
      <ChartContainer
        title={title}
        subtitle={subtitle}
        dataSource={data_source}
        generatedAt={generated_at}
      >
        <MermaidRenderer code={mermaid_code} />
      </ChartContainer>
    );
  }

  return (
    <ChartContainer
      title={title}
      subtitle={subtitle}
      dataSource={data_source}
      generatedAt={generated_at}
    >
      <ChartRenderer chartType={chart_type} data={data} options={options} />
    </ChartContainer>
  );
}

// Memoize to prevent re-renders when parent updates
export default memo(Visualization, (prevProps, nextProps) => {
  return prevProps.chartPayload?.chart_id === nextProps.chartPayload?.chart_id;
});

export { ChartRenderer, MermaidRenderer, ChartContainer };
