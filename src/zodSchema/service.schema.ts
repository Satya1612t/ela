import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().min(2, "Name is required"),
  note: z.string().optional(),
  description: z.string().optional(),
});

export const updateServiceSchema = z.object({
  name: z.string().min(2).optional(),
  note: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});
