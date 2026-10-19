import type { SVGProps } from "react";

const base: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

type Icon = (props: SVGProps<SVGSVGElement>) => React.JSX.Element;

const make = (children: React.ReactNode): Icon => {
  const Comp = (props: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...props}>
      {children}
    </svg>
  );
  Comp.displayName = "Icon";
  return Comp;
};

// Brand
export const ShieldLock = make(
  <>
    <path d="M12 3 4.5 6v5.4c0 4.2 3 7.6 7.5 8.85 4.5-1.25 7.5-4.65 7.5-8.85V6L12 3Z" />
    <rect x="9.25" y="11.4" width="5.5" height="4.6" rx="1.1" />
    <path d="M10.3 11.4V9.9a1.7 1.7 0 0 1 3.4 0v1.5" />
  </>,
);

// Nav icons
export const OrdersIcon = make(
  <>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <path d="M8 10h8M8 14h5" />
  </>,
);

export const ImportIcon = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16V8" />
    <path d="M8.5 11.5 12 8l3.5 3.5" />
  </>,
);

export const PackingIcon = make(
  <>
    <path d="M21 8 12 3.5 3 8v8l9 4.5 9-4.5V8Z" />
    <path d="M3 8l9 4.5 9-4.5" />
    <path d="M12 12.5V21" />
  </>,
);

export const TokensIcon = make(
  <>
    <path d="M4 12V5.5A1.5 1.5 0 0 1 5.5 4H12l8 8-6.5 6.5L4 12Z" />
    <circle cx="8.5" cy="8.5" r="1.2" />
  </>,
);

export const CancelIcon = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M9 9l6 6M15 9l-6 6" />
  </>,
);

export const RunnerIcon = make(
  <>
    <circle cx="12" cy="8" r="3.2" />
    <path d="M5.5 19.2c0-3.3 2.9-5.6 6.5-5.6s6.5 2.3 6.5 5.6" />
  </>,
);

export const DeliveryIcon = make(
  <>
    <path d="M3 6.5h10v9H3z" />
    <path d="M13 9.5h4l3 3v3h-7z" />
    <circle cx="7" cy="17" r="1.7" />
    <circle cx="17" cy="17" r="1.7" />
  </>,
);

export const UsersIcon = make(
  <>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
    <path d="M16 5.3a3 3 0 0 1 0 5.4" />
    <path d="M17 14.2c2.3.5 4 2.4 4 4.8" />
  </>,
);

export const ErpIcon = make(
  <>
    <rect x="3" y="4" width="18" height="17" rx="2.5" />
    <path d="M3 9h18" />
    <path d="M8 2v4M16 2v4" />
    <circle cx="12" cy="14" r="2.5" />
    <path d="M12 13v1.2l.8.8" />
  </>,
);

export const ReportsIcon = make(
  <>
    <path d="M4 5v14h16" />
    <path d="M7.5 14.5l3.5-4 3 2.5 4-5.5" />
  </>,
);

export const AuditIcon = make(
  <>
    <path d="M12 3 5 6v5c0 4 3 7 7 8 4-1 7-4 7-8V6l-7-3Z" />
    <path d="M9 12l2 2 4-4" />
  </>,
);

export const OverridesIcon = make(
  <>
    <path d="M4 8h9M17 8h3" />
    <circle cx="15" cy="8" r="2" />
    <path d="M4 16h3M11 16h9" />
    <circle cx="9" cy="16" r="2" />
  </>,
);

// Chrome
export const BellIcon = make(
  <>
    <path d="M18 9a6 6 0 0 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9Z" />
    <path d="M10.3 19.5a2 2 0 0 0 3.4 0" />
  </>,
);

export const ChevronUpDownIcon = make(
  <>
    <path d="M8.5 9.5 12 6l3.5 3.5" />
    <path d="M8.5 14.5 12 18l3.5-3.5" />
  </>,
);

export const LogoutIcon = make(
  <>
    <path d="M15 12H4" />
    <path d="M8 8l-4 4 4 4" />
    <path d="M10 4h8a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-8" />
  </>,
);

