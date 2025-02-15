import dotenv from 'dotenv';
import { SubscriptionDetector } from './services/subscriptionDetector';
import { EmailInput } from './types/types';
import fs from 'fs/promises';

dotenv.config();

async function main() {
    try {
        console.log('Starting subscription detection...');
        
        // Read emails from JSON file
        console.log('Reading emails from file...');
        const emailsData = await fs.readFile('./data/emails.json', 'utf-8');
        const emails: EmailInput[] = JSON.parse(emailsData);
        console.log(`Found ${emails.length} emails to process`);

        // Create output directory if it doesn't exist
        await fs.mkdir('./output', { recursive: true });

        // Process emails
        console.log('Processing emails...');
        const detector = new SubscriptionDetector();
        const subscriptions = await detector.processEmails(emails);

        // Output results
        console.log(`\nDetected ${subscriptions.length} unique subscriptions`);
        
        // Save results to file
        const outputPath = './output/subscriptions.json';
        await fs.writeFile(
            outputPath, 
            JSON.stringify(subscriptions, null, 2)
        );
        console.log(`Results saved to ${outputPath}`);

    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

main();