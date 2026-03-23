import { knowledge as k } from "../knowledge/index.js";

export const getPKTNow = () =>
  new Date().toLocaleString("en-PK", {
    timeZone: "Asia/Karachi",
    dateStyle: "full",
    timeStyle: "medium",
  });

export const convertTimezone = () => {
  const now = new Date();
  return Object.entries(k.timezones)
    .filter(([key]) => key !== "PKT")
    .map(([key, zone]) => {
      const offsetMs = zone.offset * 60 * 60 * 1000;
      const pktOffset = 5 * 60 * 60 * 1000;
      const targetTime = new Date(now.getTime() + offsetMs - pktOffset);
      const timeStr = targetTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
      return `• ${zone.label}: ${timeStr}`;
    })
    .join("\n");
};
