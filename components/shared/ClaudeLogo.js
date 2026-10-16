/**
 * Simplified, hand-drawn approximation of the Claude spark mark (not the
 * official asset). Draws in currentColor, so color it with a Tailwind text
 * utility on className, the same way the lucide-react icons are used.
 * One path element, no props spread, so any extra props a parent passes to
 * an icon slot (like strokeWidth) are ignored on purpose.
 */
export default function ClaudeLogo({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 12L12.0 1.4 M12 12L15.56 5.51 M12 12L18.78 5.78 M12 12L22.21 10.04 M12 12L18.7 13.16 M12 12L19.22 18.63 M12 12L15.81 19.26 M12 12L12.0 22.6 M12 12L8.54 18.31 M12 12L4.82 18.37 M12 12L1.98 13.92 M12 12L5.08 10.92 M12 12L5.27 6.03 M12 12L8.28 4.92" />
    </svg>
  );
}
