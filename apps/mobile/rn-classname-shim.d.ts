// Compatibility shim for React Native 0.88 (Expo SDK 58) Strict TypeScript API.
//
// Why this file exists:
// React Native 0.88 made the Strict TypeScript API the default. Component prop
// types such as ViewProps are now re-exported from "react-native" with
// `export type`, so the declaration merging that NativeWind /
// react-native-css-interop relies on (adding `className` to ViewProps,
// TextProps, ...) can no longer reach them -- the augmentation is silently
// ignored and every `className` prop fails type-checking (444 errors).
//
// This file augments the interfaces where they are actually declared, using
// paths relative to this file so the augmentation merges with the real
// declarations. Both layouts are covered: react-native nested under
// apps/mobile/node_modules (what `npm install` produced here) and hoisted to
// the monorepo root node_modules (what a fresh install on another machine
// may produce). A path that does not exist on a given machine is simply
// ignored. Runtime behaviour is unchanged: NativeWind's Babel plugin already
// turns `className` into styles at build time.
//
// NOTE: keep this file's name unlike any folder in apps/mobile (NativeWind
// has the same rule for nativewind-env.d.ts) or TypeScript may not pick it up.

export {};

declare module "./node_modules/react-native/types_generated/Libraries/Components/View/ViewPropTypes" {
  interface ViewProps {
    className?: string;
  }
}

declare module "../../node_modules/react-native/types_generated/Libraries/Components/View/ViewPropTypes" {
  interface ViewProps {
    className?: string;
  }
}

declare module "./node_modules/react-native/types_generated/Libraries/Text/TextProps" {
  interface TextProps {
    className?: string;
  }
}

declare module "../../node_modules/react-native/types_generated/Libraries/Text/TextProps" {
  interface TextProps {
    className?: string;
  }
}

declare module "./node_modules/react-native/types_generated/Libraries/Image/ImageProps" {
  interface ImagePropsBase {
    className?: string;
  }
}

declare module "../../node_modules/react-native/types_generated/Libraries/Image/ImageProps" {
  interface ImagePropsBase {
    className?: string;
  }
}

declare module "./node_modules/react-native/types_generated/Libraries/Components/ScrollView/ScrollView" {
  interface ScrollViewProps {
    contentContainerClassName?: string;
  }
}

declare module "../../node_modules/react-native/types_generated/Libraries/Components/ScrollView/ScrollView" {
  interface ScrollViewProps {
    contentContainerClassName?: string;
  }
}
