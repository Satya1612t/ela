import { z } from "zod";
import { ApplicationStatus } from "@prisma/client";

export const applicationSchema = z.object({
  serviceId: z.string().uuid({ message: "Invalid service ID" }),
  ServiceName: z.string().optional(),
});

export const updateApplicationSchema = z.object({
  applicationStatus: z.nativeEnum(ApplicationStatus).optional(),
  objectionReason: z.string().optional(),
  autoCloseAt: z.string().datetime().optional(),
});

export const applicationUpdateSchema = z.object({
  message: z.string().min(1, "Update message is required"),
});