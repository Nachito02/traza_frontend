export const colorPrimitives = {
  wine950: "#08131D",
  wine900: "#102433",
  wine800: "#17384B",
  wine700: "#225470",
  wine600: "#2F7295",
  wine500: "#4E93B7",
  sand500: "#C8A96B",
  sand600: "#A88444",
  cream50: "#F8FAFC",
  cream100: "#EDF2F7",
  cream200: "#D9E3ED",
  slate500: "#708397",
  white: "#FFFFFF",
  success500: "#2F855A",
  warning500: "#9A6A1F",
  danger500: "#B83232",
} as const;

export const semanticColors = {
  bg: {
    app: colorPrimitives.wine950,
    surface: colorPrimitives.wine800,
    surfaceMuted: colorPrimitives.cream50,
    accentSoft: colorPrimitives.cream100,
    overlay: "rgba(8, 19, 29, 0.74)",
  },
  text: {
    primary: colorPrimitives.white,
    secondary: colorPrimitives.slate500,
    ink: colorPrimitives.wine900,
    mutedInk: "#607487",
    accent: colorPrimitives.wine600,
  },
  border: {
    subtle: "rgba(200, 169, 107, 0.18)",
    default: "rgba(200, 169, 107, 0.34)",
    strong: colorPrimitives.sand500,
  },
  action: {
    primary: colorPrimitives.wine600,
    primaryHover: colorPrimitives.wine700,
    secondary: "#1D2A3B",
    secondaryHover: "#223249",
    accent: colorPrimitives.sand500,
  },
  feedback: {
    success: colorPrimitives.success500,
    warning: colorPrimitives.warning500,
    danger: colorPrimitives.danger500,
    neutral: colorPrimitives.wine900,
    successBg: "#ECFDF3",
    successBorder: "#A7F3D0",
    successText: "#166534",
    warningBg: "#FFFBEB",
    warningBorder: "#FCD34D",
    warningText: "#92400E",
    dangerBg: "#FEF2F2",
    dangerBorder: "#F5B3B3",
    dangerText: "#A61F1F",
    neutralBg: "rgba(248, 250, 252, 0.94)",
    neutralBorder: "rgba(200, 169, 107, 0.28)",
    neutralText: "#607487",
  },
} as const;

export const typography = {
  fontFamily: {
    body: "'Work Sans', sans-serif",
    heading: "'Red Hat Display', sans-serif",
    accent: "'Geist', sans-serif",
  },
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem",
    md: "1rem",
    lg: "1.125rem",
    xl: "1.5rem",
    "2xl": "1.875rem",
    "3xl": "2.25rem",
  },
  lineHeight: {
    tight: 1.1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.65,
  },
} as const;

export const spacing = {
  0: "0",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
} as const;

export const radius = {
  sm: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.625rem",
  pill: "9999px",
} as const;

export const shadows = {
  soft: "0 12px 28px rgba(8, 19, 29, 0.14)",
  raised: "0 18px 40px rgba(8, 19, 29, 0.18)",
  insetSoft: "inset 0 1px 0 rgba(248, 250, 252, 0.4)",
} as const;

export const motion = {
  duration: {
    fast: "150ms",
    base: "220ms",
    slow: "320ms",
  },
  easing: {
    standard: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    exit: "cubic-bezier(0.4, 0, 1, 1)",
  },
} as const;

export const componentInventory = {
  foundations: ["AppShell", "PageHeader", "SectionCard", "DataCard"],
  form: ["AppButton", "AppInput", "AppSelect", "AppTextarea", "AppModal"],
  feedback: ["StatusBadge", "InlineNotice", "EmptyState"],
  navigation: ["Topbar", "Aside", "SectionTabs"],
} as const;

export type DesignTokens = {
  colorPrimitives: typeof colorPrimitives;
  semanticColors: typeof semanticColors;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof shadows;
  motion: typeof motion;
  componentInventory: typeof componentInventory;
};

export const designTokens: DesignTokens = {
  colorPrimitives,
  semanticColors,
  typography,
  spacing,
  radius,
  shadows,
  motion,
  componentInventory,
};
