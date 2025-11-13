// types/communications.ts

export type CommunicationChannel = 'whatsapp' | 'sms' | 'email' | 'call';

export interface MessageTemplateVariable {
  name: string;                   // e.g. "firstName"
  description: string;            // e.g. "Recipient's first name"
}

export interface MessageTemplate {
  id: string;
  name: string;
  description?: string;
  channel: CommunicationChannel;
  subject?: string;               // email subject if channel === 'email'
  body: string;                   // template content with placeholders: {{firstName}}
  variables: MessageTemplateVariable[];
  createdAt: string;              // ISO
  updatedAt: string;              // ISO
}

export interface SendMessagePayload {
  personId: string;
  channel: CommunicationChannel;
  templateId?: string;
  bodyOverride?: string;          // if sending ad-hoc message
}

export interface ProviderSendResult {
  success: boolean;
  providerMessageId?: string;
  errorMessage?: string;
}
