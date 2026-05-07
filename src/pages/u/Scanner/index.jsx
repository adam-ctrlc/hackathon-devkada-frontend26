import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../../components/ui/Card.jsx";
import { Button } from "../../../components/ui/Button.jsx";
import { Pill, Support } from "../../../components/ui/Pill.jsx";
import { Ring, Bar } from "../../../components/ui/Charts.jsx";
import {
  Camera,
  Barcode,
  Scan,
  ArrowRight,
  Orange,
  Check,
  Lock,
  CaretDown,
  CaretUp,
  ArrowsClockwise,
  Sparkle,
  Package,
  UploadSimple,
  CheckCircle,
  Trash,
  Basket,
} from "@phosphor-icons/react";
import { apiRequest, apiFormRequest } from "../../../lib/api.js";
import {
  clearAuthSession,
  getAuthSession,
  setAuthSession,
} from "../../../lib/auth-session.js";
import { runGeminiLiveJson } from "../../../lib/gemini-live.js";
import { buildScannerLivePrompt } from "../../../prompts/scanner.js";
import { buildScannerInsightsPrompt } from "../../../prompts/scanner-insights.js";
import {
  buildProfileTargets,
  profilePlanLabel,
  isSameFoodScan,
  isClearlyNonFoodInput,
  mealPeriodOptions,
  inputDateTimeValue,
  inferMealPeriod,
  setMealPeriodOnDateTime,
  decodeBarcodeFromFile,
  fetchOpenFoodFacts,
  buildResult,
  timeAgo,
  buildScoreReasons,
  buildScannerSwapSuggestion,
  buildScannerPatternNotice,
  buildScannerMentalSupport,
  buildScannerCheckinDiaryPayload,
} from "../../../utils/scanner.js";
import { ManualScanModal } from "./components/ManualScanModal.jsx";
import { ScannerSwapSection } from "./components/ScannerSwapSection.jsx";
import { ScannerBudgetModal } from "./components/ScannerBudgetModal.jsx";
import { ScannerMentalCheckinModal } from "./components/ScannerMentalCheckinModal.jsx";
import { ScannerSkeleton } from "../components/RouteSkeletons.jsx";

const normalizeList = (value, limit) =>
  (Array.isArray(value) ? value : [])
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, limit);

const normalizeTone = (value, fallback = "amber") => {
  const tone = String(value ?? "")
    .trim()
    .toLowerCase();
  if (["green", "amber", "red"].includes(tone)) return tone;
  return fallback;
};

const normalizeConfidence = (value) => {
  const confidence = String(value ?? "")
    .trim()
    .toLowerCase();
  if (["low", "medium", "high"].includes(confidence)) return confidence;
  return "medium";
};

const normalizeScannerInsights = (value, resultId, motivationFallback) => {
  if (!value) return null;
  const pattern = value.patternNotice ?? {};
  const mental = value.mentalSupport ?? {};
  return {
    resultId: value.resultId ?? resultId,
    patternNotice: {
      title:
        String(pattern.title ?? "")
          .trim()
          .toLowerCase() === "pattern alert"
          ? "Pattern alert"
          : "Pattern notice",
      trendLine:
        String(pattern.trendLine ?? "").trim() ||
        "We are still building your trend from recent logs.",
      hydrationLine:
        String(pattern.hydrationLine ?? "").trim() ||
        "Hydration trend appears once enough logs are available.",
      suggestions: normalizeList(pattern.suggestions, 6),
      tone: normalizeTone(pattern.tone, "amber"),
    },
    mentalSupport: {
      title: "Mind & energy impact",
      summary:
        String(mental.summary ?? "").trim() ||
        "This meal may affect energy or focus today, but a few support habits can help.",
      confidence: normalizeConfidence(mental.confidence),
      tone: normalizeTone(mental.tone, "amber"),
      contributors: normalizeList(mental.contributors, 5),
      actions: normalizeList(mental.actions, 5),
      motivation:
        String(mental.motivation ?? "").trim() ||
        motivationFallback ||
        "Progress starts with one better next choice.",
    },
  };
};

