"use client";

import { Ban, RotateCcw, KeyRound } from "lucide-react";

const STATUS_META = {
  active: { label: "Active", className: "bg-green-50 text-green-700 border-green-200" },
  suspended: { label: "Suspended", className: "bg-red-50 text-red-600 border-red-200" },
};

export function StatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.active;
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function ActionButtons({ row, busy, onToggleStatus, onResetPassword }) {
  const isActive = row.status === "active";
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onToggleStatus(row)}
        disabled={busy}
        title={isActive ? "Suspend" : "Unsuspend"}
        className={`p-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
          isActive
            ? "border-red-200 text-red-500 hover:bg-red-50"
            : "border-green-200 text-green-600 hover:bg-green-50"
        }`}
      >
        {isActive ? <Ban className="w-4 h-4" strokeWidth={1.75} /> : <RotateCcw className="w-4 h-4" strokeWidth={1.75} />}
      </button>
      <button
        onClick={() => onResetPassword(row)}
        disabled={busy}
        title="Reset password"
        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
      >
        <KeyRound className="w-4 h-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

// columns: [{ key, label, render(row) }]
// identifier: { label, render(row) }, shown as the first column on desktop
// and the top line of the card on mobile.
export default function UserTable({
  rows,
  loading,
  columns,
  identifier,
  busyId,
  onToggleStatus,
  onResetPassword,
  emptyMessage = "No accounts found.",
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-background shadow-neo neo-transition rounded-lg px-4 py-3 animate-pulse h-14" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p className="text-base font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-background shadow-neo neo-transition rounded-xl overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wide">
          <span className="flex-[1.3] min-w-0">{identifier.label}</span>
          {columns.map((col) => (
            <span key={col.key} className="flex-1 min-w-0">{col.label}</span>
          ))}
          <span className="w-[76px] shrink-0 text-right">Actions</span>
        </div>
        <div className="divide-y divide-slate-50">
          {rows.map((row) => (
            <div key={row.id || row.profile_id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <span className="flex-[1.3] min-w-0 font-medium text-foreground truncate">
                {identifier.render(row)}
              </span>
              {columns.map((col) => (
                <span key={col.key} className="flex-1 min-w-0 text-slate-600 truncate">
                  {col.render(row)}
                </span>
              ))}
              <span className="w-[76px] shrink-0 flex justify-end">
                <ActionButtons
                  row={row}
                  busy={busyId === (row.id || row.profile_id)}
                  onToggleStatus={onToggleStatus}
                  onResetPassword={onResetPassword}
                />
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-slate-50">
        {rows.map((row) => (
          <div key={row.id || row.profile_id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{identifier.render(row)}</p>
                <p className="text-xs text-slate-400 mt-0.5">{formatDate(row.created_at)}</p>
              </div>
              <StatusPill status={row.status} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mb-3">
              {columns.filter((col) => col.key !== "status").map((col) => (
                <span key={col.key}>{col.render(row)}</span>
              ))}
            </div>
            <ActionButtons
              row={row}
              busy={busyId === (row.id || row.profile_id)}
              onToggleStatus={onToggleStatus}
              onResetPassword={onResetPassword}
            />
          </div>
        ))}
      </div>
    </div>
  );
}