import React from 'react';

interface RatioSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const RatioSlider: React.FC<RatioSliderProps> = ({ value, onChange, disabled = false }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Background</span>
        <span className="text-sm text-gray-600">Technical</span>
      </div>
      
      <div className="flex items-center space-x-4">
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={disabled}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider disabled:opacity-50"
        />
        <span className="text-lg font-semibold text-blue-600 min-w-[4rem]">
          {value}%
        </span>
      </div>
      
      <div className="text-center text-sm text-gray-600">
        Background: {100 - value}%
      </div>
    </div>
  );
};

export default RatioSlider;


