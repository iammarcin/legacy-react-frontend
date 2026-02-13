// SleepMetricsChart.js

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, TimeScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { processNonGroupedDataForGraph } from '../../../utils/health.data.process';

ChartJS.register(TimeScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const SleepMetricsChart = ({ index, data, isFullWidth, isMobile, isModalOpen, onChartClick }) => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  });

  const chartRef = useRef(null);

  const processData = useCallback(() => {
    const keys = ['avg_sleep_stress', 'sleep_avg_overnight_hrv', 'sleep_resting_heart_rate', 'sleep_body_battery_change', 'sleep_average_respiration_value'];
    const transformFunctions = [value => value, value => value, value => value, value => value, value => value];
    const colors = ['red', 'blue_dark', 'orange', 'green_light', 'violet'];
    const labels = ['Avg Sleep Stress', 'Avg Overnight HRV', 'Resting Heart Rate', 'Body Battery Change', 'Average Respiration'];
    const chartTypes = ['line', 'line', 'line', 'line', 'line'];
    const yAxisIDs = ['y-left', 'y-left', 'y-left', 'y-left', 'y-left'];
    const isHidden = [false, false, true, true, true];

    const chartData = processNonGroupedDataForGraph(data, keys, transformFunctions, colors, labels, chartTypes, isHidden, yAxisIDs);

    setChartData(chartData);
  }, [data]);

  useEffect(() => {
    processData();
  }, [processData]);

  // depending of choice of full width in Health.js (do we want small or big charts), resize the chart
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.resize();
    }
  }, [isFullWidth]);

  const options = {
    responsive: true,
    maintainAspectRatio: isMobile ? false : true,
    scales: {
      x: {
        // display the x axis only on mobile if modal is open (or of course always when not on mobile)
        // not on mobile - when is full width (with small graphs we don't want it)
        display: isMobile ? isModalOpen ? true : false : isFullWidth ? true : isModalOpen ? true : false,
        stacked: true,
        title: {
          display: true,
          text: 'Date'
        },
        type: 'category'
      },
      'y-left': {
        type: 'linear',
        position: 'left',
        title: {
          display: isMobile ? false : true,
          text: 'Metrics'
        },
        ticks: {
          font: {
            size: isMobile ? 8 : 12,
          },
          padding: isMobile ? 0 : 5,
        },
        beginAtZero: true
      }
    },
    onClick: () => { // important to differentiate if legend was clicked or not
      onChartClick('chart', index);
    },
    plugins: {
      legend: {
        position: isMobile ? 'bottom' : 'top',
        labels: {
          boxWidth: 12,
          padding: 10
        },
        onClick: (event, legendItem, legend) => { // important to differentiate if legend was clicked or not
          // Custom legend click handler
          ChartJS.defaults.plugins.legend.onClick(event, legendItem, legend);
          onChartClick('legend', index);
        },
      },
      title: {
        display: false,
        text: 'Sleep metrics',
      },
    }
  }

  return <Line ref={chartRef} data={chartData} options={options} />;
};

export default SleepMetricsChart;
