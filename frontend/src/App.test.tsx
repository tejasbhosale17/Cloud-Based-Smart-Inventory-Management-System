// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the project name and setup message', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', {
        name: 'Cloud-Based Smart Inventory Management System',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Project setup is ready for the inventory dashboard.'),
    ).toBeInTheDocument();
  });
});
