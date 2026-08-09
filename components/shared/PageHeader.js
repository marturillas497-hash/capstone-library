/**
 * Unified page-level header, per PRD Section 21, "Page Header Pattern."
 * Single source of truth for the border-l-4 border-orange pl-4 convention,
 * replacing the four variants that had drifted across the codebase.
 *
 * Applies strictly to page-level h1 headings. Never used inside modals or cards.
 *
 * Props:
 *  - title (required): string or node. For report pages, the dynamic report title.
 *  - subtitle (optional): string or node, rendered below the title.
 *  - icon (optional): a lucide-react icon component. Omit for a title-only header.
 *  - iconBg (optional): Tailwind bg class for the icon box. Defaults to "bg-navy".
 *      Icon color is derived automatically for contrast: "bg-gold" pairs with
 *      text-navy, everything else pairs with text-white, matching the one
 *      gold icon box already in the codebase (Student Whitelist).
 *  - badge (optional): node rendered inline next to the title, e.g. a count pill.
 *  - compact (optional): true for report title headers. Uses mb-6, text-2xl,
 *      leading-snug, and skips the icon row, matching the existing report pages.
 *  - children (optional): extra content rendered inside the bordered container,
 *      below the subtitle, for page-specific supplementary lines.
 */
export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  iconBg = "bg-navy",
  badge,
  compact = false,
  children,
}) {
  const iconColor = iconBg === "bg-gold" ? "text-navy" : "text-white";

  if (compact) {
    return (
      <div className="mb-6 border-l-4 border-orange pl-4">
        <h1 className="font-display text-2xl text-navy leading-snug">{title}</h1>
        {subtitle && <p className="text-slate-500 mt-1 text-sm">{subtitle}</p>}
        {children}
      </div>
    );
  }

  return (
    <div className="mb-8 border-l-4 border-orange pl-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${iconBg}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={1.75} />
          </div>
        )}
        <h1 className="font-display text-3xl text-navy">{title}</h1>
        {badge}
      </div>
      {subtitle && <p className="text-slate-500 mt-1 text-sm">{subtitle}</p>}
      {children}
    </div>
  );
}
