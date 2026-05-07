import { Link } from "react-router-dom";
import { ArrowLeft } from "@phosphor-icons/react";
import { BrandName } from "../components/BrandName.jsx";
import { AppFooter } from "../components/AppFooter.jsx";
import { usePageTitle } from "../hooks/usePageTitle.js";

export default function Privacy() {
  usePageTitle("Privacy Policy");

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-slate-100 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="font-semibold text-base text-brand-900 tracking-tight"
          >
            <BrandName />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
          >
            <ArrowLeft size={14} /> Back
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 w-full">
        <h1 className="font-display text-3xl font-extrabold text-ink mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-slate-400 mb-10">
          Last updated: January 1, 2026
        </p>

        <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-8">
          <section>
            <h2 className="font-bold text-base text-ink mb-2">
              1. Information We Collect
            </h2>
            <p className="text-slate-500">
              We collect information you provide directly, including your name,
              email address, and health profile data (age, weight, dietary
              preferences, allergies). We also collect usage data such as
              scanned foods, meal logs, and diary entries.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base text-ink mb-2">
              2. How We Use Your Information
            </h2>
            <p className="text-slate-500">
              Your data is used to provide personalized nutrition insights,
              generate wellness scores, and improve the KainWise experience. We
              do not sell your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base text-ink mb-2">
              3. Health Data
            </h2>
            <p className="text-slate-500">
              Health-related information you provide is stored securely and used
              solely to power KainWise features. We treat this data with
              heightened care and do not share it without your explicit consent.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base text-ink mb-2">
              4. Data Storage and Security
            </h2>
            <p className="text-slate-500">
              Your data is stored on secure servers. We use industry-standard
              encryption for data in transit and at rest. Passwords are hashed
              and never stored in plaintext.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base text-ink mb-2">
              5. Cookies and Tracking
            </h2>
            <p className="text-slate-500">
              We use session tokens for authentication. We use Cloudflare
              Turnstile for bot protection, which may process limited request
              metadata. We do not use advertising trackers.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base text-ink mb-2">
              6. Your Rights
            </h2>
            <p className="text-slate-500">
              You may request access to, correction of, or deletion of your
              personal data at any time through your account settings or by
              contacting us through the app.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base text-ink mb-2">
              7. Changes to This Policy
            </h2>
            <p className="text-slate-500">
              We may update this privacy policy periodically. We will notify you
              of material changes via email or in-app notice. Continued use of
              KainWise constitutes acceptance of the updated policy.
            </p>
          </section>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
