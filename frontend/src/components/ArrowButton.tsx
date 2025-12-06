import React from "react";

interface ArrowButtonProps {
  onClick: () => void;
  direction?: "up" | "down";
  disabled?: boolean;
  className?: string;
}

export function ArrowButton({ onClick, direction = "down", disabled, className = "" }: ArrowButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`swallow-icon ${direction === "up" ? "rotate-180" : ""} ${className} text-coffee`}
      aria-label={direction === "up" ? "Scroll up" : "Scroll down"}
    >
      <span></span>
    </button>
  );
}
