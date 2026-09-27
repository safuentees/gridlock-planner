import { useState, type ReactNode } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { LazyMotion, m as motion, useReducedMotion } from "motion/react";
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
        data-expanded={open}
        render={<section />}
        className="map-match-overview pointer-events-auto relative isolate rounded-xl border border-transparent text-stone-900"
      >
        {/* Scale only the surface: text stays outside the transformed tree. */}
        <motion.div
          aria-hidden="true"
          data-card-surface=""
          layout={!reduceMotion}
          layoutDependency={open}
          transition={transition}
          style={{ borderRadius: 12, originX: 0.5, originY: 0 }}
          className="pointer-events-none absolute inset-0 -z-10 border border-stone-200 bg-white shadow-sm"
        />
        <Collapsible.Trigger
          aria-label="Adjust comparison distance"
          title="Adjust comparison distance"
          className="flex w-full items-center justify-center rounded-xl p-4 text-left focus-visible:outline-offset-[-3px]"
        >
          <span
            className="min-w-0 max-w-full break-words"
            aria-busy={busy}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {children}
          </span>
        </Collapsible.Trigger>
        <Collapsible.Panel
          keepMounted
          className="nearby-distance-panel overflow-x-hidden overflow-y-auto overscroll-contain"
        >
          <motion.div
            initial={false}
            animate={{ opacity: open ? 1 : 0 }}
            // The surface grows independently; reveal controls only once it fits.
            transition={{
              duration: 0,
              delay: open && !reduceMotion ? transition.duration : 0,
            }}
            className="p-4"
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
