interface SaveButtonProps {
  isSaved: boolean;
  onClick: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
}

export function SaveButton({
  isSaved,
  onClick,
  onMouseEnter,
  onMouseLeave,
  className = "",
}: SaveButtonProps) {
  return (
    <label
      className={`pl-2 pt-0.5 flex justify-center items-center relative cursor-pointer select-none text-[20px] text-coffee fill-current ${className}`}
      onClick={(e) => {
        e.preventDefault();
        onClick(e);
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <input
        type="checkbox"
        autoComplete="off"
        checked={isSaved}
        readOnly
        className="absolute opacity-0 h-0 w-0"
      />

      {!isSaved && (
        <svg
          viewBox="0 0 384 512"
          height="1em"
          xmlns="http://www.w3.org/2000/svg"
          className="
            absolute
            origin-top
            animate-bounce
            transition-transform
            duration-300
            scale-100
          "
        >
          <path d="M0 48C0 21.5 21.5 0 48 0l0 48V441.4l130.1-92.9c8.3-6 19.6-6 27.9 0L336 441.4V48H48V0H336c26.5 0 48 21.5 48 48V488c0 9-5 17.2-13 21.3s-17 3.5-23.4-1L229.5 432 192 405.2 154.5 432 36.4 508.3C30 512.8 21 513.2 13 509.1S0 497 0 488V48z" />
        </svg>
      )}

      {isSaved && (
        <svg
          viewBox="0 0 384 512"
          height="1em"
          xmlns="http://www.w3.org/2000/svg"
          className="
            absolute
            origin-top
            transition-transform
            duration-300
            scale-100
          "
        >
          <path d="M0 48V487.7C0 501.1 10.9 512 24.3 512c5 0 9.9-1.5 14-4.4L192 400 345.7 507.6c4.1 2.9 9 4.4 14 4.4c13.4 0 24.3-10.9 24.3-24.3V48c0-26.5-21.5-48-48-48H48C21.5 0 0 21.5 0 48z" />
        </svg>
      )}
    </label>
  );
}
