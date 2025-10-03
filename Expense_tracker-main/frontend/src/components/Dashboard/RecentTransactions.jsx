import React from "react";
import { MdArrowForward } from "react-icons/md";
import TransactionInfoCard from "../Cards/TransactionInfoCard";

const RecentTransactions = ({ transactions = [], onSeeMore }) => {
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

  const getType = (tx) => (tx.category ? "expense" : "income");

  const sortedTransactions = [...transactions].sort((a, b) => a.order - b.order);

  return (
      <div className="bg-[#1e1e1e] border border-gray-700 rounded-3xl p-6 text-white shadow-md mt-10 max-h-[350px]">
          <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Recent Transactions</h2>
              <button
                  onClick={onSeeMore}
                  className="flex items-center font-semibold gap-2 border border-white text-white 
                           px-3 py-1 rounded-lg text-sm hover:bg-blue-600 hover:text-white 
                           transition active:scale-80"
              >
                  See More <MdArrowForward className="text-base" />
              </button>
          </div>

          <div className="max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              <ul className="space-y-3">
                  {sortedTransactions.slice(0, 10).map((tx, index) => (
                      <TransactionInfoCard
                          key={index}
                          title={getTitle(tx)}
                          date={formatDate(tx.date)}
                          amount={tx.amount}
                          type={getType(tx)}
                          hideDeleteBtn={true}
                      />
                  ))}
              </ul>
          </div>
      </div>
  );
};

export default RecentTransactions;
