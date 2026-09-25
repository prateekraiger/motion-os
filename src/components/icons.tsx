import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const PlusIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const CheckIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 12.5l5 5L20 6.5" />
  </Base>
);

export const PlayIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 5.5v13l11-6.5-11-6.5z" fill="currentColor" stroke="none" />
  </Base>
);

export const PauseIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="6.5" y="5.5" width="3.5" height="13" rx="1.2" fill="currentColor" stroke="none" />
    <rect x="14" y="5.5" width="3.5" height="13" rx="1.2" fill="currentColor" stroke="none" />
  </Base>
);

export const ResetIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4" />
    <path d="M4 4v4h4" />
  </Base>
);

export const SkipIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 5.5v13l9-6.5-9-6.5z" fill="currentColor" stroke="none" />
    <path d="M17 5.5v13" />
  </Base>
);

export const TrashIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
  </Base>
);

export const FlameIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3s5 4.5 5 9a5 5 0 0 1-10 0c0-1.6.8-3 1.5-4 .3 1 1 1.7 1.8 1.7C11 8 10.5 5.5 12 3z" />
  </Base>
);

export const TargetIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="0.6" fill="currentColor" />
  </Base>
);

export const ClockIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Base>
);

export const CalendarIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="4" y="5.5" width="16" height="15" rx="2.5" />
    <path d="M4 9.5h16M8 3.5v4M16 3.5v4" />
  </Base>
);

export const ChevronRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 5l7 7-7 7" />
  </Base>
);

export const ChevronLeft = (p: IconProps) => (
  <Base {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Base>
);

export const ChevronUp = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 15l7-7 7 7" />
  </Base>
);

export const ChevronDown = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 9l7 7 7-7" />
  </Base>
);

export const ListIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M8 6h12M8 12h12M8 18h12" />
    <circle cx="4" cy="6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="4" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="4" cy="18" r="1.2" fill="currentColor" stroke="none" />
  </Base>
);

export const XIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);

export const BoltIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M13 3L5 13h6l-1 8 8-11h-6l1-7z" fill="currentColor" stroke="none" />
  </Base>
);

export const SearchIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.3-4.3" />
  </Base>
);

export const RepeatIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M17 2l4 4-4 4" />
    <path d="M3 12v-1a4 4 0 0 1 4-4h14" />
    <path d="M7 22l-4-4 4-4" />
    <path d="M21 12v1a4 4 0 0 1-4 4H3" />
  </Base>
);

export const ChartIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 3v18h18" />
    <path d="M8 17v-5" />
    <path d="M13 17V8" />
    <path d="M18 17v-8" />
  </Base>
);

export const NoteIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <path d="M14 3v6h6" />
    <path d="M9 13h6M9 17h4" />
  </Base>
);

export const SunIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Base>
);

export const MicIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M8.5 21h7" />
  </Base>
);

export const CloudIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 18.5h9.5a3.5 3.5 0 0 0 .4-6.98A5.5 5.5 0 0 0 6.6 10.2 4.4 4.4 0 0 0 7 18.5Z" />
    <path d="M12 15.5v-4M10 13.5l2-2 2 2" />
  </Base>
);

export const GridIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </Base>
);

export const BackupIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
    <path d="M12 15.5v-6M9.5 12.5L12 10l2.5 2.5" />
  </Base>
);
