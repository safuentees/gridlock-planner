import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import {
  cancelFrame,
  frame,
  LazyMotion,
  m as motion,
  useReducedMotion,
} from "motion/react";
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
  const surfaceRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    const controls = controlsRef.current;
    if (!surface || !controls) return;
    if (!open || reduceMotion) {
      controls.style.clipPath = "none";
      return;
    }
    // Clip after Motion renders the surface, so content follows its visible edges
    // without inheriting scale transforms or waiting for expansion to finish.
    controls.style.clipPath = "inset(0 50% 100% 50%)";
    const started = performance.now();
    const clipToSurface = () => {
      const surfaceBounds = surface.getBoundingClientRect();
      const contentBounds = controls.getBoundingClientRect();
      const top = Math.max(0, surfaceBounds.top - contentBounds.top);
      const right = Math.max(0, contentBounds.right - surfaceBounds.right + 1);
      const bottom = Math.max(
        0,
        contentBounds.bottom - surfaceBounds.bottom + 1,
      );
      const left = Math.max(0, surfaceBounds.left - contentBounds.left + 1);
      controls.style.clipPath = `inset(${top}px ${right}px ${bottom}px ${left}px)`;
      if (
        performance.now() - started > 180 &&
        getComputedStyle(surface).transform === "none"
      ) {
        controls.style.clipPath = "none";
        cancelFrame(clipToSurface);
      }
    };
    frame.postRender(clipToSurface, true);
    return () => cancelFrame(clipToSurface);
  }, [open, reduceMotion]);

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
          ref={surfaceRef}
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
          <div ref={controlsRef} className="p-4">
            <DistanceControl
              embedded
              miles={miles}
              unit={unit}
              onChange={onChange}
              onUnitChange={onUnitChange}
            />
          </div>
        </Collapsible.Panel>
      </Collapsible.Root>
    </LazyMotion>
  );
}
