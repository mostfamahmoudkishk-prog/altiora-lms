import * as React from "react";

export function PoweredByMogenix() {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <button
      onClick={handleClick}
      type="button"
      className="inline-flex items-center gap-2 cursor-pointer border-none bg-transparent p-0 transition-all hover:opacity-95 focus:outline-none select-none text-muted-foreground hover:text-foreground"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        cursor: "pointer",
        border: "none",
        background: "transparent",
        padding: 0,
      }}
    >
      <span className="text-[10px] text-muted-foreground/75 font-normal tracking-wide">
        Powered by
      </span>
      <img
        src="/mogenix-logo.png"
        alt="MOGENIX Logo"
        className="object-contain h-[18px] sm:h-[20px] w-auto transition-transform hover:scale-105"
        style={{
          height: "20px",
          width: "auto",
          display: "block",
        }}
      />
      <span className="text-[11px] font-bold tracking-wider text-muted-foreground hover:text-foreground">
        MOGENIX
      </span>
    </button>
  );
}
