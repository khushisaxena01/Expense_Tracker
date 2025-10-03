import React, { useState } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";

const AddExpenseForm = ({ onSuccess, onClose }) => {
  const [newExpense, setNewExpense] = useState({
    category: "",
    amount: "",
    date: "",
  });

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post(API_PATHS.EXPENSE.ADD_EXPENSE, newExpense);
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to add expense:", error);
    }
  };

  return (
    <form onSubmit={handleAddExpense} className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-white mb-1">Category</label>
        <input
          type="text"
          value={newExpense.category}
          onChange={(e) =>
            setNewExpense((prev) => ({ ...prev, category: e.target.value }))
          }
          className="w-full px-4 py-2 bg-blue-900/70 text-white placeholder-gray-300 rounded-2xl border border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="e.g., Groceries"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-white mb-1">Amount (₹)</label>
        <input
          type="number"
          value={newExpense.amount}
          onChange={(e) =>
            setNewExpense((prev) => ({ ...prev, amount: e.target.value }))
          }
          className="w-full px-4 py-2 bg-blue-900/70 text-white placeholder-gray-300 rounded-2xl border border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="e.g., 1200"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-white mb-1">Date</label>
        <input
          type="date"
          value={newExpense.date}
          onChange={(e) =>
            setNewExpense((prev) => ({ ...prev, date: e.target.value }))
          }
          className="w-medium px-4 py-2 bg-blue-900/70 text-white rounded-2xl border border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          required
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="bg-blue-500 border border-black hover:bg-blue-600 active:scale-95 transition-transform duration-150 text-white px-5 py-2 rounded-2xl font-semibold shadow"
        >
          Save Expense
        </button>
      </div>
    </form>
  );
};

export default AddExpenseForm;
