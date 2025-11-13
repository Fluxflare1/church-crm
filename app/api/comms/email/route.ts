import { NextRequest, NextResponse } from 'next/server';

interface ProviderConfigPayload {
  baseUrl: string;
  method: 'GET' | 'POST';
  apiKey?: string;
  apiKeyHeaderName?: string;
  defaultSenderId?: string;
  extraHeaders?: Record<string, string>;
  timeoutMs?: number;
}

interface CommsApiRequest {
  to: string;
  body: string;
  subject?: string;
  channel: 'email';
  provider: ProviderConfigPayload;
}

export async function POST(req: NextRequest) {
  let payload: CommsApiRequest;

  try {
    payload = (await req.json()) as CommsApiRequest;
  } catch {
    return NextResponse.json(
      {
        success: false,
        errorMessage: 'Invalid JSON payload.',
      },
      { status: 400 }
    );
  }

  const { to, body, subject, provider } = payload;

  if (!provider.baseUrl) {
    return NextResponse.json(
      {
        success: false,
        errorMessage: 'No provider baseUrl configured.',
      },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    provider.timeoutMs ?? 15000
  );

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(provider.extraHeaders ?? {}),
  };

  if (provider.apiKey && provider.apiKeyHeaderName) {
    headers[provider.apiKeyHeaderName] = provider.apiKey;
  }

  const providerBody = {
    to,
    subject,
    message: body,
    senderId: provider.defaultSenderId,
  };

  try {
    const res = await fetch(provider.baseUrl, {
      method: provider.method,
      headers,
      body: JSON.stringify(providerBody),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // provider did not return JSON
    }

    const providerMessageId =
      json?.id ?? json?.messageId ?? json?.data?.id ?? null;

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          providerMessageId,
          errorMessage: `Provider error: HTTP ${res.status}`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        providerMessageId,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    clearTimeout(timeout);
    const error = err as Error;
    return NextResponse.json(
      {
        success: false,
        providerMessageId: null,
        errorMessage: error.message ?? 'Email send failed.',
      },
      { status: 500 }
    );
  }
}
