import { useEffect, useRef, useState } from 'react';
import type { CategoryInventory } from './analytics/inventory-analytics';

interface CategoryInventoryChartProps {
  categories: CategoryInventory[];
}

function CategoryInventoryChart({ categories }: CategoryInventoryChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chartError, setChartError] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || categories.length === 0) {
      return;
    }

    let isCurrent = true;
    let destroyChart: (() => void) | undefined;
    setChartError(false);

    void import('chart.js/auto')
      .then(({ default: Chart }) => {
        if (!isCurrent || !canvasRef.current) {
          return;
        }

        const chart = new Chart(canvasRef.current, {
          type: 'bar',
          data: {
            labels: categories.map(({ category }) => category),
            datasets: [
              {
                label: 'Units in stock',
                data: categories.map(({ totalUnits }) => totalUnits),
                backgroundColor: '#4c8ee8',
                borderRadius: 6,
                maxBarThickness: 48,
              },
            ],
          },
          options: {
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { precision: 0 },
              },
            },
          },
        });
        destroyChart = () => chart.destroy();
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          console.error(
            JSON.stringify({
              level: 'error',
              message: 'Unable to render inventory category chart.',
              errorName: error instanceof Error ? error.name : 'UnknownError',
            }),
          );
          setChartError(true);
        }
      });

    return () => {
      isCurrent = false;
      destroyChart?.();
    };
  }, [categories]);

  return (
    <section className="analytics-chart" aria-labelledby="category-chart-title">
      <h2 id="category-chart-title">Stock by category</h2>
      {categories.length === 0 ? (
        <p className="chart-empty-state">No category data to display.</p>
      ) : chartError ? (
        <p className="chart-empty-state" role="alert">
          The category chart could not be displayed.
        </p>
      ) : (
        <>
          <div className="chart-canvas">
            <canvas
              ref={canvasRef}
              role="img"
              aria-label="Units in stock by category"
            />
          </div>
          <ul className="visually-hidden" aria-label="Category stock totals">
            {categories.map(({ category, totalUnits, inventoryValue }) => (
              <li key={category}>
                {category}: {totalUnits} units,{' '}
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                }).format(inventoryValue)}{' '}
                inventory value
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export default CategoryInventoryChart;
