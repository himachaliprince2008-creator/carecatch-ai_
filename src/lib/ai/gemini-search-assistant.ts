import "server-only";

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { getGeminiApiKey } from "@/lib/server-env";
import { logger } from "@/lib/logger";

export const parsedSearchRequirementsSchema = z
  .object({
    intent: z.literal("hospital_search"),
    location: z.string().trim().min(1).nullable(),
    specialty: z.string().trim().min(1).nullable(),
    treatment: z.string().trim().min(1).nullable(),
    maxBudget: z.number().finite().nonnegative().nullable(),
    maxDistanceKm: z.number().finite().positive().max(1000).nullable(),
    requiredFacilities: z.array(z.string().trim().min(1)).max(20),
    requirePMJAY: z.boolean(),
    requireEmergency: z.boolean(),
    requireICU: z.boolean(),
    clarificationNeeded: z.boolean(),
    clarificationQuestion: z.string().trim().min(1).nullable(),
    missingInformation: z.array(z.string().trim().min(1)).max(10),
  })
  .superRefine((value, context) => {
    if (value.clarificationNeeded && !value.clarificationQuestion) {
      context.addIssue({
        code: "custom",
        path: ["clarificationQuestion"],
        message: "A clarification question is required when clarificationNeeded is true.",
      });
    }
    if (!value.clarificationNeeded && value.clarificationQuestion) {
      context.addIssue({
        code: "custom",
        path: ["clarificationQuestion"],
        message: "clarificationQuestion must be null when clarification is not needed.",
      });
    }
  });

export type ParsedSearchRequirements = z.infer<typeof parsedSearchRequirementsSchema>;

const geminiResponseSchema = {
  type: "OBJECT",
  properties: {
    intent: { type: "STRING", enum: ["hospital_search"] },
    location: { type: "STRING", nullable: true },
    specialty: { type: "STRING", nullable: true },
    treatment: { type: "STRING", nullable: true },
    maxBudget: { type: "NUMBER", nullable: true },
    maxDistanceKm: { type: "NUMBER", nullable: true },
    requiredFacilities: { type: "ARRAY", items: { type: "STRING" } },
    requirePMJAY: { type: "BOOLEAN" },
    requireEmergency: { type: "BOOLEAN" },
    requireICU: { type: "BOOLEAN" },
    clarificationNeeded: { type: "BOOLEAN" },
    clarificationQuestion: { type: "STRING", nullable: true },
    missingInformation: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: [
    "intent",
    "location",
    "specialty",
    "treatment",
    "maxBudget",
    "maxDistanceKm",
    "requiredFacilities",
    "requirePMJAY",
    "requireEmergency",
    "requireICU",
    "clarificationNeeded",
    "clarificationQuestion",
    "missingInformation",
  ],
} as const;

function parseJsonText(text: string): unknown {
  const withoutFence = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  return JSON.parse(withoutFence);
}

function clarificationIsSafe(result: ParsedSearchRequirements): ParsedSearchRequirements {
  const missingCritical =
    result.missingInformation.length > 0 || (!result.location && !result.specialty && !result.treatment);
  if (!missingCritical) return result;
  return {
    ...result,
    clarificationNeeded: true,
    clarificationQuestion:
      result.clarificationQuestion ?? "Which city and medical specialty or treatment should I search for?",
    missingInformation:
      result.missingInformation.length > 0 ? result.missingInformation : ["location", "specialty_or_treatment"],
  };
}

/**
 * Deterministic Heuristic Fallback Parser
 * Operates when Gemini API times out, has network drop, or hits rate limits.
 */
function heuristicFallbackParser(query: string): ParsedSearchRequirements {
  const lower = query.toLowerCase();

  let location: string | null = null;
  const knownCities = ["new york", "boston", "san francisco", "chicago", "los angeles", "delhi", "mumbai", "bengaluru", "hyderabad", "chennai", "pune", "bangalore", "kolkata", "jaipur", "ahmedabad", "lucknow", "bhopal", "indore", "surat", "patna", "guwahati", "kochi", "chandigarh", "bhubaneswar", "thiruvananthapuram"];
  for (const city of knownCities) {
    if (lower.includes(city)) {
      location = city.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      break;
    }
  }

  let specialty: string | null = null;
  if (lower.includes("cardio") || lower.includes("heart") || lower.includes("angioplasty") || lower.includes("dil") || lower.includes("hypertension") || lower.includes("fibrillation")) {
    specialty = "Cardiology";
  } else if (lower.includes("eye") || lower.includes("cataract") || lower.includes("vision") || lower.includes("ophthal") || lower.includes("glaucoma")) {
    specialty = "Ophthalmology";
  } else if (lower.includes("kidney") || lower.includes("dialysis") || lower.includes("nephro") || lower.includes("renal") || lower.includes("urinary")) {
    specialty = "Nephrology";
  } else if (lower.includes("ortho") || lower.includes("knee") || lower.includes("joint") || lower.includes("bone") || lower.includes("arthritis") || lower.includes("fracture") || lower.includes("spine")) {
    specialty = "Orthopedics";
  } else if (lower.includes("cancer") || lower.includes("oncol") || lower.includes("chemo") || lower.includes("tumor") || lower.includes("leukemia") || lower.includes("melanoma")) {
    specialty = "Oncology";
  } else if (lower.includes("asthma") || lower.includes("lung") || lower.includes("copd") || lower.includes("pulmon") || lower.includes("pneumonia") || lower.includes("tuberculosis") || lower.includes("bronchitis")) {
    specialty = "Pulmonology";
  } else if (lower.includes("ent") || lower.includes("ear") || lower.includes("nose") || lower.includes("throat") || lower.includes("sinus") || lower.includes("rhinitis") || lower.includes("tonsil")) {
    specialty = "ENT";
  } else if (lower.includes("typhoid") || lower.includes("dengue") || lower.includes("malaria") || lower.includes("infection") || lower.includes("flu") || lower.includes("influenza")) {
    specialty = "Infectious Diseases";
  } else if (lower.includes("trauma") || lower.includes("accident") || lower.includes("injury")) {
    specialty = "Traumatology";
  } else if (lower.includes("anesthesia") || lower.includes("surgery prep")) {
    specialty = "Anesthesiology";
  } else if (lower.includes("brain") || lower.includes("neuro") || lower.includes("stroke") || lower.includes("migraine") || lower.includes("epilepsy") || lower.includes("alzheimer") || lower.includes("parkinson")) {
    specialty = "Neurology";
  } else if (lower.includes("stomach") || lower.includes("gastro") || lower.includes("ulcer") || lower.includes("liver") || lower.includes("hepatitis") || lower.includes("pancreas")) {
    specialty = "Gastroenterology";
  } else if (lower.includes("blood") || lower.includes("anemia") || lower.includes("hema")) {
    specialty = "Hematology";
  } else if (lower.includes("skin") || lower.includes("derma") || lower.includes("acne") || lower.includes("psoriasis") || lower.includes("eczema")) {
    specialty = "Dermatology";
  } else if (lower.includes("diabetes") || lower.includes("thyroid") || lower.includes("endo")) {
    specialty = "Endocrinology";
  } else if (lower.includes("child") || lower.includes("pediatric") || lower.includes("kid")) {
    specialty = "Pediatrics";
  } else if (lower.includes("women") || lower.includes("gyne") || lower.includes("pregnancy")) {
    specialty = "Gynecology";
  }

  const requirePMJAY = lower.includes("pmjay") || lower.includes("pm-jay") || lower.includes("ayushman");
  const requireEmergency = lower.includes("emergency") || lower.includes("trauma") || lower.includes("urgent");
  const requireICU = lower.includes("icu") || lower.includes("intensive care");

  // Budget extraction heuristic (e.g. 50000, 1 lakh, 5k, 10000)
  let maxBudget: number | null = null;
  const lakhMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac|l)/i);
  if (lakhMatch) {
    maxBudget = parseFloat(lakhMatch[1]) * 100000;
  } else {
    const kMatch = lower.match(/(\d+)\s*k\b/i);
    if (kMatch) {
      maxBudget = parseInt(kMatch[1], 10) * 1000;
    } else {
      const numMatch = lower.match(/(?:under|budget|below|max)\s*(?:rs|inr|\$)?\s*(\d+)/i);
      if (numMatch) {
        maxBudget = parseInt(numMatch[1], 10);
      }
    }
  }

  const result: ParsedSearchRequirements = {
    intent: "hospital_search",
    location,
    specialty,
    treatment: null,
    maxBudget,
    maxDistanceKm: null,
    requiredFacilities: [],
    requirePMJAY,
    requireEmergency,
    requireICU,
    clarificationNeeded: !location && !specialty,
    clarificationQuestion: !location && !specialty ? "Which city and specialty are you looking for?" : null,
    missingInformation: !location && !specialty ? ["location", "specialty"] : [],
  };

  return clarificationIsSafe(result);
}

