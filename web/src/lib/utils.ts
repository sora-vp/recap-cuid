import axios from "axios";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const apiInstance = axios.create({
  baseURL: import.meta.env.PROD ? "/api" : "http://localhost:8080/api",
});
