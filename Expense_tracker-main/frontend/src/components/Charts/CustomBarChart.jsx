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
import { prepareExpenseBarChartData } from "../../utils/helper";

const CustomBarChart = ({ data }) => {
  const chartData = prepareExpenseBarChartData(data);

  const colors = [
    "#ff4d4f", "#ff7875", "#ff6f61", "#e63946", "#ff5c57",
    "#f94144", "#ff6666", "#f03e3e", "#e03131", "#c92a2a"
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
            backgroundColor: "#2a0f0f",  // Keep the background color as it is
            border: "none",
            borderRadius: "10px",
            color: "#fff",  // Text color white
            fontWeight: "bold",  // Optional: If you want bold text
         }}
         labelStyle={{
            color: "#fff", // Ensure label is white
            fontWeight: "bold", // Bold for the label
         }}
         formatter={(value) => [
            `₹${value.toLocaleString("en-IN")}`, // Value in white
            "Expense",  // Label text in white
         ]}
         itemStyle={{
            color: "#fff", // This ensures the "Expense" label text in the tooltip is also white
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

export default CustomBarChart;
