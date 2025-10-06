// components/labels/templates/index.ts
import type { LabelTemplate } from "@/lib/labels/types"
import { Original69x25 } from "./original-69x25"
import { Blanca40x22 } from "./blanca-40x22"
import { Mini25x25 } from "./mini-25x25"
import { ColaRaton } from "./cola-raton"
import { Chica50x25 } from "./chica50x25"




export const LABEL_TEMPLATES: readonly LabelTemplate[] = [
  Original69x25,
  Blanca40x22,
  Mini25x25,
  ColaRaton,
  Chica50x25,
] as const

export type TemplateId = (typeof LABEL_TEMPLATES)[number]["id"]

export function getTemplate(id?: TemplateId): LabelTemplate {
  return LABEL_TEMPLATES.find(t => t.id === id) ?? LABEL_TEMPLATES[0]
}
