import React from "react";
import {
  MdAttachMoney,
  MdMoneyOff,
  MdTrendingUp,
  MdTrendingDown,
  MdDelete,
} from "react-icons/md";

const TransactionInfoCard = ({
  title,
  date,
  amount,
  type,
  hideDeleteBtn = true,
}) => {
  const isExpense = type === "expense";
  const amountColor = isExpense ? "text-red-500" : "text-green-500";
  const bgColor = isExpense ? "bg-red-900/30" : "bg-green-900/30";
  const sign = isExpense ? "-" : "+";
  const MainIcon = isExpense ? MdMoneyOff : MdAttachMoney;
  const DirectionIcon = isExpense ? MdTrendingDown : MdTrendingUp;

  return (
      <li className="flex justify-between items-center p-3 bg-gray-900 rounded-lg hover:bg-gray-800 transition">
          <div className="flex items-center gap-3">
              <span className="p-2 rounded-full bg-gray-800">
                  <MainIcon className="text-lg text-white" />
              </span>
              <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs text-gray-400">{date}</p>
              </div>
          </div>

          <div className={`flex items-center gap-1 px-3 py-1 rounded-lg ${bgColor}`}>
              <p className={`text-sm font-semibold ${amountColor}`}>
                  {sign}₹{Math.abs(amount).toLocaleString("en-IN")}
              </p>
              <DirectionIcon className={`${amountColor} text-base`} />
              {!hideDeleteBtn && (
                  <MdDelete className="ml-2 text-red-500 cursor-pointer hover:text-red-600 transition" />
              )}
          </div>
      </li>
  );
};

export default TransactionInfoCard;
