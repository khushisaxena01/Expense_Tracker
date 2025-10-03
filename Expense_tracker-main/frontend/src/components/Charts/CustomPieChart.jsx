import React from "react";
import {
   PieChart,
   Pie,
   Cell,
   ResponsiveContainer,
   Tooltip,
   Legend,
 } from "recharts";
import CustomTooltip from "./CustomTooltip";
import CustomLegend from "./CustomLegend";
import { addThousandsSeparator } from "../../utils/helper";

const COLORS = ["#39FF14", "#FF007F", "#00FFFF"];

const CustomPieChart = ({ data }) => {
  const incomeEntry = data.find(entry => entry.name.toLowerCase() === "income");
  const expenseEntry = data.find(entry => entry.name.toLowerCase() === "expense");

  const totalIncome = incomeEntry ? incomeEntry.value : 0;
  const totalExpense = expenseEntry ? expenseEntry.value : 0;
  const totalBalance = totalIncome - totalExpense;

  const coloredData = data.map((entry, index) => ({
    ...entry,
    color: COLORS[index % COLORS.length]
  }));

  return (
    <div className="w-full flex flex-col items-center relative">
      <div className="h-48 w-full">
        <ResponsiveContainer>
        <PieChart>
         <Pie
            data={coloredData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={70}
            dataKey="value"
            stroke="none"
            nameKey="name"
         >
            {coloredData.map((entry, index) => (
               <Cell
               key={`cell-${index}`}
               fill={entry.color}
               />
            ))}
         </Pie>
         <Tooltip content={<CustomTooltip />} />
         <Legend content={<CustomLegend />} />
         </PieChart>
        </ResponsiveContainer>

        <div className="absolute top-[41.5%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 text-center text-white">
          <div className="text-l text-blue-400">Balance</div>
          <div className="text-sm font-semibold text-blue-400">
            ₹{addThousandsSeparator(totalBalance)}
          </div>
        </div>
      </div>

      <CustomLegend data={coloredData} />
    </div>
  );
};

export default CustomPieChart;
