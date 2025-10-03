import React from "react";
import CustomBarChart from "../Charts/CustomBarChart";

const Last30DaysExpenses = ({ data = [] }) => {
  return (
    <div className="bg-gradient-to-b from-[#2a0f0f] to-[#1e1e1e] border border-red-600 rounded-3xl p-6 text-white shadow-md mt-6">
      <h2 className="text-lg font-semibold mb-4">Expense Trend (Last 30 Days)</h2>
      <div className="mt-8">
        <CustomBarChart data={data} />
      </div>
    </div>
  );
};

export default Last30DaysExpenses;
