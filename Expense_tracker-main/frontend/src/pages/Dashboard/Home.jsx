import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { useUserAuth } from '../../hooks/useUserAuth';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPath';
import InfoCard from '../../components/Cards/InfoCard';
import RecentTransactions from '../../components/Dashboard/RecentTransactions';
import FinanceOverview from '../../components/Dashboard/FinanceOverview';
import ExpenseTransactions from '../../components/Dashboard/ExpenseTransactions';
import Last30DaysExpenses from '../../components/Dashboard/last30DaysExpenses';
import IncomeTransactions from '../../components/Dashboard/IncomeTransactions';
import Last60DaysIncome from '../../components/Dashboard/last60DaysIncome';

import { LuHandCoins, LuWalletMinimal } from 'react-icons/lu';
import { IoMdCard } from "react-icons/io";
import { addThousandsSeparator } from '../../utils/helper';

const Home = () => {
  useUserAuth();

  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchDashboardData = async () => {
    if (loading) return;

    setLoading(true);

    try {
        const response = await axiosInstance.get(
            `${API_PATHS.DASHBOARD.GET_DATA}`
        );

        if (response.data) {
            setDashboardData(response.data);
        }
    } catch (error) {
        console.error("Something went wrong please try again", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    return () => {};
  }, []);

  return (
    <DashboardLayout activeMenu="Dashboard">
      <div className="my-5 mx-auto">
        <div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
          <InfoCard
            icon={<IoMdCard />}
            label="Total Balance"
            value={addThousandsSeparator(dashboardData?.totalBalance || 0)}
            color="neon-blue-glow"
          />

          <InfoCard
            icon={<LuWalletMinimal />}
            label="Total Income"
            value={addThousandsSeparator(dashboardData?.totalIncome || 0)}
            color="neon-green-glow"
          />

          <InfoCard
            icon={<LuHandCoins />}
            label="Total Expense"
            value={addThousandsSeparator(dashboardData?.totalExpense || 0)}
            color="neon-red-glow"
          />
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mt-1'>
          <div className="flex flex-col gap-10">
            <RecentTransactions
              transactions={dashboardData?.recentTransactions}
              onSeeMore={() => navigate("/expense")}
            />
          </div>
          <div className="mt-10">
            <FinanceOverview
              totalBalance={dashboardData?.totalBalance || 0}
              totalIncome={dashboardData?.totalIncome || 0}
              totalExpense={dashboardData?.totalExpense || 0}
            />
          </div>
          <div>
            <IncomeTransactions
              transactions={dashboardData?.last60DaysIncome?.transactions || []}
              onSeeMore={() => navigate("/income")}
            />

            <Last60DaysIncome
              income={dashboardData?.last60DaysIncome?.transactions || []}
            />
          </div>

          <div>
            <ExpenseTransactions
              transactions={dashboardData?.last30DaysExpenses?.transactions || []}
              onSeeMore={() => navigate("/expense")}
            />
            <Last30DaysExpenses
              data={dashboardData?.last30DaysExpenses?.transactions || []}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Home;
