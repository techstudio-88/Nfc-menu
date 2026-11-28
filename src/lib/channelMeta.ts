/**
 * Order channels. Each channel is represented by a virtual "table" (code = channel code) so existing
 * kitchen, realtime, reports and printing keep working with no schema change.
 * Delivery aggregators (Swiggy, Zomato, ONDC…) normally reach a restaurant through a partner such as
 * UrbanPiper / Petpooja / Dyno, which forwards each order to /api/integrations/<channel>.
 */
export const CHANNELS: Record<string, { name: string; kind: "delivery" | "pickup" | "own"; color: string }> = {
  SWIGGY: { name: "Swiggy", kind: "delivery", color: "#fc8019" },
  ZOMATO: { name: "Zomato", kind: "delivery", color: "#cb202d" },
  ONDC: { name: "ONDC", kind: "delivery", color: "#2b6cb0" },
  MAGICPIN: { name: "Magicpin", kind: "delivery", color: "#7c3aed" },
  WEBSITE: { name: "Own website", kind: "own", color: "#0f7a4f" },
  DELIVERY: { name: "Delivery (POS)", kind: "delivery", color: "#8e1b2a" },
  TAKEAWAY: { name: "Takeaway", kind: "pickup", color: "#b86e0a" },
};
export const channelOf = (tableCode: string | null | undefined) => (tableCode && CHANNELS[tableCode.toUpperCase()] ? tableCode.toUpperCase() : null);
