// A permanent, app-level home for the MSG91 captcha widget's DOM node.
//
// AuthModal is mounted/unmounted every time the sign-in dialog opens/closes,
// but MSG91's widget can only be initialized (and its captcha rendered) once
// per page load — calling initSendOTP a second time re-renders the captcha
// into an already-rendered container and breaks it (see msg91Otp.js).
//
// So the actual captcha container DOM node must never be destroyed. This
// component mounts once at the app root and holds that node off-screen by
// default. AuthModal physically relocates (not re-renders) the node into its
// own layout on open, and relocates it back here on close — the node itself,
// and any captcha state MSG91 rendered into it, survives the whole time.
export const OTP_WIDGET_HOST_ID = 'otp-widget-host';
export const OTP_WIDGET_CONTAINER_ID = 'otp-widget-container';

export default function OtpCaptchaHost() {
  return (
    <div
      id={OTP_WIDGET_HOST_ID}
      aria-hidden="true"
      style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: 0, height: 0, overflow: 'hidden' }}
    >
      <div id={OTP_WIDGET_CONTAINER_ID} />
    </div>
  );
}
