export const getDay = (date) => {
  return new Date(date).toLocaleDateString("fr-FR", { day: "numeric" });
};

export const getMonth = (date) => {
  return new Date(date).toLocaleDateString("fr-FR", { month: "short" });
};

export const getMonthLong = (date) => {
  return new Date(date).toLocaleDateString("fr-FR", { month: "long" });
};
