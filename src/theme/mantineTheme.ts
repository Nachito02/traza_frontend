import { createTheme } from "@mantine/core";
import { colorPrimitives, radius, semanticColors, shadows, typography } from "./tokens";

const navyPalette = [
  colorPrimitives.cream50,
  colorPrimitives.cream100,
  colorPrimitives.cream200,
  colorPrimitives.wine500,
  colorPrimitives.wine500,
  colorPrimitives.wine600,
  colorPrimitives.wine600,
  colorPrimitives.wine700,
  colorPrimitives.wine800,
  colorPrimitives.wine900,
] as const;

const aiGreenPalette = [
  colorPrimitives.cream50,
  colorPrimitives.cream100,
  colorPrimitives.cream200,
  colorPrimitives.sand500,
  colorPrimitives.sand500,
  colorPrimitives.sand500,
  colorPrimitives.sand600,
  colorPrimitives.sand600,
  colorPrimitives.sand600,
  colorPrimitives.wine900,
] as const;

export const mantineTheme = createTheme({
  primaryColor: "aiGreen",
  primaryShade: 5,
  colors: {
    navy: navyPalette,
    aiGreen: aiGreenPalette,
  },
  white: semanticColors.bg.surfaceMuted,
  black: semanticColors.text.ink,
  fontFamily: typography.fontFamily.body,
  headings: {
    fontFamily: typography.fontFamily.heading,
    fontWeight: "700",
  },
  radius: {
    xs: radius.sm,
    sm: radius.sm,
    md: radius.md,
    lg: radius.lg,
    xl: radius.xl,
  },
  defaultRadius: "md",
  shadows: {
    xs: shadows.insetSoft,
    sm: shadows.soft,
    md: shadows.soft,
    lg: shadows.raised,
    xl: shadows.raised,
  },
  components: {
    Button: {
      defaultProps: {
        radius: "md",
      },
    },
    Card: {
      defaultProps: {
        radius: "lg",
        shadow: "sm",
      },
    },
    Input: {
      defaultProps: {
        radius: "md",
      },
    },
    Select: {
      defaultProps: {
        radius: "md",
      },
    },
    Textarea: {
      defaultProps: {
        radius: "md",
      },
    },
    Modal: {
      defaultProps: {
        radius: "lg",
        centered: true,
      },
    },
  },
});

export default mantineTheme;
