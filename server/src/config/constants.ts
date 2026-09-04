export const ROLES = ['SUPER_ADMIN', 'AGENT'] as const;
export type RoleName = (typeof ROLES)[number];

export const ADMIN_PANEL_ROLES: RoleName[] = ['SUPER_ADMIN'];
export const AGENT_PANEL_ROLES: RoleName[] = ['AGENT'];

export const MAX_CART_SIZE = 200;
export const MAX_TICKET_GENERATION_QTY = 50000;
export const TICKET_GENERATION_CHUNK_SIZE = 2000;
