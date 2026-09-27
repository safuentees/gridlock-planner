import { useState, type ReactNode } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { LazyMotion, m as motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { DistanceControl } from "./DistanceControl";
import type { DistanceUnit } from "../lib/distanceControl";

const loadAnimationFeatures = () =>
  import("../lib/cardAnimationFeatures").then((module) => module.default);

/** One mounted distance editor; expansion never resets the map or its draft. */
export function NearbyDistanceCard({
  children,
  busy,
  miles,
  unit,
  onChange,
  onUnitChange,
}: {
  children: ReactNode;
  busy: boolean;
  miles: number;
  unit: DistanceUnit;
  onChange: (miles: number) => void;
  onUnitChange: (unit: DistanceUnit) => void;
}) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const transition = {
    duration: reduceMotion ? 0 : 0.18,
    ease: "easeOut" as const,
  };
  return (
    <LazyMotion features={loadAnimationFeatures} strict>
      <Collapsible.Root
        open={open}
        onOpenChange={setOpen}
        aria-label="Nearby match overview"
        render={
          <motion.section
            layout={!reduceMotion}
            layoutDependency={open}
            transition={transition}
            style={{ borderRadius: 12, transformOrigin: "top center" }}
          />
        }
        className="map-match-overview pointer-events-auto overflow-hidden border border-stone-200 bg-white shadow-sm"
      >
        <Collapsible.Trigger
          aria-label="Adjust comparison distance"
          title="Adjust comparison distance"
          render={<motion.button layout="position" transition={transition} />}
          className="flex w-full items-center justify-center gap-3 rounded-xl p-4 text-left hover:bg-stone-50 focus-visible:outline-offset-[-3px]"
        >
          <span
            aria-busy={busy}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {children}
          </span>
          <motion.span
            aria-hidden="true"
            animate={{ rotate: open ? 180 : 0 }}
            transition={transition}
            className="shrink-0 text-stone-500"
          >
            <ChevronDown size={16} />
          </motion.span>
        </Collapsible.Trigger>
        <Collapsible.Panel
          keepMounted
          className="nearby-distance-panel overflow-y-auto overscroll-contain"
        >
          <motion.div
            layout="position"
            initial={false}
            animate={{ opacity: open ? 1 : 0 }}
            transition={transition}
            className="border-t border-stone-200 p-4"
          >
            <DistanceControl
              embedded
              miles={miles}
              unit={unit}
              onChange={onChange}
              onUnitChange={onUnitChange}
            />
          </motion.div>
        </Collapsible.Panel>
      </Collapsible.Root>
    </LazyMotion>
  );
}