export async function parseHealthcareSearchRequest(userQuery: string): Promise<ParsedSearchRequirements> {
  const query = userQuery.trim();
  if (!query) throw new Error("Search request cannot be empty.");

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    logger.warn("Gemini API key not configured. Using deterministic fallback parser.");
    return heuristicFallbackParser(query);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Enforce an 8-second timeout on the external AI call
    const aiPromise = ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: query }] }],
      config: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: geminiResponseSchema,
        systemInstruction: `You convert a user's healthcare search request into search requirements only. Support English, Hindi, and Hinglish. Return only the requested JSON structure.

Never diagnose, prescribe, or give medical advice. Never create or infer hospital names, hospital facts, costs, ratings, outcomes, success rates, or facility availability. Extract a budget only when the user explicitly provides one. Extract facilities only when explicitly requested. Normalize an obvious specialty such as eye care to Ophthalmology, but use null when uncertain. Treat a city/location, specialty/treatment, budget, and facility needs as user requirements, not facts. If the request is ambiguous or lacks both a usable location and specialty/treatment, set clarificationNeeded true and ask one concise clarification question. Do not use external knowledge to fill missing values.`,
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Gemini AI request timed out after 8000ms")), 8000);
    });

    const response = await Promise.race([aiPromise, timeoutPromise]);
    const text = response.text;
    if (!text) throw new Error("Gemini returned an empty response.");

    const parsedJson = parseJsonText(text);
    const parsed = parsedSearchRequirementsSchema.safeParse(parsedJson);
    if (!parsed.success) {
      logger.warn("Gemini output failed schema validation. Falling back to heuristic parser.", {
        issues: parsed.error.issues,
      });
      return heuristicFallbackParser(query);
    }

    return clarificationIsSafe(parsed.data);
  } catch (err) {
    logger.warn("Gemini generation failed or timed out. Falling back to heuristic parser safely.", {
      error: err instanceof Error ? err.message : String(err),
    });
    return heuristicFallbackParser(query);
  }
}
