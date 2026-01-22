import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Email, AIAnalysisResult, SimilarEmailResult, SenderGroupAnalysis, EmailDetail, EmailAIAnalysis, EmailAction } from "../types";

// NOTE: In a production app, the API Key should be securely handled via a backend proxy.
// For this client-side demo, we assume process.env.API_KEY is available.
const apiKey = process.env.API_KEY || 'DEMO_KEY';

export const analyzeEmailsWithGemini = async (emails: Email[]): Promise<AIAnalysisResult[]> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key found. Returning mock analysis for demo purposes.");
    return mockAnalysis(emails);
  }

  const ai = new GoogleGenAI({ apiKey });

  const emailDataForPrompt = emails.map(e => ({
    id: e.id,
    sender: e.sender,
    subject: e.subject,
    snippet: e.snippet
  }));

  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        emailId: { type: Type.STRING },
        category: { 
          type: Type.STRING, 
          enum: ['Promotional', 'Notification', 'Newsletter', 'Social', 'Finance', 'Personal', 'Spam']
        },
        confidence: { type: Type.NUMBER },
        reasoning: { type: Type.STRING },
        suggestedAction: { 
          type: Type.STRING,
          enum: ['archive', 'delete', 'keep', 'mark_read'] 
        },
        riskLevel: { 
          type: Type.STRING,
          enum: ['low', 'medium', 'high']
        }
      },
      required: ['emailId', 'category', 'suggestedAction', 'riskLevel', 'reasoning']
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        You are an expert email organization AI. Analyze the following list of email metadata.
        For each email, categorize it, assess the risk of deleting it (Risk Level), suggest an action (archive, delete, keep), 
        and provide a very short reasoning.
        
        Emails to analyze:
        ${JSON.stringify(emailDataForPrompt)}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "You are Inbox Guardian, a cautious but efficient email cleaner. You prefer archiving over deleting unless it is clearly spam. You are highly accurate.",
      }
    });

    if (response.text) {
      const parsedResults = JSON.parse(response.text) as AIAnalysisResult[];
      return parsedResults;
    }
    throw new Error("No response text from Gemini");

  } catch (error) {
    console.error("Gemini analysis error:", error);
    return mockAnalysis(emails);
  }
};

// Fallback if no API key is present
const mockAnalysis = (emails: Email[]): AIAnalysisResult[] => {
  return emails.map(email => {
    let category: any = 'Personal';
    let action: any = 'keep';
    let risk: any = 'high';

    if (email.sender.includes('Amazon') || email.sender.includes('Uber')) {
      category = 'Notification';
      action = 'archive';
      risk = 'medium';
    } else if (email.sender.includes('Netflix') || email.sender.includes('Spotify')) {
      category = 'Promotional';
      action = 'delete';
      risk = 'low';
    } else if (email.sender.includes('Old Navy')) {
      category = 'Promotional';
      action = 'delete';
      risk = 'low';
    } else if (email.sender.includes('LinkedIn')) {
      category = 'Social';
      action = 'archive';
      risk = 'low';
    }

    return {
      emailId: email.id,
      category,
      confidence: 0.95,
      reasoning: `Matched pattern for ${category} emails.`,
      suggestedAction: action,
      riskLevel: risk
    };
  });
};

