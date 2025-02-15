import { EmailInput, SubscriptionOutput, SubscriptionCategory, SubscriptionCycle } from '../types/types';
import { EmailParser } from './emailParser';
import { OpenAIService } from './openaiService';

export class SubscriptionDetector {
    private processedCount: number = 0;
    private totalCount: number = 0;
    private openAIService: OpenAIService;

    constructor() {
        this.openAIService = new OpenAIService();
    }

    async processEmails(emails: EmailInput[]): Promise<SubscriptionOutput[]> {
        const subscriptions: SubscriptionOutput[] = [];
        this.totalCount = emails.length;
        
        for (const email of emails) {
            try {
                const parsedEmail = EmailParser.extractRelevantInfo(email);
                
                // Create a base subscription from the email
                const subscription = this.createBaseSubscription(parsedEmail);

                // Enhance with OpenAI if available
                if (process.env.OPENAI_API_KEY) {
                    const aiSubscription = await this.openAIService.detectSubscription(parsedEmail);
                    if (aiSubscription) {
                        Object.assign(subscription, aiSubscription);
                    }
                }

                // Enhance with rule-based detection
                this.enhanceSubscriptionWithRules(subscription, parsedEmail);
                
                // Validate and clean the subscription data
                const validatedSubscription = this.validateAndEnhanceSubscription(subscription, parsedEmail);
                subscriptions.push(validatedSubscription);
                
                this.processedCount++;
                this.logProgress();
            } catch (error) {
                console.error(`Error processing email from ${email.from}:`, error);
            }
        }

        return this.deduplicateSubscriptions(subscriptions);
    }

    private createBaseSubscription(email: EmailInput): SubscriptionOutput {
        return {
            name: this.extractServiceName(email) || 'unknown',
            cycle: this.detectBillingCycle(this.cleanHtmlContent(email.body)),
            start_date: new Date(email.date).toISOString().split('T')[0],
            category: this.detectCategory(email)
        };
    }

    private enhanceSubscriptionWithRules(subscription: SubscriptionOutput, email: EmailInput) {
        const content = this.cleanHtmlContent(email.body).toLowerCase();
        const subject = email.subject.toLowerCase();
        const snippet = email.snippet.toLowerCase();
        const fullContent = `${subject} ${snippet} ${content}`;

        // Extract amount if not already set
        if (!subscription.amount) {
            subscription.amount = this.extractAmount(fullContent);
        }

        // Extract trial information if not already set
        if (!subscription.is_trial) {
            const trialInfo = this.extractTrialInfo(fullContent, email.date);
            if (trialInfo.isTrial) {
                subscription.is_trial = trialInfo.isTrial;
                subscription.trial_duration_in_days = trialInfo.trialDuration;
                subscription.trial_end_date = trialInfo.trialEndDate;
            }
        }

        // Enhance category if possible
        if (subscription.category === 'other') {
            subscription.category = this.detectCategory(email);
        }
    }

    private detectCategory(email: EmailInput): SubscriptionCategory {
        const content = this.cleanHtmlContent(email.body).toLowerCase();
        const subject = email.subject.toLowerCase();
        const from = email.from.toLowerCase();
        const fullContent = `${subject} ${content}`;

        // Define category detection patterns
        const categoryPatterns = {
            streaming: /\b(?:stream|video|music|audio|movie|show|episode|playlist|netflix|hulu|disney|spotify)\b/i,
            utilities: /\b(?:utility|electric|water|gas|internet|cable|phone|broadband|bill|xfinity|comcast)\b/i,
            software: /\b(?:software|app|application|platform|tool|service|cloud|storage|backup)\b/i,
            rent: /\b(?:rent|lease|apartment|housing|property|tenant|landlord|manor|estate)\b/i,
            insurance: /\b(?:insurance|coverage|policy|premium|protection|claim)\b/i,
            food_delivery: /\b(?:food|delivery|meal|restaurant|order|grocery|doordash|uber|grubhub)\b/i,
            storage: /\b(?:storage|space|drive|backup|cloud|icloud)\b/i,
            entertainment: /\b(?:game|gaming|entertainment|subscription|content)\b/i
        };

        for (const [category, pattern] of Object.entries(categoryPatterns)) {
            if (pattern.test(fullContent) || pattern.test(from)) {
                return category as SubscriptionCategory;
            }
        }

        return 'other';
    }

