import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

/*
  Chart System

  Wrapper around Recharts providing:
  - centralized color theming
  - reusable tooltip + legend
  - consistent styling

  Context here is LOCAL (only for chart children),
  not application state.
*/

const THEMES = { light: "", dark: ".dark" };

const ChartContext = React.createContext(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) throw new Error("useChart must be used inside <ChartContainer />");
  return context;
}

/* ================= CONTAINER ================= */

export const ChartContainer = React.forwardRef(
  ({ id, className, children, config, ...props }, ref) => {
    const uniqueId = React.useId();
    const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

    return (
      <ChartContext.Provider value={{ config }}>
        <div
          data-chart={chartId}
          ref={ref}
          className={cn(
            "flex aspect-video justify-center text-xs \
            [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground \
            [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50",
            className
          )}
          {...props}
        >
          <ChartStyle id={chartId} config={config} />
          <RechartsPrimitive.ResponsiveContainer>
            {children}
          </RechartsPrimitive.ResponsiveContainer>
        </div>
      </ChartContext.Provider>
    );
  }
);

ChartContainer.displayName = "ChartContainer";

/* ================= STYLE ================= */

export const ChartStyle = ({ id, config }) => {
  const colorConfig = Object.entries(config).filter(
    ([_, c]) => c.theme || c.color
  );

  if (!colorConfig.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, item]) => {
    const color = item.theme?.[theme] || item.color;
    return color ? `--color-${key}: ${color};` : null;
  })
  .join("\n")}
}`
          )
          .join("\n"),
      }}
    />
  );
};

/* ================= TOOLTIP ================= */

export const ChartTooltip = RechartsPrimitive.Tooltip;

export const ChartTooltipContent = React.forwardRef(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const { config } = useChart();

    if (!active || !payload?.length) return null;

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className
        )}
      >
        {!hideLabel && label && (
          <div className="font-medium">
            {labelFormatter ? labelFormatter(label, payload) : label}
          </div>
        )}

        {payload.map((item, index) => {
          const key = nameKey || item.name || item.dataKey;
          const cfg = config[key] || {};
          const indicatorColor = color || item.color;

          return (
            <div key={index} className="flex justify-between gap-2">
              <div className="flex items-center gap-2">
                {!hideIndicator && (
                  <div
                    className={cn(
                      "h-2.5 w-2.5 rounded-sm",
                      indicator === "line" && "w-4 h-[2px]"
                    )}
                    style={{ backgroundColor: indicatorColor }}
                  />
                )}
                <span className="text-muted-foreground">
                  {cfg.label || item.name}
                </span>
              </div>

              <span className="font-mono">
                {formatter
                  ? formatter(item.value, item.name, item, index, item.payload)
                  : Number(item.value).toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
);

ChartTooltipContent.displayName = "ChartTooltipContent";

/* ================= LEGEND ================= */

export const ChartLegend = RechartsPrimitive.Legend;

export const ChartLegendContent = React.forwardRef(
  ({ className, payload, verticalAlign = "bottom", hideIcon = false, nameKey }, ref) => {
    const { config } = useChart();
    if (!payload?.length) return null;

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-4",
          verticalAlign === "top" ? "pb-3" : "pt-3",
          className
        )}
      >
        {payload.map((item, i) => {
          const key = nameKey || item.dataKey;
          const cfg = config[key] || {};

          return (
            <div key={i} className="flex items-center gap-1.5">
              {!hideIcon && (
                <div
                  className="h-2 w-2 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
              )}
              {cfg.label || item.value}
            </div>
          );
        })}
      </div>
    );
  }
);

ChartLegendContent.displayName = "ChartLegendContent";
