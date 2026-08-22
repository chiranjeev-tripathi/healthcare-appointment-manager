import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider } from './llm-provider';
import { config } from '../../config';
import { PreVisitSummary, PostVisitSummary, PreVisitSummarySchema, PostVisitSummarySchema } from '../../types';

export class AnthropicLLMProvider implements LLMProvider {
  private anthropic: Anthropic;
  private model = 'claude-sonnet-4-20250514';

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: config.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  async generatePreVisitSummary(symptoms: string): Promise<{ summary: PreVisitSummary; promptUsed: string }> {
    const prompt = `Analyse these symptoms and return a JSON object with these exact fields: urgency_level (one of: Low, Medium, High), chief_complaint (string), suggested_questions (array of exactly 3 strings — questions for the doctor). Symptoms: ${symptoms}. Return ONLY valid JSON, no other text.`;
    
    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 1024,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
        timeout: config.llmTimeout || 15000,
      });

      const content = response.content[0].type === 'text' ? response.content[0].text : '';
      const parsed = JSON.parse(content);
      const validated = PreVisitSummarySchema.parse(parsed);

      return { summary: validated, promptUsed: prompt };
    } catch (error) {
      console.error('Failed to generate pre-visit summary with Anthropic:', error);
      throw new Error(`Anthropic pre-visit summary generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async generatePostVisitSummary(notes: string): Promise<{ summary: PostVisitSummary; promptUsed: string }> {
    const prompt = `Convert these clinical notes into a patient-friendly JSON object with these exact fields: summary (string — plain language summary), medication_schedule (array of objects with: medication, dosage, frequency, duration, instructions), follow_up_steps (array of strings). Notes: ${notes}. Return ONLY valid JSON, no other text.`;
    
    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 1500,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
        timeout: config.llmTimeout || 15000,
      });

      const content = response.content[0].type === 'text' ? response.content[0].text : '';
      const parsed = JSON.parse(content);
      const validated = PostVisitSummarySchema.parse(parsed);

      return { summary: validated, promptUsed: prompt };
    } catch (error) {
      console.error('Failed to generate post-visit summary with Anthropic:', error);
      throw new Error(`Anthropic post-visit summary generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
