import { z } from "zod";

export const userRegisterSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  city: z.string().optional(),
});

export const updateUserProfileSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().min(10).max(15).optional(),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD")
    .optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  city: z.string().min(2).optional(),
});