export const CloudUploadIcon = make(
  <>
    <path d="M7 18a4 4 0 0 1-.5-7.97 5.5 5.5 0 0 1 10.6-1.3A3.75 3.75 0 0 1 17 18" />
    <path d="M12 21v-8" />
    <path d="m9 15.5 3-3 3 3" />
  </>,
);

export const UploadIcon = make(
  <>
    <path d="M12 15V4" />
    <path d="m8 8 4-4 4 4" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </>,
);

export const SearchIcon = make(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m16.5 16.5 4 4" />
  </>,
);

// Empty states
export const DocumentSearchIcon = make(
  <>
    <path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5" />
    <path d="M13 3v5h5V8" />
    <circle cx="16.5" cy="15.5" r="3" />
    <path d="m19 18 2.5 2.5" />
  </>,
);

export const DocumentIcon = make(
  <>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
    <path d="M13 3v5h5" />
    <path d="M9 13h6M9 16.5h4" />
  </>,
);

export const ClockIcon = make(
  <>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4l3 2" />
  </>,
);

export const TicketIcon = make(
  <>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h13A1.5 1.5 0 0 1 20 8.5v1a2 2 0 0 0 0 4v1a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 14.5v-1a2 2 0 0 0 0-4v-1Z" />
    <path d="M10 7v10" strokeDasharray="1.5 2" />
  </>,
);

export const BagIcon = make(
  <>
    <path d="M6.5 8h11l-1 11.5a1.5 1.5 0 0 1-1.5 1.35H9a1.5 1.5 0 0 1-1.5-1.35L6.5 8Z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </>,
);

export const ClipboardIcon = make(
  <>
    <rect x="6" y="4.5" width="12" height="16.5" rx="2" />
    <rect x="9" y="2.5" width="6" height="3.2" rx="1" />
  </>,
);

export const ClipboardListIcon = make(
  <>
    <rect x="6" y="4.5" width="12" height="16.5" rx="2" />
    <rect x="9" y="2.5" width="6" height="3.2" rx="1" />
    <path d="M9.5 11h5M9.5 15h5" />
    <path d="M8 11h.01M8 15h.01" />
  </>,
);

export const ClipboardCheckIcon = make(
  <>
    <rect x="6" y="4.5" width="12" height="16.5" rx="2" />
    <rect x="9" y="2.5" width="6" height="3.2" rx="1" />
    <path d="M9 13.5l2 2 4-4" />
  </>,
);

export const BoxOpenIcon = make(
  <>
    <path d="m2.5 8 4-4 5.5 2 5.5-2 4 4-9.5 4z" />
    <path d="M2.5 8v8l9.5 4 9.5-4V8" />
    <path d="M12 12v8" />
  </>,
);

export const ClipboardChartIcon = make(
  <>
    <rect x="6" y="4.5" width="12" height="16.5" rx="2" />
    <rect x="9" y="2.5" width="6" height="3.2" rx="1" />
    <path d="M9 16.5l2-2.5 2 1.5 2.5-3.5" />
  </>,
);

export const InfoIcon = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </>,
);

export const FilePlusIcon = make(
  <>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
    <path d="M13 3v5h5" />
    <path d="M12 12.5v5M9.5 15h5" />
  </>,
);

// slug -> nav icon, used by the sidebar
// Destructive actions — triangle-and-bang rather than another rounded glyph, so
// the Reset tab does not read like the rest of the sidebar.
export const WarningIcon = make(
  <>
    <path d="M12 4.2 2.9 19.2h18.2L12 4.2Z" />
    <path d="M12 10v4" />
    <path d="M12 16.8h.01" />
  </>,
);

export const NAV_ICONS: Record<string, Icon> = {
  orders: OrdersIcon,
  "new-order": FilePlusIcon,
  import: ImportIcon,
  packing: PackingIcon,
  tokens: TokensIcon,
  cancel: CancelIcon,
  runner: RunnerIcon,
  delivery: DeliveryIcon,
  users: UsersIcon,
  erp: ErpIcon,
  reports: ReportsIcon,
  audit: AuditIcon,
  overrides: OverridesIcon,
  reset: WarningIcon,
};
