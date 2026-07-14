import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

const Electronics = (p: IconProps) => (
  <Base {...p}>
    <rect x="4" y="4" width="16" height="12" rx="1.5" />
    <path d="M2 20h20M9 20l1-4h4l1 4" />
  </Base>
);
const Accessories = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 12a6 6 0 1 1 12 0v6a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2z" />
    <path d="M9 12a3 3 0 1 1 6 0" />
  </Base>
);
const HomeDecor = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v10h14V10" />
    <path d="M10 20v-6h4v6" />
  </Base>
);
const Gadgets = (p: IconProps) => (
  <Base {...p}>
    <rect x="7" y="2" width="10" height="20" rx="2" />
    <path d="M11 18h2" />
  </Base>
);
const Wearables = (p: IconProps) => (
  <Base {...p}>
    <rect x="7" y="7" width="10" height="10" rx="2.5" />
    <path d="M9 7V5a3 3 0 0 1 6 0v2M9 17v2a3 3 0 0 0 6 0v-2" />
  </Base>
);
const Fashion = (p: IconProps) => (
  <Base {...p}>
    <path d="M8 4l4 2 4-2 3 4-3 2v10H5V10L2 8z" />
  </Base>
);
const Default = (p: IconProps) => (
  <Base {...p}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
  </Base>
);

const REGISTRY: Record<string, (p: IconProps) => React.ReactElement> = {
  electronics: Electronics,
  accessories: Accessories,
  "home decor": HomeDecor,
  "home & decor": HomeDecor,
  gadgets: Gadgets,
  wearables: Wearables,
  fashion: Fashion,
};

/** Maps a category name coming from the backend to a matching icon, falling back to a generic tag icon for categories we haven't designed one for yet. */
export function getCategoryIcon(categoryName: string) {
  return REGISTRY[categoryName.trim().toLowerCase()] ?? Default;
}
