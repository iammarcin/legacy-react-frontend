import { format, addDays } from 'date-fns';

import { getColor } from './color.helper';

// this is to process simple, non grouped data 
// there might be bars or lines
const processNonGroupedDataForGraph = (data, keys, transformFunctions, colors, labels, chartTypes, isHidden, yAxisIDs = []
) => {
  const dates = data.map(entry => entry.calendar_date);
  // Prepare the data for the chart
  const datasets = keys.map((key, index) => ({
    type: chartTypes[index],
    label: labels[index],
    data: data.map(entry => transformFunctions[index](entry[key])),
    backgroundColor: chartTypes[index] === 'bar' ? getColor(colors[index], 0.8) : undefined,
    borderColor: chartTypes[index] === 'line' ? getColor(colors[index], 0.8) : undefined,
    fill: chartTypes[index] === 'line',
    tension: chartTypes[index] === 'line' ? 0.1 : undefined,
    yAxisID: yAxisIDs[index] || 'y',
    pointRadius: chartTypes[index] === 'line' ? 1 : undefined,
    hidden: isHidden[index] || false,
  }));

  return {
    labels: dates,
    datasets: datasets,
  };
};


// function to process data for specific categories - where we want to group them by specific key (like activities grouped by activity_type)
// important secondaryKey = null, valueKey = null
// by default null - because in most cases we won't use it
// secondaryKey - because sometimes we want to group data by specific key (like activity_type)
// valueKey - because sometimes we want to sum values for specific key (like distance per activity_type)
// and also - if secondaryKey is there but valueKey is not - it means we want to count entries for specific key (like how many activities we have)
const groupAndProcessDataForGraph = (data, startDate, endDate, keys, transformFunction, colors, labels, secondaryKey = null, valueKey = null) => {
  // Generate all dates within the range to generate proper graph
  // there were cases where there were missing dates in the data and graph was incomplete (because there were less bars for example) - and hard to compare to others
  const generateDateRange = (start, end) => {
    const dates = [];
    let currentDate = start;

    while (currentDate <= end) {
      dates.push(format(currentDate, 'yyyy-MM-dd'));
      currentDate = addDays(currentDate, 1);
    }

    return dates;
  };

  const datesInRange = generateDateRange(startDate, endDate);
  // Initialize groupedData with all dates and zero values
  // if we need to group data by specific key (like secs_in_zone1 in ActivityHR) we can use this function
  // first we initialize with 0
  // and later we will be adding values here
  const groupedData = datesInRange.reduce((acc, date) => {
    acc[date] = keys.reduce((keyAcc, key) => {
      keyAcc[key] = 0;
      return keyAcc;
    }, {});
    return acc;
  }, {});

  // Group data by date and sum the values
  data.forEach(entry => {
    const date = entry.calendar_date;
    if (groupedData[date]) {
      keys.forEach(key => {
        groupedData[date][key] += entry[key] || 0;
      });
    }
  });

  data.forEach(entry => {
    const date = entry.calendar_date;
    if (groupedData[date]) {
      if (secondaryKey) {
        const key = entry[secondaryKey];
        if (key in groupedData[date]) {
          // if valueKey is there - we sum values, if not - we count entries
          groupedData[date][key] += valueKey ? (entry[valueKey] || 0) : 1;
        }
      } else {
        keys.forEach(key => {
          groupedData[date][key] += entry[key] || 0;
        });
      }
    }
  });

  // Prepare the data for the chart
  // transformFunctions is important here - because we can change data according to our needs (like divide by 1000)
  const chartData = {
    labels: datesInRange,
    datasets: keys.map((key, index) => ({
      type: 'bar',
      label: labels[index],
      data: datesInRange.map(date => transformFunction(groupedData[date][key])),
      backgroundColor: getColor(colors[index], 0.8),
      stack: 'Stack 0',
    })),
  };

  return chartData;
};


export { groupAndProcessDataForGraph, processNonGroupedDataForGraph };
