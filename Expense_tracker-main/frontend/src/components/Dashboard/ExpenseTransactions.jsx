import React from "react";
import { MdArrowForward } from "react-icons/md";
import TransactionInfoCard from "../Cards/TransactionInfoCard";

const ExpenseTransactions = ({ transactions = [], onSeeMore }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getTitle = (tx) => {
    return tx.title?.trim() || tx.source?.trim() || tx.category?.trim() || "No Title";
  };

  return (
    <div className="bg-[#1e1e1e] border border-gray-700 rounded-3xl p-6 text-white shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-red-400">Recent Expenses</h2>
        <button
          onClick={onSeeMore}
          className="flex items-center gap-2 font-semibold border border-red-600 text-red-600 
                   px-3 py-1 rounded-lg text-sm hover:bg-red-600 hover:text-white 
                   transition active:scale-80"
        >
          See More <MdArrowForward className="text-base" />
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto pr-1 custom-scrollbar">
        <ul className="space-y-3">
          {transactions.slice(0, 10).map((tx, index) => (
            <TransactionInfoCard
              key={index}
              title={getTitle(tx)}
              date={formatDate(tx.date)}
              amount={tx.amount}
              type="expense"
              hideDeleteBtn={true}
            />
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ExpenseTransactions;
