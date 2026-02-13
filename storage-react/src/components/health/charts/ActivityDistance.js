// ActivityDistance.js

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

import { groupAndProcessDataForGraph } from '../../../utils/health.data.process';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

const ActivityDistance = ({ index, data, startDate, endDate, isFullWidth, isMobile, isModalOpen, onChartClick }) => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  });

  const chartRef = useRef(null);

  const processData = useCallback(() => {
    const keys = ['road_biking', 'walking', 'hiking', 'running', 'swimming', 'pilates', 'strength_training', 'kayaking_v2'];
    const transformFunction = value => value / 1000;
    const colors = ['red_dark', 'green_light', 'green_dark', 'violet', 'blue_light', 'purple', 'khaki_dark', 'orange'];
    const labels = ['Road Biking', 'Walking', 'Hiking', 'Running', 'Swimming', 'Pilates', 'Strength Training', 'Kayaking'];

    const chartData = groupAndProcessDataForGraph(data, startDate, endDate, keys, transformFunction, colors, labels, 'activity_type', 'activity_distance');
    setChartData(chartData);
  }, [data, startDate, endDate]);

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
          text: 'Distance [km]'
        },
        ticks: {
          font: {
            size: isMobile ? 8 : 12,
          },
          padding: isMobile ? 0 : 5,
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
        text: 'Activity time',
      },
    },
  };

  return <Bar ref={chartRef} data={chartData} options={options} />;
};

export default ActivityDistance;