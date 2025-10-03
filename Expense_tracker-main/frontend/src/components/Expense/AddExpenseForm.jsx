import React, { useState } from "react";

const AddExpenseForm = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    category: "",
    amount: "",
    date: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.category || !formData.amount || !formData.date) return;
    onSubmit(formData);
    setFormData({ category: "", amount: "", date: "" });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-xl font-bold text-white mb-2">Add New Expense</h2>

      <div>
        <label className="block text-sm font-semibold text-white mb-1">Category</label>
        <input
          type="text"
          name="category"
          value={formData.category}
          onChange={handleChange}
          placeholder="e.g., Food, Travel"
          className="w-full px-4 py-2 bg-black text-white placeholder-white rounded-xl border border-red-500 focus:outline-none focus:ring-2 focus:ring-red-300"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-white mb-1">Amount (₹)</label>
        <input
          type="number"
          name="amount"
          value={formData.amount}
          onChange={handleChange}
          placeholder="e.g., 500"
          className="w-full px-4 py-2 bg-black text-white placeholder-white rounded-xl border border-red-500 focus:outline-none focus:ring-2 focus:ring-red-300"
          required
        />
      </div>
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          onFocus={(e) => e.target.showPicker && e.target.showPicker()} // 💡 this opens the calendar
          className="w-full px-4 py-2 bg-black text-white rounded-xl border border-red-500 focus:outline-none focus:ring-2 focus:ring-red-300"
          required
        />
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="bg-black text-white px-6 py-2 rounded-2xl font-semibold transition-all duration-200 hover:bg-red-600 hover:border hover:border-black hover:shadow-lg active:scale-95"
        >
          Save
        </button>
      </div>
    </form>
  );
};

export default AddExpenseForm;
