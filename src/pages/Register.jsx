import { useState, useEffect, useRef } from "react";
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
import { RegisterProfileStep } from "./RegisterProfileStep.jsx";

const slugify = (str) =>
  str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const generateUsername = (first, last) => {
  const f = slugify(first);
  const l = slugify(last);
  if (!f && !l) return "";
  const num = () => Math.floor(Math.random() * 9000 + 1000);
  const n = num();
  const patterns = [
    f && l ? `${f}.${l}${n}` : `${f || l}${n}`,
    f && l ? `${f}${l}${n}` : `${f || l}${n}`,
    f && l ? `${f[0]}${l}${n}` : `${f || l}${n}`,
    f && l ? `${f}.${l[0]}${n}` : `${f || l}${n}`,
  ].filter(Boolean);
  const pick = patterns[Math.floor(Math.random() * patterns.length)];
  return pick.slice(0, 80);
};

export default function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const usernameTouched = useRef(false);

  useEffect(() => {
    if (usernameTouched.current) return;
    const generated = generateUsername(firstName, lastName);
    if (generated) setUsername(generated);
  }, [firstName, lastName]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [apiError, setApiError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileNonce, setTurnstileNonce] = useState(0);

  // Verify step
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  // Profile step
  const [profileStep, setProfileStep] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setApiError(null);

    const normalizedEmail = email.trim();
    const normalizedUsername = username.trim();
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedPassword = password.trim();
    const normalizedConfirm = confirm.trim();

    if (!normalizedUsername) {
      setError("Username is required");
      return;
    }
    if (!normalizedEmail) {
      setError("Email is required");
      return;
    }
    if (!normalizedFirstName || !normalizedLastName) {
      setError("First name and last name are required");
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
    if (normalizedPassword !== normalizedConfirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await apiRequest("/auth/register", {
        method: "POST",
        auth: false,
        body: {
          email: normalizedEmail,
          username: normalizedUsername,
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          password: normalizedPassword,
          turnstileToken,
        },
      });

      if (response.requiresVerification) {
        setVerifyEmail(response.email);
      } else {
        setAuthSession(response);
        setProfileStep({ profileId: response.profile?.id ?? "" });
      }
    } catch (err) {
      setApiError(err);
      setError(formatApiError(err));
      setTurnstileNonce((value) => value + 1);
      setTurnstileToken("");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setVerifyError("");
    if (!verifyCode.trim()) {
      setVerifyError("Enter the code from your email");
      return;
    }
    setVerifyLoading(true);
    try {
      const response = await apiRequest("/auth/verify-email", {
        method: "POST",
        auth: false,
        body: { email: verifyEmail, code: verifyCode.trim() },
      });
      setAuthSession(response);
      setProfileStep({ profileId: response.profile?.id ?? "" });
    } catch (err) {
      setVerifyError(formatApiError(err));
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResend = async () => {
    setResendMessage("");
    setResendLoading(true);
    try {
      await apiRequest("/auth/resend-verify", {
        method: "POST",
        auth: false,
        body: { email: verifyEmail },
      });
      setResendMessage("A new code was sent to your email.");
    } catch {
      setResendMessage("Could not resend — try again shortly.");
    } finally {
      setResendLoading(false);
    }
  };

  const usernameError = getApiFieldError(apiError, "username");
  const emailError = getApiFieldError(apiError, "email");
  const firstNameError = getApiFieldError(apiError, "firstName");
  const lastNameError = getApiFieldError(apiError, "lastName");
  const passwordError = getApiFieldError(apiError, "password");

  usePageTitle(
    profileStep
      ? "Set up profile"
      : verifyEmail
        ? "Verify email"
        : "Create account",
  );

  if (profileStep) {
    return (
      <RegisterProfileStep
        profileId={profileStep.profileId}
        firstName={firstName}
        lastName={lastName}
        email={email}
        onSaved={() => navigate("/u/dashboard")}
        onSkip={() => navigate("/u/dashboard")}
      />
    );
  }

  if (verifyEmail) {
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
              <div className="flex flex-col items-center mb-6">
                <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mb-3">
                  <EnvelopeSimple size={22} className="text-brand-600" />
                </div>
                <h1 className="font-display text-[20px] text-slate-900">
                  Verify your email
                </h1>
                <p className="text-[13px] text-slate-500 mt-1 text-center">
                  We sent a 6-digit code to{" "}
                  <span className="font-medium text-slate-700">
                    {verifyEmail}
                  </span>
                </p>
              </div>

              {verifyError && (
                <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">
                  {verifyError}
                </div>
              )}
              {resendMessage && (
                <div className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-[13px] text-emerald-700">
                  {resendMessage}
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-5">
                <Field label="Verification code">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="123456"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    autoComplete="one-time-code"
                    required
                    className="text-center tracking-[0.2em] text-lg font-bold"
                  />
                </Field>

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  type="submit"
                  disabled={verifyLoading}
                >
                  {verifyLoading ? "Verifying..." : "Verify email"}
                </Button>
              </form>

              <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between">
                <p className="text-[12px] text-slate-400">Didn't receive it?</p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium text-brand-600 hover:underline disabled:opacity-50"
                >
                  <ArrowsClockwise size={12} />
                  {resendLoading ? "Sending..." : "Resend code"}
                </button>
              </div>
            </Card>
          </div>
        </div>
        <AppFooter />
      </div>
    );
  }

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
                Create account
              </h1>
              <p className="text-[13px] text-slate-500 mt-1">
                Start your personalized wellness journey today.
              </p>
            </div>

            {isRateLimitError(apiError) ? (
              <RateLimitNotice error={apiError} className="mb-5" compact />
            ) : error ? (
              <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Field label="Username">
                <Input
                  placeholder="jane.doe"
                  value={username}
                  onChange={(e) => {
                    usernameTouched.current = true;
                    setUsername(e.target.value);
                  }}
                  autoComplete="username"
                  required
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Auto-generated from your name — feel free to change it
                </p>
              </Field>
              {usernameError && (
                <p className="-mt-3 text-[12px] text-red-600">
                  {usernameError}
                </p>
              )}

              <Field label="Email">
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </Field>
              {emailError && (
                <p className="-mt-3 text-[12px] text-red-600">{emailError}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="First name">
                  <Input
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                    required
                  />
                </Field>
                <Field label="Last name">
                  <Input
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                    required
                  />
                </Field>
              </div>
              {(firstNameError || lastNameError) && (
                <p className="-mt-3 text-[12px] text-red-600">
                  {firstNameError || lastNameError}
                </p>
              )}

              <Field label="Password">
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
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

              <Field label="Confirm password">
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

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
                {loading ? "Creating account..." : "Create account"}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-200 text-center">
              <p className="text-[13px] text-slate-500">
                Already have an account?{" "}
                <Link
                  to="/"
                  className="text-brand-600 font-medium hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </Card>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
