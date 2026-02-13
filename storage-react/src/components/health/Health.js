// Health.js

import React, { useEffect, useState, useRef, useCallback, useContext } from 'react';
import { StateContext } from '../StateContextProvider';
import { fetchGarminAnalysisOverview } from '../../services/api.methods';
import FloatingChat from './FloatingChat';
import SleepPhasesChart from './charts/SleepPhasesChart';
import SleepStartEndChart from './charts/SleepStartEndChart';
import SleepMetricsChart from './charts/SleepMetricsChart';
import UserSummaryIntensity from './charts/UserSummaryIntensity';
import UserSummaryStress from './charts/UserSummaryStress';
import TrainingStatusLoad from './charts/TrainingStatusLoad';
import BodyComposition from './charts/BodyComposition';
import BodyBattery from './charts/BodyBattery';
import EnduranceAndReadiness from './charts/EnduranceAndReadiness';
import CorrelationHeatmap from './CorrelationHeatmap';
import Hrv from './charts/Hrv';
import ActivityHR from './charts/ActivityHR';
import ActivityTime from './charts/ActivityTime';
import ActivityTypes from './charts/ActivityTypes';
import ActivityDistance from './charts/ActivityDistance';

import ChatImageModal from '../ChatImageModal';
import TopMenu from '../TopMenu';

import { formatDate } from '../../utils/misc';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './css/Health.css';

// setting initial date (today - 1 month)
// and day -1 (not to handle data till today but till yesterday) as sometimes data from today is not there
const getInitialDate = () => {
  const now = new Date();
  const previousMonthDate = new Date(now.setMonth(now.getMonth() - 1));
  previousMonthDate.setDate(previousMonthDate.getDate() - 1); // Shift day by -1
  return previousMonthDate;
};
const getAdjustedTodayDate = () => {
  const today = new Date();
  today.setDate(today.getDate() - 1); // Shift day by -1
  return today;
};

