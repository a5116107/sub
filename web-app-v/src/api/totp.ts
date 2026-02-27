import { api } from './client';
import type {
  TOTPSetupResponse,
} from '../types';

export const totpApi = {
  // Get TOTP status
  getStatus: () =>
    api.get<{
      enabled: boolean;
      verified: boolean;
    }>('/user/totp/status'),

  // Get verification method
  getVerificationMethod: () =>
    api.get<{
      method: 'email' | 'totp';
    }>('/user/totp/verification-method'),

  // Send verification code
  sendCode: () =>
    api.post<void>('/user/totp/send-code', {}),

  // Setup TOTP
  setup: () =>
    api.post<TOTPSetupResponse>('/user/totp/setup', {}),

  // Enable TOTP
  enable: (data: { code: string; secret: string }) =>
    api.post<void>('/user/totp/enable', data),

  // Disable TOTP
  disable: (data: { code: string; password: string }) =>
    api.post<void>('/user/totp/disable', data),
};
