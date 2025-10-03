import { data } from "react-router-dom";
import moment from "moment";

export const validateEmail = (email) => {
   const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   return regex.test(email);
 };

 export const getInitials = (name = "") => {
   const names = name.trim().split(" ");
   if (names.length === 0 || !names[0]) return "?";
   if (names.length === 1) return names[0][0].toUpperCase();
   return (names[0][0] + names[1][0]).toUpperCase();
 };


 export const addThousandsSeparator = (num) => {
   if (num == null || isNaN(num)) return "";
 
   const [integerPart, fractionalPart] = num.toString().split(".");
 
   let lastThree = integerPart.slice(-3);
   let otherNumbers = integerPart.slice(0, -3);
 
   if (otherNumbers !== "") {
     lastThree = "," + lastThree;
   }
 
   const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
 
   return fractionalPart 
     ? `${formattedInteger}.${fractionalPart}`
     : formattedInteger;
 };

 export const prepareExpenseBarChartData = (transactions = []) => {
   if (!Array.isArray(transactions)) return [];
 
   const dailyTotals = {};
 
   transactions.forEach((tx) => {
     if (!tx.date || !tx.amount) return;
 
     const dateKey = new Date(tx.date).toDateString();
 
     if (!dailyTotals[dateKey]) {
       dailyTotals[dateKey] = 0;
     }
 
     dailyTotals[dateKey] += Math.abs(tx.amount);
   });
 
   const amounts = Object.entries(dailyTotals)
     .map(([_, amount]) => parseFloat(amount.toFixed(2)))
     .slice(-30);
 
   const data = amounts.map((value, index) => ({
     name: `#${index + 1}`,
     value,
   }));
 
   return data;
 };
 

 export const prepareIncomeBarChartData = (transactions = []) => {
  if (!Array.isArray(transactions)) return [];

  const dailyTotals = {};

  transactions.forEach((tx) => {
    if (!tx.date || !tx.amount) return;

    const dateKey = new Date(tx.date).toDateString(); // e.g., "Sun Apr 06 2025"

    if (!dailyTotals[dateKey]) {
      dailyTotals[dateKey] = 0;
    }

    dailyTotals[dateKey] += Math.abs(tx.amount); // Ensure it's positive
  });

  const sortedAmounts = Object.entries(dailyTotals)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .map(([_, amount]) => parseFloat(amount.toFixed(2)))
    .slice(-30);

  const data = sortedAmounts.map((value, index) => ({
    name: `#${index + 1}`, // You can replace this with something else if you like
    value,
  }));

  return data;
};

export const prepareExpenseLineChartData = (data = []) => {
  const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

  const chartData = sortedData.map((item) => ({
    month: moment(item?.date).format("Do, MMM"),  // formatted date label
    amount: item?.amount,                         // Y-axis value
    category: item?.category,                     // optional, for legends/filters
  }));

  return chartData;
};


