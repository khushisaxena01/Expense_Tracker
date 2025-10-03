import React, { useEffect, useState } from 'react'
import { useUserAuth } from "../../hooks/useUserAuth";
import DashboardLayout from '../../components/layouts/DashboardLayout';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPath';
import ExpenseOverview from '../../components/Expense/ExpenseOverview';
import ModalExpense from '../../components/ModalExpense';
import AddExpenseForm from '../../components/Expense/AddExpenseForm';
import ExpenseList from '../../components/Expense/ExpenseList';
import * as XLSX from 'xlsx';

const Expense = () => {
  useUserAuth();

  const [expenseData, setExpenseData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDeleteAlert, setOpenDeleteAlert] = useState({
    show: false,
    data: null,
  })
  const [openAddExpenseModal, setOpenAddExpenseModal] = useState(false);

  const fetchExpenseDetails = async () => {
    if(loading) return ;

    setLoading(true);

    try {
      const response = await axiosInstance.get(
        `${API_PATHS.EXPENSE.GET_ALL_EXPENSE}`
      );

      if(response.data) {
        setExpenseData(response.data);
      }
    } catch (error) {
      console.error("Something went wrong please try again ", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (expense) => {
    const { category, amount, date } = expense;
  
    if (!category.trim()) {
      toast.error("Category is required");
      return;
    }
  
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      toast.error("Invalid amount");
      return;
    }
  
    if (!date) {
      toast.error("Date is required");
      return;
    }
  
    try {
      const response = await axiosInstance.post(API_PATHS.EXPENSE.ADD_EXPENSE, {
        category,
        amount,
        date,
      });
  
      const newExpense = response.data; // assuming backend sends the created expense
  
      setExpenseData((prev) => [...prev, newExpense]); // 👈 manually push to state
      setOpenAddExpenseModal(false);
      toast.success("Expense added successfully");
    } catch (error) {
      console.error("Something went wrong please try again", error);
    }
  };

  const deleteExpense = async (id) => {
    try {
      const response = await axiosInstance.delete(API_PATHS.EXPENSE.DELETE_EXPENSE(id));
      if (response.status === 200 || response.status === 204) {
        setExpenseData((prev) => prev.filter((expense) => expense._id !== id));
        setOpenDeleteAlert({ show: false, data: null });
      }
    } catch (error) {
      console.error("Failed to delete expense:", error);
    }
  };

  const handleDownloadExpenseDetails = async (type) => {
    try {
      const dataToExport = expenseData.map(({ category, amount, date }) => ({
        Category: category,
        Amount: amount,
        Date: new Date(date).toLocaleDateString(),
      }));
  
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');
  
      const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      });
  
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'Expense_History.xlsx';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting Excel:", error);
    }
  };

  useEffect(() => {
    fetchExpenseDetails();

    return () => {};
  }, []);

  return (
    <DashboardLayout activeMenu="Expense">
      <div className="my-5 mx-auto">
        <div className=''>
          <div className='relative'>
            <ExpenseOverview
              transactions={expenseData}
              onAddExpense={() => setOpenAddExpenseModal(true)}
            />
            <ExpenseList
              transactions={expenseData}
              onDelete={(id) => deleteExpense(id)}
              onDownload={handleDownloadExpenseDetails}
            />
            <ModalExpense
              isOpen={openAddExpenseModal}
              onClose={() => setOpenAddExpenseModal(false)}
            >
            <AddExpenseForm onSubmit={handleAddExpense} />
          </ModalExpense>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default Expense