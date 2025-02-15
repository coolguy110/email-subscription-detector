# Email Subscription Detector

A TypeScript application that analyzes emails to detect and extract subscription-related information using both rule-based processing and OpenAI's GPT models.

## Overview

This project processes emails to identify various types of subscriptions, including:
- Streaming services
- Software subscriptions
- Utility bills
- Rent payments
- Insurance payments
- Trial memberships

The detector extracts key information such as:
- Subscription name
- Payment amount
- Billing cycle
- Trial period details
- Service category

## Features

- **Dual Detection System**: Combines rule-based pattern matching with AI-powered analysis
- **OpenAI Integration**: Uses GPT models for advanced subscription detection
- **Deduplication**: Automatically groups and merges related subscription entries
- **Trial Period Detection**: Identifies and extracts trial period information
- **Flexible Categories**: Supports multiple subscription types and categories
- **Clean Output**: Generates well-structured JSON output

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/email-subscription-detector.git
cd email-subscription-detector
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory and add your OpenAI API key:

```
OPENAI_API_KEY=your_openai_api_key
```

## Usage

1. Run the application:

```bash
npm start
```

2. Provide the path to your email file:

copy your email.json file to the data/ folder

3. The application will process the emails and output the detected subscriptions to the console.

## Output

The application will output the detected subscriptions in JSON format:

```json
[
    {
    "name": "string",                          // Subscription name or service provider
    "amount": "number (optional)",             // Subscription cost if available
    "cycle": "monthly | yearly | weekly | bi-weekly | quarterly | bi-monthly | bi-yearly | unknown",
    "start_date": "date",         
    "is_trial": "boolean (optional)",          
    "trial_duration_in_days": "number (optional)", // Duration of the trial in days
    "trial_end_date": "string (optional)"      // End date of the trial (if detected)
    },
]
```
  
