import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import OtpCaptchaHost, { OTP_WIDGET_CONTAINER_ID, OTP_WIDGET_HOST_ID } from './OtpCaptchaHost.jsx';

describe('OtpCaptchaHost', () => {
  it('does not use the id MSG91 auto-initializes its demo widget on', () => {
    expect(OTP_WIDGET_CONTAINER_ID).not.toBe('otp-widget-container');
    const { container } = render(<OtpCaptchaHost />);
    expect(container.querySelector('#otp-widget-container')).toBeNull();
  });

  it('keeps the captcha container inside the off-screen host', () => {
    const { container } = render(<OtpCaptchaHost />);
    const host = container.querySelector(`#${OTP_WIDGET_HOST_ID}`);
    expect(host.querySelector(`#${OTP_WIDGET_CONTAINER_ID}`)).not.toBeNull();
  });
});
