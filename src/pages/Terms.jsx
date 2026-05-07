import { Link } from "react-router-dom";
import { ArrowLeft } from "@phosphor-icons/react";
import { BrandName } from "../components/BrandName.jsx";
import { AppFooter } from "../components/AppFooter.jsx";
import { usePageTitle } from "../hooks/usePageTitle.js";

export default function Terms() {
  usePageTitle("Terms of Service");

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
          Terms of Service
        </h1>
        <p className="text-sm text-slate-400 mb-10">
          Last updated: January 1, 2026
        </p>

        <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-8">
          <section>
            <h2 className="font-bold text-base text-ink mb-2">
              1. Acceptance of Terms
            </h2>
            <p className="text-slate-500">
              By accessing or using KainWise, you agree to be bound by these
              Terms of Service. If you do not agree to these terms, please do
              not use the service.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base text-ink mb-2">
              2. Use of Service
            </h2>
            <p className="text-slate-500">
              KainWise is a wellness and nutrition tracking application. You may
              use the service for personal, non-commercial purposes only. You
              are responsible for maintaining the confidentiality of your
              account credentials.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base text-ink mb-2">
              3. Health Disclaimer
            </h2>
            <p className="text-slate-500">
              KainWise provides nutritional information and wellness guidance
              for informational purposes only. It is not a substitute for
              professional medical advice, diagnosis, or treatment. Always
              consult a qualified healthcare provider before making significant
              changes to your diet or health routine.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base text-ink mb-2">
              4. Data and Privacy
            </h2>
            <p className="text-slate-500">
              Your use of KainWise is also governed by our{" "}
              <Link to="/privacy" className="text-brand-600 hover:underline">
                Privacy Policy
              </Link>
              , which is incorporated into these Terms by reference.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base text-ink mb-2">
              5. Modifications
            </h2>
            <p className="text-slate-500">
              We reserve the right to modify these terms at any time. Continued
              use of KainWise after changes constitutes your acceptance of the
              updated terms.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base text-ink mb-2">
              6. Limitation of Liability
            </h2>
            <p className="text-slate-500">
              KainWise is provided "as is" without warranties of any kind. We
              are not liable for any damages arising from your use of the
              service, including but not limited to health outcomes based on
              information provided.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-base text-ink mb-2">7. Contact</h2>
            <p className="text-slate-500">
              If you have questions about these terms, please reach out through
              the app's feedback channel.
            </p>
          </section>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
