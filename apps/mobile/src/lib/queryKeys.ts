export const queryKeys = {
  items: ["items"],
  favorites: ["favorites"],
  gallery: ["gallery"],
  me: ["me"],
  weather: ["weather"],
  fits: ["fits"],
  fitsByOwner: (owner: string) => ["fits", { owner }],
  battles: (status?: string) => ["battles", { status }],
  publicUser: (id: string) => ["publicUser", id],
} as const;
