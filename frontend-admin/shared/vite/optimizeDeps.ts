/** Vite dependency pre-bundle hints — avoids 504 Outdated Optimize Dep after dep changes. */
export const optimizeDeps = {
  include: [
    '@tanstack/react-query',
    'zustand',
  ],
};
