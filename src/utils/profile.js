export const HEALTH_GOALS = [
  "Eat healthier",
  "Lose weight",
  "Gain weight",
  "Maintain",
  "Build muscle",
  "Reduce sugar",
  "Reduce sodium",
  "Improve energy",
  "Improve digestion",
];

export const ACTIVITY_LEVELS = [
  "sedentary",
  "lightly active",
  "active",
  "very active",
];

export const DIET_PATTERNS = [
  "omnivore",
  "pescatarian",
  "vegetarian",
  "vegan",
  "keto",
  "paleo",
];

export const CURRENCIES = ["PHP", "USD", "SGD", "EUR", "AUD"];

export const emptyProfileForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  age: "",
  sex: "MALE",
  heightCm: "",
  weightKg: "",
  activityLevel: "",
  healthGoal: "",
  dietPattern: "",
  allergies: [],
  foodPreferences: [],
  dietRestrictions: [],
  budgetAmount: "",
  budgetCurrency: "PHP",
  budgetFrequency: "monthly",
  syncHealth: true,
};

export const formFromProfile = (profile) => ({
  ...emptyProfileForm,
  firstName: profile.firstName ?? "",
  middleName: profile.middleName ?? "",
  lastName: profile.lastName ?? "",
  email: profile.email ?? "",
  age: profile.age ?? "",
  sex: profile.sex ?? "MALE",
  heightCm: profile.heightCm ?? "",
  weightKg: profile.weightKg ?? "",
  activityLevel: profile.activityLevel ?? "",
  healthGoal: profile.healthGoal ?? "",
  dietPattern: profile.dietPattern ?? "",
  allergies: [...(profile.allergies ?? [])],
  foodPreferences: [...(profile.foodPreferences ?? [])],
  dietRestrictions: [...(profile.dietRestrictions ?? [])],
  budgetAmount: profile.budgetAmount ?? "",
  budgetCurrency: profile.budgetCurrency ?? "PHP",
  budgetFrequency: profile.budgetFrequency ?? "monthly",
});
