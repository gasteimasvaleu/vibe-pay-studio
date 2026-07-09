import * as React from "react";
import { cn } from "@/lib/utils";

export interface GooeyLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  primaryColor?: string;
  secondaryColor?: string;
  borderColor?: string;
}

const GooeyLoader = React.forwardRef<HTMLDivElement, GooeyLoaderProps>(
  ({ className, primaryColor, secondaryColor, borderColor, style, ...props }, ref) => {
    const cssVariables = {
      "--gooey-primary-color": primaryColor || "var(--primary)",
      "--gooey-secondary-color": secondaryColor || "oklch(0.58 0.24 305)",
      "--gooey-border-color": borderColor || "oklch(0.72 0.13 300 / 0.22)",
      ...style,
    } as React.CSSProperties;

    return (
      <div
        ref={ref}
        className={cn("relative flex items-center justify-center", className)}
        style={cssVariables}
        {...props}
      >
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

        <div className="gooey-loader-rail" aria-label="Carregando verificação">
          <span className="gooey-loader-blob gooey-loader-blob-primary" />
          <span className="gooey-loader-blob gooey-loader-blob-secondary" />
        </div>

        <style>{`
          .gooey-loader-rail {
            position: relative;
            width: 12em;
            height: 4em;
            border-bottom: 0.18em solid var(--gooey-border-color);
            filter: url(#gooey-loader-filter);
          }

          .gooey-loader-blob {
            position: absolute;
            bottom: 0.18em;
            left: 50%;
            display: block;
            border-radius: 50%;
            will-change: transform;
          }

          .gooey-loader-blob-primary {
            width: 2.2em;
            height: 2.2em;
            margin-left: -1.1em;
            background: var(--gooey-primary-color);
            box-shadow: 0 0 34px color-mix(in oklab, var(--gooey-primary-color) 58%, transparent);
            animation: gooey-loader-wee1 1.7s ease-in-out infinite alternate;
          }

          .gooey-loader-blob-secondary {
            width: 1.55em;
            height: 1.55em;
            margin-left: -0.775em;
            background: var(--gooey-secondary-color);
            box-shadow: 0 0 28px color-mix(in oklab, var(--gooey-secondary-color) 54%, transparent);
            animation: gooey-loader-wee2 1.7s ease-in-out infinite alternate;
          }

          @keyframes gooey-loader-wee1 {
            0% {
              transform: translateX(-5.2em) rotate(0deg);
            }
            100% {
              transform: translateX(4.85em) rotate(180deg);
            }
          }

          @keyframes gooey-loader-wee2 {
            0% {
              transform: translateX(-4.25em) rotate(0deg);
            }
            100% {
              transform: translateX(5.2em) rotate(180deg);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .gooey-loader-blob-primary,
            .gooey-loader-blob-secondary {
              animation-duration: 3s;
            }
          }
        `}</style>
      </div>
    );
  },
);
GooeyLoader.displayName = "GooeyLoader";

export { GooeyLoader };
