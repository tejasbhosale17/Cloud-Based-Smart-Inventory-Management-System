// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import type { Product } from './types/product';

const products: Product[] = [
  {
    productId: 'notebook',
    name: 'Classic Notebook',
    category: 'Stationery',
    price: 4.99,
    quantity: 120,
    lowStockThreshold: 25,
  },
  {
    productId: 'mouse',
    name: 'Wireless Mouse',
    category: 'Electronics',
    price: 24.5,
    quantity: 18,
    lowStockThreshold: 20,
  },
  {
    productId: 'cable',
    name: 'USB-C Cable',
    category: 'Electronics',
    price: 9.99,
    quantity: 7,
    lowStockThreshold: 15,
  },
];

afterEach(cleanup);

describe('inventory dashboard', () => {
  it('shows a loading state while products are being fetched', async () => {
    let resolveProducts: (products: Product[]) => void = () => undefined;
    const loadProducts = vi.fn(
      () =>
        new Promise<Product[]>((resolve) => {
          resolveProducts = resolve;
        }),
    );

    render(<App loadProducts={loadProducts} />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading inventory');

    await waitFor(() => expect(loadProducts).toHaveBeenCalledOnce());
    await act(async () => {
      resolveProducts(products);
    });
    expect(
      await screen.findByRole('heading', { name: 'Product inventory' }),
    ).toBeInTheDocument();
  });

  it('shows inventory summaries and filters by search, category, and stock', async () => {
    render(<App loadProducts={() => Promise.resolve(products)} />);

    expect(await screen.findByText('Classic Notebook')).toBeInTheDocument();
    expect(screen.getByText('145')).toBeInTheDocument();
    expect(
      screen.getAllByText('2', { selector: '.summary-value' }),
    ).toHaveLength(2);

    fireEvent.change(
      screen.getByRole('searchbox', { name: 'Search products' }),
      {
        target: { value: 'usb' },
      },
    );
    expect(screen.getByText('USB-C Cable')).toBeInTheDocument();
    expect(screen.queryByText('Classic Notebook')).not.toBeInTheDocument();

    fireEvent.change(
      screen.getByRole('searchbox', { name: 'Search products' }),
      {
        target: { value: '' },
      },
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), {
      target: { value: 'Electronics' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Low stock only' }));

    expect(screen.getByText('Wireless Mouse')).toBeInTheDocument();
    expect(screen.getByText('USB-C Cable')).toBeInTheDocument();
    expect(screen.queryByText('Classic Notebook')).not.toBeInTheDocument();
  });

  it('shows a helpful empty state when there are no products', async () => {
    render(<App loadProducts={() => Promise.resolve([])} />);

    expect(await screen.findByText('No products yet')).toBeInTheDocument();
    expect(screen.getByText('Your inventory is empty.')).toBeInTheDocument();
  });

  it('shows load errors and retries the request', async () => {
    const loadProducts = vi
      .fn<() => Promise<Product[]>>()
      .mockRejectedValueOnce(new Error('Mock service unavailable'))
      .mockResolvedValueOnce(products);

    render(<App loadProducts={loadProducts} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Mock service unavailable',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Classic Notebook')).toBeInTheDocument();
    await waitFor(() => expect(loadProducts).toHaveBeenCalledTimes(2));
  });
});
