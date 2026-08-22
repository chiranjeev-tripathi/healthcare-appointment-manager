import { google, Auth } from 'googleapis';
import { config } from '../config';
import { prisma } from '../config/database';

export interface CalendarEventPayload {
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendees?: string[];
}

export class CalendarService {
  private oauth2Client: Auth.OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );
  }

  getAuthUrl(doctorId: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      state: doctorId,
      prompt: 'consent'
    });
  }

  async handleCallback(doctorId: string, code: string): Promise<void> {
    const { tokens } = await this.oauth2Client.getToken(code);
    
    await prisma.doctor_profile.update({
      where: { user_id: doctorId },
      data: {
        google_calendar_tokens: tokens as any,
      },
    });
  }

  private async getClientForDoctor(doctorId: string): Promise<Auth.OAuth2Client | null> {
    const profile = await prisma.doctor_profile.findUnique({
      where: { user_id: doctorId },
    });

    if (!profile || !profile.google_calendar_tokens) {
      return null;
    }

    const client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );
    
    client.setCredentials(profile.google_calendar_tokens as any);
    
    // Automatically save refreshed tokens
    client.on('tokens', async (tokens) => {
      const currentTokens = profile.google_calendar_tokens as any;
      const updatedTokens = { ...currentTokens, ...tokens };
      await prisma.doctor_profile.update({
        where: { user_id: doctorId },
        data: { google_calendar_tokens: updatedTokens },
      });
    });

    return client;
  }

  async createEvent(doctorId: string, payload: CalendarEventPayload): Promise<string | null> {
    try {
      const client = await this.getClientForDoctor(doctorId);
      if (!client) {
        console.log(`No calendar tokens found for doctor ${doctorId}`);
        return null;
      }

      const calendar = google.calendar({ version: 'v3', auth: client });
      
      const event = {
        summary: payload.summary,
        description: payload.description,
        start: {
          dateTime: payload.startTime.toISOString(),
        },
        end: {
          dateTime: payload.endTime.toISOString(),
        },
        attendees: payload.attendees ? payload.attendees.map(email => ({ email })) : [],
      };

      const res = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        sendUpdates: 'all',
      });

      return res.data.id || null;
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      return null;
    }
  }

  async updateEvent(doctorId: string, eventId: string, payload: CalendarEventPayload): Promise<void> {
    try {
      const client = await this.getClientForDoctor(doctorId);
      if (!client) return;

      const calendar = google.calendar({ version: 'v3', auth: client });
      
      const event = {
        summary: payload.summary,
        description: payload.description,
        start: { dateTime: payload.startTime.toISOString() },
        end: { dateTime: payload.endTime.toISOString() },
        attendees: payload.attendees ? payload.attendees.map(email => ({ email })) : [],
      };

      await calendar.events.update({
        calendarId: 'primary',
        eventId,
        requestBody: event,
        sendUpdates: 'all',
      });
    } catch (error) {
      console.error(`Failed to update calendar event ${eventId}:`, error);
    }
  }

  async deleteEvent(doctorId: string, eventId: string): Promise<void> {
    try {
      const client = await this.getClientForDoctor(doctorId);
      if (!client) return;

      const calendar = google.calendar({ version: 'v3', auth: client });
      
      await calendar.events.delete({
        calendarId: 'primary',
        eventId,
        sendUpdates: 'all',
      });
    } catch (error) {
      console.error(`Failed to delete calendar event ${eventId}:`, error);
    }
  }
}

export const calendarService = new CalendarService();