const Health = () => {
  const {
    setHealthData,
    isMobile
  } = useContext(StateContext);

  const [sleepData, setSleepData] = useState([]);
  const [userSummaryData, setUserSummaryData] = useState([]);
  const [trainingStatusData, setTrainingStatusData] = useState([]);
  const [enduranceAndReadinessData, setEnduranceAndReadinessData] = useState([]);
  const [hrvData, setHrvData] = useState([]);
  const [bodyCompositionData, setBodyCompositionData] = useState([]);
  const [bodyBatteryData, setBodyBatteryData] = useState([]);
  const [activitiesData, setActivitiesData] = useState([]);
  const [isError, setIsError] = useState(false);
  const [dateRange, setDateRange] = useState([getInitialDate(), getAdjustedTodayDate()]);
  const [startDate, endDate] = dateRange;
  const hasFetchedData = useRef(false);
  const [isFullWidth, setIsFullWidth] = useState(isMobile ? true : false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentChartIndex, setCurrentChartIndex] = useState(0);

  const fetchAnalysisData = useCallback(async (start, end) => {
    const startDate = formatDate(start, 'ymd');
    const endDate = formatDate(end, 'ymd');

    const response = await fetchGarminAnalysisOverview({
      startDate,
      endDate,
      mode: 'correlation',
      includeOptimized: true,
    });

    if (!response.success) {
      const errorMessage = response.message;
      throw new Error(errorMessage || 'Failed to fetch Garmin analysis data');
    }

    const payload = response.data;

    if (!payload) {
      throw new Error('No data received');
    }

    const datasets = payload.datasets || {};
    if (payload.optimized !== undefined) {
      return { ...datasets, optimized: payload.optimized };
    }
    return datasets;
  }, []);

  const fetchData = useCallback(async (start, end) => {
    try {
      const allDataForAnalysis = await fetchAnalysisData(start, end);

      setHealthData(allDataForAnalysis);

      setHrvData(allDataForAnalysis.get_hrv_data || []);

      // now we need to merge data for readiness and endurance score - because we want to show it on single chart
      const trainingReadinessData = allDataForAnalysis.get_training_readiness || [];
      const enduranceScoreData = allDataForAnalysis.get_endurance_score || [];
      if (!trainingReadinessData || !enduranceScoreData) {
        throw new Error('No data received');
      }
      const mergedData = trainingReadinessData.map((entry, index) => ({
        calendar_date: entry.calendar_date,
        readiness_score: entry.training_readiness_score,
        endurance_score: enduranceScoreData[index]?.endurance_score || 0,
      }));
      setEnduranceAndReadinessData(mergedData);

      const summaryData = allDataForAnalysis.get_user_summary || [];
      const sleepDataset = allDataForAnalysis.get_sleep_data || [];

      const mergedBodyBatteryData = summaryData.map((entry) => {
        // Find the corresponding sleep data entry by calendar_date
        const sleepDataForDate = sleepDataset.find(
          (sleepEntry) => sleepEntry.calendar_date === entry.calendar_date
        );

        return {
          calendar_date: entry.calendar_date,
          body_battery_highest_value: entry.body_battery_highest_value,
          body_battery_lowest_value: entry.body_battery_lowest_value,
          sleep_body_battery_change: sleepDataForDate?.sleep_body_battery_change,
        };
      });

      setBodyBatteryData(mergedBodyBatteryData);

      setSleepData(sleepDataset);

      setUserSummaryData(summaryData);

      setTrainingStatusData(allDataForAnalysis.get_training_status || []);

      setBodyCompositionData(allDataForAnalysis.get_body_composition || []);

      setActivitiesData(allDataForAnalysis.get_activities || []);

    } catch (error) {
      console.error('Error fetching data: ', error);
      setIsError(true);
    }
  }, [setHealthData, fetchAnalysisData]);

  useEffect(() => {
    if (!hasFetchedData.current && startDate && endDate) {
      fetchData(startDate, endDate);
      hasFetchedData.current = true;
    }
  }, [fetchData, startDate, endDate]);

  const handleDateChange = (update) => {
    setDateRange(update);
    if (update[0] && update[1]) {
      fetchData(update[0], update[1]);
    }
  };

  const setPresetRange = (type) => {
    const end = new Date();
    let start = new Date();

    switch (type) {
      case 'YTD':
        start.setMonth(0);
        start.setDate(1);
        break;
      case 'currentWeek':
        start.setDate(end.getDate() - 7);
        break;
      case 'previousWeek':
        start.setDate(end.getDate() - 14);
        end.setDate(end.getDate() - 7);
        break;
      case 'currentMonth':
        start.setMonth(end.getMonth() - 1);
        break;
      case 'previousMonth':
        end.setMonth(end.getMonth() - 1);
        start.setMonth(end.getMonth() - 1);
        break;
      default:
        break;
    }

    setDateRange([start, end]);
    fetchData(start, end);
  };

  const toggleChartSize = () => {
    setIsFullWidth(!isFullWidth);
  };

  const openModal = (index) => {
    setCurrentChartIndex(index);
    setIsModalOpen(true);
  };

  // this is to differentiate if legend was click (so for example Deep sleep in sleep phases)
  // because then we don't want to open modal - we just want to enable/disable this element
  // for any other place in chart - we want to open modal
  const handleChartClick = (clickType, index = 0) => {
    if (clickType !== 'legend') {
      // Chart area or data point was clicked
      openModal(index);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const nextChart = () => {
    setCurrentChartIndex((currentChartIndex + 1) % charts.length);
  };

  const prevChart = () => {
    setCurrentChartIndex((currentChartIndex - 1 + charts.length) % charts.length);
  };

  var charts = [];
  if (!isError) {
    charts = [
      <SleepPhasesChart index={0} data={sleepData} isFullWidth={isFullWidth} key="Daily Sleep Stages" isMobile={isMobile} isModalOpen={isModalOpen} onChartClick={handleChartClick} />,
      <SleepStartEndChart index={1} data={sleepData} isFullWidth={isFullWidth} key="Sleep start / end" isMobile={isMobile} isModalOpen={isModalOpen} onChartClick={handleChartClick} />,
      <SleepMetricsChart index={2} data={sleepData} isFullWidth={isFullWidth} key="Sleep metrics" isMobile={isMobile} isModalOpen={isModalOpen} onChartClick={handleChartClick} />,
      <UserSummaryIntensity index={3} data={userSummaryData} isFullWidth={isFullWidth} key="Daily Intensity" isMobile={isMobile} isModalOpen={isModalOpen} onChartClick={handleChartClick} />,
      <UserSummaryStress index={4} data={userSummaryData} isFullWidth={isFullWidth} key="Daily Stress" isMobile={isMobile} isModalOpen={isModalOpen} onChartClick={handleChartClick} />,
      <TrainingStatusLoad index={5} data={trainingStatusData} isFullWidth={isFullWidth} key="Training Status Load" isMobile={isMobile} isModalOpen={isModalOpen} onChartClick={handleChartClick} />,
      <BodyBattery index={6} data={bodyBatteryData} isFullWidth={isFullWidth} key="Body Battery" isMobile={isMobile} isModalOpen={isModalOpen} onChartClick={handleChartClick} />,
      <EnduranceAndReadiness index={7} data={enduranceAndReadinessData} isFullWidth={isFullWidth} key="Endurance and Readiness" isMobile={isMobile} isModalOpen={isModalOpen} onChartClick={handleChartClick} />,
      <ActivityHR index={8} data={activitiesData} startDate={startDate} endDate={endDate} isFullWidth={isFullWidth} key="Training HR" isMobile={isMobile} isModalOpen={isModalOpen} onChartClick={handleChartClick} />,
      <ActivityTime index={9} data={activitiesData} startDate={startDate} endDate={endDate} isFullWidth={isFullWidth} key="Training Time" isMobile={isMobile} isModalOpen={isModalOpen} onChartClick={handleChartClick} />,
      <ActivityDistance index={10} data={activitiesData} startDate={startDate} endDate={endDate} isFullWidth={isFullWidth} key="Training Distance" isMobile={isMobile} isModalOpen={isModalOpen} onChartClick={handleChartClick} />,
      <ActivityTypes index={11} data={activitiesData} startDate={startDate} endDate={endDate} isFullWidth={isFullWidth} key="Training Types" isMobile={isMobile} isModalOpen={isModalOpen} onChartClick={handleChartClick} />,
      <Hrv index={12} data={hrvData} isFullWidth={isFullWidth} key="HRV" isMobile={isMobile} isModalOpen={isModalOpen} onChartClick={handleChartClick} />,
      <BodyComposition index={13} data={bodyCompositionData} isFullWidth={isFullWidth} key="Body Composition" isMobile={isMobile} isModalOpen={isModalOpen} onChartClick={handleChartClick} />,
    ];
  }

  return (
    <div className="layout">
      <TopMenu
        onNewChatClicked={() => { }}
        toggleSidebar={() => { }} // empty on purpose - because toggle sidebar only needed in Main.js
        mode="health"
      />
      <div className="health-container">

        <h2>Your Health stats</h2>
        <div className="date-picker-container">
          <DatePicker
            selectsRange={true}
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateChange}
            dateFormat="yyyy-MM-dd"
            className="custom-datepicker"
          />
        </div>
        <div className="health-button-container">
          <button className="health-button-preset-date" onClick={() => setPresetRange('YTD')}>YTD</button>
          <button className="health-button-preset-date" onClick={() => setPresetRange('currentWeek')}>Current Week</button>
          <button className="health-button-preset-date" onClick={() => setPresetRange('previousWeek')}>Previous Week</button>
          <button className="health-button-preset-date" onClick={() => setPresetRange('currentMonth')}>Current Month</button>
          <button className="health-button-preset-date" onClick={() => setPresetRange('previousMonth')}>Previous Month</button>
        </div>
        {!isMobile && (
          <div className="health-button-container">
            <button className="health-button-toggle" onClick={toggleChartSize}>
              {isFullWidth ? 'Small Graphs' : 'Full screen graphs'}
            </button>
          </div>
        )}
        {isError ? (
          <div className="error-message">Error fetching data. Please try again later.</div>
        ) : (
          <div className={`charts-container ${isFullWidth ? 'full-width' : 'small-graphs'}`}>
            {charts.map((chart, index) => (
              <div key={index + "m"}>
                <h4 key={index + "n"} className="chart-title">{chart.key}</h4>
                <div key={index} className="chart-wrapper">
                  {chart}
                </div>
              </div>
            ))}
          </div>
        )}
        <CorrelationHeatmap startDate={startDate} endDate={endDate} />
        {isModalOpen && (
          <ChatImageModal
            images={charts}
            currentIndex={currentChartIndex}
            onClose={closeModal}
            onNext={nextChart}
            onPrev={prevChart}
            isChart={true}
          />
        )}
        <FloatingChat />
      </div>
    </div>
  );
};

export default Health;