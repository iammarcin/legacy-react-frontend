// Hrv.js

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

import { processNonGroupedDataForGraph } from '../../../utils/health.data.process';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

const Hrv = ({ index, data, isFullWidth, isMobile, isModalOpen, onChartClick }) => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  });

  const chartRef = useRef(null);

  const processData = useCallback(() => {
    const keys = ['hrv_weekly_avg', 'hrv_last_night_avg', 'hrv_baseline_balanced_low', 'hrv_baseline_balanced_upper'];
    const transformFunctions = [value => value, value => value, value => value, value => value];
    const colors = ['red', 'violet', 'yellow_light', 'yellow_light'];
    const labels = ['Weekly Avg', 'Last Night Avg', 'Baseline Low', 'Baseline Up'];
    const chartTypes = ['line', 'line', 'line', 'line'];
    const yAxisIDs = ['y-left', 'y-left', 'y-left', 'y-left'];
    const isHidden = [false, true, false, false];

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
          text: 'HRV'
        },
        min: 30,
        max: 65,
        ticks: {
          font: {
            size: isMobile ? 8 : 12,
          },
          padding: isMobile ? 0 : 5,
        },
        beginAtZero: true
      },
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
        text: 'HRV',
      },
    },
  };

  return <Line ref={chartRef} data={chartData} options={options} />;
};

export default Hrv;