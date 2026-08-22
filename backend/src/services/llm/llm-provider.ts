import { PreVisitSummary, PostVisitSummary } from '../../types';

export interface LLMProvider {
  generatePreVisitSummary(symptoms: string): Promise<{ summary: PreVisitSummary; promptUsed: string }>;
  generatePostVisitSummary(notes: string): Promise<{ summary: PostVisitSummary; promptUsed: string }>;
}
