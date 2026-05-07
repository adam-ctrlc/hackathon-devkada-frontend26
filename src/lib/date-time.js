export const getDayPeriod = (date = new Date()) => {
  const hour = date.getHours();

  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
};

export const getTimeGreeting = (date = new Date()) => {
  const period = getDayPeriod(date);

  if (period === "morning") return "Good morning";
  if (period === "afternoon") return "Good afternoon";
  return "Good evening";
};
