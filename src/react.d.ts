import type * as ReactTypes from "react";

declare global {
  namespace React {
    type Key = string | number;
    type ReactNode = ReactTypes.ReactNode;
    type ReactElement = ReactTypes.ReactElement;
    type FC<P = {}> = ReactTypes.FC<P>;
    type ComponentProps<T extends keyof JSX.IntrinsicElements | ReactTypes.JSXElementConstructor<any>> = ReactTypes.ComponentProps<T>;
    type ElementType = ReactTypes.ElementType;
    type FormEvent<T = Element> = ReactTypes.FormEvent<T>;
    type ChangeEvent<T = Element> = ReactTypes.ChangeEvent<T>;
    type DragEvent<T = Element> = ReactTypes.DragEvent<T>;
    type MouseEvent<T = Element, E = globalThis.MouseEvent> = ReactTypes.MouseEvent<T, E>;
    type KeyboardEvent<T = Element> = ReactTypes.KeyboardEvent<T>;
    type RefObject<T> = ReactTypes.RefObject<T>;
    type CSSProperties = ReactTypes.CSSProperties;
  }
}

export {};