    private extractServiceName(email: EmailInput): string | null {
        const fromParts = email.from.split('@');
        let name = '';

        // Try to extract from email subject first
        const subjectMatches = email.subject.match(/(?:from|for|to) ([\w\s&]+?)(?:\s*-|\s*\(|$)/i);
        if (subjectMatches) {
            name = subjectMatches[1].trim();
        }

        // If no name found in subject, try sender name
        if (!name && fromParts[0]) {
            name = fromParts[0]
                .replace(/[<>]/g, '')
                .replace(/\b(?:no[-_]?reply|support|info|service|billing)\b/gi, '')
                .replace(/[._-]/g, ' ')
                .trim();
        }

        // If still no name, try domain name
        if (!name && fromParts[1]) {
            name = fromParts[1].split('.')[0].replace(/[._-]/g, ' ').trim();
        }

        return name || null;
    }

    private detectBillingCycle(content: string): SubscriptionCycle {
        const cyclePatterns = {
            yearly: /\b(?:annual|yearly|year|12.?month|365.?day)\b/i,
            monthly: /\b(?:monthly|month|30.?day)\b/i,
            weekly: /\b(?:weekly|week|7.?day)\b/i,
            'bi-weekly': /\b(?:bi.?weekly|every.?two.?weeks|every.?other.?week)\b/i,
            quarterly: /\b(?:quarterly|quarter|3.?month|90.?day)\b/i,
            'bi-monthly': /\b(?:bi.?monthly|every.?two.?months)\b/i,
            'bi-yearly': /\b(?:bi.?yearly|semi.?annual|twice.?a.?year)\b/i
        };

        for (const [cycle, pattern] of Object.entries(cyclePatterns)) {
            if (pattern.test(content)) {
                return cycle as SubscriptionCycle;
            }
        }

        return 'unknown';
    }

    private extractTrialInfo(content: string, startDate: string): { 
        isTrial: boolean; 
        trialDuration?: number; 
        trialEndDate?: string; 
    } {
        const isTrial = /\b(?:trial|free.?period|try.?for.?free)\b/i.test(content);
        if (!isTrial) return { isTrial: false };

        const durationMatch = content.match(/\b(\d+)[\s-]*(day|week|month)s?\b/i);
        if (!durationMatch) return { isTrial: true };

        const [_, duration, unit] = durationMatch;
        const durationDays = {
            day: 1,
            week: 7,
            month: 30
        } as const;
        
        const unitKey = unit.toLowerCase() as keyof typeof durationDays;
        const multiplier = durationDays[unitKey] || 1;  // fallback to 1 if invalid unit
        const totalDays = multiplier * parseInt(duration);

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + totalDays);

        return {
            isTrial: true,
            trialDuration: totalDays,
            trialEndDate: endDate.toISOString().split('T')[0]
        };
    }

    private validateAndEnhanceSubscription(
        subscription: SubscriptionOutput, 
        email: EmailInput
    ): SubscriptionOutput {
        return {
            ...subscription,
            name: subscription.name.toLowerCase().trim(),
            amount: this.validateAmount(subscription.amount),
            start_date: new Date(email.date).toISOString().split('T')[0]
        };
    }

    private validateAmount(amount: number | undefined): number | undefined {
        if (amount === undefined) return undefined;
        if (isNaN(amount) || amount <= 0 || amount > 10000) return undefined;
        return Number(amount.toFixed(2));
    }

    private extractAmount(text: string): number | undefined {
        const matches = text.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
        if (matches) {
            return parseFloat(matches[1].replace(/,/g, ''));
        }
        return undefined;
    }

    private cleanHtmlContent(html: string): string {
        return html
            .replace(/<[^>]*>/g, ' ')
            .replace(/&[^;]+;/g, ' ')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private deduplicateSubscriptions(subscriptions: SubscriptionOutput[]): SubscriptionOutput[] {
        const grouped = new Map<string, SubscriptionOutput[]>();
        
        for (const sub of subscriptions) {
            const key = `${sub.name}-${sub.category}`;
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key)!.push(sub);
        }

        return Array.from(grouped.values()).map(group => {
            return group.reduce((latest, current) => {
                if (!latest) return current;
                
                const latestDate = new Date(latest.start_date);
                const currentDate = new Date(current.start_date);
                
                if (currentDate > latestDate) {
                    return {
                        ...current,
                        amount: current.amount || latest.amount,
                        is_trial: current.is_trial || latest.is_trial,
                        trial_duration_in_days: current.trial_duration_in_days || latest.trial_duration_in_days,
                        trial_end_date: current.trial_end_date || latest.trial_end_date
                    };
                }
                return latest;
            });
        });
    }

    private logProgress(): void {
        const percentage = Math.round((this.processedCount / this.totalCount) * 100);
        console.log(`Processed ${this.processedCount}/${this.totalCount} emails (${percentage}%)...`);
    }
}