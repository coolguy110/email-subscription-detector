import { EmailInput } from '../types/types';

export class EmailParser {
    static extractRelevantInfo(email: EmailInput): EmailInput {
        return {
            ...email,
            snippet: this.cleanText(email.snippet),
            subject: this.cleanText(email.subject),
            from: this.cleanText(email.from),
            date: email.date
        };
    }

    private static cleanText(text: string): string {
        return text
            .replace(/\u200B/g, '') // Remove zero-width spaces
            .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove all zero-width characters
            .replace(/‌/g, '') // Remove additional invisible characters
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }
}