import React, { useState, useEffect, useMemo } from 'react';
import { LuTrendingUpDown } from 'react-icons/lu';
import { motion } from 'framer-motion';

// Enhanced animation component with fallback
const SafeAnimatedNumbers = ({ value }) => {
  const AnimatedNumbers = useMemo(() => {
    try {
      return require('react-animated-numbers').default;
    } catch (e) {
      console.warn('Using fallback number animation');
      return ({ animateToNumber }) => (
        <motion.span
          key={animateToNumber}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {animateToNumber}
        </motion.span>
      );
    }
  }, []);

  return (
    <AnimatedNumbers
      includeComma
      animateToNumber={value}
      fontStyle={{ 
        fontSize: 20, 
        color: 'white',
        fontFamily: 'monospace',
        fontWeight: 'bold'
      }}
      transitions={(index) => ({
        type: 'spring',
        damping: 10,
        stiffness: 100,
        mass: 0.5,
        duration: index * 0.05 + 0.3,
      })}
    />
  );
};

const AuthLayout = ({ children }) => {
  const [animatedValue, setAnimatedValue] = useState(1000);
  const [increasing, setIncreasing] = useState(true); 
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedValue((prev) => {
        if (prev >= 999999) {
          setIncreasing(false);
          return prev - 1000;
        } else if (prev <= 100000) {
          setIncreasing(true);
          return prev + 1000;
        }
        return increasing ? prev + 1000 : prev - 1000;
      });
    }, 500);
  
    return () => clearInterval(interval);
  }, [increasing]);
  

  return (
    <div className="flex w-screen h-screen overflow-hidden">
      <div className="w-1/2 h-full flex flex-col justify-center px-12 text-white bg-black">
        <h2 className="text-2xl font-medium mt-2">Expense Tracker</h2>
        {children && <div className="mt-1">{children}</div>}
      </div>

      <div className="relative w-1/2 h-full flex items-center justify-center bg-gradient-to-br from-gray-950 to-blue-950">
        <div className="block-red" />
        <div className="block-blue" />

        <div className="absolute top-[5%] left-[10%] z-30">
          <StatsInfoCard
            icon={<LuTrendingUpDown className="text-white text-2xl" />}
            label="Track Your Income & Expenses"
            value={animatedValue}
          />
        </div>

        <video
          src="/images/card.mp4"
          autoPlay
          loop
          muted
          className="video-style"
        />
      </div>
    </div>
  );
};

export default AuthLayout;


const StatsInfoCard = ({ icon, label, value }) => {
  return (
    <div className="flex gap-6 bg-gray-800 p-4 rounded-xl shadow-lg shadow-blue-900/50 border border-gray-600 z-10">
      <div className="w-12 h-12 flex items-center justify-center text-[26px] bg-black text-white border-2 border-white rounded-full drop-shadow-xl">
        {icon}
      </div>
      <div>
        <h6 className="text-xs text-white mb-1">{label}</h6>
        <div className="text-[20px] text-white font-mono">
          <SafeAnimatedNumbers value={value} />
        </div>
      </div>
    </div>
  );
};
