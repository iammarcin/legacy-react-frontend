import { render, screen } from '@testing-library/react';

test('testing library renders basic content', () => {
  render(<div>BetterAI</div>);
  expect(screen.getByText('BetterAI')).toBeInTheDocument();
});
