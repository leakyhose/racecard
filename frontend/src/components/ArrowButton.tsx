import { useState } from "react";

interface ArrowButtonProps {
  onClick: () => void;
  direction?: "up" | "down" | "left" | "right";
  disabled?: boolean;
  className?: string;
}

export function ArrowButton({
  onClick,
  direction = "down",
  disabled,
  className = "",
}: ArrowButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    onClick();
    setTimeout(() => setIsAnimating(false), 150);
  };

  const getRotation = () => {
    switch (direction) {
      case "up":
        return "rotate-180";
      case "left":
        return "-rotate-90";
      case "right":
        return "rotate-90";
      default:
        return "";
    }
  };

  const getAriaLabel = () => {
    switch (direction) {
      case "up":
        return "Scroll up";
      case "down":
        return "Scroll down";
      case "left":
        return "Previous";
      case "right":
        return "Next";
      default:
        return "Navigate";
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`swallow-icon ${getRotation()} ${className} text-coffee ${isAnimating ? "arrow-animating" : ""}`}
      aria-label={getAriaLabel()}
    >
      <span></span>
    </button>
  );
}
