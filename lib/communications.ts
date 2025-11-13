'use client';

import {
  getSystemConfig,
  getMessageTemplates,
  getPeople,
} from './database';

import type {
  CommunicationChannel,
  MessageTemplate,
  SendMessagePayload,
  ProviderSendResult,
  Person,
  SystemConfig,
} from '@/types';

type TemplateContext = Record<string, unknown>;

interface CommsApiRequest {
  to: string;
  body: string;
  subject?: string;
  channel: CommunicationChannel;
  provider: {
    baseUrl: string;
    method: 'GET' | 'POST';
    apiKey?: string;
    apiKeyHeaderName?: string;
    defaultSenderId?: string;
    extraHeaders?: Record<string, string>;
    timeoutMs?: number;
  };
}

/**
 * Entry point: send a message to a person using a template or custom body.
 * - Respects channel availability and SystemConfig.communications.
 * - Falls back according to defaultChannelOrder when needed.
 */
export async function sendMessageToPerson(
  payload: SendMessagePayload & {
    initiatedByUserId: string;
    context?: TemplateContext;
  }
): Promise<ProviderSendResult> {
  const config = getSystemConfig();
  const people = getPeople();
  const person = people.find((p) => p.id === payload.personId);

  if (!person) {
    return {
      success: false,
      errorMessage: 'Person not found.',
    };
  }

  const channel = resolveChannel(person, payload.channel, config);
  if (channel === 'call') {
    // For calls we don't hit an API; UI should use tel: links.
    const phone = person.personalData.phone;
    if (!phone) {
      return {
        success: false,
        errorMessage: 'No phone number available for call.',
      };
    }
    return {
      success: true,
      providerMessageId: `tel:${phone}`,
    };
  }

  const body = buildMessageBody(payload, channel, person, config);
  const subject =
    channel === 'email'
      ? buildEmailSubject(payload, person, config)
      : undefined;

  const to = getRecipientContact(person, channel);
  if (!to) {
    return {
      success: false,
      errorMessage: `No valid contact for channel ${channel}.`,
    };
  }

  const provider = buildProviderPayload(config, channel);
  if (!provider.baseUrl) {
    return {
      success: false,
      errorMessage: `No provider configured for channel ${channel}.`,
    };
  }

  const apiRequest: CommsApiRequest = {
    to,
    body,
    subject,
    channel,
    provider,
  };

  const route = getApiRouteForChannel(channel);

  try {
    const res = await fetch(route, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiRequest),
    });

    const json = (await res.json()) as ProviderSendResult;

    if (!res.ok || !json.success) {
      return {
        success: false,
        errorMessage: json.errorMessage ?? 'Failed to send message.',
        providerMessageId: json.providerMessageId,
      };
    }

    return json;
  } catch (err: unknown) {
    const error = err as Error;
    return {
      success: false,
      errorMessage: error.message ?? 'Send failed.',
    };
  }
}

// ---- Channel & contact resolution -------------------------------------------

function resolveChannel(
  person: Person,
  requestedChannel: CommunicationChannel,
  config: SystemConfig
): CommunicationChannel {
  if (isChannelAvailable(person, requestedChannel, config)) {
    return requestedChannel;
  }

  const order = config.communications.defaultChannelOrder;
  for (const ch of order) {
    if (isChannelAvailable(person, ch, config)) {
      return ch;
    }
  }

  // Fallback: requested channel even if not fully available; will fail gracefully later
  return requestedChannel;
}

function isChannelAvailable(
  person: Person,
  channel: CommunicationChannel,
  config: SystemConfig
): boolean {
  if (person.engagement.doNotContact) return false;

  if (channel === 'whatsapp') {
    return (
      !!person.personalData.phone && config.communications.whatsapp.enabled
    );
  }

  if (channel === 'sms') {
    return !!person.personalData.phone && config.communications.sms.enabled;
  }

  if (channel === 'email') {
    return !!person.personalData.email && config.communications.email.enabled;
  }

  if (channel === 'call') {
    return !!person.personalData.phone && config.communications.call.enabled;
  }

  return false;
}

function getRecipientContact(
  person: Person,
  channel: CommunicationChannel
): string | null {
  if (channel === 'whatsapp' || channel === 'sms' || channel === 'call') {
    return person.personalData.phone || null;
  }
  if (channel === 'email') {
    return person.personalData.email || null;
  }
  return null;
}

