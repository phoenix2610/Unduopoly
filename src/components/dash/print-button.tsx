"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="press rounded-md bg-pen px-4 py-2 text-sm font-semibold text-white">
      Print
    </button>
  );
}
