// UserSummaryIntensity.js

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

import { processNonGroupedDataForGraph } from '../../../utils/health.data.process';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

const UserSummaryIntensity = ({ index, data, isFullWidth, isMobile, isModalOpen, onChartClick }) => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  });

  const chartRef = useRef(null);

  const processData = useCallback(() => {
    const keys = ['vigorous_intensity_minutes', 'moderate_intensity_minutes', 'total_steps', 'total_distance_meters'];
    const transformFunctions = [value => value, value => value, value => value, value => value / 1000];
    const colors = ['violet', 'blue_dark', 'red', 'yellow_light'];
    const labels = ['Vigorous mins', 'Moderate mins', 'Total steps', 'Total distance'];
    const chartTypes = ['bar', 'bar', 'line', 'line'];
    const yAxisIDs = ['y', 'y', 'y-right', 'y-right'];
    const isHidden = [false, false, false, true];

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
        grid: {
          display: false
        },
        type: 'category'
      },
      y: {
        stacked: true,
        title: {
          display: isMobile ? false : true,
          text: 'Minutes'
        },
        min: 0,
        max: 500,
        ticks: {
          font: {
            size: isMobile ? 8 : 12,
          },
          padding: isMobile ? 0 : 5,
        },
      },
      'y-right': {
        type: 'linear',
        position: 'right',
        title: {
          display: isMobile ? false : true,
          text: 'Steps / Distance'
        },
        ticks: {
          font: {
            size: isMobile ? 8 : 12,
          },
          padding: isMobile ? 0 : 5,
          callback: function (value) {
            if (value >= 1000) {
              return (value / 1000) + 'k';
            }
            return value;
          }
        },
        grid: {
          drawOnChartArea: false
        },
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
        text: 'Daily Intensity',
      },
    },
  };

  return <Bar ref={chartRef} data={chartData} options={options} />;
};

export default UserSummaryIntensity;