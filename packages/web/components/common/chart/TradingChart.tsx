import { useEffect, useRef, useState } from "react";
import BigNumber from "bignumber.js";
import useApi from "@/hooks/useApi";
import { widget } from "@/plugins/charting_library/charting_library";

interface ChartProps {
  poolId: string;
  symbol: string;
  theme?: "light" | "dark";
}

const TradingChart = ({ poolId, symbol, theme = "dark" }: ChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tvWidgetRef = useRef<any>(null);
  const [chartReady, setChartReady] = useState(false);

  const getPoolApi = useApi({
    method: "GET",
    url: `liquidity/pools/${poolId}`,
    key: ["pool"],
  }).get;

  const getTrades = useApi({
    key: ["trades", poolId],
    method: "GET",
    url: `liquidity/trades/${poolId}?`,
  }).get;

  // Create data feed using our API hooks
  const createDatafeed = () => ({
    onReady: (callback: any) => {
      setTimeout(() =>
        callback({
          supported_resolutions: ["1", "5", "15", "30", "60", "240", "D"],
          supports_marks: false,
          supports_timescale_marks: false,
          supports_time: true,
          exchanges: [
            {
              value: "XRPL",
              name: "Xpump",
              desc: "1st Memecoins on XRPL",
            },
          ],
        })
      );
    },

    searchSymbols: () => {},

    resolveSymbol: (
      symbolName: string,
      onSymbolResolvedCallback: any,
      onErrorCallback: any
    ) => {
      getPoolApi
        ?.refetch()
        .then((pool) => {
          const symbolInfo = {
            name: symbolName,
            description: `${pool.data?.token.symbol}/XRP`,
            type: "crypto",
            session: "24x7",
            timezone: "Etc/UTC",
            exchange: "Xpump",
            minmov: 1,
            pricescale: 1000000, // 6 decimal places
            has_intraday: true,
            has_daily: true,
            has_weekly_and_monthly: true,
            supported_resolutions: ["1", "5", "15", "30", "60", "240", "D"],
            volume_precision: 8,
            data_status: "streaming",
          };

          onSymbolResolvedCallback(symbolInfo);
        })
        .catch(onErrorCallback);
    },

    getBars: async (
      symbolInfo: any,
      resolution: string,
      periodParams: any,
      onHistoryCallback: any,
      onErrorCallback: any
    ) => {
      try {
        console.log(periodParams);
        // const { from, to, firstDataRequest } = periodParams;
        const response = await getTrades?.refetch({});
        console.log(response);
        const bars = generateBars(response?.data?.trades);
        console.log(bars);
        // if (bars.length === 0) {
        //   onHistoryCallback([], { noData: true });
        // } else {
        //   onHistoryCallback(bars, {
        //     noData: false,
        //     nextTime: firstDataRequest ? undefined : bars[0].time,
        //   });
        // }
      } catch (error) {
        onErrorCallback(error);
      }
    },

    subscribeBars: (
      symbolInfo: any,
      resolution: string,
      onRealtimeCallback: any,
      subscriberUID: string
    ) => {
      // WebSocket subscription could be implemented here
    },

    unsubscribeBars: (subscriberUID: string) => {
      // WebSocket cleanup could be implemented here
    },
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const widgetOptions = {
      symbol: symbol,
      datafeed: createDatafeed(),
      interval: "150" as const,
      container: containerRef.current,
      library_path: "/lib/chart/charting_library/",
      locale: "en",
      disabled_features: [
        "header_widget", // Removes the entire top toolbar
        "header_symbol_search",
        "header_resolutions", // Removes timeframe selector
        "header_chart_type", // Removes chart type selector
        "header_settings", // Removes settings button
        "header_indicators", // Removes indicators button
        "header_compare", // Removes compare button
        "header_undo_redo", // Removes undo/redo buttons
        "header_screenshot", // Removes screenshot button
        "header_saveload", // Removes save/load buttons
        "left_toolbar", // Removes left toolbar
        "right_toolbar", // Removes right toolbar
        "control_bar", // Removes bottom control bar
        "timeframes_toolbar", // Removes bottom timeframe buttons
        "main_series_scale_menu", // Removes scale settings
        "symbol_search_hot_key", // Disables search hotkey
        "show_interval_dialog_on_key_press", // Disables interval dialog
        "context_menus", // Removes all context menus
        "edit_buttons_in_legend", // Removes edit buttons in legend
        "border_around_the_chart", // Removes chart border
        "remove_library_container_border", // Removes container border
        "chart_property_page_background", // Removes property background
        "property_pages", // Removes all property pages
        "show_chart_property_page", // Disables property dialog
        "chart_crosshair_menu", // Removes crosshair menu
        "caption_buttons_text_if_possible", // Removes button text
      ],
      enabled_features: [],
      theme: "light",
      autosize: true,
      fullscreen: true,
      timezone: "Etc/UTC",
      debug: false,
      loading_screen: {
        backgroundColor: "#000000",
        foregroundColor: "#131722",
      },
      overrides: {
        // Chart background and general style
      },
      studies_overrides: {},
      time_frames: [
        { text: "1D", resolution: "5", description: "1 Day" },
        { text: "5D", resolution: "15", description: "5 Days" },
        { text: "1M", resolution: "60", description: "1 Month" },
        { text: "3M", resolution: "240", description: "3 Months" },
      ],
      custom_css_url: "/trading-view-dark.css",
    };

    tvWidgetRef.current = new widget(widgetOptions);

    tvWidgetRef.current.onChartReady(() => {
      setChartReady(true);
      // Add default indicators
      tvWidgetRef.current.activeChart().createStudy("Volume");
      tvWidgetRef.current
        .activeChart()
        .createStudy("Moving Average", false, false, [14]);
    });

    return () => {
      if (tvWidgetRef.current) {
        tvWidgetRef.current.remove();
        tvWidgetRef.current = null;
      }
    };
  }, [poolId, symbol, theme]);

  return (
    <div className="flex flex-col items-center w-full bg-red-500  min-h-[300px] relative">
      <div
        ref={containerRef}
        className="w-full absolute top-0 left-0 right-0 bottom-0 max-h-[400px] bg-red-500"
      />
      {/* {!chartReady && (
        <div className="absolute inset-0 flex items-center justify-center dark:bg-gray-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      )} */}
    </div>
  );
};

