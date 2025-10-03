import React from "react";
import { LuHandCoins, LuWalletMinimal, LuPiggyBank } from "react-icons/lu";
import { addThousandsSeparator } from "../../utils/helper";
import CustomPieChart from "../Charts/CustomPieChart";

const FinanceOverview = ({ totalIncome , totalExpense , totalBalance }) => {
  const data = [
    { name: "Income", value: totalIncome },
    { name: "Expense", value: totalExpense },
  ];

  return (
    <div className="bg-[#1e1e1e] border border-gray-700 rounded-3xl 
      p-5 text-white shadow-md h-[350px] overflow-y-auto 
      scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
      
      <h2 className="text-lg font-semibold mb-3">Finance Overview</h2>

      {/* Custom Pie Chart Component */}
      <CustomPieChart data={data} />

      <div className="mt-6 space-y-2">
        <div className="flex justify-between items-center text-green-500">
          <div className="flex items-center gap-2">
            <LuWalletMinimal />
            <span>Income</span>
          </div>
          <span className="font-medium">₹{addThousandsSeparator(totalIncome)}</span>
        </div>

        <div className="flex justify-between items-center text-red-500">
          <div className="flex items-center gap-2">
            <LuHandCoins />
            <span>Expense</span>
          </div>
          <span className="font-medium">₹{addThousandsSeparator(totalExpense)}</span>
        </div>

        <div className="flex justify-between items-center border-t border-gray-600 pt-2 mt-2 text-blue-400">
          <div className="flex items-center gap-2">
            <LuPiggyBank />
            <span>Savings</span>
          </div>
          <span className="font-semibold">₹{addThousandsSeparator(totalBalance)}</span>
        </div>
      </div>
    </div>
  );
};

export default FinanceOverview;
