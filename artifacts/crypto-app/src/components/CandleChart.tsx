import { useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi, ISeriesApi, Time } from "lightweight-charts";
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

    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0d1117" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#1e2328" },
        horzLines: { color: "#1e2328" },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#00c076",
      downColor: "#ff3a3a",
      borderVisible: false,
      wickUpColor: "#00c076",
      wickDownColor: "#ff3a3a",
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      const formattedData = data.map((d) => ({
        time: d.time as Time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      })).sort((a, b) => (a.time as number) - (b.time as number));
      
      seriesRef.current.setData(formattedData);
    }
  }, [data]);

  return <div ref={chartContainerRef} className="w-full h-full" />;
}
