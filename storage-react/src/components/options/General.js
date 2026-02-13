// options/General.js

import React, { useState, useEffect } from 'react';
import {
  getIsProdMode, setIsProdMode, setURLForAPICalls,
  getUseTestData, setUseTestData,
  getGeneralShowMessageInfoBottomRight, setGeneralShowMessageInfoBottomRight,
  getAppModeUseWatson, setAppModeUseWatson,
  getAuthTokenForBackend, setAuthTokenForBackend,
  getUseWebsockets, setUseWebsockets
} from '../../utils/configuration';

const General = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  const [isProdMode, setLocalIsProdMode] = useState(getIsProdMode());
  const [useTestData, setLocalUseTestData] = useState(getUseTestData());
  const [showLocalMessageInfo, setLocalShowMessageInfo] = useState(getGeneralShowMessageInfoBottomRight());
  const [useWatson, setLocalUseWatson] = useState(getAppModeUseWatson());
  const [authToken, setLocalAuthToken] = useState(getAuthTokenForBackend());
  const [isWebsocketEnabled, setLocalIsWebsocketEnabled] = useState(getUseWebsockets());


  const handleProdModeChange = (e) => {
    const checked = e.target.checked;
    setLocalIsProdMode(checked);
    setIsProdMode(checked);
    setURLForAPICalls();
    window.location.reload();
  };

  const handleUseTestDataChange = (e) => {
    const checked = e.target.checked;
    setLocalUseTestData(checked);
    setUseTestData(checked);
  };

  const handleShowMessageInfoChange = (e) => {
    const checked = e.target.checked;
    setLocalShowMessageInfo(checked);
    setGeneralShowMessageInfoBottomRight(checked);
  }

  const handleUseWatsonChange = (e) => {
    const checked = e.target.checked;
    setLocalUseWatson(checked);
    setAppModeUseWatson(checked);
    setURLForAPICalls();
  };

  const handleAuthTokenChange = (e) => {
    const value = e.target.value;
    setLocalAuthToken(value);
    setAuthTokenForBackend(value);
  };

  const handleWebsocketChange = (e) => {
    const checked = e.target.checked;
    setLocalIsWebsocketEnabled(checked);
    setUseWebsockets(checked);
  };

  useEffect(() => {
    if (!isProduction) {
      setIsProdMode(isProdMode);
    }
  }, [isProdMode, isProduction]);

  return (
    <div className="general-options">
      {!isProduction && (
        <div className="option-item">
          <label>Production Mode</label>
          <input type="checkbox" checked={isProdMode} onChange={handleProdModeChange} />
        </div>
      )}
      <div className="option-item">
        <label>Test Data</label>
        <input type="checkbox" checked={useTestData} onChange={handleUseTestDataChange} />
      </div>
      {!isProduction && (
        <div className="option-item">
          <label>Use Watson for nonprod</label>
          <input type="checkbox" checked={useWatson} onChange={handleUseWatsonChange} />
        </div>
      )}
      <div className="option-item">
        <label>Show message info (bottom,right corner)</label>
        <input type="checkbox" checked={showLocalMessageInfo} onChange={handleShowMessageInfoChange} />
      </div>
      <div className="option-item">
        <label>Websocket</label>
        <input
          type="checkbox"
          checked={isWebsocketEnabled}
          onChange={handleWebsocketChange}
        />
      </div>
      <br />
      <div className="option-item">
        <label>API auth Token</label>
        <input type="password" value={authToken} onChange={handleAuthTokenChange} />
      </div>
    </div>
  );
};

export default General;
