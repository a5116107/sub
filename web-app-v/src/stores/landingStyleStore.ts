import { create } from 'zustand';

type LandingLightStyle = 'tech' | 'business';

interface LandingStyleState {
  lightStyle: LandingLightStyle;
  setLightStyle: (style: LandingLightStyle) => void;
}

const STORAGE_KEY = 'landing_light_style';

const getInitialLightStyle = (): LandingLightStyle => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'tech' || stored === 'business') return stored;
  return 'tech';
};

const applyLightStyle = (style: LandingLightStyle) => {
  const root = document.documentElement;
  root.classList.toggle('light-business', style === 'business');
};

const initialLightStyle = getInitialLightStyle();
applyLightStyle(initialLightStyle);

export const useLandingStyleStore = create<LandingStyleState>()((set) => ({
  lightStyle: initialLightStyle,
  setLightStyle: (style) =>
    set(() => {
      localStorage.setItem(STORAGE_KEY, style);
      applyLightStyle(style);
      return { lightStyle: style };
    }),
}));

export type { LandingLightStyle };
