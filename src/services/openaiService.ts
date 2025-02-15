import OpenAI from 'openai';
import { EmailInput, SubscriptionOutput } from '../types/types';

export class OpenAIService {
    private openai: OpenAI;
    private static readonly SYSTEM_PROMPT = `You are a subscription detection expert. Analyze emails to extract subscription information with high precision. Focus on:
- Recurring payments/subscriptions
- Trial periods
- Service subscriptions
- Utility bills
- Rent payments
- Insurance payments

For each detected subscription, provide:
- Exact service/company name
- Amount (if mentioned)
- Billing cycle
- Start date
- Trial information
- Category classification

Be conservative - only return subscription data when highly confident.`;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async detectSubscription(email: EmailInput): Promise<SubscriptionOutput | null> {
        const prompt = `
Analyze this email for subscription or recurring payment information:

From: ${email.from}
Subject: ${email.subject}
Date: ${email.date}
Content: ${email.snippet}

If this contains subscription-related information, extract the following details:
- Service/company name
- Payment amount (if mentioned)
- Billing cycle (monthly/yearly/weekly/bi-weekly/quarterly/bi-monthly/bi-yearly)
- Start date
- Trial information (if applicable)
- Category (streaming/utilities/software/rent/insurance/other)

Format your response as a valid JSON object with these exact fields:
{
    "name": "service name",
    "amount": number or null,
    "cycle": "monthly|yearly|weekly|bi-weekly|quarterly|bi-monthly|bi-yearly|unknown",
    "start_date": "YYYY-MM-DD",
    "is_trial": boolean or null,
    "trial_duration_in_days": number or null,
    "trial_end_date": "YYYY-MM-DD" or null,
    "category": "streaming|utilities|software|rent|insurance|other"
}

If this is not a subscription-related email, respond with: null`;

        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    { role: "system", content: OpenAIService.SYSTEM_PROMPT },
                    { role: "user", content: prompt }
                ],
                temperature: 0.1
            });

            const content = response.choices[0].message.content;
            if (!content || content.trim().toLowerCase() === 'null') {
                return null;
            }

            try {
                const parsed = JSON.parse(content);
                if (!parsed || !parsed.name) return null;
                
                // Validate date format
                if (parsed.start_date) {
                    parsed.start_date = new Date(parsed.start_date).toISOString().split('T')[0];
                }
                if (parsed.trial_end_date) {
                    parsed.trial_end_date = new Date(parsed.trial_end_date).toISOString().split('T')[0];
                }
                
                return parsed;
            } catch (e) {
                console.error('Error parsing OpenAI response:', e);
                return null;
            }
        } catch (error) {
            console.error('Error calling OpenAI:', error);
            throw error;
        }
    }
}