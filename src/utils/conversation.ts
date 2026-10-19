import type { ConversionStatus, Intent } from "@/types";

export const intentLabels: Record<Intent, string> = {
  buy: "Buy",
  question: "Question",
  spam: "Spam",
};
export const statusLabels: Record<ConversionStatus, string> = {
  new: "New lead",
  engaged: "Engaged",
  qualified: "Qualified",
  converted: "Converted",
  lost: "Closed",
};

export function timeAgo(timestamp: number): string {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
}
