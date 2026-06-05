import React from "react";

interface Z444LogoProps {
  className?: string;
  variant?: "black-bg" | "transparent";
  size?: number | string;
}

export default function Z444Logo({
  className = "",
  variant = "transparent",
  size = 48,
}: Z444LogoProps) {
  // SVG drawing dimensions: viewBox "0 0 140 140"
  return (
    <div
      className={`relative inline-flex items-center justify-center select-none overflow-hidden transition-transform hover:scale-105 ${
        variant === "black-bg" ? "bg-black rounded-xl p-2.5 shadow-xl shadow-black/15" : ""
      } ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      <svg
        viewBox="0 0 140 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* HAND-DRAWN BLUE 'Z' WITH CROSS-STROKE */}
        <g strokeLinecap="round" strokeLinejoin="round">
          {/* Main Z stroke (slightly wavy top, graceful diagonal, solid bottom) */}
          <path
            d="M 22 47 C 32 44, 42 43, 50 48"
            stroke="#0d5bc4"
            strokeWidth="8.5"
          />
          <path
            d="M 50 48 C 44 60, 31 82, 21 95"
            stroke="#0d5bc4"
            strokeWidth="9"
          />
          <path
            d="M 21 95 C 31 95, 41 94, 52 94"
            stroke="#0d5bc4"
            strokeWidth="8.5"
          />
          {/* Accent secondary lines to mimic painterly ink brush overlaps */}
          <path
            d="M 25 48 C 33 46, 40 45, 47 48"
            stroke="#1d72f2"
            strokeWidth="3.5"
            opacity="0.8"
          />
          {/* The Z Middle Crossbar */}
          <path
            d="M 26 70 C 32 69, 39 69, 48 70"
            stroke="#0d5bc4"
            strokeWidth="7"
          />
          <path
            d="M 29 70 C 34 69, 41 69, 45 70"
            stroke="#4589ff"
            strokeWidth="2.5"
            opacity="0.9"
          />
        </g>

        {/* BRUSHED/SKETCH CHALK-WHITE '4 4 4' (WITH DOUBLE STROKES COMPARED TO ORIGINAL LOGO) */}
        <g strokeLinecap="round" strokeLinejoin="round">
          {/* FIRST '4' (starts around X=55) */}
          <g stroke="white" strokeWidth="4.5">
            {/* Left triangle diagonal hook */}
            <path d="M 72 50 C 67 61, 62 67, 59 72 C 60 74, 69 74, 76 74" />
            {/* Vertical spine */}
            <path d="M 73 45 C 74 58, 73 73, 72 90" />
          </g>
          {/* Sketchy shadow stroke overlay for '4' to make it look handwritten */}
          <g stroke="white" strokeWidth="1.5" opacity="0.6">
            <path d="M 71 52 C 67 62, 63 68, 60 72 M 74 46 C 75 58, 74 73, 73 88" />
          </g>

          {/* SECOND '4' (starts around X=81) */}
          <g stroke="white" strokeWidth="4.5">
            {/* Left triangle diagonal hook */}
            <path d="M 97 50 C 92 61, 87 67, 84 72 C 85 74, 94 74, 101 74" />
            {/* Vertical spine */}
            <path d="M 98 45 C 99 58, 98 73, 97 90" />
          </g>
          {/* Sketchy shadow stroke overlay for second '4' */}
          <g stroke="white" strokeWidth="1.5" opacity="0.6">
            <path d="M 96 52 C 92 62, 88 68, 85 72 M 99 46 C 100 58, 99 73, 98 88" />
          </g>

          {/* THIRD '4' (starts around X=107) */}
          <g stroke="white" strokeWidth="4.5">
            {/* Left triangle diagonal hook */}
            <path d="M 122 50 C 117 61, 112 67, 109 72 C 110 74, 119 74, 126 74" />
            {/* Vertical spine */}
            <path d="M 123 45 C 124 58, 123 73, 122 90" />
          </g>
          {/* Sketchy shadow stroke overlay for third '4' */}
          <g stroke="white" strokeWidth="1.5" opacity="0.6">
            <path d="M 121 52 C 117 62, 113 68, 110 72 M 124 46 C 125 58, 124 73, 123 88" />
          </g>
        </g>
      </svg>
    </div>
  );
}
