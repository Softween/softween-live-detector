/** Mixpanel is only active when a token is provided at build time. */
export const MIXPANEL_TOKEN: string | undefined = import.meta.env.VITE_MIXPANEL_TOKEN;
export const mixpanelEnabled = Boolean(MIXPANEL_TOKEN);
