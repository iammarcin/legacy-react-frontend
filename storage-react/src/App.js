// App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { StateContextProvider } from "./components/StateContextProvider";
import Main from './components/Main';
import Login from './components/Login';
import Health from './components/health/Health';
import Garmin from './components/Garmin';
import ImageCenter from './components/ImageCenter';
import Wanderer from './components/Wanderer';
import WandererExampleBlogPost from './components/WandererExampleBlogPost';
import BloodTests from './components/BloodTests';
import PrivacyPolicy from './components/Privacy';
import TermsAndConditions from './components/TermsConditions';
import VibesLayout from './components/vibes/VibesLayout';
import Demo1 from './components/vibes/Demo1';
import Demo2 from './components/vibes/Demo2';
import Pangea from './components/pangea/Pangea';


const isTokenValid = (tokenData) => {
  if (!tokenData || !tokenData.expiration) {
    return false;
  }
  const now = new Date();
  const expirationDate = new Date(tokenData.expiration);
  return now < expirationDate;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if the user is already authenticated
    const tokenData = JSON.parse(localStorage.getItem('authToken'));

    if (isTokenValid(tokenData)) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  return (
    <StateContextProvider>
      <Router>
        <Routes>
          {isAuthenticated ? (
            <>
              <Route path="/" element={<Main />} />
              <Route path="/session/:sessionId" element={<Main />} />
              <Route path="/health" element={<Health />} />
              <Route path="/garmin" element={<Garmin />} />
            </>
          ) : (
            <Route path="/" element={<Login onLoginSuccess={handleLoginSuccess} />} />
          )}
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/img" element={<ImageCenter />} />
          <Route path="/wanderer" element={<Wanderer />} />
          <Route path="/wanderer/example" element={<WandererExampleBlogPost />} />
          <Route path="/blood" element={<BloodTests />} />
          <Route path="/pangea" element={<Pangea />} />
          {/* Public route for demos */}
          <Route path="/vibes/*" element={<VibesLayout />}>
            {/* Nested routes for individual demos */}
            <Route index element={<div>Select a demo from the above links.</div>} />
            <Route path="demo1" element={<Demo1 />} />
            <Route path="demo2" element={<Demo2 />} />
          </Route>
        </Routes>
      </Router>
    </StateContextProvider>
  );
}

export default App;
