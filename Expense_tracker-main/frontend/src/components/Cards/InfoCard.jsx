import React from 'react';

const InfoCard = ({ icon, label, value, color }) => {
  return (
    <div className={`rounded-2xl p-5 text-white border ${color} transform transition-transform duration-300 hover:scale-105`}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 flex items-center justify-center rounded-full bg-black border-2 border-white">
          <div className="text-2xl text-white">{icon}</div>
        </div>

        <div className="flex-1 text-right">
          <p className="text-sm uppercase tracking-wide text-white">{label}</p>
          <h3 className="text-xl font-semibold mt-1 text-white">{value}</h3>
        </div>
      </div>
    </div>
  );
};

export default InfoCard;
