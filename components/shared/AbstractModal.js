"use client";

import { useState } from "react";

export default function AbstractModal({ abstract, children, showAccessionNote = false }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div onClick={() => setOpen(true)}>{children}</div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">

            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl text-navy leading-snug">
                    {abstract.title}
                  </h2>
                  <p className="text-sm text-foreground/50 mt-1">
                    {abstract.authors && `${abstract.authors}`}
                    {abstract.year && ` · ${abstract.year}`}
                    {abstract.accession_id && (
                      <span className="ml-2 font-mono text-xs bg-slate-100 text-foreground/60 px-1.5 py-0.5 rounded">
                        {abstract.accession_id}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="shrink-0 p-1.5 rounded-lg text-foreground/40 hover:text-foreground hover:bg-slate-100 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">
                {abstract.abstract_text}
              </p>

              {showAccessionNote && abstract.accession_id && (
                <div className="mt-5 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-xs text-blue-700">
                    To request the physical manuscript, provide the accession ID{" "}
                    <span className="font-mono font-semibold">{abstract.accession_id}</span>{" "}
                    to the librarian. Borrowing is not permitted; manuscripts are for on-site reading only.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100">
              <button
                onClick={() => setOpen(false)}
                className="w-full bg-slate-100 text-foreground/60 text-sm font-medium py-2 rounded-lg hover:bg-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
