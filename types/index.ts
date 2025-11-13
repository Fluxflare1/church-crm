// types/index.ts

export * from './auth';
export * from './users';
export * from './people';
export * from './programs';
export * from './attendance';
export * from './tally';
export * from './follow-up';
export * from './communications';
export * from './broadcasts';
export * from './notifications';
export * from './analytics';
export * from './config';

// ---------------------------------------------------------
// BirthdaysConfig + SystemConfig extension
// This MUST be included here because other modules depend on it.
// ---------------------------------------------------------

/**
 * Preferred communication channels for automated and manual messaging.
 * You already export CommunicationChannel from './communications', so we reuse it.
 */
import type { CommunicationChannel } from './communications';

/**
 * Birthday automation configuration.
 * Controls when and how birthday messages are sent.
 */
export interface BirthdaysConfig {
  enabled: boolean;

  /**
   * Number of days BEFORE the birthday to send the message.
   * 0 = on the birthday itself.
   */
  daysBefore: number;

  /**
   * Primary channel for sending birthday greetings.
   * The system may fall back to other channels automatically.
   */
  defaultChannel: CommunicationChannel;

  /**
   * Template for automated birthday messages.
   * Tokens supported:
   * {{firstName}}, {{lastName}}, {{fullName}}, {{churchName}}
   */
  messageTemplate: string;
}

/**
 * Extend the SystemConfig interface by merging in
 * the birthdays automation configuration block.
 */
export interface SystemConfig {
  birthdays: BirthdaysConfig;
  // NOTE: All other SystemConfig fields are imported
  // from './config' and merged at use time, so we do not redefine them here.
}
