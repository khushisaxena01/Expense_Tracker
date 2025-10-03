import React, { useEffect, useState } from 'react';
import { LuPlus } from "react-icons/lu";
import CustomBarIncome from '../Charts/CustomBarIncome';
import { prepareIncomeBarChartData, addThousandsSeparator } from '../../utils/helper';

const IncomeOverview = ({ transactions = [], onAddIncome }) => {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const result = prepareIncomeBarChartData(transactions);
    setChartData(result);
  }, [transactions]);

  const totalIncome = transactions.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div className='bg-gradient-to-br from-green-800 via-emerald-700 to-green-900 text-white rounded-3xl p-6 shadow-xl w-full'>
      <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
        <div>
          <h2 className='text-xl font-semibold tracking-tight'>Income Overview</h2>
          <p className='text-sm text-gray-200 mt-1'>
            Track your earnings over time and analyze your income trends.
          </p>
        </div>
        <button
         className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-blue-700 active:scale-90 transition-transform duration-100 text-white rounded-2xl shadow-md"
         onClick={onAddIncome}
         >
         <LuPlus className="text-lg" />
         Add Income
         </button>
      </div>

      <div className='mt-8 flex flex-col md:flex-row md:items-center md:justify-between'>
        <div>
          <p className='text-sm text-gray-300'>Total Income</p>
          <h3 className='text-3xl font-bold mt-1'>₹{addThousandsSeparator(totalIncome.toFixed(2))}</h3>
        </div>
      </div>

      <div className='mt-10'>
        <CustomBarIncome data={chartData} />
      </div>
    </div>
  );
};

export default IncomeOverview;
