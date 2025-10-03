import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import IncomeOverview from '../../components/Income/IncomeOverview';
import Modal from '../../components/Modal';
import AddIncomeForm from '../../components/Income/AddIncomeForm';
import IncomeList from '../../components/Income/IncomeList';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPath';
import { useUserAuth } from '../../hooks/useUserAuth';
import * as XLSX from 'xlsx';

const Income = () => {
  useUserAuth();

  const [incomeData, setIncomeData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDeleteAlert, setOpenDeleteAlert] = useState({
    show: false,
    data: null,
  });
  const [openAddIncomeModal, setOpenAddIncomeModal] = useState(false);

  const fetchIncomeDetails = async () => {
    if (loading) return;

    setLoading(true);

    try {
      const response = await axiosInstance.get(API_PATHS.INCOME.GET_ALL_INCOME);
      if (response.data) {
        setIncomeData(response.data);
      }
    } catch (error) {
      console.log("Something went wrong. Please try again later.", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteIncome = async (id) => {
    try {
      const response = await axiosInstance.delete(API_PATHS.INCOME.DELETE_INCOME(id));
      if (response.status === 200 || response.status === 204) {
        setIncomeData((prev) => prev.filter((income) => income._id !== id));
        setOpenDeleteAlert({ show: false, data: null });
      }
    } catch (error) {
      console.error("Failed to delete income:", error);
    }
  };  

  const handleDownloadIncomeDetails = async (type) => {
    try {
      const dataToExport = incomeData.map(({ source, amount, date }) => ({
        Source: source,
        Amount: amount,
        Date: new Date(date).toLocaleDateString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Income');

      const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      });

      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'Income_History.xlsx';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting Excel:", error);
    }
  };

  useEffect(() => {
    fetchIncomeDetails();
  }, []);

  return (
    <DashboardLayout activeMenu="Income">
      <div className="my-5 mx-auto relative">
        <IncomeOverview
          transactions={incomeData}
          onAddIncome={() => setOpenAddIncomeModal(true)}
          onDelete={deleteIncome}
        />

        <IncomeList 
          transactions={incomeData}
          onDelete={(id) => deleteIncome(id)}
          onDownload={handleDownloadIncomeDetails}
        />

        <Modal
          isOpen={openAddIncomeModal}
          onClose={() => setOpenAddIncomeModal(false)}
          title="Add Income"
        >
          <AddIncomeForm
            onSuccess={fetchIncomeDetails}
            onClose={() => setOpenAddIncomeModal(false)}
          />
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default Income;