export const findSimilarEmails = async (
  sourceEmail: Email,
  allEmails: Email[]
): Promise<SimilarEmailResult[]> => {
  // Exclude the source email from candidates
  const candidateEmails = allEmails.filter(e => e.id !== sourceEmail.id);

  if (candidateEmails.length === 0) {
    return [];
  }

  if (!process.env.API_KEY) {
    console.warn("No API Key found. Returning mock similar emails for demo purposes.");
    return mockSimilarEmails(sourceEmail, candidateEmails);
  }

  const ai = new GoogleGenAI({ apiKey });

  const emailDataForPrompt = candidateEmails.map(e => ({
    id: e.id,
    sender: e.sender,
    senderEmail: e.senderEmail,
    subject: e.subject
  }));

  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        emailId: { type: Type.STRING },
        similarityScore: { type: Type.NUMBER },
        matchReason: { type: Type.STRING }
      },
      required: ['emailId', 'similarityScore', 'matchReason']
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        You are an email similarity analyzer. Given a source email, find all semantically similar emails from the candidate list.

        Source email to match against:
        - Subject: "${sourceEmail.subject}"
        - Sender: "${sourceEmail.sender}" <${sourceEmail.senderEmail}>

        Candidate emails to analyze:
        ${JSON.stringify(emailDataForPrompt)}

        For each candidate email, determine if it is semantically similar to the source email.
        Consider:
        - Similar subject patterns (e.g., "Your order shipped" vs "Order #123 has shipped")
        - Same sender or same type of sender (e.g., both are shipping notifications)
        - Similar content themes (e.g., both are promotional, both are receipts)

        Return ONLY emails with similarity score >= 0.6.
        Provide a brief matchReason explaining why they are similar.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "You are a precise email similarity analyzer. Be thorough but only include truly similar emails (score >= 0.6). The matchReason should be concise (under 50 characters).",
      }
    });

    if (response.text) {
      const parsedResults = JSON.parse(response.text) as SimilarEmailResult[];
      // Filter to only include results with score >= 0.6
      return parsedResults.filter(r => r.similarityScore >= 0.6);
    }
    throw new Error("No response text from Gemini");

  } catch (error) {
    console.error("Gemini similarity analysis error:", error);
    return mockSimilarEmails(sourceEmail, candidateEmails);
  }
};

const mockSimilarEmails = (sourceEmail: Email, candidates: Email[]): SimilarEmailResult[] => {
  const results: SimilarEmailResult[] = [];

  // Simple heuristic matching for demo
  const sourceSubjectLower = sourceEmail.subject.toLowerCase();
  const sourceSenderLower = sourceEmail.sender.toLowerCase();

  for (const candidate of candidates) {
    const candidateSubjectLower = candidate.subject.toLowerCase();
    const candidateSenderLower = candidate.sender.toLowerCase();

    let score = 0;
    let reason = '';

    // Same sender gets high score
    if (candidateSenderLower === sourceSenderLower ||
        candidate.senderEmail === sourceEmail.senderEmail) {
      score += 0.5;
      reason = 'Same sender';
    }

    // Check for common subject keywords
    const sourceWords = sourceSubjectLower.split(/\s+/).filter(w => w.length > 3);
    const candidateWords = candidateSubjectLower.split(/\s+/).filter(w => w.length > 3);
    const commonWords = sourceWords.filter(w => candidateWords.includes(w));

    if (commonWords.length > 0) {
      score += Math.min(0.4, commonWords.length * 0.15);
      reason = reason ? `${reason}, similar subject` : `Similar subject keywords`;
    }

    // Check for promotional patterns
    const promoPatterns = ['sale', 'off', 'discount', 'deal', 'offer', 'free', 'save'];
    const sourceHasPromo = promoPatterns.some(p => sourceSubjectLower.includes(p));
    const candidateHasPromo = promoPatterns.some(p => candidateSubjectLower.includes(p));

    if (sourceHasPromo && candidateHasPromo) {
      score += 0.2;
      reason = reason ? reason : 'Both promotional emails';
    }

    // Check for notification patterns
    const notifPatterns = ['shipped', 'delivered', 'order', 'receipt', 'confirmation', 'update'];
    const sourceHasNotif = notifPatterns.some(p => sourceSubjectLower.includes(p));
    const candidateHasNotif = notifPatterns.some(p => candidateSubjectLower.includes(p));

    if (sourceHasNotif && candidateHasNotif) {
      score += 0.2;
      reason = reason ? reason : 'Both notification emails';
    }

    if (score >= 0.6) {
      results.push({
        emailId: candidate.id,
        similarityScore: Math.min(score, 1),
        matchReason: reason || 'Similar content pattern'
      });
    }
  }

  // Sort by similarity score descending
  return results.sort((a, b) => b.similarityScore - a.similarityScore);
};

