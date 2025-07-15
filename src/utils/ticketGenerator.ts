export const generateTicketNumber = (): string => {
  const now = new Date();
  const datePart = now.toISOString().split("T")[0].replace(/-/g, "");
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TKT-${datePart}-${randomPart}`;
};
