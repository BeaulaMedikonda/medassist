"use client";

import { useState } from "react";

export type PainMarker = {
  id: string;
  side: "front" | "back";
  x: number;
  y: number;
  location: string;
  intensity: number;
  painType: string;
};

type Props = {
  markers: PainMarker[];
  onAddMarker?: (marker: PainMarker) => void;
  onRemoveMarker?: (id: string) => void;
  intensity?: number;
  painType?: string;
  className?: string;
};

const VB_W = 120;
const VB_H = 300;

export function BodyPainDiagram({
  markers,
  onAddMarker,
  onRemoveMarker,
  intensity = 5,
  painType = "Sharp",
  className = "",
}: Props) {
  const [side, setSide] = useState<"front" | "back">("front");
  const isInteractive = Boolean(onAddMarker);
  const sideMarkers = markers.filter((m) => m.side === side);

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!onAddMarker) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onAddMarker({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      side,
      x,
      y,
      location: getBodyRegion(x, y, side),
      intensity,
      painType,
    });
  }

  return (
    <div className={className}>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {(["front", "back"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={`rounded-lg px-4 py-1.5 text-xs font-extrabold capitalize transition ${
                side === s
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="text-[11px] font-semibold text-slate-400">
          {sideMarkers.length} point{sideMarkers.length !== 1 ? "s" : ""} marked
        </span>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className={`mx-auto block w-full max-w-[150px] select-none ${
            isInteractive ? "cursor-crosshair" : ""
          }`}
          onClick={handleClick}
          aria-label={`${side} body — ${isInteractive ? "tap to mark pain" : "pain map"}`}
        >
          <BodyShapes side={side} />
          {sideMarkers.map((marker, i) => {
            const cx = (marker.x / 100) * VB_W;
            const cy = (marker.y / 100) * VB_H;
            return (
              <g
                key={marker.id}
                transform={`translate(${cx}, ${cy})`}
                onClick={(e) => {
                  if (!onRemoveMarker) return;
                  e.stopPropagation();
                  onRemoveMarker(marker.id);
                }}
                style={{ cursor: onRemoveMarker ? "pointer" : "default" }}
              >
                <circle r="6.5" fill={intensityColor(marker.intensity)} opacity="0.92" />
                <circle r="6.5" fill="none" stroke="white" strokeWidth="1" opacity="0.6" />
                <text
                  textAnchor="middle"
                  dy="0.38em"
                  fontSize="5"
                  fontWeight="bold"
                  fill="white"
                >
                  {i + 1}
                </text>
              </g>
            );
          })}
        </svg>

        {isInteractive && (
          <p className="mt-1.5 text-center text-[10px] font-semibold text-slate-400">
            Tap body to mark • Tap a number to remove
          </p>
        )}
      </div>

      {/* Legend for intensity colors */}
      <div className="mt-3 flex items-center justify-center gap-3 text-[10px] font-semibold text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
          Mild (1–3)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-400" />
          Moderate (4–6)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
          Severe (7–10)
        </span>
      </div>
    </div>
  );
}

function BodyShapes({ side }: { side: "front" | "back" }) {
  const fill = "rgba(148,163,184,0.12)";
  const stroke = "#94a3b8";
  const sw = "1.5";
  return (
    <g>
      {/* Head */}
      <ellipse cx="60" cy="22" rx="17" ry="20" fill={fill} stroke={stroke} strokeWidth={sw} />
      {/* Neck */}
      <rect x="53" y="41" width="14" height="14" rx="3" fill={fill} stroke={stroke} strokeWidth={sw} />
      {/* Torso */}
      <polygon points="27,54 93,54 87,148 33,148" fill={fill} stroke={stroke} strokeWidth={sw} />
      {/* Left upper arm */}
      <polygon points="27,56 11,63 9,114 25,111" fill={fill} stroke={stroke} strokeWidth={sw} />
      {/* Right upper arm */}
      <polygon points="93,56 109,63 111,114 95,111" fill={fill} stroke={stroke} strokeWidth={sw} />
      {/* Left forearm */}
      <polygon points="11,116 7,119 8,162 22,160 23,115" fill={fill} stroke={stroke} strokeWidth={sw} />
      {/* Right forearm */}
      <polygon points="109,116 113,119 112,162 98,160 97,115" fill={fill} stroke={stroke} strokeWidth={sw} />
      {/* Left hand */}
      <ellipse cx="14" cy="171" rx="8" ry="11" fill={fill} stroke={stroke} strokeWidth={sw} />
      {/* Right hand */}
      <ellipse cx="106" cy="171" rx="8" ry="11" fill={fill} stroke={stroke} strokeWidth={sw} />
      {/* Hips */}
      <polygon points="33,150 87,150 91,180 29,180" fill={fill} stroke={stroke} strokeWidth={sw} />
      {/* Left thigh */}
      <polygon points="30,182 54,182 52,244 32,244" fill={fill} stroke={stroke} strokeWidth={sw} />
      {/* Right thigh */}
      <polygon points="66,182 90,182 88,244 68,244" fill={fill} stroke={stroke} strokeWidth={sw} />
      {/* Left shin */}
      <polygon points="32,246 52,246 50,288 34,288" fill={fill} stroke={stroke} strokeWidth={sw} />
      {/* Right shin */}
      <polygon points="68,246 88,246 86,288 70,288" fill={fill} stroke={stroke} strokeWidth={sw} />
      {/* Left foot */}
      <ellipse cx="40" cy="296" rx="16" ry="8" fill={fill} stroke={stroke} strokeWidth={sw} />
      {/* Right foot */}
      <ellipse cx="80" cy="296" rx="16" ry="8" fill={fill} stroke={stroke} strokeWidth={sw} />
      {/* Spine guide for back view */}
      {side === "back" && (
        <line x1="60" y1="56" x2="60" y2="147" stroke={stroke} strokeWidth="1" strokeDasharray="3,2" opacity="0.4" />
      )}
    </g>
  );
}

function intensityColor(intensity: number): string {
  if (intensity <= 3) return "#f59e0b";
  if (intensity <= 6) return "#f97316";
  return "#ef4444";
}

function getBodyRegion(x: number, y: number, side: "front" | "back"): string {
  if (y < 14) return "Head";
  if (y < 19) return "Neck";
  if (x < 21) {
    if (y < 49) return "Left Upper Arm";
    if (y < 62) return "Left Forearm";
    return "Left Hand";
  }
  if (x > 79) {
    if (y < 49) return "Right Upper Arm";
    if (y < 62) return "Right Forearm";
    return "Right Hand";
  }
  if (y < 50) return side === "front" ? "Chest" : "Upper Back";
  if (y < 60) return side === "front" ? "Abdomen" : "Lower Back";
  if (y < 65) return "Hip / Pelvis";
  const isLeft = x < 50;
  if (y < 82) return isLeft ? "Left Thigh" : "Right Thigh";
  if (y < 97) return isLeft ? "Left Knee / Shin" : "Right Knee / Shin";
  return isLeft ? "Left Foot" : "Right Foot";
}
