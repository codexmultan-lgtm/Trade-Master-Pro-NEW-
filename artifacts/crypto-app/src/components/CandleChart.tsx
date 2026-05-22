import { useEffect, useRef } from "react";
import { createChart, ColorType, CandlestickSeries, IChartApi, ISeriesApi, Time } from "lightweight-charts";
import { Candle } from "@workspace/api-client-react";

interface CandleChartProps {
  data: Candle[];
  symbol: string;
}

export function CandleChart({ data, symbol }: CandleChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "#0d1117" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#1e2328" },
        horzLines: { color: "#1e2328" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#1e2328",
      },
      rightPriceScale: {
        borderColor: "#1e2328",
      },
      crosshair: {
        mode: 1,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#00c076",
      downColor: "#ff3a3a",
      borderVisible: false,
      wickUpColor: "#00c076",
      wickDownColor: "#ff3a3a",
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;

    const formattedData = data
      .map((d) => ({
        time: d.time as Time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    seriesRef.current.setData(formattedData);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return <div ref={chartContainerRef} style={{ width: "100%", height: "100%" }} />;
}
