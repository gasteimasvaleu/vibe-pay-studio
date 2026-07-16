import {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  type CSSProperties,
} from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface Step {
  title: string;
  subtitle: string;
  description: string;
  src: string;
}

interface Colors {
  title?: string;
  subtitle?: string;
  description?: string;
  arrowBackground?: string;
  arrowForeground?: string;
  arrowHoverBackground?: string;
}

interface FontSizes {
  title?: string;
  subtitle?: string;
  description?: string;
}

interface CircularStepsProps {
  steps: Step[];
  autoplay?: boolean;
  colors?: Colors;
  fontSizes?: FontSizes;
}

function calculateGap(width: number) {
  const minWidth = 320;
  const maxWidth = 900;
  const minGap = 40;
  const maxGap = 72;
  if (width <= minWidth) return minGap;
  if (width >= maxWidth) return maxGap;
  return minGap + (maxGap - minGap) * ((width - minWidth) / (maxWidth - minWidth));
}

export function CircularSteps({
  steps,
  autoplay = true,
  colors = {},
  fontSizes = {},
}: CircularStepsProps) {
  const colorTitle = colors.title ?? "var(--foreground)";
  const colorSubtitle = colors.subtitle ?? "var(--primary)";
  const colorDescription = colors.description ?? "var(--muted-foreground)";
  const colorArrowBg = colors.arrowBackground ?? "var(--muted)";
  const colorArrowFg = colors.arrowForeground ?? "var(--foreground)";
  const colorArrowHoverBg =
    colors.arrowHoverBackground ?? "linear-gradient(135deg,#d946ef,#9333ea)";

  const fontSizeTitle = fontSizes.title ?? "1.4rem";
  const fontSizeSubtitle = fontSizes.subtitle ?? "0.8rem";
  const fontSizeDescription = fontSizes.description ?? "0.95rem";

  const [activeIndex, setActiveIndex] = useState(0);
  const [hoverPrev, setHoverPrev] = useState(false);
  const [hoverNext, setHoverNext] = useState(false);
  const [containerWidth, setContainerWidth] = useState(600);

  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const autoplayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stepsLength = useMemo(() => steps.length, [steps]);
  const activeStep = useMemo(() => steps[activeIndex], [activeIndex, steps]);

  useEffect(() => {
    function handleResize() {
      if (imageContainerRef.current) {
        setContainerWidth(imageContainerRef.current.offsetWidth);
      }
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % stepsLength);
    if (autoplayIntervalRef.current) clearInterval(autoplayIntervalRef.current);
  }, [stepsLength]);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + stepsLength) % stepsLength);
    if (autoplayIntervalRef.current) clearInterval(autoplayIntervalRef.current);
  }, [stepsLength]);

  useEffect(() => {
    if (!autoplay) return;
    autoplayIntervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % stepsLength);
    }, 5000);
    return () => {
      if (autoplayIntervalRef.current) clearInterval(autoplayIntervalRef.current);
    };
  }, [autoplay, stepsLength]);

  function getImageStyle(index: number): CSSProperties {
    const gap = calculateGap(containerWidth);
    const maxStickUp = gap * 0.6;
    const isActive = index === activeIndex;
    const isLeft = (activeIndex - 1 + stepsLength) % stepsLength === index;
    const isRight = (activeIndex + 1) % stepsLength === index;
    const base: CSSProperties = {
      position: "absolute",
      inset: 0,
      margin: "auto",
      width: "60%",
      aspectRatio: "1 / 1",
      borderRadius: "9999px",
      overflow: "hidden",
      border: "1px solid var(--border)",
      boxShadow: "0 20px 60px -20px rgba(217,70,239,0.35)",
      transition: "all 0.8s cubic-bezier(.4,2,.3,1)",
      willChange: "transform, opacity",
    };
    if (isActive) {
      return {
        ...base,
        zIndex: 3,
        opacity: 1,
        transform: "translateX(0) translateY(0) scale(1) rotateY(0deg)",
      };
    }
    if (isLeft) {
      return {
        ...base,
        zIndex: 2,
        opacity: 0.85,
        transform: `translateX(-${gap}px) translateY(-${maxStickUp}px) scale(0.7) rotateY(20deg)`,
      };
    }
    if (isRight) {
      return {
        ...base,
        zIndex: 2,
        opacity: 0.85,
        transform: `translateX(${gap}px) translateY(-${maxStickUp}px) scale(0.7) rotateY(-20deg)`,
      };
    }
    return { ...base, zIndex: 1, opacity: 0, pointerEvents: "none" };
  }

  return (
    <div className="w-full">
      <div className="grid gap-8 md:grid-cols-2 md:items-center">
        {/* Images */}
        <div
          ref={imageContainerRef}
          className="relative mx-auto w-full max-w-sm"
          style={{ aspectRatio: "1 / 1", perspective: "1000px" }}
        >
          {steps.map((step, index) => (
            <div key={index} style={getImageStyle(index)}>
              <img
                src={step.src}
                alt={step.title}
                draggable={false}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex flex-col justify-between gap-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <p
                className="uppercase tracking-widest"
                style={{ color: colorSubtitle, fontSize: fontSizeSubtitle }}
              >
                {activeStep.subtitle}
              </p>
              <h3
                className="mt-1 font-black tracking-tight"
                style={{ color: colorTitle, fontSize: fontSizeTitle }}
              >
                {activeStep.title}
              </h3>
              <p
                className="mt-3 leading-relaxed"
                style={{ color: colorDescription, fontSize: fontSizeDescription }}
              >
                {activeStep.description.split(" ").map((word, i) => (
                  <motion.span
                    key={`${activeIndex}-${i}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.02 * i, duration: 0.3 }}
                    style={{ display: "inline-block", marginRight: 4 }}
                  >
                    {word}
                  </motion.span>
                ))}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrev}
              onMouseEnter={() => setHoverPrev(true)}
              onMouseLeave={() => setHoverPrev(false)}
              aria-label="Anterior"
              className="grid h-11 w-11 place-items-center rounded-full border border-white/10 transition-all"
              style={{
                background: hoverPrev ? colorArrowHoverBg : colorArrowBg,
                color: colorArrowFg,
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              onMouseEnter={() => setHoverNext(true)}
              onMouseLeave={() => setHoverNext(false)}
              aria-label="Próximo"
              className="grid h-11 w-11 place-items-center rounded-full border border-white/10 transition-all"
              style={{
                background: hoverNext ? colorArrowHoverBg : colorArrowBg,
                color: colorArrowFg,
              }}
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <div className="ml-2 flex gap-1.5">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: i === activeIndex ? 20 : 6,
                    background:
                      i === activeIndex
                        ? "linear-gradient(90deg,#d946ef,#9333ea)"
                        : "color-mix(in oklab, var(--muted-foreground) 30%, transparent)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CircularSteps;
