import React from "react";

const CustomLegend = ({ payload }) => {
   if (!payload || !Array.isArray(payload)) return null;
 
   return (
     <ul className="flex flex-wrap gap-4 mt-4 justify-center">
       {payload.map((entry, index) => (
         <li key={`item-${index}`} className="flex items-center gap-2">
           <div
             className="w-4 h-4 rounded-full"
             style={{ backgroundColor: entry.color }}
           />
           <span className="text-sm">{entry.value}</span>
         </li>
       ))}
     </ul>
   );
 };
 

export default CustomLegend;
