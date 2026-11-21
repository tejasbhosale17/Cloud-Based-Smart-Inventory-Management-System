// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CategoryInventoryChart from './CategoryInventoryChart';
import type { CategoryInventory } from './analytics/inventory-analytics';

const chartMock = vi.hoisted(() => ({
  construct: vi.fn(),
  destroy: vi.fn(),
}));

vi.mock('chart.js/auto', () => ({
  default: class MockChart {
    constructor(_canvas: HTMLCanvasElement, config: unknown) {
      chartMock.construct(config);
    }

    destroy() {
      chartMock.destroy();
    }
  },
}));

const categories: CategoryInventory[] = [
  {
    category: 'Electronics',
    productCount: 2,
    totalUnits: 25,
    inventoryValue: 510.93,
  },
  {
    category: 'Stationery',
    productCount: 1,
    totalUnits: 120,
    inventoryValue: 598.8,
  },
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CategoryInventoryChart', () => {
  it('renders category totals in an accessible Chart.js bar chart', async () => {
    const { unmount } = render(
      <CategoryInventoryChart categories={categories} />,
    );

    expect(
      screen.getByRole('img', { name: 'Units in stock by category' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Electronics: 25 units, \$510\.93 inventory value/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Stationery: 120 units, \$598\.80 inventory value/),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(chartMock.construct).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'bar',
          data: expect.objectContaining({
            labels: ['Electronics', 'Stationery'],
            datasets: [
              expect.objectContaining({
                label: 'Units in stock',
                data: [25, 120],
              }),
            ],
          }),
        }),
      );
    });

    unmount();
    expect(chartMock.destroy).toHaveBeenCalledOnce();
  });

  it('renders an empty state without creating an empty chart', () => {
    render(<CategoryInventoryChart categories={[]} />);

    expect(
      screen.getByText('No category data to display.'),
    ).toBeInTheDocument();
    expect(chartMock.construct).not.toHaveBeenCalled();
  });
});