export const analyzeSenderGroup = async (
  senderEmail: string,
  senderName: string,
  emails: Email[]
): Promise<SenderGroupAnalysis> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key found. Returning mock sender group analysis for demo purposes.");
    return mockSenderGroupAnalysis(senderEmail, senderName, emails);
  }

  const ai = new GoogleGenAI({ apiKey });

  const emailSummary = emails.slice(0, 20).map(e => ({
    subject: e.subject,
    snippet: e.snippet,
    date: e.date
  }));

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        enum: ['Promotional', 'Notification', 'Newsletter', 'Social', 'Finance', 'Personal', 'Spam']
      },
      recommendation: {
        type: Type.STRING,
        enum: ['keep', 'archive', 'delete', 'review']
      },
      summary: { type: Type.STRING },
      confidence: { type: Type.NUMBER }
    },
    required: ['category', 'recommendation', 'summary', 'confidence']
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Analyze emails from a single sender and provide an overall recommendation.

        Sender: ${senderName} <${senderEmail}>
        Total emails: ${emails.length}

        Sample of recent emails from this sender:
        ${JSON.stringify(emailSummary)}

        Based on these emails:
        1. Categorize this sender (Promotional, Notification, Newsletter, Social, Finance, Personal, Spam)
        2. Recommend what to do with ALL emails from this sender:
           - "keep" = These are important, keep all
           - "archive" = Not urgent, safe to archive all
           - "delete" = Low value, safe to delete all
           - "review" = Mixed content, review individually
        3. Provide a brief summary explaining your recommendation (max 100 chars)
        4. Confidence score (0-1)
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "You are Inbox Guardian, helping users clean their inbox. Be conservative - only recommend 'delete' for clearly low-value senders (promotions, spam). Recommend 'review' if unsure.",
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as SenderGroupAnalysis;
    }
    throw new Error("No response text from Gemini");

  } catch (error) {
    console.error("Gemini sender group analysis error:", error);
    return mockSenderGroupAnalysis(senderEmail, senderName, emails);
  }
};

const mockSenderGroupAnalysis = (
  senderEmail: string,
  senderName: string,
  emails: Email[]
): SenderGroupAnalysis => {
  const senderLower = senderName.toLowerCase();
  const emailLower = senderEmail.toLowerCase();

  // Promotional patterns
  if (
    emailLower.includes('promo') ||
    emailLower.includes('marketing') ||
    emailLower.includes('newsletter') ||
    emailLower.includes('deals') ||
    senderLower.includes('old navy') ||
    senderLower.includes('groupon') ||
    senderLower.includes('linkedin')
  ) {
    return {
      category: 'Promotional',
      recommendation: 'delete',
      summary: 'Promotional emails - safe to delete',
      confidence: 0.85
    };
  }

  // Notification patterns
  if (
    emailLower.includes('noreply') ||
    emailLower.includes('notification') ||
    senderLower.includes('amazon') ||
    senderLower.includes('uber') ||
    senderLower.includes('netflix')
  ) {
    return {
      category: 'Notification',
      recommendation: 'archive',
      summary: 'Service notifications - safe to archive',
      confidence: 0.80
    };
  }

  // Finance patterns
  if (
    senderLower.includes('bank') ||
    senderLower.includes('paypal') ||
    senderLower.includes('venmo') ||
    emailLower.includes('billing')
  ) {
    return {
      category: 'Finance',
      recommendation: 'keep',
      summary: 'Financial emails - recommend keeping',
      confidence: 0.90
    };
  }

  // Default - review individually
  return {
    category: 'Personal',
    recommendation: 'review',
    summary: 'Mixed content - review emails individually',
    confidence: 0.60
  };
};

