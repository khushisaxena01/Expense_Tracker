import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { prepareIncomeBarChartData } from "../../utils/helper";

const CustomBarChartIncome = ({ data }) => {
  const chartData = prepareIncomeBarChartData(data);

  const colors = [
    "#34d399", "#10b981", "#22c55e", "#16a34a", "#059669",
    "#4ade80", "#6ee7b7", "#5eead4", "#2dd4bf", "#14b8a6"
  ];

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={chartData}
        margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
        barSize={30}
      >
        <XAxis
          dataKey="name"
          axisLine={{ stroke: "#fff" }}
          tickLine={false}
          tick={{ fill: "#fff", fontSize: 12 }}
        />
        <YAxis
          axisLine={{ stroke: "#fff" }}
          tickLine={false}
          tick={{ fill: "#fff", fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0f2a1c",
            border: "none",
            borderRadius: "10px",
            color: "#fff",
            fontWeight: "bold",
          }}
          labelStyle={{
            color: "#fff",
            fontWeight: "bold",
          }}
          formatter={(value) => [
            `₹${value.toLocaleString("en-IN")}`,
            "Income",
          ]}
          itemStyle={{
            color: "#fff",
          }}
        />
        <Bar
          dataKey="value"
          radius={[8, 8, 0, 0]}
          isAnimationActive
        >
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default CustomBarChartIncome;
