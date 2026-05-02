"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type PassageVisualData = {
  visualId: string;
  type: "table" | "chart";
  data: unknown;
  spec: unknown;
};

type TableShape = {
  columns: string[];
  rows: Array<Array<string | number | null>>;
};

type Props = {
  visual: PassageVisualData;
};

function normalizeTableData(data: unknown): TableShape | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const asRecord = data as Record<string, unknown>;

  const columns = asRecord.columns;
  const rows = asRecord.rows;
  if (Array.isArray(columns) && Array.isArray(rows)) {
    const validColumns = columns.every((entry) => typeof entry === "string");
    const validRows = rows.every(
      (entry) =>
        Array.isArray(entry) &&
        entry.every((cell) => typeof cell === "string" || typeof cell === "number" || cell === null),
    );

    if (validColumns && validRows) {
      return {
        columns: columns as string[],
        rows: rows as Array<Array<string | number | null>>,
      };
    }
  }

  const values = asRecord.values;
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const allRowsAreObjects = values.every((entry) => entry && typeof entry === "object" && !Array.isArray(entry));
  if (!allRowsAreObjects) {
    return null;
  }

  const keys = Object.keys(values[0] as Record<string, unknown>);
  if (keys.length === 0) {
    return null;
  }

  return {
    columns: keys,
    rows: values.map((entry) =>
      keys.map((key) => {
        const value = (entry as Record<string, unknown>)[key];
        if (typeof value === "string" || typeof value === "number" || value === null) {
          return value;
        }
        return JSON.stringify(value);
      }),
    ),
  };
}

export function PassageVisual({ visual }: Props) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);

  const tableData = useMemo(() => {
    if (visual.type !== "table") {
      return null;
    }

    return normalizeTableData(visual.data);
  }, [visual.data, visual.type]);

  useEffect(() => {
    const container = chartRef.current;

    if (visual.type !== "chart" || !container) {
      return;
    }

    let disposed = false;
    setChartError(null);

    async function renderChart() {
      try {
        const embedModule = await import("vega-embed");
        if (disposed) {
          return;
        }

        const embed = embedModule.default;
        const specWithData = {
          ...(visual.spec as Record<string, unknown>),
          data: visual.data,
        };

        const result = await embed(container!, specWithData, {
          actions: false,
          renderer: "svg",
        });

        if (disposed) {
          result.finalize();
        }
      } catch (err) {
        if (!disposed) {
          setChartError(err instanceof Error ? err.message : "Chart rendering failed.");
        }
      }
    }

    void renderChart();

    return () => {
      disposed = true;
      container.innerHTML = "";
    };
  }, [visual.data, visual.spec, visual.type]);

  if (visual.type === "table") {
    if (!tableData) {
      return (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Table visual is unavailable for this question.
        </div>
      );
    }

    return (
      <div className="mb-5 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm text-slate-800">
          <thead className="bg-slate-100 text-left text-slate-700">
            <tr>
              {tableData.columns.map((column) => (
                <th key={column} className="px-3 py-2 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.rows.map((row, rowIndex) => (
              <tr key={`${visual.visualId}-row-${rowIndex}`} className="border-t border-slate-200">
                {row.map((cell, cellIndex) => (
                  <td key={`${visual.visualId}-${rowIndex}-${cellIndex}`} className="px-3 py-2">
                    {cell === null ? "-" : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      {chartError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Chart failed to render: {chartError}
        </div>
      ) : (
        <div ref={chartRef} className="min-h-[200px] w-full overflow-x-auto" aria-label="Question chart visual" />
      )}
    </div>
  );
}


