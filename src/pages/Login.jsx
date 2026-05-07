import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Eye,
  EyeSlash,
  EnvelopeSimple,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { Card } from "../components/ui/Card.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Input, Field } from "../components/ui/Input.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { BrandName } from "../components/BrandName.jsx";
import { TurnstileWidget } from "../components/TurnstileWidget.jsx";
import { RateLimitNotice } from "../components/RateLimitNotice.jsx";
import {
  apiRequest,
  formatApiError,
  getApiFieldError,
  isRateLimitError,
} from "../lib/api.js";
import { setAuthSession } from "../lib/auth-session.js";
import { AppFooter } from "../components/AppFooter.jsx";
import { usePageTitle } from "../hooks/usePageTitle.js";

const emptyResetState = {
  email: "",
  token: "",
  newPassword: "",
  confirmPassword: "",
};

export default function Login() {
  const navigate = useNavigate();
  const [showForgot, setShowForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [apiError, setApiError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileNonce, setTurnstileNonce] = useState(0);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const [resetStage, setResetStage] = useState("request");
  const [resetState, setResetState] = useState(emptyResetState);
  const [resetError, setResetError] = useState("");
  const [resetApiError, setResetApiError] = useState(null);
  const [resetMessage, setResetMessage] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetTurnstileToken, setResetTurnstileToken] = useState("");
  const [resetTurnstileNonce, setResetTurnstileNonce] = useState(0);

  const closeForgot = () => {
    setShowForgot(false);
    setResetStage("request");
    setResetState(emptyResetState);
    setResetError("");
    setResetMessage("");
    setResetLoading(false);
    setResetTurnstileToken("");
    setResetTurnstileNonce((value) => value + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setApiError(null);

    const normalizedIdentifier = identifier.trim();
    const normalizedPassword = password.trim();

    if (!normalizedIdentifier) {
      setError("Email or username is required");
      return;
    }

    if (!normalizedPassword) {
      setError("Password is required");
      return;
    }

    if (!turnstileToken) {
      setError("Please complete the Turnstile check first");
      return;
    }

    setLoading(true);

    try {
      const response = await apiRequest("/auth/login", {
        method: "POST",
        auth: false,
        body: {
          identifier: normalizedIdentifier,
          password: normalizedPassword,
          turnstileToken,
        },
      });

      setAuthSession(response);
      navigate("/u/dashboard");
    } catch (err) {
      setApiError(err);
      if (err.code === "EMAIL_NOT_VERIFIED" && err.data?.email) {
        setUnverifiedEmail(err.data.email);
        setError("");
      } else {
        setError(formatApiError(err));
      }
      setTurnstileNonce((value) => value + 1);
      setTurnstileToken("");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerify = async () => {
    setResendMessage("");
    setResendLoading(true);
    try {
      await apiRequest("/auth/resend-verify", {
        method: "POST",
        auth: false,
        body: { email: unverifiedEmail },
      });
      setResendMessage("A new verification code was sent to your email.");
    } catch {
      setResendMessage("Could not resend — try again shortly.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleForgotSubmit = async () => {
    setResetError("");
    setResetApiError(null);
    setResetMessage("");
    setResetLoading(true);

    if (resetStage === "request") {
      const email = resetState.email.trim();

      if (!email) {
        setResetError("Email is required");
        setResetLoading(false);
        return;
      }

      if (!resetTurnstileToken) {
        setResetError("Please complete the Turnstile check first");
        setResetLoading(false);
        return;
      }

      try {
        await apiRequest("/auth/password-reset/request", {
          method: "POST",
          auth: false,
          body: {
            email,
            turnstileToken: resetTurnstileToken,
          },
        });

        setResetMessage(
          "A reset code was sent to your email. Enter it below to continue.",
        );
        setResetStage("confirm");
        setResetTurnstileNonce((value) => value + 1);
        setResetTurnstileToken("");
      } catch (err) {
        setResetApiError(err);
        setResetError(formatApiError(err));
        setResetTurnstileNonce((value) => value + 1);
        setResetTurnstileToken("");
      } finally {
        setResetLoading(false);
      }

      return;
    }

    const resetToken = resetState.token.trim();
    const newPassword = resetState.newPassword.trim();
    const confirmPassword = resetState.confirmPassword.trim();

    if (!resetToken) {
      setResetError("Reset token is required");
      setResetLoading(false);
      return;
    }

    if (!newPassword) {
      setResetError("New password is required");
      setResetLoading(false);
      return;
    }

    if (!resetTurnstileToken) {
      setResetError("Please complete the Turnstile check first");
      setResetLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match");
      setResetLoading(false);
      return;
    }

    try {
      await apiRequest("/auth/password-reset/confirm", {
        method: "POST",
        auth: false,
        body: {
          resetToken,
          newPassword,
          turnstileToken: resetTurnstileToken,
        },
      });

      closeForgot();
    } catch (err) {
      setResetApiError(err);
      setResetError(formatApiError(err));
      setResetTurnstileNonce((value) => value + 1);
      setResetTurnstileToken("");
    } finally {
      setResetLoading(false);
    }
  };
  const identifierError =
    getApiFieldError(apiError, "identifier") ||
    getApiFieldError(apiError, "email") ||
    getApiFieldError(apiError, "username");
  const passwordError = getApiFieldError(apiError, "password");
  const resetEmailError = getApiFieldError(resetApiError, "email");
  const resetTokenError = getApiFieldError(resetApiError, "resetToken");
  const resetPasswordError = getApiFieldError(resetApiError, "newPassword");

  usePageTitle("Sign in");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col overflow-hidden">
      <div className="flex-1 flex items-center justify-center px-4 relative overflow-hidden">
        <img
          src="/images/philippines.svg"
          alt=""
          aria-hidden="true"
          className="absolute top-1/2 -translate-y-1/2 -right-[30%] w-[180vw] sm:w-[900px] sm:-right-24 max-w-none opacity-[0.05] pointer-events-none select-none"
        />
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-brand-100/40 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-brand-50/60 blur-3xl" />

        <div className="relative w-full max-w-[400px]">
          <Link
            to="/landing"
            className="flex items-center justify-center gap-2.5 mb-8"
          >
            <img
              src="/logo.png"
              alt="KainWise logo"
              className="w-10 h-10 rounded-xl object-cover"
            />
            <BrandName className="text-[20px] text-slate-900" />
          </Link>

          <Card className="p-8 shadow-card">
            <div className="text-center mb-6">
              <h1 className="font-display text-[22px] text-slate-900">
                Welcome back
              </h1>
              <p className="text-[13px] text-slate-500 mt-1">
                Sign in to continue your wellness journey.
              </p>
            </div>

            {isRateLimitError(apiError) ? (
              <RateLimitNotice error={apiError} className="mb-5" compact />
            ) : unverifiedEmail ? (
              <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-3 text-[13px] text-amber-800">
                <div className="flex items-center gap-2 mb-1.5 font-medium">
                  <EnvelopeSimple size={14} />
                  Email not verified
                </div>
                <p className="text-amber-700 mb-2">
                  Check your inbox for the verification code sent to{" "}
                  <span className="font-medium">{unverifiedEmail}</span>.
                </p>
                {resendMessage ? (
                  <p className="text-[12px] text-amber-600">{resendMessage}</p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendVerify}
                    disabled={resendLoading}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-amber-800 hover:underline disabled:opacity-50"
                  >
                    <ArrowsClockwise size={11} />
                    {resendLoading ? "Sending..." : "Resend verification code"}
                  </button>
                )}
              </div>
            ) : error ? (
              <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Field label="Email or username">
                <Input
                  type="text"
                  placeholder="you@example.com or username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  required
                />
              </Field>
              {identifierError && (
                <p className="-mt-3 text-[12px] text-red-600">
                  {identifierError}
                </p>
              )}

              <Field
                label="Password"
                hint={
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="cursor-pointer text-[11px] font-medium text-brand-600 hover:underline"
                  >
                    Forgot password?
                  </button>
                }
              >
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              {passwordError && (
                <p className="-mt-3 text-[12px] text-red-600">
                  {passwordError}
                </p>
              )}

              <TurnstileWidget
                key={turnstileNonce}
                onToken={setTurnstileToken}
                onExpire={() => setTurnstileToken("")}
                className="flex justify-center"
              />

              <Button
                variant="primary"
                size="lg"
                className="w-full mt-1"
                type="submit"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-200 text-center">
              <p className="text-[13px] text-slate-500">
                New to KainWise?{" "}
                <Link
                  to="/register"
                  className="text-brand-600 font-medium hover:underline"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </Card>
        </div>
      </div>
      <AppFooter />

      {showForgot && (
        <Modal
          title="Reset password"
          subtitle="Generate a reset token, then confirm your new password."
          width="max-w-[440px]"
          onClose={closeForgot}
          footer={
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={closeForgot}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={handleForgotSubmit}
                disabled={resetLoading}
              >
                {resetStage === "request"
                  ? "Send reset token"
                  : "Reset password"}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2.5 pb-1">
              <img
                src="/logo.png"
                alt="KainWise logo"
                className="w-9 h-9 rounded-xl object-cover"
              />
              <BrandName className="text-[18px] text-slate-900" />
            </div>

            {resetMessage && (
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-[13px] text-emerald-700">
                {resetMessage}
              </div>
            )}

            {isRateLimitError(resetApiError) ? (
              <RateLimitNotice error={resetApiError} className="my-1" compact />
            ) : resetError ? (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">
                {resetError}
              </div>
            ) : null}

            <Field label="Email">
              <Input
                type="email"
                placeholder="you@example.com"
                value={resetState.email}
                autoComplete="email"
                onChange={(e) =>
                  setResetState((value) => ({
                    ...value,
                    email: e.target.value,
                  }))
                }
                required
                disabled={resetStage !== "request"}
              />
            </Field>
            {resetEmailError && (
              <p className="-mt-2 text-[12px] text-red-600">
                {resetEmailError}
              </p>
            )}

            {resetStage === "confirm" && (
              <>
                <Field label="Reset token">
                  <Input
                    value={resetState.token}
                    autoComplete="one-time-code"
                    onChange={(e) =>
                      setResetState((value) => ({
                        ...value,
                        token: e.target.value,
                      }))
                    }
                    required
                  />
                </Field>
                {resetTokenError && (
                  <p className="-mt-2 text-[12px] text-red-600">
                    {resetTokenError}
                  </p>
                )}

                <Field label="New password">
                  <Input
                    type="password"
                    value={resetState.newPassword}
                    autoComplete="new-password"
                    onChange={(e) =>
                      setResetState((value) => ({
                        ...value,
                        newPassword: e.target.value,
                      }))
                    }
                    required
                  />
                </Field>
                {resetPasswordError && (
                  <p className="-mt-2 text-[12px] text-red-600">
                    {resetPasswordError}
                  </p>
                )}

                <Field label="Confirm new password">
                  <Input
                    type="password"
                    value={resetState.confirmPassword}
                    autoComplete="new-password"
                    onChange={(e) =>
                      setResetState((value) => ({
                        ...value,
                        confirmPassword: e.target.value,
                      }))
                    }
                    required
                  />
                </Field>
              </>
            )}

            <TurnstileWidget
              key={resetTurnstileNonce}
              onToken={setResetTurnstileToken}
              onExpire={() => setResetTurnstileToken("")}
              className="flex justify-center pt-1"
            />

            <p className="text-[12px] text-slate-500 leading-relaxed">
              Check your inbox for the reset code. It expires in 30 minutes.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
