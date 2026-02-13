import React, { useContext, useEffect, useMemo } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StateContextProvider, StateContext } from '../../components/StateContextProvider';
import { createTestConfiguration } from './createTestConfiguration';

const StateContextBridge = ({ children, contextOverride, initializeState }) => {
  const context = useContext(StateContext);

  useEffect(() => {
    if (typeof initializeState === 'function') {
      initializeState(context);
    }
  }, [context, initializeState]);

  const value = useMemo(() => {
    if (typeof contextOverride === 'function') {
      return contextOverride(context);
    }
    if (contextOverride) {
      return { ...context, ...contextOverride };
    }
    return context;
  }, [context, contextOverride]);

  return (
    <StateContext.Provider value={value}>
      {children}
    </StateContext.Provider>
  );
};

export const renderWithProviders = (
  ui,
  {
    route = '/',
    routerProps,
    contextOverride,
    initializeState,
    configuration,
    skipConfiguration = false,
  } = {},
) => {
  if (!skipConfiguration) {
    createTestConfiguration(configuration);
  }

  const Wrapper = ({ children }) => (
    <MemoryRouter initialEntries={routerProps?.initialEntries ?? [route]} {...routerProps}>
      <StateContextProvider>
        <StateContextBridge contextOverride={contextOverride} initializeState={initializeState}>
          {children}
        </StateContextBridge>
      </StateContextProvider>
    </MemoryRouter>
  );

  return render(ui, { wrapper: Wrapper });
};

export const renderWithAuthenticatedProviders = (ui, options = {}) => {
  return renderWithProviders(ui, options);
};
