import React from "react";
import { Trash2, Download, TrendingDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const ExpenseList = ({ transactions, onDelete, onDownload }) => {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center text-white bg-gradient-to-r from-rose-900 to-red-700 py-6 rounded-xl shadow-md max-w-2xl mx-auto">
        No expense records found.
      </div>
    );
  }

  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  return (
    <div className="mt-8 bg-gradient-to-br border border-white from-blue-1000 to-blue-800 text-white p-6 rounded-2xl shadow-xl max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">Expense History</h3>
        <button
          onClick={() => onDownload("all")}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 active:scale-95 transition transform text-white px-4 py-2 rounded-lg shadow font-medium text-sm"
        >
          Download All
          <Download size={16} />
        </button>
      </div>

      {/* Cards */}
      <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-1 flex flex-col items-center">
        <AnimatePresence>
          {sortedTransactions.map((item) => (
            <motion.div
              key={item._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              layout
              className="w-full max-w-3xl flex justify-between items-center bg-gradient-to-r from-red-700 to-rose-950 p-4 rounded-2xl border border-red-700 shadow-md hover:scale-[1.02] transition-transform"
            >
              <div>
                <p className="text-base font-semibold">{item.category}</p>
                <p className="text-xs text-rose-300 mt-1">
                  {new Date(item.date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 text-white px-3 py-1 font-medium text-sm shadow-inner">
                  <TrendingDown className="mr-1" size={16} />
                  ₹ {item.amount}
                </div>
                <button
                  onClick={() => onDelete(item._id)}
                  className="bg-black hover:bg-red-600 text-white p-2 rounded-full shadow transition"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ExpenseList;
