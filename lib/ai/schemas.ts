import { z } from 'zod'

export const evidenceFieldSchema = z.object({
  value: z.unknown(),
  confidence: z.number().min(0).max(1),
  snippet: z.string().optional(),
  method: z.string().optional(),
})

export const literaryMetadataSchema = z.object({
  factual: z
    .object({
      title: z.string().optional(),
      author: z.string().optional(),
      sourceHints: z.string().optional(),
      fragmentType: z.string().optional(),
    })
    .optional(),
  textual: z
    .object({
      genreForm: z.string().optional(),
      rhetoric: z.array(z.string()).optional(),
      motifs: z.array(z.string()).optional(),
      keywords: z.array(z.string()).optional(),
      affectiveRegister: z.string().optional(),
    })
    .optional(),
  interpretive: z
    .object({
      domains: z.array(z.string()).optional(),
      worldviewTension: z.string().optional(),
      quoteLeak: z.string().optional(),
      provenance: z.string().optional(),
    })
    .optional(),
  evidence: z.record(z.string(), evidenceFieldSchema).optional(),
  confidence: z.number().min(0).max(1).optional(),
  warnings: z.array(z.string()).optional(),
})

export const tagAssignmentSchema = z.object({
  family: z.enum(['domain', 'motif', 'form', 'affect', 'worldview', 'source', 'risk']),
  label: z.string().min(1),
  confidence: z.number().min(0).max(1),
  evidence: z.string().optional(),
  lifecycleState: z.enum(['suggested', 'confirmed', 'weak', 'rejected', 'corrected']).default('suggested'),
})

export const relationshipSuggestionSchema = z.object({
  fromThoughtObjectId: z.string().uuid(),
  toThoughtObjectId: z.string().uuid(),
  type: z.enum([
    'echoes',
    'rebuts',
    'extends',
    'inverts',
    'parodies',
    'radicalizes',
    'secularizes',
    'shares-image-system',
    'shares-rhetorical-form',
    'supports',
    'descends_from',
  ]),
  confidence: z.number().min(0).max(1),
  evidence: z.string(),
  inferenceSource: z.string(),
  lifecycleState: z.enum(['suggested', 'confirmed', 'rejected', 'derived']).default('suggested'),
})

export const generationPlanItemSchema = z.object({
  outputMode: z.string(),
  formalConstraint: z.string(),
  revisionDirection: z.string().optional(),
})

export const qualityCheckSchema = z.object({
  quoteLeakageRisk: z.number().int().min(1).max(5),
  sourceMimicryRisk: z.number().int().min(1).max(5),
  falseLineageRisk: z.number().int().min(1).max(5),
  genericProfundityRisk: z.number().int().min(1).max(5),
  tensionFlatteningRisk: z.number().int().min(1).max(5),
  provenanceCoverage: z.number().int().min(1).max(5),
  flags: z.array(z.string()),
  status: z.enum(['passed', 'flagged', 'blocked']),
  guidance: z.string().optional(),
})

export type LiteraryMetadata = z.infer<typeof literaryMetadataSchema>
export type TagAssignment = z.infer<typeof tagAssignmentSchema>
export type RelationshipSuggestion = z.infer<typeof relationshipSuggestionSchema>
export type QualityCheck = z.infer<typeof qualityCheckSchema>
