import React from "react";
import CustomBarChartIncome from "../Charts/CustomBarChartIncome";

const Last60DaysIncome = ({ income }) => {
  return (
    <div className="bg-gradient-to-b from-green-900 to-[#1e1e1e] border border-green-600 rounded-3xl p-6 text-white shadow-md mt-6">
      <h2 className="text-lg font-semibold mb-4">Income Trend (Last 60 Days)</h2>
      <div className="mt-8">
        <CustomBarChartIncome data={income}/>
      </div>
    </div>
  );
};

export default Last60DaysIncome;
