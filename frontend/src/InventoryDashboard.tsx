import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { UnauthorizedRequestError } from './api/products';
import CategoryInventoryChart from './CategoryInventoryChart';
import {
  calculateInventoryAnalytics,
  isProductLowStock,
} from './analytics/inventory-analytics';
import type { Sale } from './types/sale';
import type { Product } from './types/product';

type LoadState = 'loading' | 'ready' | 'error';
type StockFilter = 'all' | 'low';

interface InventoryDashboardProps {
  createSale: (productId: string, quantity: number) => Promise<Sale>;
  loadProducts: () => Promise<Product[]>;
  onSignOut: () => void;
  onUnauthorized: () => Promise<void>;
  signOutError?: string;
  userEmail?: string;
}

function InventoryDashboard({
  createSale,
  loadProducts,
  onSignOut,
  onUnauthorized,
  signOutError,
  userEmail,
}: InventoryDashboardProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [retryCount, setRetryCount] = useState(0);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [saleQuantity, setSaleQuantity] = useState('1');
  const [saleState, setSaleState] = useState<'idle' | 'submitting'>('idle');
  const [saleMessage, setSaleMessage] = useState('');
  const [saleError, setSaleError] = useState('');

  useEffect(() => {
    let isCurrentRequest = true;

    setLoadState('loading');
    setErrorMessage('');

    Promise.resolve()
      .then(loadProducts)
      .then((loadedProducts) => {
        if (isCurrentRequest) {
          setProducts(loadedProducts);
          setLoadState('ready');
        }
      })
      .catch(async (error: unknown) => {
        if (!isCurrentRequest) {
          return;
        }

        if (error instanceof UnauthorizedRequestError) {
          await onUnauthorized();
          return;
        }

        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : 'Unable to load inventory. Please try again.',
        );
        setLoadState('error');
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [loadProducts, onUnauthorized, retryCount]);

  const analytics = useMemo(
    () => calculateInventoryAnalytics(products),
    [products],
  );
  const categories = analytics.categories.map(({ category }) => category);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.category.toLowerCase().includes(normalizedSearch);
      const matchesCategory =
        selectedCategory === 'all' || product.category === selectedCategory;
      const matchesStock = stockFilter === 'all' || isProductLowStock(product);

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchTerm, selectedCategory, stockFilter]);

  function clearFilters() {
    setSearchTerm('');
    setSelectedCategory('all');
    setStockFilter('all');
  }

  async function submitSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaleMessage('');
    setSaleError('');

    const quantity = Number(saleQuantity);
    if (
      !selectedProductId ||
      !Number.isSafeInteger(quantity) ||
      quantity <= 0
    ) {
      setSaleError('Select a product and enter a positive whole number.');
      return;
    }

    setSaleState('submitting');
    try {
      const sale = await createSale(selectedProductId, quantity);
      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.productId === sale.productId
            ? { ...product, quantity: product.quantity - sale.quantity }
            : product,
        ),
      );
      setSaleMessage(
        `Sale recorded: ${sale.quantity} unit${sale.quantity === 1 ? '' : 's'}.`,
      );
      setSaleQuantity('1');
    } catch (error) {
      if (error instanceof UnauthorizedRequestError) {
        await onUnauthorized();
        return;
      }
      setSaleError(
        error instanceof Error && error.message
          ? error.message
          : 'Unable to record the sale. Please try again.',
      );
    } finally {
      setSaleState('idle');
    }
  }

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="Smart Inventory home">
          <span className="brand-mark">SI</span>
          <span>
            <strong>Smart Inventory</strong>
            <small>Management System</small>
          </span>
        </a>

        <p className="sidebar-label">WORKSPACE</p>
        <nav className="primary-navigation" aria-label="Main navigation">
          <a
            className="navigation-link active"
            href="#overview"
            aria-current="page"
          >
            <span className="navigation-indicator" aria-hidden="true" />
            Overview
          </a>
          <a className="navigation-link" href="#product-list">
            <span className="navigation-indicator" aria-hidden="true" />
            Products
          </a>
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-status-dot" aria-hidden="true" />
          <span>Protected inventory workspace</span>
        </div>
      </aside>

      <main className="dashboard-main" id="overview">
        <header className="topbar">
          <div>
            <p className="eyebrow">INVENTORY MANAGEMENT</p>
            <h1>Overview</h1>
          </div>
          <div className="profile-chip">
            <span className="profile-avatar" aria-hidden="true">
              {(userEmail?.[0] ?? 'E').toUpperCase()}
            </span>
            <span className="profile-name">{userEmail ?? 'Employee'}</span>
            <button
              className="button button-secondary sign-out-button"
              onClick={onSignOut}
              type="button"
            >
              Sign out
            </button>
          </div>
        </header>

        {signOutError && (
          <p className="sign-out-error" role="alert">
            {signOutError}
          </p>
        )}

        <section className="page-intro" aria-labelledby="page-title">
          <div>
            <h2 id="page-title">Inventory at a glance</h2>
            <p>Monitor your products and stock levels in one place.</p>
          </div>
        </section>

        {loadState === 'ready' && products.length > 0 && (
          <section className="sale-section" aria-labelledby="sale-title">
            <div className="section-heading">
              <div>
                <h2 id="sale-title">Record a sale</h2>
                <p>Stock is reduced only when the sale is accepted.</p>
              </div>
            </div>
            <form
              className="sale-form"
              onSubmit={(event) => void submitSale(event)}
            >
              <label>
                <span>Product</span>
                <select
                  aria-label="Sale product"
                  onChange={(event) => setSelectedProductId(event.target.value)}
                  value={selectedProductId}
                >
                  <option value="">Select a product</option>
                  {products.map((product) => (
                    <option key={product.productId} value={product.productId}>
                      {product.name} ({product.quantity} available)
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Quantity</span>
                <input
                  aria-label="Sale quantity"
                  min="1"
                  onChange={(event) => setSaleQuantity(event.target.value)}
                  type="number"
                  value={saleQuantity}
                />
              </label>
              <button
                className="button button-primary"
                disabled={saleState === 'submitting'}
                type="submit"
              >
                {saleState === 'submitting' ? 'Recording…' : 'Record sale'}
              </button>
            </form>
            {saleMessage && (
              <p className="sale-success" role="status">
                {saleMessage}
              </p>
            )}
            {saleError && (
              <p className="sale-error" role="alert">
                {saleError}
              </p>
            )}
          </section>
        )}

        {loadState === 'loading' && (
          <div className="state-panel loading-panel" role="status">
            <span className="loading-spinner" aria-hidden="true" />
            <span>Loading inventory…</span>
          </div>
        )}

        {loadState === 'error' && (
          <section className="state-panel error-panel" role="alert">
            <div>
              <h2>Inventory could not be loaded</h2>
              <p>{errorMessage}</p>
            </div>
            <button
              className="button button-secondary"
              onClick={() => setRetryCount((count) => count + 1)}
              type="button"
            >
              Try again
            </button>
          </section>
        )}

        {loadState === 'ready' && (
          <>
            <section className="summary-grid" aria-label="Inventory summary">
              <article className="summary-card">
                <div className="summary-card-heading">
                  <span className="summary-icon icon-blue" aria-hidden="true">
                    P
                  </span>
                  <span>Product SKUs</span>
                </div>
                <p className="summary-value">{analytics.productCount}</p>
                <p className="summary-caption">Products in your catalog</p>
              </article>
              <article className="summary-card">
                <div className="summary-card-heading">
                  <span className="summary-icon icon-violet" aria-hidden="true">
                    U
                  </span>
                  <span>Total units</span>
                </div>
                <p className="summary-value">
                  {new Intl.NumberFormat('en-US').format(analytics.totalUnits)}
                </p>
                <p className="summary-caption">Units currently in stock</p>
              </article>
              <article className="summary-card">
                <div className="summary-card-heading">
                  <span className="summary-icon icon-amber" aria-hidden="true">
                    !
                  </span>
                  <span>Low stock items</span>
                </div>
                <p className="summary-value">{analytics.lowStockCount}</p>
                <p className="summary-caption">At or below reorder level</p>
              </article>
              <article className="summary-card">
                <div className="summary-card-heading">
                  <span className="summary-icon icon-green" aria-hidden="true">
                    C
                  </span>
                  <span>Categories</span>
                </div>
                <p className="summary-value">{analytics.categoryCount}</p>
                <p className="summary-caption">Product categories</p>
              </article>
              <article className="summary-card">
                <div className="summary-card-heading">
                  <span className="summary-icon icon-green" aria-hidden="true">
                    $
                  </span>
                  <span>Inventory value</span>
                </div>
                <p className="summary-value">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(analytics.inventoryValue)}
                </p>
                <p className="summary-caption">Current stock at unit price</p>
              </article>
            </section>

            <CategoryInventoryChart categories={analytics.categories} />

            <section
              className="inventory-section"
              id="product-list"
              aria-labelledby="inventory-title"
            >
              <div className="section-heading">
                <div>
                  <h2 id="inventory-title">Product inventory</h2>
                  <p>
                    Showing {filteredProducts.length} of {products.length}{' '}
                    products
                  </p>
                </div>
                {analytics.lowStockCount > 0 && (
                  <span className="low-stock-summary">
                    {analytics.lowStockCount} need attention
                  </span>
                )}
              </div>

              <div className="table-toolbar">
                <label className="search-control">
                  <span className="visually-hidden">Search products</span>
                  <input
                    aria-label="Search products"
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search products"
                    type="search"
                    value={searchTerm}
                  />
                </label>

                <label className="filter-control">
                  <span className="visually-hidden">Category</span>
                  <select
                    aria-label="Category"
                    onChange={(event) =>
                      setSelectedCategory(event.target.value)
                    }
                    value={selectedCategory}
                  >
                    <option value="all">All categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="low-stock-filter">
                  <input
                    checked={stockFilter === 'low'}
                    onChange={(event) =>
                      setStockFilter(event.target.checked ? 'low' : 'all')
                    }
                    type="checkbox"
                  />
                  <span>Low stock only</span>
                </label>
              </div>

              {products.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state-icon" aria-hidden="true">
                    —
                  </span>
                  <h3>No products yet</h3>
                  <p>Your inventory is empty.</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state-icon" aria-hidden="true">
                    ?
                  </span>
                  <h3>No products match your filters</h3>
                  <p>Try a different search or clear the selected filters.</p>
                  <button
                    className="button button-link"
                    onClick={clearFilters}
                    type="button"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Product</th>
                        <th scope="col">Category</th>
                        <th scope="col">Price</th>
                        <th scope="col">Quantity</th>
                        <th scope="col">Reorder level</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => {
                        const lowStock = isProductLowStock(product);

                        return (
                          <tr key={product.productId}>
                            <td>
                              <span className="product-name">
                                {product.name}
                              </span>
                            </td>
                            <td>{product.category}</td>
                            <td>
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                              }).format(product.price)}
                            </td>
                            <td>
                              <span className="quantity-value">
                                {product.quantity}
                              </span>{' '}
                              units
                            </td>
                            <td>{product.lowStockThreshold} units</td>
                            <td>
                              <span
                                className={`status-pill ${
                                  lowStock ? 'status-low' : 'status-healthy'
                                }`}
                              >
                                {lowStock ? 'Low stock' : 'In stock'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default InventoryDashboard;
