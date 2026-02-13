// CorrelationHeatmap.js

import React, { useState, useCallback, useContext } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Colors } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useSettings } from '../../hooks/useSettings';
import { triggerAPIRequest, extractResponseData } from '../../services/api.methods';
import { StateContext } from '../StateContextProvider';
import { formatDate } from '../../utils/misc';

import './css/CorrelationHeatmap.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Colors);

const CorrelationHeatmap = ({ startDate, endDate }) => {
  const getSettings = useSettings();

  const {
    correlationData, setCorrelationData,
    pValuesData, setPValuesData,
    correlationThreshold, setCorrelationThreshold,
    pValueThreshold, setPValueThreshold,
    isMobile
  } = useContext(StateContext);

  const [isLoading, setIsLoading] = useState(false);

  const fetchCorrelations = useCallback(async () => {
    setIsLoading(true);
    try {
      // important! mode correlation - means that some data (like sleep etc) will be shifted by 1 day
      // explained in get_garmin_data (in backend)
      const userInput = {
        "start_date": formatDate(startDate, 'ymd'),
        "end_date": formatDate(endDate, 'ymd'),
        "mode": "correlation"
      };

      const response = await triggerAPIRequest(
        "api/db",
        "provider.db",
        "analyze_correlations",
        userInput,
        getSettings
      );
      if (response.success) {
        const result = extractResponseData(response);
        setCorrelationData(result?.correlations ?? null);
        setPValuesData(result?.p_values ?? {});
      }
    } catch (error) {
      console.error('Error fetching correlations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, getSettings, setCorrelationData, setPValuesData]);

  const handleCorrelationThresholdChange = (e) => {
    const value = e.target.value;
    setCorrelationThreshold(value);
  }

  const handlePValueThresholdChange = (e) => {
    const value = e.target.value;
    setPValueThreshold(value);
  }

  // Correlation graph will be only generated if user clicks on button
  const renderChart = () => {
    if (!correlationData) return null;
    const correlations = correlationData;

    const filteredAndSortedCorrelations = Object.entries(correlations)
      .filter(([key, value]) => {
        const pValue = pValuesData[key];
        return Math.abs(value) > correlationThreshold && pValue <= pValueThreshold;
      })
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

    const labels = filteredAndSortedCorrelations.map(([key, _]) => key);
    const values = filteredAndSortedCorrelations.map(([_, value]) => value);

    const data = {
      labels: labels,
      datasets: [{
        label: 'Correlation with sleep score',
        data: values,
        backgroundColor: values.map(value =>
          value > 0 ? 'rgba(75, 192, 192, 0.6)' : 'rgba(255, 99, 132, 0.6)'
        ),
      }]
    };

    const options = {
      indexAxis: 'y',
      maintainAspectRatio: isMobile ? false : true,
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Correlation Coefficient',
          },
          ticks: {
            font: {
              size: isMobile ? 10 : 14
            }
          }
        },
        y: {
          ticks: {
            font: {
              size: isMobile ? 8 : 12
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.dataset.label || '';
              const value = context.raw != null ? context.raw.toFixed(2) : 'N/A';
              const pValue = pValuesData[context.label];
              const pValueText = pValue != null ? ` (p-value: ${pValue.toFixed(2)})` : '';
              return `${label}: ${value}${pValueText}`;
            }
          }
        },
        titleFont: {
          size: isMobile ? 10 : 14
        },
        bodyFont: {
          size: isMobile ? 10 : 14
        },
        legend: {
          display: false
        }
      }
    };

    return (
      <>
        <div className="correlations-threshold-switches">
          <div className="correlations-threshold option-item">
            <label>Correlation threshold</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={correlationThreshold}
              onChange={handleCorrelationThresholdChange}
            />
            <span>{correlationThreshold}</span>
          </div>
          <div className="correlations-threshold option-item">
            <label>p-Value threshold</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={pValueThreshold}
              onChange={handlePValueThresholdChange}
            />
            <span>{pValueThreshold}</span>
          </div>
        </div>
        <Bar data={data} options={options} />
      </>
    );
  };

  return (
    <div className="correlations-heatmap">
      <hr />
      <h2>Sleep correlations</h2>
      <button className="correlation-generate-button"
        onClick={fetchCorrelations}
        disabled={isLoading}
      >
        {isLoading ? 'Generating...' : 'Generate Correlations Graph'}
      </button>
      {isLoading && <p>Loading...</p>}

      <div className="correlations-chart-wrapper">
        {correlationData && renderChart()}
      </div>
    </div >
  );
};

export default CorrelationHeatmap;
