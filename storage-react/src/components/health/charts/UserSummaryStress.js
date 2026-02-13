// UserSummaryStress.js

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

import { processNonGroupedDataForGraph } from '../../../utils/health.data.process';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

const UserSummaryStress = ({ index, data, isFullWidth, isMobile, isModalOpen, onChartClick }) => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  });

  const chartRef = useRef(null);

  const processData = useCallback(() => {
    const keys = ['high_stress_duration', 'medium_stress_duration', 'low_stress_duration', 'rest_stress_duration', 'activity_stress_duration', 'uncategorized_stress_duration', 'average_stress_level'];
    const transformFunctions = [value => value / 60, value => value / 60, value => value / 60, value => value / 60, value => value / 60, value => value / 60, value => value];
    const colors = ['violet', 'blue_dark', 'green_mid', 'yellow_dark', 'gray_light', 'pink', 'red'];
    const labels = ['High', 'Medium', 'Low', 'Rest', 'Activity', 'Uncategorized', 'Average Stress Level'];
    const chartTypes = ['bar', 'bar', 'bar', 'bar', 'bar', 'bar', 'line'];
    const yAxisIDs = ['y', 'y', 'y', 'y', 'y', 'y', 'y-right'];
    const isHidden = [false, false, false, false, false, false, false];

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
          text: 'Stress'
        },
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
          text: 'Average'
        },
        ticks: {
          stepSize: 20,
          font: {
            size: isMobile ? 8 : 12,
          },
          padding: isMobile ? 0 : 5,
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
        text: 'Daily Stress',
      },
    },
  };

  return <Bar ref={chartRef} data={chartData} options={options} />;
};

export default UserSummaryStress;