export class EmailDeliveryError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'EmailDeliveryError';
  }
}

export function isEmailDeliveryError(err: unknown): err is EmailDeliveryError {
  return err instanceof EmailDeliveryError;
}
