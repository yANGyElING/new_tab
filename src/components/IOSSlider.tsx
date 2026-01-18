import { useState, useRef, useEffect } from 'react';

interface IOSSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  showValue?: boolean;
  unit?: string;
}

export default function IOSSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  showValue = false,
  unit = '',
}: IOSSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const percentage = ((value - min) / (max - min)) * 100;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    setIsDragging(true);
    updateValue(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || disabled) return;
    updateValue(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const updateValue = (clientX: number) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newValue = min + percentage * (max - min);
    const steppedValue = Math.round(newValue / step) * step;
    onChange(Math.max(min, Math.min(max, steppedValue)));
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <div className="flex items-center gap-3 w-full">
      <div
        ref={sliderRef}
        onMouseDown={handleMouseDown}
        className={`
          relative flex-1 h-[4px] bg-gray-200 dark:bg-gray-700 rounded-full
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {/* 激活部分的轨道 */}
        <div
          className="absolute left-0 top-0 h-full bg-[#007AFF] rounded-full transition-all duration-150"
          style={{ width: `${percentage}%` }}
        />

        {/* 滑块 */}
        <div
          className={`
            absolute top-1/2 -translate-y-1/2 w-[20px] h-[20px] bg-white rounded-full
            shadow-lg transition-all duration-150
            ${isDragging ? 'scale-110' : 'scale-100'}
            ${!disabled && 'hover:scale-110'}
          `}
          style={{
            left: `${percentage}%`,
            transform: `translate(-50%, -50%) scale(${isDragging ? 1.1 : 1})`,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.2)',
          }}
        />
      </div>

      {showValue && (
        <div className="min-w-[60px] text-right text-sm font-medium text-gray-700 dark:text-gray-300">
          {value}{unit}
        </div>
      )}
    </div>
  );
}
