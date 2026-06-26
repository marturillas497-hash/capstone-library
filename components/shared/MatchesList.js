"use client";

import { useState } from "react";
import AbstractModal from "@/components/shared/AbstractModal";

export default function MatchesList({ matches, showAccessionNote = false }) {
  const [selectedMatch, setSelectedMatch] = useState(null);

  if (!matches || matches.length === 0) return null;

  return (
    <>
      <div className="space-y-3">
        {matches.map((match, index) => (
          <div
            key={match.id ?? index}
            onClick={() => setSelectedMatch(match)}
            className="bg-white rounded-xl border border-slate-200 p-4 hover:border-navy/30 hover:shadow-sm transition cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{match.title}</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {match.authors && `${match.authors} · `}
                  {match.year && match.year}
                  {match.accession_id && ` · ${match.accession_id}`}
                </p>
              </div>
              <span className="shrink-0 text-xs font-medium text-navy bg-navy/5 px-2.5 py-1 rounded-full">
                {(match.similarity * 100).toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-2 line-clamp-2">{match.abstract_text}</p>
          </div>
        ))}
      </div>

      <AbstractModal
        abstract={selectedMatch}
        isOpen={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        showAccessionNote={showAccessionNote}
      />
    </>
  );
}