// Utility function to generate OHLCV bars from trades
const generateBars = (trades: any[], resolution: string = "15") => {
  const intervalMs = getIntervalMs(resolution);
  const bars: { [key: number]: any } = {};
  console.log(trades);
  trades.forEach((trade) => {
    const tradeTime = new Date(trade.timestamp).getTime();
    const barTime = Math.floor(tradeTime / intervalMs) * intervalMs;
    const price = new BigNumber(trade.price).toNumber();
    const volume = new BigNumber(trade.amount).toNumber();

    if (!bars[barTime]) {
      bars[barTime] = {
        time: barTime,
        open: price,
        high: price,
        low: price,
        close: price,
        volume,
      };
    } else {
      const bar = bars[barTime];
      bar.high = Math.max(bar.high, price);
      bar.low = Math.min(bar.low, price);
      bar.close = price;
      bar.volume += volume;
    }
  });

  return Object.values(bars).sort((a, b) => a.time - b.time);
};

const getIntervalMs = (resolution: string): number => {
  const intervals: { [key: string]: number } = {
    "1": 60 * 1000,
    "5": 5 * 60 * 1000,
    "15": 15 * 60 * 1000,
    "30": 30 * 60 * 1000,
    "60": 60 * 60 * 1000,
    "240": 4 * 60 * 60 * 1000,
    D: 24 * 60 * 60 * 1000,
  };
  return intervals[resolution] || 60 * 1000;
};

export default TradingChart;
