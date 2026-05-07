import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeSlash } from "@phosphor-icons/react";
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

export default function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [apiError, setApiError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileNonce, setTurnstileNonce] = useState(0);

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

      setAuthSession(response);
      navigate("/u/dashboard");
    } catch (err) {
      setApiError(err);
      setError(formatApiError(err));
      setTurnstileNonce((value) => value + 1);
      setTurnstileToken("");
    } finally {
      setLoading(false);
    }
  };
  const usernameError = getApiFieldError(apiError, "username");
  const emailError = getApiFieldError(apiError, "email");
  const firstNameError = getApiFieldError(apiError, "firstName");
  const lastNameError = getApiFieldError(apiError, "lastName");
  const passwordError = getApiFieldError(apiError, "password");

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-brand-100/40 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-brand-50/60 blur-3xl" />

      <div className="relative w-full max-w-[400px]">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <img
            src="/logo.png"
            alt="KainWise logo"
            className="w-10 h-10 rounded-xl object-cover"
          />
          <BrandName className="text-[20px] text-slate-900" />
        </div>

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
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </Field>
            {usernameError && (
              <p className="-mt-3 text-[12px] text-red-600">{usernameError}</p>
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
              <p className="-mt-3 text-[12px] text-red-600">{passwordError}</p>
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
  );
}
