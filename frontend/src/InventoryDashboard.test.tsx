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
import InventoryDashboard from './InventoryDashboard';
import type { Product } from './types/product';
import { UnauthorizedRequestError } from './api/products';

vi.mock('./CategoryInventoryChart', () => ({
  default: ({
    categories,
  }: {
    categories: Array<{
      category: string;
      totalUnits: number;
      inventoryValue: number;
    }>;
  }) => (
    <section aria-label="Stock by category">
      {categories.map(({ category, totalUnits }) => (
        <p key={category}>
          {category}: {totalUnits} units
        </p>
      ))}
    </section>
  ),
}));

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

    render(
      <InventoryDashboard
        createSale={async () => ({
          saleId: 'sale-1',
          productId: 'notebook',
          quantity: 1,
          unitPrice: 4.99,
          totalAmount: 4.99,
          soldAt: '2026-01-01T00:00:00.000Z',
        })}
        loadProducts={loadProducts}
        onSignOut={() => undefined}
        onUnauthorized={async () => undefined}
      />,
    );

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
    render(
      <InventoryDashboard
        createSale={async () => ({
          saleId: 'sale-1',
          productId: 'notebook',
          quantity: 1,
          unitPrice: 4.99,
          totalAmount: 4.99,
          soldAt: '2026-01-01T00:00:00.000Z',
        })}
        loadProducts={() => Promise.resolve(products)}
        onSignOut={() => undefined}
        onUnauthorized={async () => undefined}
      />,
    );

    expect(await screen.findByText('Classic Notebook')).toBeInTheDocument();
    expect(screen.getByText('145')).toBeInTheDocument();
    expect(screen.getByText('$1,109.73')).toBeInTheDocument();
    expect(screen.getByText('Electronics: 25 units')).toBeInTheDocument();
    expect(screen.getByText('Stationery: 120 units')).toBeInTheDocument();
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
    render(
      <InventoryDashboard
        createSale={async () => ({
          saleId: 'sale-1',
          productId: 'notebook',
          quantity: 1,
          unitPrice: 4.99,
          totalAmount: 4.99,
          soldAt: '2026-01-01T00:00:00.000Z',
        })}
        loadProducts={() => Promise.resolve([])}
        onSignOut={() => undefined}
        onUnauthorized={async () => undefined}
      />,
    );

    expect(await screen.findByText('No products yet')).toBeInTheDocument();
    expect(screen.getByText('Your inventory is empty.')).toBeInTheDocument();
  });

  it('shows load errors and retries the request', async () => {
    const loadProducts = vi
      .fn<() => Promise<Product[]>>()
      .mockRejectedValueOnce(new Error('Mock service unavailable'))
      .mockResolvedValueOnce(products);

    render(
      <InventoryDashboard
        createSale={async () => ({
          saleId: 'sale-1',
          productId: 'notebook',
          quantity: 1,
          unitPrice: 4.99,
          totalAmount: 4.99,
          soldAt: '2026-01-01T00:00:00.000Z',
        })}
        loadProducts={loadProducts}
        onSignOut={() => undefined}
        onUnauthorized={async () => undefined}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Mock service unavailable',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Classic Notebook')).toBeInTheDocument();
    await waitFor(() => expect(loadProducts).toHaveBeenCalledTimes(2));
  });

  it('clears the session when the API reports an unauthorized request', async () => {
    const handleUnauthorized = vi.fn(async () => undefined);
    render(
      <InventoryDashboard
        createSale={async () => ({
          saleId: 'sale-1',
          productId: 'notebook',
          quantity: 1,
          unitPrice: 4.99,
          totalAmount: 4.99,
          soldAt: '2026-01-01T00:00:00.000Z',
        })}
        loadProducts={() => Promise.reject(new UnauthorizedRequestError())}
        onSignOut={() => undefined}
        onUnauthorized={handleUnauthorized}
      />,
    );

    await waitFor(() => expect(handleUnauthorized).toHaveBeenCalledOnce());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('records a sale and reduces the displayed quantity', async () => {
    const createSale = vi.fn(async () => ({
      saleId: 'sale-1',
      productId: 'notebook',
      quantity: 2,
      unitPrice: 4.99,
      totalAmount: 9.98,
      soldAt: '2026-01-01T00:00:00.000Z',
    }));

    render(
      <InventoryDashboard
        createSale={createSale}
        loadProducts={() => Promise.resolve(products)}
        onSignOut={() => undefined}
        onUnauthorized={async () => undefined}
      />,
    );

    await screen.findByText('Classic Notebook');
    fireEvent.change(screen.getByRole('combobox', { name: 'Sale product' }), {
      target: { value: 'notebook' },
    });
    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'Sale quantity' }),
      {
        target: { value: '2' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Record sale' }));

    await waitFor(() => expect(createSale).toHaveBeenCalledWith('notebook', 2));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Sale recorded: 2 units.',
    );
    expect(screen.getByText('118')).toBeInTheDocument();
    expect(screen.getByText('$1,099.75')).toBeInTheDocument();
  });
});
