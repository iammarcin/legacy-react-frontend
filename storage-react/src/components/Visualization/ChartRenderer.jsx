import React, { useMemo, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const DEFAULT_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F97316',
];

function extractNumericValue(value) {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === 'object' && value !== null) {
    if (typeof value.y === 'number' && !Number.isNaN(value.y)) return value.y;
    if (typeof value.value === 'number' && !Number.isNaN(value.value)) return value.value;
    if (typeof value.amount === 'number' && !Number.isNaN(value.amount)) return value.amount;
    if (typeof value.count === 'number' && !Number.isNaN(value.count)) return value.count;
  }
  return null;
}

function transformData(chartData) {
  if (!chartData || !chartData.datasets || chartData.datasets.length === 0) {
    return [];
  }

  const { labels, datasets } = chartData;

  if (labels && labels.length > 0) {
    return labels.map((label, index) => {
      const point = { name: label };
      datasets.forEach((dataset) => {
        const value = dataset.data[index];
        const numericValue = extractNumericValue(value);
        point[dataset.label] = numericValue ?? 0;
      });
      return point;
    });
  }

  return datasets[0].data.map((item, index) => {
    if (typeof item === 'object') {
      const numericValue = extractNumericValue(item.y ?? item.value ?? item.count ?? item.amount);
      return {
        x: item.x,
        y: numericValue ?? 0,
        name: item.label || item.name || `Point ${index}`,
      };
    }
    const numericValue = extractNumericValue(item);
    return { name: `Point ${index}`, value: numericValue ?? 0 };
  });
}

