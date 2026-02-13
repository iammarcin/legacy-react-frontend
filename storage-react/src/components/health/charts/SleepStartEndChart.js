// SleepStartEndChart.js

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, TimeScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import 'chartjs-adapter-date-fns';

import { processNonGroupedDataForGraph } from '../../../utils/health.data.process';

ChartJS.register(TimeScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const SleepStartEndChart = ({ index, data, isFullWidth, isMobile, isModalOpen, onChartClick }) => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  });

  const chartRef = useRef(null);

  const processData = useCallback(() => {
    const keys = ['sleep_start', 'sleep_end'];
    const transformFunctions = [value => {
      if (!value) return null;
      let [hours, minutes] = value.split(':').map(Number);
      if (hours < 17) hours += 24; // Adjust for next day if before 5 PM
      return hours + minutes / 60;
    }, value => {
      if (!value) return null;
      let [hours, minutes] = value.split(':').map(Number);
      hours += 24; // Always add 24 to ensure it's on the next day
      return hours + minutes / 60;
    }];
    const colors = ["green_dark", "red"];
    const labels = ['Sleep Start', 'Sleep End'];
    const chartTypes = ['line', 'line'];
    const yAxisIDs = ['y', 'y'];
    const isHidden = [false, false];

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
        // display the x axis on mobile only if modal is open 
        // not on mobile - when is full width (with small graphs we don't want it)
        display: isMobile ? isModalOpen ? true : false : isFullWidth ? true : isModalOpen ? true : false,
        type: 'category',
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        type: 'linear',
        min: 19,
        max: 34, // 10 AM next day
        ticks: {
          font: {
            size: isMobile ? 8 : 12,
          },
          padding: isMobile ? 0 : 5,
          stepSize: isMobile ? 2 : 1,
          callback: function (value) {
            value = value % 24;
            return value.toString().padStart(2, '0') + ':00';
          }
        },
        title: {
          display: isMobile ? false : true,
          text: 'Time of Day'
        }
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
        text: 'Sleep start / end',
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let value = context.parsed.y;
            let hours = Math.floor(value) % 24;
            let minutes = Math.round((value - Math.floor(value)) * 60);
            return `${context.dataset.label}: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          }
        }
      }
    }
  };

  return <Line ref={chartRef} data={chartData} options={options} />;
};

export default SleepStartEndChart;