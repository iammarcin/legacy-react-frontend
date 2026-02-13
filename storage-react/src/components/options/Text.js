// options/Text.js

import React, { useState } from 'react';
import {
  getTextTemperature, setTextTemperature,
  getTextMemorySize, setTextMemorySize,
  getTextFileAttachedMessageLimit, setTextFileAttachedMessageLimit,
  getIsStreamingEnabled, setIsStreamingEnabled,
  getTextReasoningEffort, setTextReasoningEffort,
  getTextShowReasoning, setTextShowReasoning,
  getTextModelToBeUsedWithWebsearch, setTextModelToBeUsedWithWebsearch,
} from '../../utils/configuration';

const Text = () => {
  const [temperature, setLocalTemperature] = useState(getTextTemperature());
  const [memorySize, setLocalMemorySize] = useState(getTextMemorySize());
  const [fileAttachedMessageLimit, setLocalFileAttachedMessageLimit] = useState(getTextFileAttachedMessageLimit());
  const [isStreaming, setLocalIsStreaming] = useState(getIsStreamingEnabled());
  const [reasoningEffort, setLocalReasoningEffort] = useState(getTextReasoningEffort() || 1);
  const [showReasoning, setLocalShowReasoning] = useState(getTextShowReasoning());
  const [websearchModel, setLocalWebsearchModel] = useState(getTextModelToBeUsedWithWebsearch() || "sonar");

  const handleTemperatureChange = (e) => {
    const value = e.target.value;
    setLocalTemperature(value);
    setTextTemperature(value);
  };

  const handleMemorySizeChange = (e) => {
    const value = e.target.value;
    setLocalMemorySize(value);
    setTextMemorySize(value);
  };

  const handleStreamingChange = (e) => {
    const checked = e.target.checked;
    setLocalIsStreaming(checked);
    setIsStreamingEnabled(checked);
  };

  const handleFileAttachedMessageLimitChange = (e) => {
    const value = e.target.value;
    setLocalFileAttachedMessageLimit(value);
    setTextFileAttachedMessageLimit(value);
  }

  const handleReasoningEffortChange = (e) => {
    const value = parseInt(e.target.value);
    setLocalReasoningEffort(value);
    setTextReasoningEffort(value);
  };

  const handleShowReasoningChange = (e) => {
    const checked = e.target.checked;
    setLocalShowReasoning(checked);
    setTextShowReasoning(checked);
  };

  const handleWebsearchModelChange = (e) => {
    const value = e.target.value;
    setLocalWebsearchModel(value);
    setTextModelToBeUsedWithWebsearch(value);
  };

  const getReasoningEffortLabel = (value) => {
    switch (parseInt(value)) {
      case 0: return "low";
      case 1: return "medium";
      case 2: return "high";
      default: return "medium";
    }
  };

  return (
    <div className="text-options">
      <div className="option-item">
        <label>Temperature</label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={temperature}
          onChange={handleTemperatureChange}
        />
        <span>{temperature}</span>
      </div>
      <div className="option-item">
        <label>Memory Size</label>
        <input
          type="range"
          min="0"
          max="4000"
          step="1"
          value={memorySize}
          onChange={handleMemorySizeChange}
        />
        <span>{memorySize}</span>
      </div>
      <div className="option-item">
        <label>Attachments message count limit</label>
        <input
          type="range"
          min="0"
          max="10"
          step="1"
          value={fileAttachedMessageLimit}
          onChange={handleFileAttachedMessageLimitChange}
        />
        <span>{fileAttachedMessageLimit}</span>
      </div>
      <div className="option-item">
        <label>Reasoning effort</label>
        <input
          type="range"
          min="0"
          max="2"
          step="1"
          value={reasoningEffort}
          onChange={handleReasoningEffortChange}
        />
        <span>{getReasoningEffortLabel(reasoningEffort)}</span>
      </div>
      <div className="option-item">
        <label>Show reasoning/thinking</label>
        <input
          type="checkbox"
          checked={showReasoning}
          onChange={handleShowReasoningChange}
        />
      </div>
      <div className="option-item">
        <label>Websearch model</label>
        <select value={websearchModel} onChange={handleWebsearchModelChange}>
          <option value="sonar-reason-pro">sonar-reason-pro</option>
          <option value="sonar-reason">sonar-reason</option>
          <option value="sonar-pro">sonar-pro</option>
          <option value="sonar">sonar</option>
        </select>
      </div>
      <div className="option-item">
        <label>Enable streaming</label>
        <input
          type="checkbox"
          checked={isStreaming}
          onChange={handleStreamingChange}
        />
      </div>
    </div>
  );
};

export default Text;
