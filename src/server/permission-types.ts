/**
 * Permission types for mutating operations
 */

export interface ConfirmationRequest {
  confirmationRequired: true;
  tool: string;
  description: string;
  args: string[];
  cwd: string;
}

export interface ConfirmationDenied {
  success: false;
  error: string;
  code: 'CONFIRMATION_REQUIRED';
}

export function isConfirmationRequest(
  response: unknown
): response is ConfirmationRequest {
  return (
    typeof response === 'object' &&
    response !== null &&
    'confirmationRequired' in response &&
    (response as ConfirmationRequest).confirmationRequired === true
  );
}
