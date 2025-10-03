import React, { useEffect, useState } from 'react';
import { LuPlus } from "react-icons/lu";
import { prepareExpenseLineChartData } from '../../utils/helper';
import CustomLineChart from '../Charts/CustomLineChart';

const ExpenseOverview = ({ transactions, onAddExpense }) => {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const result = prepareExpenseLineChartData(transactions);
    setChartData(result);
  }, [transactions]);

  return (
   <div className='bg-gradient-to-br from-red-950 to-red-600 rounded-3xl p-6 shadow-lg text-white'>
     <div className='flex items-center justify-between mb-6'>
       <div>
         <h5 className='text-lg font-semibold'>Expense Overview</h5>
         <p className='text-sm text-red-100 mt-0.5'>
           Track your expenses over time.
         </p>
       </div>
       <button
         onClick={onAddExpense}
         className='flex items-center gap-2 bg-red-700 text-white font-semibold px-3 py-1.5 rounded-2xl shadow hover:bg-black transition-all duration-200 transform active:scale-95 active:translate-y-[1px] text-sm sm:text-base sm:px-4 sm:py-2'
       >
         Add Expense
         <LuPlus className='text-lg' />
       </button>
     </div>

     <div className='mt-6'>
       <CustomLineChart data={chartData} />
     </div>
   </div>
 );
};

export default ExpenseOverview;
