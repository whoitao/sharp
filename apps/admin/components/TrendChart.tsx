"use client";

import { useLocale } from "@/lib/i18n";
import type { AdminPalette } from "@/lib/theme";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { useEffect, useMemo, useRef } from "react";

export interface TrendPoint {
  date: string;
  questions: number;
  duration: number;
  sessions: number;
}

export type TrendChartType = "bar" | "line";

interface TrendChartProps {
  trend: TrendPoint[];
  palette: AdminPalette;
  chartType?: TrendChartType;
  isDark?: boolean;
  loading?: boolean;
}

export default function TrendChart({
  trend,
  palette,
  chartType = "bar",
  isDark = false,
  loading = false,
}: TrendChartProps) {
  const { t } = useLocale();
  const chartRef = useRef<ReactECharts>(null);

  // 数据请求期间用 echarts 内置 loading 遮罩（只显示 spinner，不显示文字）
  useEffect(() => {
    const instance = chartRef.current?.getEchartsInstance();
    if (!instance) return;
    if (loading) {
      instance.showLoading({
        text: "",
        color: palette.accent,
        maskColor: isDark ? "rgba(20, 32, 27, 0.72)" : "rgba(255, 255, 255, 0.72)",
        spinnerRadius: 10,
        lineWidth: 3,
      });
    } else {
      instance.hideLoading();
    }
  }, [loading, isDark, palette]);

  const option = useMemo<EChartsOption>(() => {
    return {
      animationDuration: 400,
      grid: { left: 4, right: 8, top: 12, bottom: 4, containLabel: true },
      tooltip: {
        trigger: "axis",
        // 用细虚线指针替代整块 shadow，避免 hover 时遮住当前柱体
        axisPointer: {
          type: "line",
          lineStyle: { color: palette.border, width: 1, type: "dashed" },
        },
        confine: true,
        backgroundColor: palette.surface,
        borderColor: palette.border,
        textStyle: { color: palette.text, fontSize: 12 },
        // 默认显示在指针右上方，贴近容器边缘时翻到另一侧
        position: (point, _params, _dom, _rect, size) => {
          const [x, y] = point;
          const tooltipWidth = size.contentSize[0];
          const tooltipHeight = size.contentSize[1];
          const viewWidth = size.viewSize[0];
          const left = x + 12 + tooltipWidth > viewWidth ? x - 12 - tooltipWidth : x + 12;
          const top = Math.max(8, y - tooltipHeight - 12);
          return [left, top];
        },
        extraCssText: "box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); border-radius: 8px; padding: 8px 10px;",
        formatter: (raw: unknown) => {
          const list = Array.isArray(raw) ? raw : [raw];
          const first = list[0] as { dataIndex?: number } | undefined;
          const point = trend[first?.dataIndex ?? 0];
          if (!point) return "";
          return [
            `<div style="font-weight:600;margin-bottom:2px">${point.date}</div>`,
            `<div>${t("stats.trendQuestions")}: ${point.questions}</div>`,
            `<div>${t("stats.trendSessions")}: ${point.sessions}</div>`,
          ].join("");
        },
      },
      xAxis: {
        type: "category",
        data: trend.map((point) => point.date.slice(5)),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: palette.border } },
        axisLabel: { color: palette.textTertiary, fontSize: 10, margin: 8 },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: palette.textTertiary, fontSize: 10 },
        splitLine: { lineStyle: { color: palette.borderLight } },
      },
      series: [
        chartType === "line"
          ? {
              type: "line",
              name: t("stats.trendQuestions"),
              data: trend.map((point) => point.questions),
              smooth: true,
              symbol: "circle",
              symbolSize: 6,
              lineStyle: { width: 2, color: palette.accent },
              itemStyle: { color: palette.accent },
              // hover 时不淡化其他数据点
              emphasis: { focus: "none", itemStyle: { opacity: 1 } },
              blur: { itemStyle: { opacity: 1 } },
              areaStyle: {
                color: {
                  type: "linear",
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: `${palette.accent}59` },
                    { offset: 1, color: `${palette.accent}00` },
                  ],
                },
              },
            }
          : {
              type: "bar",
              name: t("stats.trendQuestions"),
              data: trend.map((point) => point.questions),
              barMaxWidth: 28,
              barCategoryGap: "38%",
              // 关闭 hover 时的联动淡化，保证所有柱子前后都清晰可见
              emphasis: { focus: "none", itemStyle: { opacity: 1 } },
              blur: { itemStyle: { opacity: 1 } },
              itemStyle: {
                borderRadius: [4, 4, 0, 0],
                color: {
                  type: "linear",
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: palette.accent },
                    { offset: 1, color: palette.accentStrong },
                  ],
                },
              },
            },
      ],
    };
  }, [trend, palette, t, chartType]);

  return (
    <ReactECharts
      ref={chartRef}
      option={option}
      notMerge
      opts={{ renderer: "canvas" }}
      style={{ width: "100%", height: 210 }}
    />
  );
}