export const analyzeEmailDetail = async (email: EmailDetail): Promise<EmailAIAnalysis> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key found. Returning mock email analysis for demo purposes.");
    return mockEmailDetailAnalysis(email);
  }

  const ai = new GoogleGenAI({ apiKey });

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      emailId: { type: Type.STRING },
      summary: { type: Type.STRING },
      keyPoints: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      sentiment: {
        type: Type.STRING,
        enum: ['positive', 'neutral', 'negative', 'urgent']
      },
      category: {
        type: Type.STRING,
        enum: ['Promotional', 'Notification', 'Newsletter', 'Social', 'Finance', 'Personal', 'Spam']
      },
      urgency: {
        type: Type.STRING,
        enum: ['low', 'medium', 'high', 'critical']
      },
      suggestedActions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: {
              type: Type.STRING,
              enum: ['reply', 'forward', 'delete', 'archive', 'star', 'snooze', 'unsubscribe', 'mark_spam']
            },
            label: { type: Type.STRING },
            description: { type: Type.STRING },
            priority: {
              type: Type.STRING,
              enum: ['primary', 'secondary', 'tertiary']
            },
            draftContent: { type: Type.STRING }
          },
          required: ['type', 'label', 'description', 'priority']
        }
      },
      requiresResponse: { type: Type.BOOLEAN },
      responseDeadline: { type: Type.STRING },
      extractedInfo: {
        type: Type.OBJECT,
        properties: {
          dates: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          amounts: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          links: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          people: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          organizations: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      }
    },
    required: ['emailId', 'summary', 'keyPoints', 'sentiment', 'category', 'urgency', 'suggestedActions', 'requiresResponse']
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Analyze this email in detail and provide actionable insights.

        Email Details:
        - From: ${email.sender} <${email.senderEmail}>
        - Subject: ${email.subject}
        - Date: ${email.date}
        - Body: ${email.bodyText.slice(0, 3000)}

        Provide:
        1. A brief summary (2-3 sentences)
        2. Key points (bullet points of important information)
        3. Sentiment (positive, neutral, negative, urgent)
        4. Category (Promotional, Notification, Newsletter, Social, Finance, Personal, Spam)
        5. Urgency level (low, medium, high, critical)
        6. Suggested actions with:
           - type: reply, forward, delete, archive, star, snooze, unsubscribe, mark_spam
           - label: short button text
           - description: what this action does
           - priority: primary (main action), secondary, tertiary
           - draftContent: for reply/forward, provide a draft response if applicable
        7. Whether this email requires a response
        8. Response deadline if any deadline is mentioned
        9. Extracted information:
           - Dates mentioned (appointments, deadlines, events)
           - Monetary amounts
           - Important links
           - People mentioned
           - Organizations mentioned
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: `You are Inbox Guardian AI, helping users manage their email efficiently.
        Provide concise, actionable insights. For reply drafts, write professional and helpful responses.
        Always include at least 2-3 suggested actions. The primary action should be the most important one.
        Be helpful but conservative - don't suggest deleting emails unless they're clearly promotional or spam.`,
      }
    });

    if (response.text) {
      const result = JSON.parse(response.text) as EmailAIAnalysis;
      result.emailId = email.id; // Ensure correct emailId
      return result;
    }
    throw new Error("No response text from Gemini");

  } catch (error) {
    console.error("Gemini email detail analysis error:", error);
    return mockEmailDetailAnalysis(email);
  }
};