export default function Scanner() {
  const navigate = useNavigate();
  const session = getAuthSession();
  const [profile, setProfile] = useState(session?.profile ?? null);
  const profileId = profile?.id ?? session?.profile?.id;
  const targets = buildProfileTargets(profile);

  const [scans, setScans] = useState([]);
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState(null);
  const [recentlyAddedId, setRecentlyAddedId] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [manualFood, setManualFood] = useState("");
  const [manualError, setManualError] = useState("");
  const [manualSearching, setManualSearching] = useState(false);
  const [mealPeriod, setMealPeriod] = useState(() => inferMealPeriod());
  const [eatenAt, setEatenAt] = useState(() => inputDateTimeValue());
  const [swapSuggestion, setSwapSuggestion] = useState(null);
  const [savingSwap, setSavingSwap] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetLogs, setBudgetLogs] = useState([]);
  const [loadingBudgetLogs, setLoadingBudgetLogs] = useState(false);
  const [scanningBudgetLog, setScanningBudgetLog] = useState(false);
  const [calendarView, setCalendarView] = useState(null);
  const [scannerContext, setScannerContext] = useState(null);
  const [aiScannerInsights, setAiScannerInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [showMentalCheckin, setShowMentalCheckin] = useState(false);
  const [savingMentalCheckin, setSavingMentalCheckin] = useState(false);
  const [latestCheckIn, setLatestCheckIn] = useState(null);

  const fileRef = useRef(null);
  const resultRef = useRef(null);
  const insightRequestRef = useRef(0);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const scrollToResult = () => {
    window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const reloadScannerContext = async ({ silent = true } = {}) => {
    if (!profileId) return;
    try {
      const data = await apiRequest(`/scanner-context/${profileId}?days=30`);
      setScannerContext(data);
    } catch (err) {
      if (!silent) showToast(err.message || "Scanner context is unavailable.");
    }
  };

  useEffect(() => {
    let cancelled = false;

    if (!profileId) {
      navigate("/", { replace: true });
      return;
    }

    const loadScans = async () => {
      setLoading(true);
      try {
        let calendarError = null;
        let scannerContextError = null;
        const [profileData, scansData, calendarData, scannerContextData] =
          await Promise.all([
            apiRequest(`/profiles/${profileId}`),
            apiRequest(`/scans/${profileId}`),
            apiRequest(`/calendar/${profileId}?days=30`).catch((err) => {
              calendarError = err;
              return null;
            }),
            apiRequest(`/scanner-context/${profileId}?days=30`).catch((err) => {
              scannerContextError = err;
              return null;
            }),
          ]);
        if (cancelled) return;
        const latestProfile =
          profileData.profile ?? getAuthSession()?.profile ?? {};
        const currentSession = getAuthSession();
        if (currentSession) {
          setAuthSession({
            ...currentSession,
            profile: { ...currentSession.profile, ...latestProfile },
          });
        }
        setProfile(latestProfile);
        const loadedScans = scansData.scans ?? [];
        const currentTargets = buildProfileTargets(latestProfile);
        setScans(loadedScans);
        setResult(
          loadedScans.length
            ? buildResult(loadedScans[0], loadedScans, currentTargets)
            : null,
        );
        setCalendarView(calendarData);
        setScannerContext(scannerContextData);
        if (calendarError) {
          showToast("Calendar trends are temporarily unavailable.");
        }
        if (scannerContextError) {
          showToast("Mental trend context is temporarily unavailable.");
        }
      } catch (err) {
        if (String(err.message).toLowerCase().includes("profile not found")) {
          clearAuthSession();
          navigate("/", { replace: true });
          return;
        }
        if (!cancelled) showToast(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadScans();
    return () => {
      cancelled = true;
    };
  }, [navigate, profileId]);

  useEffect(() => {
    let cancelled = false;
    if (!result || !scannerContext) {
      return () => {
        cancelled = true;
      };
    }

    const requestId = insightRequestRef.current + 1;
    insightRequestRef.current = requestId;

    const generateInsights = async () => {
      setInsightsLoading(true);
      try {
        const cachedFromResult = normalizeScannerInsights(
          result?.aiAnalysis?.scannerInsights,
          result.id,
          scannerContext?.motivationText,
        );
        if (cachedFromResult) {
          if (!cancelled && insightRequestRef.current === requestId) {
            setAiScannerInsights(cachedFromResult);
            setInsightsLoading(false);
          }
          return;
        }

        const cachedResponse = await apiRequest(`/scans/${result.id}/insights`);
        const cachedFromBackend = normalizeScannerInsights(
          cachedResponse?.insights,
          result.id,
          scannerContext?.motivationText,
        );
        if (cachedFromBackend) {
          if (!cancelled && insightRequestRef.current === requestId) {
            setAiScannerInsights(cachedFromBackend);
            setInsightsLoading(false);
          }
          return;
        }

        const generated = await runGeminiLiveJson({
          prompt: buildScannerInsightsPrompt({
            result,
            context: scannerContext,
            checkIn: latestCheckIn,
            profile,
          }),
          temperature: 0.35,
          timeoutMs: 90000,
        });

        if (cancelled || insightRequestRef.current !== requestId) return;

        const insights = normalizeScannerInsights(
          generated,
          result.id,
          scannerContext?.motivationText,
        );
        setAiScannerInsights(insights);
        apiRequest(`/scans/${result.id}/insights`, {
          method: "PUT",
          body: { insights },
          timeoutMs: 10000,
        })
          .then((data) => {
            if (!data?.scan) return;
            setScans((current) =>
              current.map((scan) =>
                scan.id === data.scan.id ? data.scan : scan,
              ),
            );
          })
          .catch(() => {});
      } catch {
        if (cancelled || insightRequestRef.current !== requestId) return;
        setAiScannerInsights(null);
      } finally {
        if (!cancelled && insightRequestRef.current === requestId) {
          setInsightsLoading(false);
        }
      }
    };

    generateInsights();
    return () => {
      cancelled = true;
    };
  }, [result, scannerContext, latestCheckIn, profile]);

  const setSelectedScan = (scan, scanList = scans) => {
    setResult(buildResult(scan, scanList, targets));
    setTab("overview");
  };

  const handleEatenAtChange = (nextValue) => {
    setEatenAt(nextValue);
    setMealPeriod(inferMealPeriod(nextValue));
  };

  const handleMealPeriodSelect = (nextPeriod) => {
    setMealPeriod(nextPeriod);
    setEatenAt((current) => setMealPeriodOnDateTime(current, nextPeriod));
  };

  const recentScans = scans.slice(0, 4);
  const previousMatchingScans = result
    ? scans
        .filter(
          (scan) =>
            scan.id !== result.id &&
            isSameFoodScan(scan, {
              productName: result.name,
              barcode: result.barcode,
            }),
        )
        .slice(0, 5)
    : [];

  const persistScannerSwap = async (
    suggestion,
    status = "suggested",
    { silent = false } = {},
  ) => {
    if (!profileId || !suggestion) return false;
    try {
      await apiRequest("/swaps/from-scan", {
        method: "POST",
        body: { profileId, swaps: [{ ...suggestion, status }] },
        timeoutMs: 10000,
      });
      return true;
    } catch (err) {
      if (!silent) showToast(err.message);
      return false;
    }
  };

  const runBackendScan = async ({ productName, barcode, productData } = {}) => {
    if (!profileId) return;
    const previousScan = scans.find((scan) =>
      isSameFoodScan(scan, { productName, barcode }),
    );
    if (previousScan) {
      setSelectedScan(previousScan);
      setRecentlyAddedId(null);
      showToast(`Loaded previous scan: ${previousScan.productName}`);
      scrollToResult();
      return;
    }

    setScanning(true);
    setTab("overview");

    try {
      const liveAnalysis = await runGeminiLiveJson({
        prompt: buildScannerLivePrompt({
          productName,
          barcode,
          productData,
          profile,
          targets,
        }),
        temperature: 0.35,
        onProgress: showToast,
      });

      if (liveAnalysis?.isFood === false) {
        throw new Error(
          liveAnalysis.rejectionReason ||
            "That does not look like food or a drink.",
        );
      }

      const data = await apiRequest("/scans/live-result", {
        method: "POST",
        body: {
          profileId,
          productName: liveAnalysis.productName || productName || barcode,
          barcode,
          mealPeriod,
          eatenAt,
          nutrition: liveAnalysis.nutrition,
          analysis: liveAnalysis,
        },
        timeoutMs: 15000,
      });
      const nextScans = [
        data.scan,
        ...scans.filter((scan) => scan.id !== data.scan.id),
      ];
      const nextResult = buildResult(data.scan, nextScans, targets);
      const nextSwapSuggestion = buildScannerSwapSuggestion(
        nextResult,
        data.scan,
      );
      setScans(nextScans);
      setResult(nextResult);
      setTab("overview");
      setSwapSuggestion(nextSwapSuggestion);
      if (nextSwapSuggestion) {
        await persistScannerSwap(nextSwapSuggestion, "suggested", {
          silent: true,
        });
      }
      reloadScannerContext().catch(() => {});
      setRecentlyAddedId(data.scan.id);
      setTimeout(() => {
        setRecentlyAddedId((current) =>
          current === data.scan.id ? null : current,
        );
      }, 8000);
      showToast(`Scanned: ${data.scan.productName}`);
      setShowMentalCheckin(true);
      scrollToResult();
      return data.scan;
    } catch (err) {
      showToast(err.message);
      return null;
    } finally {
      setScanning(false);
    }
  };

  const runManualScan = async () => {
    const foodText = manualFood.trim();
    if (!profileId || !foodText) return;
    setManualError("");
    if (isClearlyNonFoodInput(foodText)) {
      setManualError("That does not look like food or a drink.");
      return;
    }
    setManualSearching(true);
    try {
      await runBackendScan({ productName: foodText });
      setShowManual(false);
      setManualFood("");
    } catch (err) {
      setManualError(err.message || "Unable to find that food.");
    } finally {
      setManualSearching(false);
    }
  };

  const openImagePicker = () => fileRef.current?.click();

  const attachScanImage = async (scanId, file) => {
    try {
      const form = new FormData();
      form.append("image", file);
      await apiFormRequest(`/scans/${scanId}/image`, { formData: form });
    } catch {
      // non-critical — scan is already saved
    }
  };

  const onFileChange = async (e) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    e.target.value = "";
    setScanning(true);
    try {
      const barcode = await decodeBarcodeFromFile(file);
      if (barcode) {
        showToast(`Barcode detected: ${barcode} — looking up product…`);
        const productData = await fetchOpenFoodFacts(barcode);
        const productName = productData?.productName ?? barcode;
        showToast(
          productData
            ? `Found: ${productName} — analysing…`
            : `No product data found, sending to AI…`,
        );
        const scan = await runBackendScan({ productName, barcode, productData });
        if (scan?.id) {
          attachScanImage(scan.id, file);
        }
        return;
      }
      showToast("No barcode detected. Please upload a clear barcode image.");
    } catch (err) {
      showToast(err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleDeleteScan = async (scan) => {
    try {
      await apiRequest(`/scans/${scan.id}`, { method: "DELETE" });
      const nextScans = scans.filter((s) => s.id !== scan.id);
      setScans(nextScans);
      if (result?.id === scan.id) {
        setResult(
          nextScans.length
            ? buildResult(nextScans[0], nextScans, targets)
            : null,
        );
      }
      showToast(`Deleted: ${scan.productName}`);
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleSwap = () => navigate("/u/swap");

  const openBudgetScanModal = async () => {
    if (!profileId) return;
    setShowBudgetModal(true);
    setLoadingBudgetLogs(true);
    try {
      const data = await apiRequest(`/budget-logs/${profileId}`);
      setBudgetLogs(data.logs ?? []);
    } catch (err) {
      showToast(err.message);
    } finally {
      setLoadingBudgetLogs(false);
    }
  };

  const scanBudgetLogItems = async (log, items) => {
    if (!profileId || !log || !items.length) return;
    setScanningBudgetLog(true);
    try {
      for (const item of items) {
        await runBackendScan({ productName: item.name });
      }
      const scansData = await apiRequest(`/scans/${profileId}`);
      const nextScans = scansData.scans ?? [];
      setScans(nextScans);
      if (nextScans.length) setSelectedScan(nextScans[0], nextScans);
      setShowBudgetModal(false);
      showToast(`Scanned ${items.length} item${items.length === 1 ? "" : "s"}`);
    } catch (err) {
      showToast(err.message);
    } finally {
      setScanningBudgetLog(false);
    }
  };

  const saveScannerSwap = async (status) => {
    if (!profileId || !swapSuggestion) return;
    setSavingSwap(true);
    try {
      const wasSaved = await persistScannerSwap(swapSuggestion, status);
      if (!wasSaved) return;
      showToast(
        status === "accepted" ? "Saved as a next-time plan" : "Swap dismissed",
      );
      setSwapSuggestion(null);
    } finally {
      setSavingSwap(false);
    }
  };

  const submitMentalCheckin = async (checkIn) => {
    if (!profileId || !result) return;
    setSavingMentalCheckin(true);
    setLatestCheckIn(checkIn);
    try {
      const diaryPayload = buildScannerCheckinDiaryPayload({
        result,
        checkIn,
      });
      await apiRequest("/diary", {
        method: "POST",
        body: {
          profileId,
          source: "scanner-checkin",
          skipAi: true,
          ...diaryPayload,
        },
        timeoutMs: 10000,
      });
      await reloadScannerContext();
      showToast("Check-in saved. Suggestions updated.");
    } catch (err) {
      showToast(err.message || "Unable to save this check-in.");
    } finally {
      setSavingMentalCheckin(false);
      setShowMentalCheckin(false);
    }
  };

  const skipMentalCheckin = () => {
    if (savingMentalCheckin) return;
    setShowMentalCheckin(false);
  };

  const scoreTone =
    result?.score >= 70 ? "green" : result?.score >= 50 ? "amber" : "red";
  const scoreReasons = buildScoreReasons(result, targets);
  const fallbackPatternNotice = buildScannerPatternNotice({
    result,
    scans,
    calendar: calendarView,
    profile,
    targets,
  });
  const fallbackMentalSupport = buildScannerMentalSupport({
    result,
    context: scannerContext,
    checkIn: latestCheckIn,
  });
  const useAiInsights =
    aiScannerInsights?.resultId &&
    result?.id &&
    aiScannerInsights.resultId === result.id;
  const patternNotice = useAiInsights
    ? aiScannerInsights.patternNotice
    : fallbackPatternNotice;
  const mentalSupport = useAiInsights
    ? aiScannerInsights.mentalSupport
    : fallbackMentalSupport;
  const patternToneStyles =
    patternNotice?.tone === "red"
      ? {
          card: "bg-red-50",
          icon: "bg-red-600 text-white",
          eyebrow: "text-red-700",
          body: "text-red-900",
          bullet: "bg-red-500",
        }
      : patternNotice?.tone === "green"
        ? {
            card: "bg-emerald-50",
            icon: "bg-emerald-600 text-white",
            eyebrow: "text-emerald-700",
            body: "text-emerald-900",
            bullet: "bg-emerald-500",
          }
        : {
            card: "bg-amber-50",
            icon: "bg-amber-600 text-white",
            eyebrow: "text-amber-700",
            body: "text-amber-900",
            bullet: "bg-amber-500",
          };
  const mentalToneStyles =
    mentalSupport?.tone === "red"
      ? {
          card: "bg-red-50 ring-red-100",
          icon: "bg-red-600 text-white",
          eyebrow: "text-red-700",
          body: "text-red-900",
          bullet: "bg-red-500",
        }
      : mentalSupport?.tone === "green"
        ? {
            card: "bg-emerald-50 ring-emerald-100",
            icon: "bg-emerald-600 text-white",
            eyebrow: "text-emerald-700",
            body: "text-emerald-900",
            bullet: "bg-emerald-500",
          }
        : {
            card: "bg-violet-50 ring-violet-100",
            icon: "bg-violet-600 text-white",
            eyebrow: "text-violet-700",
            body: "text-violet-900",
            bullet: "bg-violet-500",
          };

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1240px] relative">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-[13px] font-medium px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
          <CheckCircle size={14} className="text-emerald-400" /> {toast}
        </div>
      )}

      {showManual && (
        <ManualScanModal
          value={manualFood}
          onChange={(value) => {
            setManualFood(value);
            if (manualError) setManualError("");
          }}
          onSubmit={runManualScan}
          error={manualError}
          searching={manualSearching}
          onClose={() => {
            if (!manualSearching) {
              setShowManual(false);
              setManualError("");
            }
          }}
        />
      )}
      {showBudgetModal && (
        <ScannerBudgetModal
          logs={budgetLogs}
          loading={loadingBudgetLogs}
          scanning={scanningBudgetLog}
          onClose={() => {
            if (!scanningBudgetLog) setShowBudgetModal(false);
          }}
          onScan={scanBudgetLogItems}
          onCreateBudgetLog={() => navigate("/u/budget")}
        />
      )}
      {showMentalCheckin && result && (
        <ScannerMentalCheckinModal
          questionData={scannerContext?.checkIn}
          resultName={result.name}
          saving={savingMentalCheckin}
          onClose={skipMentalCheckin}
          onSkip={skipMentalCheckin}
          onSubmit={submitMentalCheckin}
        />
      )}

      <div className="mb-5 sm:mb-7">
        <div>
          <div className="text-[11px] tracking-[0.18em] uppercase text-brand-600 font-semibold mb-2">
            Scanner
          </div>
          <h1 className="font-display text-[26px] sm:text-[34px] leading-[1.05] tracking-tight text-slate-900">
            What did you eat?
          </h1>
          <p className="text-slate-600 mt-2 max-w-[600px]">
            Type a product or meal name, or upload a nutrition label or barcode
            image. We'll cross-check it against {profilePlanLabel(profile)}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
        <Card className="lg:col-span-7 p-0 overflow-hidden">
          <div>
            <div className="relative bg-slate-50 flex flex-col items-center justify-center gap-4 sm:gap-6 px-4 sm:px-8 py-6 sm:py-8 sm:aspect-[16/9]">
              {scanning ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <Scan
                      size={160}
                      className="text-brand-300 animate-pulse"
                      weight="light"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Barcode
                        size={64}
                        className="text-brand-500"
                        weight="light"
                      />
                    </div>
                    <span className="absolute bottom-[38%] left-1/2 -translate-x-1/2 w-[72px] h-px bg-brand-500 shadow-[0_0_8px_2px_#3B82F6] animate-bounce" />
                  </div>
                  <span className="text-[13px] text-brand-600 font-medium animate-pulse">
                    Scanning…
                  </span>
                </div>
              ) : (
                <div className="relative flex items-center justify-center">
                  <Scan size={160} className="text-slate-200" weight="light" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Barcode
                      size={64}
                      className="text-brand-400"
                      weight="light"
                    />
                  </div>
                  <span className="absolute bottom-[38%] left-1/2 -translate-x-1/2 w-[72px] h-px bg-brand-500 shadow-[0_0_8px_2px_#3B82F6]" />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-[520px]">
                <button
                  onClick={openImagePicker}
                  disabled={scanning}
                  className="h-11 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-[13px] font-medium inline-flex items-center justify-center gap-2 transition"
                >
                  <Camera size={15} /> Open camera
                </button>
                <label
                  className={`h-11 rounded-lg bg-white ring-1 ring-slate-200 text-slate-700 text-[13px] font-medium inline-flex items-center justify-center gap-2 transition cursor-pointer ${scanning ? "opacity-50 pointer-events-none" : "hover:bg-slate-100"}`}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onFileChange}
                  />
                  <UploadSimple size={15} /> Upload barcode
                </label>
                <button
                  onClick={openBudgetScanModal}
                  disabled={scanning || loadingBudgetLogs || scanningBudgetLog}
                  className="h-11 rounded-lg bg-white ring-1 ring-slate-200 text-slate-700 text-[13px] font-medium inline-flex items-center justify-center gap-2 transition hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-100 disabled:opacity-50"
                >
                  <Basket size={15} />
                  {loadingBudgetLogs || scanningBudgetLog
                    ? "Loading..."
                    : "Scan budget log"}
                </button>
                <button
                  onClick={() => setShowManual(true)}
                  disabled={scanning}
                  className="h-11 rounded-lg bg-white ring-1 ring-slate-200 text-slate-700 text-[13px] font-medium inline-flex items-center justify-center gap-2 transition hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-100 disabled:opacity-50"
                >
                  <Sparkle size={14} /> Type food manually
                </button>
              </div>

              <div className="w-full max-w-[520px] rounded-2xl bg-white/90 ring-1 ring-slate-200 p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3">
                  <div className="text-left">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                      Meal timing
                    </div>
                    <div className="text-[12px] text-slate-500 mt-0.5">
                      Used for calendar and insights.
                    </div>
                  </div>
                  <input
                    type="datetime-local"
                    value={eatenAt}
                    onChange={(event) =>
                      handleEatenAtChange(event.target.value)
                    }
                    disabled={scanning}
                    className="h-9 w-full sm:w-[210px] px-3 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-[12.5px] text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                  />
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {mealPeriodOptions.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleMealPeriodSelect(value)}
                      disabled={scanning}
                      className={`h-8 rounded-full text-[10px] sm:text-[12px] font-medium px-1 truncate transition disabled:opacity-50 ${
                        mealPeriod === value
                          ? "bg-slate-900 text-white"
                          : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-100"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 rounded-xl bg-indigo-50 ring-1 ring-indigo-100 px-3 py-2 text-[12px] text-slate-700">
                  {Number(scannerContext?.sleep?.todayHours ?? 0) > 0
                    ? `You slept ${Number(scannerContext?.sleep?.todayHours ?? 0).toFixed(1)} hours today. Scanner suggestions will adapt to this.`
                    : "No sleep override logged today yet. Default trend is still used for scanner suggestions."}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-5 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Recent
              </div>
              <h3 className="font-display text-[16px] mt-0.5 text-slate-900">
                Last few scans
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/u/all")}
            >
              All <ArrowRight size={13} />
            </Button>
          </div>
          {loading ? (
            <ScannerSkeleton />
          ) : recentScans.length > 0 || scanning ? (
            <ul className="divide-y divide-slate-100">
              {scanning && (
                <li>
                  <div className="w-full py-3 flex items-center gap-3 -mx-1 px-1">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="h-3 w-2/3 rounded bg-slate-100 animate-pulse" />
                      <div className="h-2.5 w-1/3 rounded bg-slate-100 animate-pulse" />
                    </div>
                    <div className="h-5 w-14 rounded-full bg-slate-100 animate-pulse" />
                    <div className="h-3 w-7 rounded bg-slate-100 animate-pulse" />
                  </div>
                </li>
              )}
              {recentScans.map((r) => (
                <li key={r.id}>
                  <div
                    className={`group w-full py-3 flex items-center gap-3 -mx-1 px-1 rounded-lg transition hover:bg-slate-50 ${result?.id === r.id ? "bg-brand-50" : ""}`}
                  >
                    <button
                      onClick={() => setSelectedScan(r)}
                      className="flex-1 flex items-center gap-3 min-w-0 text-left"
                    >
                      <div
                        className={`w-10 h-10 rounded-lg ring-1 grid place-items-center shrink-0 ${result?.id === r.id ? "bg-brand-100 ring-brand-200 text-brand-600" : "bg-brand-50 ring-brand-100 text-brand-600"}`}
                      >
                        <Orange size={16} />
                      </div>
                      <div className="flex-1 leading-tight min-w-0">
                        <div
                          className={`text-[13.5px] font-medium truncate flex items-center gap-1.5 ${result?.id === r.id ? "text-brand-700" : "text-slate-900"}`}
                        >
                          <span className="truncate">{r.productName}</span>
                          {recentlyAddedId === r.id && (
                            <span className="shrink-0 inline-flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 ring-1 ring-emerald-100 px-1.5 py-0.5 rounded-full">
                              <Sparkle size={9} weight="fill" /> New
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {r.variant ?? r.foodType} · {timeAgo(r.createdAt)}
                        </div>
                      </div>
                      <Support level={r.supportLevel} />
                      <span className="font-mono text-[12px] text-slate-700 tabular-nums w-7 text-right">
                        {r.score}
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteScan(r);
                      }}
                      title="Delete scan"
                      className="ml-1 p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl bg-brand-50/70 ring-1 ring-brand-100 p-6 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand-600 ring-1 ring-brand-100">
                <Barcode size={24} weight="duotone" />
              </div>
              <div className="font-display text-[18px] text-slate-900">
                No scans yet
              </div>
              <p className="mx-auto mt-1 max-w-[260px] text-[13px] leading-snug text-slate-600">
                Upload a barcode image or type what you ate to create your first
                scan.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  <UploadSimple size={13} /> Upload barcode
                </Button>
                <Button
                  variant="line"
                  size="sm"
                  onClick={() => setShowManual(true)}
                >
                  <Sparkle size={13} /> Type food
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {previousMatchingScans.length > 0 && (
        <Card className="p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Your previous scans
              </div>
              <h3 className="font-display text-[16px] mt-0.5 text-slate-900">
                {result.name} was scanned before
              </h3>
            </div>
            <Pill tone="brand" className="!normal-case !tracking-normal">
              {previousMatchingScans.length} match
              {previousMatchingScans.length === 1 ? "" : "es"}
            </Pill>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {previousMatchingScans.map((scan) => (
              <button
                key={scan.id}
                type="button"
                onClick={() => setSelectedScan(scan)}
                className="text-left rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4 hover:ring-brand-200 hover:bg-brand-50/40 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-slate-900 truncate">
                      {scan.productName}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {scan.foodType ?? "Food"} · {timeAgo(scan.createdAt)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Support level={scan.supportLevel} />
                    <div className="font-mono text-[12px] text-slate-700 mt-1">
                      {scan.score}/100
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {scanning ? (
        <Card className="overflow-hidden p-0 mb-5">
          <div className="relative p-7 border-b border-slate-200 bg-gradient-to-br from-brand-50/60 via-white to-white">
            <div className="flex items-start gap-7">
              <div className="w-[124px] h-[148px] rounded-2xl bg-slate-100 animate-pulse shrink-0" />
              <div className="flex-1 min-w-0 space-y-3 pt-1">
                <div className="h-3 w-40 rounded bg-slate-100 animate-pulse" />
                <div className="h-7 w-3/4 rounded bg-slate-100 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-slate-100 animate-pulse" />
                <div className="flex gap-2 pt-2">
                  <div className="h-6 w-24 rounded-full bg-slate-100 animate-pulse" />
                  <div className="h-6 w-32 rounded-full bg-slate-100 animate-pulse" />
                  <div className="h-6 w-40 rounded-full bg-slate-100 animate-pulse" />
                </div>
              </div>
              <div className="flex flex-col items-center shrink-0 pl-2 gap-2">
                <div className="w-[112px] h-[112px] rounded-full bg-slate-100 animate-pulse" />
                <div className="h-5 w-24 rounded-full bg-slate-100 animate-pulse" />
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 pt-5 border-t border-slate-200/70">
              <div className="h-8 w-24 rounded-md bg-slate-100 animate-pulse" />
              <div className="h-8 w-20 rounded-md bg-slate-100 animate-pulse" />
              <div className="h-8 w-20 rounded-md bg-slate-100 animate-pulse" />
            </div>
          </div>
          <div className="px-6 flex gap-1 border-b border-slate-200 bg-slate-50">
            {["Overview", "Why this score", "Ingredients"].map((label) => (
              <div
                key={label}
                className="px-4 h-11 flex items-center text-[13px] text-slate-300"
              >
                {label}
              </div>
            ))}
          </div>
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7">
              <div className="h-3 w-48 rounded bg-slate-100 animate-pulse mb-3" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-white ring-1 ring-slate-200 p-3.5 space-y-3"
                  >
                    <div className="h-3 w-16 rounded bg-slate-100 animate-pulse" />
                    <div className="h-6 w-20 rounded bg-slate-100 animate-pulse" />
                    <div className="h-2 w-full rounded bg-slate-100 animate-pulse" />
                    <div className="h-2.5 w-12 rounded bg-slate-100 animate-pulse" />
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-200 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
                  <div className="h-3 w-full rounded bg-slate-200 animate-pulse" />
                  <div className="h-3 w-4/5 rounded bg-slate-200 animate-pulse" />
                </div>
              </div>
            </div>
            <div className="lg:col-span-5 space-y-3">
              <div className="h-3 w-16 rounded bg-slate-100 animate-pulse" />
              <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3 space-y-2">
                <div className="h-3 w-32 rounded bg-slate-200 animate-pulse" />
                <div className="h-3 w-full rounded bg-slate-200 animate-pulse" />
              </div>
              <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3 space-y-2">
                <div className="h-3 w-28 rounded bg-slate-200 animate-pulse" />
                <div className="h-3 w-3/4 rounded bg-slate-200 animate-pulse" />
              </div>
            </div>
          </div>
        </Card>
      ) : result ? (
        <Card ref={resultRef} className="overflow-hidden p-0 mb-5 scroll-mt-6">
          <div className="relative p-4 sm:p-7 bg-gradient-to-br from-brand-50/60 via-white to-cyan-50/40">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-brand-600 font-semibold mb-2">
                  <Check size={11} weight="bold" /> Verified match
                </div>
                <h2 className="font-display text-[22px] sm:text-[30px] leading-[1.05] text-slate-900 tracking-tight">
                  {result.name}
                </h2>
                <div className="text-[13px] text-slate-500 mt-1.5">
                  {result.variant} · {result.serving}
                </div>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <Support level={result.supportLevel} />
                  <Pill
                    tone={
                      result.supportLevel === "Low"
                        ? "amber"
                        : result.supportLevel === "High"
                          ? "green"
                          : "slate"
                    }
                    className="!normal-case !tracking-normal"
                  >
                    {result.supportLevel === "High"
                      ? "Excellent choice"
                      : result.supportLevel === "Medium"
                        ? "Best in moderation"
                        : "Use sparingly"}
                  </Pill>
                  <Pill tone="slate" className="!normal-case !tracking-normal">
                    <Lock size={11} /> {profilePlanLabel(profile)}
                  </Pill>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-start gap-4 w-full sm:w-auto shrink-0">
                <div
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                    result.diff >= 0
                      ? "text-emerald-700 bg-emerald-50"
                      : "text-red-700 bg-red-50"
                  }`}
                >
                  {result.diff >= 0 ? (
                    <CaretUp size={11} weight="bold" />
                  ) : (
                    <CaretDown size={11} weight="bold" />
                  )}
                  {Math.abs(result.diff)}{" "}
                  {result.diff >= 0 ? "above avg" : "below avg"}
                </div>
                <Ring
                  value={result.score}
                  size={80}
                  stroke={8}
                  tone={scoreTone}
                  sub="score"
                />
              </div>
            </div>
            <div className="relative z-10 mt-5 pt-4 border-t border-slate-200/70">
              <Button variant="ghost" size="sm" onClick={handleSwap}>
                <ArrowsClockwise size={14} /> Swap plan
              </Button>
            </div>
          </div>

          {swapSuggestion && (
            <ScannerSwapSection
              suggestion={swapSuggestion}
              result={result}
              scoreReasons={scoreReasons}
              saving={savingSwap}
              onAccept={() => saveScannerSwap("accepted")}
              onDismiss={() => saveScannerSwap("dismissed")}
            />
          )}

          <div className="px-3 sm:px-6 flex gap-1 border-b border-slate-100 bg-slate-50/50 overflow-x-auto">
            {[
              { k: "overview", l: "Overview" },
              { k: "why", l: "Why this score" },
              { k: "ingredients", l: "Ingredients" },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`shrink-0 px-4 h-11 text-[13px] font-medium border-b-2 -mb-px transition ${tab === t.k ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}
              >
                {t.l}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-3">
                  Per serving · vs daily target
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {result.macros.map((m) => {
                    const tone =
                      m.flag === "high"
                        ? "red"
                        : m.flag === "med"
                          ? "amber"
                          : m.flag === "low"
                            ? "slate"
                            : "brand";
                    return (
                      <div key={m.k} className="rounded-xl bg-slate-50 p-3.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                            {m.k}
                          </span>
                          {m.flag === "high" && (
                            <span className="text-[10px] text-red-700 bg-red-50 px-1.5 rounded-full font-semibold uppercase">
                              high
                            </span>
                          )}
                          {m.flag === "med" && (
                            <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 rounded-full font-semibold uppercase">
                              med
                            </span>
                          )}
                          {m.flag === "low" && (
                            <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 rounded-full font-semibold uppercase">
                              low
                            </span>
                          )}
                        </div>
                        <div className="font-display text-[24px] leading-none tabular-nums text-slate-900">
                          {m.v}
                          <span className="text-slate-400 text-[13px] ml-1 font-medium">
                            {m.u}
                          </span>
                        </div>
                        <div className="mt-2.5">
                          <Bar value={m.pct} tone={tone} />
                        </div>
                        <div className="mt-1.5 text-[11px] text-slate-500 tabular-nums">
                          {m.pct}% of target
                        </div>
                      </div>
                    );
                  })}
                </div>
                {insightsLoading ? (
                  <div className="mt-5 space-y-4">
                    <div className="rounded-xl bg-slate-50 p-4 animate-pulse">
                      <div className="h-3 w-28 rounded bg-slate-200 mb-2" />
                      <div className="h-4 w-full rounded bg-slate-200 mb-2" />
                      <div className="h-3 w-5/6 rounded bg-slate-200 mb-3" />
                      <div className="space-y-2">
                        <div className="h-3 w-11/12 rounded bg-slate-200" />
                        <div className="h-3 w-4/5 rounded bg-slate-200" />
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4 animate-pulse">
                      <div className="h-3 w-36 rounded bg-slate-200 mb-2" />
                      <div className="h-4 w-full rounded bg-slate-200 mb-2" />
                      <div className="h-3 w-3/4 rounded bg-slate-200 mb-3" />
                      <div className="h-16 w-full rounded bg-slate-200" />
                    </div>
                  </div>
                ) : (
                  <>
                    {patternNotice && (
                      <div
                        className={`mt-5 rounded-xl p-4 flex items-start gap-3 ${patternToneStyles.card}`}
                      >
                        <div
                          className={`hidden sm:grid w-9 h-9 rounded-lg place-items-center shrink-0 ${patternToneStyles.icon}`}
                        >
                          <Sparkle size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className={`text-[11px] uppercase tracking-wider font-semibold mb-1 ${patternToneStyles.eyebrow}`}
                          >
                            {patternNotice.title}
                          </div>
                          <p
                            className={`text-[13px] leading-snug font-medium ${patternToneStyles.body}`}
                          >
                            {patternNotice.trendLine}
                          </p>
                          <p className="mt-1 text-[12.5px] text-slate-600 leading-snug">
                            {patternNotice.hydrationLine}
                          </p>
                          {patternNotice.suggestions.length > 0 && (
                            <ul className="mt-2.5 space-y-1.5">
                              {patternNotice.suggestions.map((tip) => (
                                <li
                                  key={tip}
                                  className="flex items-start gap-2 text-[12.5px] text-slate-700 leading-snug"
                                >
                                  <span
                                    className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${patternToneStyles.bullet}`}
                                  />
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    )}
                    {mentalSupport && (
                      <div
                        className={`mt-4 rounded-xl ring-1 p-4 flex items-start gap-3 ${mentalToneStyles.card}`}
                      >
                        <div
                          className={`hidden sm:grid w-9 h-9 rounded-lg place-items-center shrink-0 ${mentalToneStyles.icon}`}
                        >
                          <Sparkle size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <div
                              className={`text-[11px] uppercase tracking-wider font-semibold ${mentalToneStyles.eyebrow}`}
                            >
                              {mentalSupport.title}
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-white/70 ring-1 ring-slate-200 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                              {mentalSupport.confidence} confidence
                            </span>
                          </div>
                          <p
                            className={`text-[13px] leading-snug font-medium ${mentalToneStyles.body}`}
                          >
                            {mentalSupport.summary}
                          </p>
                          {mentalSupport.contributors.length > 0 && (
                            <ul className="mt-2.5 space-y-1.5">
                              {mentalSupport.contributors.map((item) => (
                                <li
                                  key={item}
                                  className="flex items-start gap-2 text-[12.5px] text-slate-700 leading-snug"
                                >
                                  <span
                                    className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${mentalToneStyles.bullet}`}
                                  />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {mentalSupport.actions.length > 0 && (
                            <div className="mt-3 rounded-lg bg-white/80 ring-1 ring-slate-200 p-3">
                              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                                Try this today
                              </div>
                              <ul className="space-y-1.5">
                                {mentalSupport.actions.map((item) => (
                                  <li
                                    key={item}
                                    className="text-[12.5px] text-slate-700 leading-snug"
                                  >
                                    • {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <p className="mt-2.5 text-[12.5px] text-slate-600 leading-snug">
                            {mentalSupport.motivation}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="lg:col-span-5 space-y-4">
                {result.flags.length > 0 && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                      Flags
                    </div>
                    <div className="space-y-2">
                      {result.flags.map((f, i) => {
                        const cls =
                          {
                            red: "bg-red-50 text-red-700 ring-red-100",
                            amber: "bg-amber-50 text-amber-800 ring-amber-100",
                            slate: "bg-slate-100 text-slate-700 ring-slate-200",
                          }[f.tone] ??
                          "bg-slate-100 text-slate-700 ring-slate-200";
                        return (
                          <div
                            key={i}
                            className={`rounded-xl p-3 ring-1 ${cls}`}
                          >
                            <div className="font-semibold text-[13px] mb-0.5">
                              {f.label}
                            </div>
                            <div className="text-[12px] opacity-80">
                              {f.detail}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {result.allergens.length > 0 && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                      Allergens
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.allergens.map((a) => (
                        <span
                          key={a}
                          className="px-2.5 py-1 rounded-full bg-red-50 ring-1 ring-red-100 text-red-700 text-[12px] font-medium"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {result.flags.length === 0 && result.allergens.length === 0 && (
                  <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-100 p-4 text-[13px] text-emerald-700">
                    No flags or allergens for this product.
                  </div>
                )}
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                    Full nutrition facts · per serving
                  </div>
                  <div className="divide-y divide-slate-200 rounded-xl ring-1 ring-slate-200 overflow-hidden bg-white">
                    {result.macros.map((m) => (
                      <div
                        key={m.k}
                        className="flex items-center justify-between px-4 py-2.5"
                      >
                        <span className="text-[13px] text-slate-700">
                          {m.k}
                        </span>
                        <span className="font-mono text-[13px] text-slate-900 font-medium tabular-nums">
                          {m.v} {m.u}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "why" && (
            <div className="p-4 sm:p-6 max-w-[760px]">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-3">
                How we scored {result.name}
              </div>
              <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-5">
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="text-[13px] font-semibold text-slate-900">
                      Score: {result.score}/100
                    </div>
                    <p className="text-[13px] text-slate-600 leading-snug mt-1">
                      {result.wellnessImpact}
                    </p>
                  </div>
                  <div className="shrink-0 whitespace-nowrap">
                    <Support level={result.supportLevel} showDot={false} />
                  </div>
                </div>
                {scoreReasons.length > 0 && (
                  <div className="pt-4">
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                      Key factors
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {scoreReasons.map((reason) => {
                        const dotClass =
                          {
                            red: "bg-red-500",
                            amber: "bg-amber-500",
                            green: "bg-emerald-500",
                            slate: "bg-slate-400",
                          }[reason.tone] ?? "bg-slate-400";
                        return (
                          <li
                            key={reason.label}
                            className="flex gap-3 py-3 first:pt-0 last:pb-0"
                          >
                            <span
                              className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${dotClass}`}
                            />
                            <div>
                              <div className="text-[13px] font-semibold text-slate-900">
                                {reason.label}
                              </div>
                              <p className="text-[12.5px] text-slate-600 leading-snug mt-0.5">
                                {reason.detail}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {result.flags.length > 0 && (
                  <div className="pt-4 mt-4 border-t border-slate-100">
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                      Analysis notes
                    </div>
                    <ul className="space-y-2">
                      {result.flags.map((flag, index) => (
                        <li
                          key={`${flag.label}-${index}`}
                          className="text-[13px] text-slate-600 leading-snug"
                        >
                          <span className="font-medium text-slate-900">
                            {flag.label}:
                          </span>{" "}
                          {flag.detail || "Included in the final score."}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-slate-100 flex gap-3">
                  <Sparkle
                    size={16}
                    className="text-brand-600 shrink-0 mt-0.5"
                  />
                  <p className="text-[13px] text-slate-700 leading-snug">
                    Score is weighted by your active health context:{" "}
                    <strong>{profilePlanLabel(profile)}</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {tab === "ingredients" && (
            <div className="p-4 sm:p-6">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-3">
                Ingredients
              </div>
              <p className="text-[14px] text-slate-700 leading-relaxed max-w-[640px]">
                {result.ingredients}
              </p>
            </div>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 mb-5">
          <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-4 rounded-3xl bg-slate-50 ring-1 ring-slate-200 min-h-[240px] grid place-items-center">
              <div className="relative">
                <Scan size={150} className="text-slate-200" weight="light" />
                <div className="absolute inset-0 grid place-items-center text-brand-500">
                  <Barcode size={62} weight="duotone" />
                </div>
              </div>
            </div>
            <div className="lg:col-span-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-700 ring-1 ring-brand-100">
                <Sparkle size={13} /> Ready for backend scan
              </div>
              <h2 className="mt-4 font-display text-[28px] leading-tight text-slate-900">
                Scan results will appear here
              </h2>
              <p className="mt-2 max-w-[560px] text-[14px] leading-relaxed text-slate-600">
                Once you type a meal or upload a nutrition label, KainWise will
                score it against {profilePlanLabel(profile)}, show nutrition
                targets, highlight flags, and save it to your scan history.
              </p>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    icon: Package,
                    title: "Product match",
                    text: "Name, type, barcode",
                  },
                  {
                    icon: Scan,
                    title: "Wellness score",
                    text: "Support level out of 100",
                  },
                  {
                    icon: Sparkle,
                    title: "AI note",
                    text: "Profile-aware guidance",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl bg-white p-4 ring-1 ring-slate-200"
                  >
                    <item.icon
                      size={20}
                      className="mb-2 text-brand-500"
                      weight="duotone"
                    />
                    <div className="text-[13px] font-semibold text-slate-900">
                      {item.title}
                    </div>
                    <div className="mt-0.5 text-[12px] text-slate-500">
                      {item.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  <UploadSimple size={14} /> Upload barcode
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
