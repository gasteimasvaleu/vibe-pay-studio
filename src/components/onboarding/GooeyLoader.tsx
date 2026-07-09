import * as React from "react";
import { cn } from "@/lib/utils";

export interface GooeyLoaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const GooeyLoader = React.forwardRef<HTMLDivElement, GooeyLoaderProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("relative flex items-center justify-center", className)}
        {...props}
      >
        {/* Filter host lives outside the flow so zero-size SVG can't be dropped by the browser. */}
        <svg
          width="0"
          height="0"
          style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
          aria-hidden="true"
        >
          <defs>
            <filter id="gooey-loader-filter">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
                result="goo"
              />
              <feBlend in="SourceGraphic" in2="goo" />
            </filter>
          </defs>
        </svg>

        <div className="gooey-loader">
          <div className="gooey-ball gooey-ball-1" />
          <div className="gooey-ball gooey-ball-2" />
        </div>

        <style>{`
          .gooey-loader {
            position: relative;
            width: 160px;
            height: 160px;
            filter: url(#gooey-loader-filter);
          }
          .gooey-ball {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 36px;
            height: 36px;
            margin: -18px 0 0 -18px;
            border-radius: 50%;
            background: var(--primary, #a855f7);
          }
          .gooey-ball-1 {
            animation: gooey-orbit-1 2.4s ease-in-out infinite;
          }
          .gooey-ball-2 {
            animation: gooey-orbit-2 2.4s ease-in-out infinite;
          }
          @keyframes gooey-orbit-1 {
            0%   { transform: translateX(-40px) rotate(0deg); }
            50%  { transform: translateX(40px) rotate(180deg); }
            100% { transform: translateX(-40px) rotate(360deg); }
          }
          @keyframes gooey-orbit-2 {
            0%   { transform: translateX(40px) rotate(0deg); }
            50%  { transform: translateX(-40px) rotate(180deg); }
            100% { transform: translateX(40px) rotate(360deg); }
          }
        `}</style>
      </div>
    );
  },
);
GooeyLoader.displayName = "GooeyLoader";

export { GooeyLoader };