const mockEmailDetailAnalysis = (email: EmailDetail): EmailAIAnalysis => {
  const subjectLower = email.subject.toLowerCase();
  const bodyLower = email.bodyText.toLowerCase();
  const senderLower = email.sender.toLowerCase();

  // Determine category and sentiment
  let category: EmailAIAnalysis['category'] = 'Personal';
  let sentiment: EmailAIAnalysis['sentiment'] = 'neutral';
  let urgency: EmailAIAnalysis['urgency'] = 'low';
  let requiresResponse = false;

  // Promotional patterns
  if (
    subjectLower.includes('sale') ||
    subjectLower.includes('off') ||
    subjectLower.includes('deal') ||
    subjectLower.includes('promo') ||
    bodyLower.includes('unsubscribe')
  ) {
    category = 'Promotional';
    sentiment = 'neutral';
    urgency = 'low';
  }
  // Urgent patterns
  else if (
    subjectLower.includes('urgent') ||
    subjectLower.includes('asap') ||
    subjectLower.includes('immediately') ||
    subjectLower.includes('action required')
  ) {
    sentiment = 'urgent';
    // Critical for "immediately" or "action required", otherwise high
    urgency = (subjectLower.includes('immediately') || subjectLower.includes('action required'))
      ? 'critical'
      : 'high';
    requiresResponse = true;
  }
  // Finance patterns
  else if (
    senderLower.includes('bank') ||
    senderLower.includes('paypal') ||
    subjectLower.includes('payment') ||
    subjectLower.includes('invoice') ||
    subjectLower.includes('receipt')
  ) {
    category = 'Finance';
    urgency = 'medium';
  }
  // Notification patterns
  else if (
    subjectLower.includes('shipped') ||
    subjectLower.includes('delivered') ||
    subjectLower.includes('order') ||
    subjectLower.includes('confirmation')
  ) {
    category = 'Notification';
  }
  // Question patterns - likely needs response
  else if (
    bodyLower.includes('?') ||
    bodyLower.includes('let me know') ||
    bodyLower.includes('please reply') ||
    bodyLower.includes('get back to')
  ) {
    requiresResponse = true;
    urgency = 'medium';
  }

  // Build suggested actions
  const actions: EmailAction[] = [];

  if (requiresResponse) {
    actions.push({
      type: 'reply',
      label: 'Reply',
      description: 'Send a response to this email',
      priority: 'primary',
      draftContent: `Hi ${email.sender.split(' ')[0]},\n\nThank you for your email. I wanted to follow up regarding "${email.subject}".\n\n[Your response here]\n\nBest regards`
    });
  }

  if (category === 'Promotional') {
    actions.push({
      type: 'unsubscribe',
      label: 'Unsubscribe',
      description: 'Unsubscribe from this mailing list',
      priority: requiresResponse ? 'secondary' : 'primary'
    });
    actions.push({
      type: 'delete',
      label: 'Delete',
      description: 'Move this email to trash',
      priority: 'secondary'
    });
  } else {
    actions.push({
      type: 'archive',
      label: 'Archive',
      description: 'Archive this email for later reference',
      priority: requiresResponse ? 'secondary' : 'primary'
    });
  }

  if (urgency === 'high' || urgency === 'critical') {
    actions.push({
      type: 'star',
      label: 'Star',
      description: 'Mark as important',
      priority: 'secondary'
    });
  }

  actions.push({
    type: 'forward',
    label: 'Forward',
    description: 'Forward to someone else',
    priority: 'tertiary'
  });

  // Extract basic info
  const extractedInfo: EmailAIAnalysis['extractedInfo'] = {};

  // Extract dates (simple pattern)
  const datePatterns = bodyLower.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(?:,? \d{4})?\b/gi);
  if (datePatterns && datePatterns.length > 0) {
    extractedInfo.dates = datePatterns.slice(0, 5);
  }

  // Extract amounts (simple pattern)
  const amountPatterns = bodyLower.match(/\$[\d,]+(?:\.\d{2})?|\b\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:usd|dollars?)\b/gi);
  if (amountPatterns && amountPatterns.length > 0) {
    extractedInfo.amounts = amountPatterns.slice(0, 5);
  }

  // Extract links
  const linkPatterns = email.bodyText.match(/https?:\/\/[^\s<>"]+/gi);
  if (linkPatterns && linkPatterns.length > 0) {
    extractedInfo.links = linkPatterns.slice(0, 5);
  }

  // Build summary
  const summary = `Email from ${email.sender} about "${email.subject}". ${
    requiresResponse ? 'This email appears to require a response.' :
    category === 'Promotional' ? 'This appears to be a promotional email.' :
    category === 'Finance' ? 'This is a financial notification.' :
    category === 'Notification' ? 'This is a notification email.' :
    'Review the content for any action items.'
  }`;

  // Key points
  const keyPoints: string[] = [];
  if (requiresResponse) keyPoints.push('Requires your response');
  if (category === 'Finance') keyPoints.push('Contains financial information');
  if (extractedInfo.dates?.length) keyPoints.push(`Mentions dates: ${extractedInfo.dates.join(', ')}`);
  if (extractedInfo.amounts?.length) keyPoints.push(`Mentions amounts: ${extractedInfo.amounts.join(', ')}`);
  if (email.attachments?.length) keyPoints.push(`Has ${email.attachments.length} attachment(s)`);
  if (keyPoints.length === 0) keyPoints.push('No urgent action items detected');

  return {
    emailId: email.id,
    summary,
    keyPoints,
    sentiment,
    category,
    urgency,
    suggestedActions: actions,
    requiresResponse,
    extractedInfo: Object.keys(extractedInfo).length > 0 ? extractedInfo : undefined
  };
};