// ---- Templates & body/subject rendering ------------------------------------

function buildMessageBody(
  payload: SendMessagePayload,
  channel: CommunicationChannel,
  person: Person,
  config: SystemConfig
): string {
  // Body override wins
  if (payload.bodyOverride) {
    return payload.bodyOverride;
  }

  if (!payload.templateId) {
    return '';
  }

  const templates = getMessageTemplates();
  const template = templates.find(
    (t) => t.id === payload.templateId && t.channel === channel
  );

  if (!template) {
    return '';
  }

  const ctx = buildTemplateContext(person, config, payload);
  return renderTemplate(template, ctx);
}

function buildEmailSubject(
  payload: SendMessagePayload,
  person: Person,
  config: SystemConfig
): string | undefined {
  if (!payload.templateId) return undefined;

  const templates = getMessageTemplates();
  const template = templates.find(
    (t) => t.id === payload.templateId && t.channel === 'email'
  );
  if (!template || !template.subject) return undefined;

  const ctx = buildTemplateContext(person, config, payload);
  return renderString(template.subject, ctx);
}

function buildTemplateContext(
  person: Person,
  config: SystemConfig,
  payload: SendMessagePayload
): TemplateContext {
  const base: TemplateContext = {
    personId: person.id,
    firstName: person.personalData.firstName,
    lastName: person.personalData.lastName,
    fullName: `${person.personalData.firstName} ${person.personalData.lastName}`,
    phone: person.personalData.phone,
    email: person.personalData.email,
    churchName: config.systemInfo.churchName,
    timezone: config.systemInfo.timezone,
    category: person.category,
    guestType: person.evolution.guestType,
    memberRating: person.evolution.memberRating,
    payloadChannel: payload.channel,
  };

  // Payload-specific context can be added by caller as `context` field
  // in the extended SendMessagePayload used by sendMessageToPerson.
  return base;
}

function renderTemplate(
  template: MessageTemplate,
  context: TemplateContext
): string {
  return renderString(template.body, context);
}

function renderString(str: string, context: TemplateContext): string {
  return str.replace(/{{\s*([\w.]+)\s*}}/g, (match, key) => {
    const value = (context as any)[key];
    return value !== undefined && value !== null ? String(value) : '';
  });
}

// ---- Provider payload & API routes ------------------------------------------

function buildProviderPayload(
  config: SystemConfig,
  channel: CommunicationChannel
): CommsApiRequest['provider'] {
  if (channel === 'whatsapp') {
    const c = config.communications.whatsapp;
    return {
      baseUrl: c.baseUrl,
      method: c.method,
      apiKey: c.apiKey,
      apiKeyHeaderName: c.apiKeyHeaderName,
      defaultSenderId: c.defaultSenderId,
      extraHeaders: c.extraHeaders,
      timeoutMs: c.timeoutMs,
    };
  }

  if (channel === 'sms') {
    const c = config.communications.sms;
    return {
      baseUrl: c.baseUrl,
      method: c.method,
      apiKey: c.apiKey,
      apiKeyHeaderName: c.apiKeyHeaderName,
      defaultSenderId: c.defaultSenderId,
      extraHeaders: c.extraHeaders,
      timeoutMs: c.timeoutMs,
    };
  }

  if (channel === 'email') {
    const c = config.communications.email;
    return {
      baseUrl: c.baseUrl,
      method: c.method,
      apiKey: c.apiKey,
      apiKeyHeaderName: c.apiKeyHeaderName,
      defaultSenderId: c.fromAddress ?? c.defaultSenderId,
      extraHeaders: c.extraHeaders,
      timeoutMs: c.timeoutMs,
    };
  }

  // call: no provider; we won't use API
  return {
    baseUrl: '',
    method: 'POST',
    extraHeaders: {},
  };
}

function getApiRouteForChannel(channel: CommunicationChannel): string {
  if (channel === 'whatsapp') return '/api/comms/whatsapp';
  if (channel === 'sms') return '/api/comms/sms';
  if (channel === 'email') return '/api/comms/email';
  // call should not reach here (handled earlier)
  return '/api/comms/whatsapp';
}