function getColors(datasets, customColors) {
  return datasets.map((dataset, index) => {
    if (dataset.color) return dataset.color;
    if (customColors && customColors[index]) return customColors[index];
    return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__title">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} style={{ color: entry.color }} className="chart-tooltip__row">
          {entry.name}: {entry.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

function BarChartRenderer({ data, datasets, options, colors }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data}>
        {options.show_grid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" />}
      <XAxis
        dataKey="name"
        stroke="#9CA3AF"
        tick={{ fill: '#9CA3AF' }}
        label={
          options.x_axis_label
            ? { value: options.x_axis_label, position: 'bottom', fill: '#9CA3AF' }
            : null
        }
      />
      <YAxis
        stroke="#9CA3AF"
        tick={{ fill: '#9CA3AF' }}
        label={
          options.y_axis_label
            ? {
                value: options.y_axis_label,
                angle: -90,
                position: 'insideLeft',
                fill: '#9CA3AF',
              }
            : null
        }
      />
      {options.interactive && <Tooltip content={<CustomTooltip />} />}
      {options.show_legend && <Legend />}
      {datasets.map((dataset, index) => (
        <Bar
          key={dataset.label}
          dataKey={dataset.label}
          fill={colors[index]}
          stackId={options.stacked ? 'stack' : undefined}
        />
      ))}
    </BarChart>
    </ResponsiveContainer>
  );
}

function LineChartRenderer({ data, datasets, options, colors }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data}>
        {options.show_grid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" />}
      <XAxis
        dataKey="name"
        stroke="#9CA3AF"
        tick={{ fill: '#9CA3AF' }}
        label={
          options.x_axis_label
            ? { value: options.x_axis_label, position: 'bottom', fill: '#9CA3AF' }
            : null
        }
      />
      <YAxis
        stroke="#9CA3AF"
        tick={{ fill: '#9CA3AF' }}
        label={
          options.y_axis_label
            ? {
                value: options.y_axis_label,
                angle: -90,
                position: 'insideLeft',
                fill: '#9CA3AF',
              }
            : null
        }
      />
      {options.interactive && <Tooltip content={<CustomTooltip />} />}
      {options.show_legend && <Legend />}
      {datasets.map((dataset, index) => (
        <Line
          key={dataset.label}
          type="monotone"
          dataKey={dataset.label}
          stroke={colors[index]}
          strokeWidth={2}
          dot={{ fill: colors[index], strokeWidth: 2 }}
          activeDot={{ r: 6 }}
        />
      ))}
    </LineChart>
    </ResponsiveContainer>
  );
}

function AreaChartRenderer({ data, datasets, options, colors }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data}>
        {options.show_grid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" />}
      <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
      <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
      {options.interactive && <Tooltip content={<CustomTooltip />} />}
      {options.show_legend && <Legend />}
      {datasets.map((dataset, index) => (
        <Area
          key={dataset.label}
          type="monotone"
          dataKey={dataset.label}
          stroke={colors[index]}
          fill={colors[index]}
          fillOpacity={0.3}
          stackId={options.stacked ? 'stack' : undefined}
        />
      ))}
    </AreaChart>
    </ResponsiveContainer>
  );
}

function PieChartRenderer({ data, datasets, options }) {
  const sliceColors =
    options.colors && options.colors.length ? options.colors : DEFAULT_COLORS;

  const pieData = data.map((item, index) => {
    const datasetLabel = datasets[0]?.label;
    const rawValue =
      (datasetLabel ? item[datasetLabel] : undefined) ??
      Object.values(item).find((v) => extractNumericValue(v) !== null);
    const numericValue = extractNumericValue(rawValue) ?? 0;
    return {
      name: item.name,
      value: numericValue,
      color: sliceColors[index % sliceColors.length],
    };
  });

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={pieData}
        cx="50%"
        cy="50%"
        innerRadius={60}
        outerRadius={100}
        paddingAngle={2}
        dataKey="value"
        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        labelLine={{ stroke: '#9CA3AF' }}
      >
        {pieData.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
      {options.interactive && <Tooltip content={<CustomTooltip />} />}
      {options.show_legend && <Legend />}
    </PieChart>
    </ResponsiveContainer>
  );
}

function ScatterChartRenderer({ data, datasets, options, colors }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ScatterChart>
        {options.show_grid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" />}
      <XAxis
        type="number"
        dataKey="x"
        stroke="#9CA3AF"
        tick={{ fill: '#9CA3AF' }}
        label={
          options.x_axis_label
            ? { value: options.x_axis_label, position: 'bottom', fill: '#9CA3AF' }
            : null
        }
      />
      <YAxis
        type="number"
        dataKey="y"
        stroke="#9CA3AF"
        tick={{ fill: '#9CA3AF' }}
        label={
          options.y_axis_label
            ? {
                value: options.y_axis_label,
                angle: -90,
                position: 'insideLeft',
                fill: '#9CA3AF',
              }
            : null
        }
      />
      {options.interactive && <Tooltip content={<CustomTooltip />} />}
      {options.show_legend && <Legend />}
      <Scatter name={datasets[0]?.label || 'Data'} data={data} fill={colors[0]} />
    </ScatterChart>
    </ResponsiveContainer>
  );
}

export default function ChartRenderer({ chartType, data: chartData, options = {} }) {
  const mergedOptions = {
    interactive: true,
    show_legend: true,
    show_grid: true,
    stacked: false,
    show_values: false,
    ...options,
  };

  const transformedData = useMemo(() => transformData(chartData), [chartData]);
  const colors = useMemo(
    () => getColors(chartData?.datasets || [], options?.colors),
    [chartData, options?.colors]
  );
  const datasets = chartData?.datasets || [];

  const chartProps = {
    data: transformedData,
    datasets,
    options: mergedOptions,
    colors,
  };

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return <BarChartRenderer {...chartProps} />;
      case 'line':
        return <LineChartRenderer {...chartProps} />;
      case 'area':
        return <AreaChartRenderer {...chartProps} />;
      case 'pie':
        return <PieChartRenderer {...chartProps} />;
      case 'scatter':
        return <ScatterChartRenderer {...chartProps} />;
      default:
        return <div className="chart-empty-state">Unsupported chart type: {chartType}</div>;
    }
  };

  useEffect(() => {
    console.log("[ChartRenderer] Render request", {
      chartType,
      datasetCount: chartData?.datasets?.length || 0,
      labelsCount: chartData?.labels?.length || 0,
    });
  }, [chartType, chartData]);

  if (!chartData || !chartData.datasets || chartData.datasets.length === 0) {
    console.log("[ChartRenderer] Missing chart data", { chartType, chartData });
    return <div className="chart-empty-state">No data available for chart</div>;
  }

  if (!transformedData || transformedData.length === 0) {
    console.log("[ChartRenderer] Transform produced no data", { chartType, chartData });
  } else {
    console.log("[ChartRenderer] Transformed data ready", {
      chartType,
      points: transformedData.length,
      preview: transformedData.slice(0, 5),
    });
  }

  return renderChart();
}
