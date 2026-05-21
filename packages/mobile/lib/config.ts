import Constants from "expo-constants";

export const API_URL = (
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  "https://b588iqpvtru3uh0q4bcng-preview-4200.runable.site"
).replace(/\/$/, "");
