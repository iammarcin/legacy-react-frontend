import React, { useState, useEffect, useRef, useContext } from 'react';
import { fetchBloodTests } from '../services/api.methods';
import { isOutOfRange } from './BloodTests.helpers';
import { StateContext } from './StateContextProvider';
import FloatingChat from './health/FloatingChat';
import './css/BloodTests.css';

const BloodTests = () => {
  const { setHealthData } = useContext(StateContext);
  const [bloodTestData, setBloodTestData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({
    x: 0,
    y: 0,
    position: '',
    transform: ''
  });
  const [tooltipContent, setTooltipContent] = useState(null);
  const [modalContent, setModalContent] = useState(null);
  const [highlightOutOfRange, setHighlightOutOfRange] = useState(false);
  const tooltipTimeoutRef = useRef(null);

  useEffect(() => {
    // Clear any existing timeout when the active tooltip changes or disappears.
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }

    // Define the function to handle clicks outside the test name cells.
    const handleOutsideClick = (event) => {
      if (
        !event.target.closest('.test-name-cell') &&
        !event.target.closest('.floating-tooltip')
      ) {
        setActiveTooltip(null);
      }
    };

    // If a tooltip is active, set a timeout to hide it and add an event listener for outside clicks.
    if (activeTooltip) {
      tooltipTimeoutRef.current = setTimeout(() => {
        setActiveTooltip(null);
      }, 15000); // 15 seconds

      document.addEventListener('mousedown', handleOutsideClick);
    }

    // Cleanup function to remove the event listener and clear the timeout when the component unmounts or the effect re-runs.
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, [activeTooltip]);

  useEffect(() => {
    const loadBloodTests = async () => {
      setIsLoading(true);
      setIsError(false);
      try {
        const response = await fetchBloodTests();

        if (response.success) {
          const dataset = response.data || {};
          const data = dataset.items || [];
          setBloodTestData(data);
          const dataForAI = data.map(item => {
            const { long_explanation, ...rest } = item;
            return rest;
          });
          setHealthData(dataForAI);
        } else {
          setIsError(true);
          console.error('Failed to fetch blood tests:', response.message);
        }
      } catch (error) {
        setIsError(true);
        console.error('Error fetching blood tests:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBloodTests();

    return () => {
      setHealthData([]);
    };
  }, [setHealthData]);

  const handleTestNameClick = (testName, category, event) => {
    const identifier = `${category}-${testName}`;
    if (activeTooltip === identifier) {
      setActiveTooltip(null);
      setTooltipContent(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      const tooltipWidth = 250; // from CSS .tooltip-content width

      const spaceOnRight = window.innerWidth - (rect.right + 10);
      const spaceOnLeft = rect.left - 10;
      let newX, newY, newPosition, transform;

      // Prefer right, then left, then fallback to original above/below
      if (spaceOnRight >= tooltipWidth) {
        newX = rect.right + 10;
        newY = rect.top + rect.height / 2;
        newPosition = 'right';
        transform = 'translateY(-50%)';
      } else if (spaceOnLeft >= tooltipWidth) {
        newX = rect.left - 10;
        newY = rect.top + rect.height / 2;
        newPosition = 'left';
        transform = 'translate(-100%, -50%)';
      } else {
        const isFirstRow = event.currentTarget.closest('tr').rowIndex === 1;
        newPosition = isFirstRow ? 'below' : 'above';
        newY = isFirstRow ? rect.bottom + 10 : rect.top - 10;

        const centeredX = rect.left + rect.width / 2;
        newX = centeredX;
        transform = 'translateX(-50%)';

        if (window.innerWidth <= 768) {
          const tooltipHalfWidth = tooltipWidth / 2;
          const margin = 10;

          if (centeredX - tooltipHalfWidth < margin) {
            newX = tooltipHalfWidth + margin;
          } else if (centeredX + tooltipHalfWidth > window.innerWidth - margin) {
            newX = window.innerWidth - tooltipHalfWidth - margin;
          }
        }
      }

      setTooltipPosition({
        x: newX,
        y: newY,
        position: newPosition,
        transform: transform
      });

      const testData = bloodTestData.find(item =>
        item.test_name === testName && item.category === category
      );

      setTooltipContent({
        testName: testName,
        explanation: testData.short_explanation,
        longExplanation: testData.long_explanation
      });

      setActiveTooltip(identifier);
    }
  };

  const renderTable = (data, title, dates) => {
    if (!data || data.length === 0) {
      return null;
    }

    const testData = data.reduce((acc, item) => {
      if (!acc[item.test_name]) {
        acc[item.test_name] = {
          explanation: item.short_explanation,
          longExplanation: item.long_explanation,
          results: {},
        };
      }
      acc[item.test_name].results[item.test_date] = {
        value: item.result_value,
        unit: item.result_unit,
        ref: item.reference_range,
      };
      return acc;
    }, {});

    const testNames = Object.keys(testData).sort();

    const formatDate = (dateString) => {
      const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
      return new Date(dateString).toLocaleDateString('en-GB', options);
    };

    return (
      <div key={title}>
        <h3>{title}</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Test</th>
                {dates.map((date) => (
                  <th key={date}>{formatDate(date)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {testNames.map((testName) => {
                //const identifier = `${title}-${testName}`;
                const explanation = testData[testName].explanation;
                //const longExplanation = testData[testName].longExplanation;
                return (
                  <tr key={testName}>
                    <td
                      className="test-name-cell"
                      onClick={(e) => handleTestNameClick(testName, title, e)}
                    >
                      <div className="test-name-container">
                        <span
                          className={explanation ? 'test-name-text' : ''}
                        >
                          {testName}
                        </span>
                      </div>
                    </td>
                    {dates.map((date) => {
                      const result = testData[testName].results[date];
                      const outOfRange = result
                        ? isOutOfRange(result.value, result.ref)
                        : false;
                      return (
                        <td
                          key={date}
                          className={
                            highlightOutOfRange && outOfRange ? 'out-of-range' : ''
                          }
                        >
                          {result ? (
                            <>
                              <span className="result-value">
                                {result.value} {result.unit}
                              </span>
                              <br />
                              (Ref: {result.ref})
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const groupedByCategory = bloodTestData.reduce((acc, item) => {
    const category = item.category || 'Others';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  const allDates = [...new Set(bloodTestData.map((item) => item.test_date))].sort(
    (a, b) => new Date(a) - new Date(b)
  );

  return (
    <div className="blood-tests-container">
      <div className="content-wrapper">
        <h2>Blood Test Results</h2>
        <div className="controls-container">
          <button
            className="highlight-toggle-btn"
            onClick={() => setHighlightOutOfRange((prev) => !prev)}
          >
            {highlightOutOfRange
              ? 'Clear Highlights'
              : 'Highlight Out of Range Values'}
          </button>
        </div>
        {isLoading && <p>Loading...</p>}
        {isError && (
          <p className="error-message">
            An error occurred while fetching the data.
          </p>
        )}
        {!isLoading && !isError && (
          <>
            {Object.keys(groupedByCategory)
              .sort()
              .map((category) =>
                renderTable(groupedByCategory[category], category, allDates)
              )}
          </>
        )}
      </div>
      {modalContent && (
        <div className="modal-overlay" onClick={() => setModalContent(null)}>
          {console.log('Modal is rendering with content:', modalContent)}
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-button"
              onClick={() => setModalContent(null)}
            >
              &times;
            </button>
            <h3>{modalContent.title}</h3>
            <div className="modal-body">{modalContent.content}</div>
          </div>
        </div>
      )}

      {activeTooltip && tooltipContent && (
        <div
          className="floating-tooltip"
          data-position={tooltipPosition.position}
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: tooltipPosition.transform
          }}
        >
          <div className="tooltip-content">
            {tooltipContent.explanation}
            {tooltipContent.longExplanation && (
              <button
                className="read-more-btn"
                onClick={() => {
                  console.log('Read More clicked!');
                  console.log('tooltipContent:', tooltipContent);
                  console.log('Setting modal content:', {
                    title: tooltipContent.testName,
                    content: tooltipContent.longExplanation,
                  });
                  setModalContent({
                    title: tooltipContent.testName,
                    content: tooltipContent.longExplanation,
                  });
                  setActiveTooltip(null);
                  setTooltipContent(null);
                }}
              >
                Read More
              </button>
            )}
          </div>
        </div>
      )}
      <FloatingChat character="doctor" />
    </div>
  );
};

export default BloodTests;
