import * as React from "react"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef(({ className, min = 0, max = 100, step = 1, value = [0, 100], onValueChange, ...props }, ref) => {
  const [localValue, setLocalValue] = React.useState(value);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleMinChange = (e) => {
    const newMin = parseInt(e.target.value);
    const newValue = [Math.min(newMin, localValue[1] - step), localValue[1]];
    setLocalValue(newValue);
    onValueChange?.(newValue);
  };

  const handleMaxChange = (e) => {
    const newMax = parseInt(e.target.value);
    const newValue = [localValue[0], Math.max(newMax, localValue[0] + step)];
    setLocalValue(newValue);
    onValueChange?.(newValue);
  };

  const minPercent = ((localValue[0] - min) / (max - min)) * 100;
  const maxPercent = ((localValue[1] - min) / (max - min)) * 100;

  return (
    <div
      ref={ref}
      className={cn("relative w-full h-10 flex items-center", className)}
      {...props}
    >
      {/* Track background */}
      <div className="absolute h-2 w-full bg-secondary rounded-full">
        {/* Active range */}
        <div
          className="absolute h-full bg-primary rounded-full"
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`
          }}
        />
      </div>

      {/* Min thumb */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={localValue[0]}
        onChange={handleMinChange}
        className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(255,255,255,0.3),0_2px_8px_rgba(0,0,0,0.3)] [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-[0_0_0_4px_rgba(255,255,255,0.3),0_2px_8px_rgba(0,0,0,0.3)]"
      />

      {/* Max thumb */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={localValue[1]}
        onChange={handleMaxChange}
        className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(255,255,255,0.3),0_2px_8px_rgba(0,0,0,0.3)] [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-[0_0_0_4px_rgba(255,255,255,0.3),0_2px_8px_rgba(0,0,0,0.3)]"
      />
    </div>
  );
});
Slider.displayName = "Slider";

export { Slider }
