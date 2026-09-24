import { z } from "zod";

const text = (label: string, max = 200) =>
  z.string({ error: `${label} is required.` }).trim().min(1, `${label} cannot be empty.`).max(max, `${label} is too long.`);

const cityPattern = /^[\p{L}][\p{L}\s.'-]{1,99}$/u;
const statePattern = /^[\p{L}][\p{L}\s.'-]{1,99}$/u;

export const hospitalTypeSchema = z.enum(["HOSPITAL", "CLINIC", "SPECIALTY_CENTER", "AMBULATORY_CENTER", "OTHER"], {
  error: "hospitalType must be a supported facility type.",
});

export const verificationStatusSchema = z.enum(["PENDING", "VERIFIED", "REJECTED"], {
  error: "verificationStatus must be PENDING, VERIFIED, or REJECTED.",
});

export const hospitalValidationSchema = z.object({
  name: text("Hospital name", 200),
  address: text("Hospital address", 300),
  city: text("City", 100).refine((value) => cityPattern.test(value), "City contains invalid characters."),
  state: text("State", 100).refine((value) => statePattern.test(value), "State contains invalid characters."),
  latitude: z.number({ error: "Latitude must be a number." }).finite("Latitude must be finite.").min(-90, "Latitude must be between -90 and 90.").max(90, "Latitude must be between -90 and 90."),
  longitude: z.number({ error: "Longitude must be a number." }).finite("Longitude must be finite.").min(-180, "Longitude must be between -180 and 180.").max(180, "Longitude must be between -180 and 180."),
  hospitalType: hospitalTypeSchema,
  rating: z.number({ error: "Rating must be a number." }).finite("Rating must be finite.").min(0, "Rating cannot be negative.").max(5, "Rating cannot be greater than 5."),
  reviewCount: z.number({ error: "Review count must be a number." }).int("Review count must be a whole number.").nonnegative("Review count cannot be negative."),
});

export const treatmentValidationSchema = z.object({
  disease: text("Disease", 200),
  treatmentName: text("Treatment name", 200),
  minimumCost: z.number({ error: "Minimum cost must be a number." }).finite("Minimum cost must be finite.").nonnegative("Minimum cost cannot be negative."),
  maximumCost: z.number({ error: "Maximum cost must be a number." }).finite("Maximum cost must be finite.").nonnegative("Maximum cost cannot be negative."),
}).superRefine((value, context) => {
  if (value.minimumCost > value.maximumCost) {
    context.addIssue({ code: "custom", path: ["maximumCost"], message: "Maximum cost cannot be lower than minimum cost." });
  }
});

export const outcomeValidationSchema = z.object({
  totalReportedPatients: z.number({ error: "Total reported patients must be a number." }).int("Total reported patients must be a whole number.").nonnegative("Total reported patients cannot be negative."),
  reportedSuccessfulOutcomes: z.number({ error: "Successful outcomes must be a number." }).int("Successful outcomes must be a whole number.").nonnegative("Successful outcomes cannot be negative."),
  reportingPeriod: z.object({
    start: z.coerce.date({ error: "Reporting period start must be a valid date." }),
    end: z.coerce.date({ error: "Reporting period end must be a valid date." }),
  }).superRefine((period, context) => {
    if (period.end < period.start) context.addIssue({ code: "custom", path: ["end"], message: "Reporting period end cannot be before start." });
  }),
  source: text("Outcome source", 300),
  verificationStatus: verificationStatusSchema,
}).superRefine((value, context) => {
  if (value.reportedSuccessfulOutcomes > value.totalReportedPatients) {
    context.addIssue({ code: "custom", path: ["reportedSuccessfulOutcomes"], message: "Successful outcomes cannot exceed total reported patients." });
  }
});

export type HospitalValidationInput = z.input<typeof hospitalValidationSchema>;
export type HospitalRecord = z.output<typeof hospitalValidationSchema>;
export type TreatmentValidationInput = z.input<typeof treatmentValidationSchema>;
export type TreatmentRecord = z.output<typeof treatmentValidationSchema>;
export type OutcomeValidationInput = z.input<typeof outcomeValidationSchema>;
export type OutcomeRecord = z.output<typeof outcomeValidationSchema>;
