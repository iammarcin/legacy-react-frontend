Tags: #frontend #react #health #garmin #fitness #sleep #hrv #charts #chartjs #data-visualization #correlation-analysis #wearables

# Health Dashboard Components

This directory implements a comprehensive health analytics dashboard for visualizing Garmin wearable data. It's part of the BetterAI React frontend and provides interactive charts, correlation analysis, and AI-powered health insights via a floating chat interface.

## System Context

The health module sits within the larger BetterAI platform:
- **Data Source:** Garmin Connect API (synced via backend)
- **Backend Endpoint:** `api/db` with `get_garmin_data`, `analyze_correlations` methods
- **AI Integration:** FloatingChat enables health-focused AI conversations with optional data context attachment
- **State:** Uses `StateContext` from parent for `healthData`, `correlationData`, threshold settings

---

## Component Architecture

```
Health.js (main dashboard orchestrator)
    ├── TopMenu (navigation, from parent)
    ├── DatePicker (date range selection)
    ├── Charts Container
    │       └── 14 chart components (charts/ subdirectory)
    ├── CorrelationHeatmap.js (sleep correlation analysis)
    ├── ChatImageModal (chart fullscreen viewer)
    └── FloatingChat.js (AI health assistant)
```

---

## Core Components

### Health.js - Dashboard Controller

**Purpose:** Main orchestrator that fetches Garmin data and renders all health visualizations.

**Key Features:**
- Date range picker with presets (YTD, Current/Previous Week/Month)
- Responsive chart grid (toggle between full-width and small graphs)
- Modal viewer for chart expansion with prev/next navigation
- Data fetching via `fetchGarminAnalysisOverview` API

**Data Flow:**
1. Fetch unified dataset from backend (`mode: 'correlation'`)
2. Distribute to individual chart components via props
3. Store in `StateContext.healthData` for AI context

**State Variables:**
- `sleepData`, `userSummaryData`, `trainingStatusData` - Raw datasets
- `hrvData`, `bodyCompositionData`, `bodyBatteryData` - Specialized metrics
- `activitiesData` - Training/workout records
- `enduranceAndReadinessData` - Merged readiness + endurance scores

---

### FloatingChat.js - AI Health Assistant

**Purpose:** Resizable, minimizable chat widget for AI-powered health analysis.

**Key Features:**
- Draggable/resizable via `react-resizable`
- Toggleable health data context attachment
- Correlation data filtering by threshold before AI submission
- Default character: `sleep_expert` (configurable)

**Data Context Options:**
- `includeHealthData` - Attach full health dataset to AI prompt
- `includeCorrelationData` - Attach filtered correlations (respects threshold settings)

**Flow:**
1. User types question
2. Optional: Attach health/correlation data as `assetInput`
3. Call `useChatAPI` hook with `isHealthMode: true`
4. Streaming response displayed in floating window

---

### CorrelationHeatmap.js - Sleep Correlation Analysis

**Purpose:** Calculate and visualize correlations between health metrics and sleep score.

**Key Features:**
- On-demand correlation generation (button click)
- Interactive threshold sliders for correlation coefficient and p-value
- Horizontal bar chart with positive (green) / negative (red) coloring
- Tooltip shows correlation value + statistical significance

**Backend Integration:**
- Endpoint: `analyze_correlations` method
- Returns: `{ correlations: {}, p_values: {} }`
- Mode: `correlation` shifts sleep data by 1 day for proper causality analysis

**Filtering Logic:**
```javascript
// Only show correlations meeting both thresholds
Math.abs(value) > correlationThreshold && pValue <= pValueThreshold
```

---

## Chart Components (`charts/` subdirectory)

All charts use **Chart.js** via `react-chartjs-2` and follow a consistent pattern:
- Receive `data`, `isFullWidth`, `isMobile`, `isModalOpen`, `onChartClick` props
- Process data via utility functions from `utils/health.data.process.js`
- Support responsive sizing and modal expansion

### Sleep Analysis Charts

| Component | Metrics Visualized |
|-----------|-------------------|
| `SleepPhasesChart.js` | Deep/REM/Light/Awake sleep hours (stacked bar) + Overall Score (line) |
| `SleepStartEndChart.js` | Sleep start time, wake time, sleep duration trends |
| `SleepMetricsChart.js` | Sleep quality scores, efficiency, interruptions |

### Body Metrics Charts

| Component | Metrics Visualized |
|-----------|-------------------|
| `BodyBattery.js` | Daily high/low body battery + sleep change impact |
| `BodyComposition.js` | Weight, body fat %, muscle mass trends |
| `Hrv.js` | Heart rate variability (HRV) over time |

### Training & Activity Charts

| Component | Metrics Visualized |
|-----------|-------------------|
| `TrainingStatusLoad.js` | Training load, status, recovery metrics |
| `EnduranceAndReadiness.js` | Training readiness score + endurance score (merged) |
| `ActivityHR.js` | Time in HR zones (Zone1-5) per week (stacked bar) |
| `ActivityTime.js` | Weekly training duration by activity type |
| `ActivityDistance.js` | Weekly distance by activity type |
| `ActivityTypes.js` | Activity type distribution (pie/bar) |

### Daily Summary Charts

| Component | Metrics Visualized |
|-----------|-------------------|
| `UserSummaryIntensity.js` | Daily intensity minutes (moderate/vigorous) |
| `UserSummaryStress.js` | Stress levels, resting heart rate trends |

---

## Data Processing Utilities

Charts rely on helpers from `../../utils/health.data.process.js`:

- **`processNonGroupedDataForGraph()`** - For daily time-series data (sleep, HRV, body battery)
- **`groupAndProcessDataForGraph()`** - For activity data needing weekly aggregation

**Common Parameters:**
- `keys` - Data fields to extract
- `transformFunctions` - Value transformations (e.g., seconds → hours)
- `colors` - Predefined color palette names
- `chartTypes` - 'bar' or 'line' per dataset
- `yAxisIDs` - Left ('y') or right ('y-right') axis assignment

---

## Styling

CSS files in `css/` subdirectory:
- `Health.css` - Main dashboard layout, responsive grid
- `FloatingChat.css` - Chat widget positioning, resize handles
- `CorrelationHeatmap.css` - Threshold sliders, chart wrapper

**Responsive Behavior:**
- Mobile detection via `isMobile` from StateContext
- Charts hide x-axis labels in small mode, show in fullscreen/modal
- FloatingChat has smaller default size on mobile

---

## Key Integration Points

### StateContext Properties Used
```javascript
const {
  setHealthData,           // Store for AI context
  correlationData, setCorrelationData,
  pValuesData, setPValuesData,
  correlationThreshold, setCorrelationThreshold,
  pValueThreshold, setPValueThreshold,
  includeHealthData, includeCorrelationData,
  isMobile
} = useContext(StateContext);
```

### API Methods
- `fetchGarminAnalysisOverview({ startDate, endDate, mode, includeOptimized })`
- `triggerAPIRequest("api/db", "provider.db", "analyze_correlations", userInput, getSettings)`

---

## Development Notes

- Charts are indexed (0-13) for modal navigation
- Legend clicks should NOT open modal (handled via `onChartClick('legend')`)
- Sleep data is shifted by -1 day in correlation mode to analyze "previous day's activities affect tonight's sleep"
- Body battery chart merges data from both `get_user_summary` and `get_sleep_data` endpoints
