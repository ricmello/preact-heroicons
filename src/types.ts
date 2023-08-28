import { FunctionalComponent, JSX, Ref } from 'preact';

export type HeroIconAttrs = JSX.SVGAttributes & JSX.HTMLAttributes;

export type HeroIcon = FunctionalComponent<
  Omit<JSX.SVGAttributes<SVGElement> & JSX.HTMLAttributes<EventTarget>, 'ref'> & {
    ref?: Ref<SVGSVGElement>;
  }
>;
