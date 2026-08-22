import { AnthropicLLMProvider } from './anthropic';
import { LLMProvider } from './llm-provider';
import { config } from '../../config';
import prisma from '../../config/database';
import { PreVisitSummary, PostVisitSummary } from '../../types';
import { UrgencyLevel } from '@prisma/client';

// ─── Factory ─────────────────────────────────────────────

let provider: LLMProvider | null = null;

function getLLMProvider(): LLMProvider {
  if (!provider) {
    // Currently only Anthropic; add more providers here in the future
    if (!config.anthropicApiKey) {
      console.warn('[LLM] No ANTHROPIC_API_KEY configured — AI summaries will use fallbacks');
    }
    provider = new AnthropicLLMProvider();
  }
  return provider;
}

// ─── Fallbacks ───────────────────────────────────────────

const PRE_VISIT_FALLBACK: PreVisitSummary = {
  urgency_level: 'Medium',
  chief_complaint: 'Summary unavailable — please review symptoms manually',
  suggested_questions: [
    'Please describe your symptoms in detail',
    'How long have you been experiencing these symptoms?',
    'Are you currently taking any medications?',
  ],
};

const POST_VISIT_FALLBACK: PostVisitSummary = {
  summary: 'Summary unavailable — please review notes manually',
  medication_schedule: [],
  follow_up_steps: ['Contact your doctor for details about your visit'],
};

// ─── Pre-Visit Summary ──────────────────────────────────

export async function generateAndSavePreVisitSummary(appointmentId: string): Promise<void> {
  try {
    const symptomForm = await prisma.symptomForm.findUnique({
      where: { appointmentId },
    });

    if (!symptomForm) {
      console.warn(`[LLM] No symptom form found for appointment ${appointmentId}`);
      return;
    }

    let summary: PreVisitSummary;
    let promptUsed: string;

    try {
      const llm = getLLMProvider();
      const result = await llm.generatePreVisitSummary(symptomForm.rawSymptoms);
      summary = result.summary;
      promptUsed = result.promptUsed;
    } catch (llmError) {
      console.error(`[LLM] Pre-visit summary failed for appointment ${appointmentId}:`, llmError);
      summary = PRE_VISIT_FALLBACK;
      promptUsed = 'FALLBACK — LLM call failed';
    }

    // Map LLM urgency string to Prisma enum
    const urgencyMap: Record<string, UrgencyLevel> = {
      'Low': UrgencyLevel.LOW,
      'Medium': UrgencyLevel.MEDIUM,
      'High': UrgencyLevel.HIGH,
    };

    await prisma.symptomForm.update({
      where: { appointmentId },
      data: {
        aiSummaryJson: summary as any,
        urgencyLevel: urgencyMap[summary.urgency_level] || null,
        aiPromptUsed: promptUsed,
      },
    });

    console.log(`[LLM] Pre-visit summary saved for appointment ${appointmentId}`);
  } catch (error) {
    console.error(`[LLM] Failed to save pre-visit summary for appointment ${appointmentId}:`, error);
  }
}

// ─── Post-Visit Summary ─────────────────────────────────

export async function generateAndSavePostVisitSummary(appointmentId: string): Promise<void> {
  try {
    const visitNotes = await prisma.visitNotes.findUnique({
      where: { appointmentId },
    });

    if (!visitNotes) {
      console.warn(`[LLM] No visit notes found for appointment ${appointmentId}`);
      return;
    }

    let summary: PostVisitSummary;
    let promptUsed: string;

    try {
      const llm = getLLMProvider();
      const result = await llm.generatePostVisitSummary(visitNotes.clinicalNotes);
      summary = result.summary;
      promptUsed = result.promptUsed;
    } catch (llmError) {
      console.error(`[LLM] Post-visit summary failed for appointment ${appointmentId}:`, llmError);
      summary = POST_VISIT_FALLBACK;
      promptUsed = 'FALLBACK — LLM call failed';
    }

    await prisma.visitNotes.update({
      where: { appointmentId },
      data: {
        aiPatientSummaryJson: summary as any,
        aiPromptUsed: promptUsed,
      },
    });

    // Create medication reminders from the summary
    if (summary.medication_schedule && summary.medication_schedule.length > 0) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (appointment) {
        for (const med of summary.medication_schedule) {
          await prisma.medicationReminder.create({
            data: {
              visitNoteId: visitNotes.id,
              patientId: appointment.patientId,
              medication: med.medication,
              dosage: med.dosage,
              frequency: med.frequency,
              startDate: new Date(),
              endDate: null, // Could parse from med.duration
              nextSendAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // First reminder in 8 hours
            },
          });
        }
      }
    }

    console.log(`[LLM] Post-visit summary saved for appointment ${appointmentId}`);
  } catch (error) {
    console.error(`[LLM] Failed to save post-visit summary for appointment ${appointmentId}:`, error);
  }
}
