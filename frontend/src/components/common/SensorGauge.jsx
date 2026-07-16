import { useEffect, useState } from 'react';

export default function SensorGauge({
  value = 0,
  max = 100,
  min = 0,
  label = '',
  unit = '',
  warningThreshold = 70,
  dangerThreshold = 90,
  size = 120,
}) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 50);
    return () => clearTimeout(timer);
  }, [value]);

  const range = max - min;
  const percentage = Math.min(Math.max(((animatedValue - min) / range) * 100, 0), 100);
  const warningPct = ((warningThreshold - min) / range) * 100;
  const dangerPct = ((dangerThreshold - min) / range) * 100;

  let color = '#22c55e'; // green
  if (percentage >= dangerPct) {
    color = '#ef4444'; // red
  } else if (percentage >= warningPct) {
    color = '#eab308'; // yellow
  }

  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const startAngle = 135;
  const totalAngle = 270;
  const dashOffset = circumference * (1 - (percentage / 100) * (totalAngle / 360));
  const bgDashOffset = circumference * (1 - totalAngle / 360);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform"
          style={{ transform: `rotate(${startAngle}deg)` }}
        >
          {/* Background arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#334155"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={bgDashOffset}
            strokeLinecap="round"
          />
          {/* Value arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
          />
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-xl font-bold transition-all duration-500"
            style={{ color }}
          >
            {typeof animatedValue === 'number' ? animatedValue.toFixed(1) : animatedValue}
          </span>
          <span className="text-xs text-slate-500">{unit}</span>
        </div>
      </div>
      <span className="text-xs text-slate-400 mt-1 font-medium">{label}</span>
    </div>
  );
}
