import { useState } from "react";
import { Modal } from "../../../../components/ui/Modal.jsx";
import { Button } from "../../../../components/ui/Button.jsx";
import { Plus, Check, X } from "@phosphor-icons/react";
import { getDayPeriod } from "../../../../lib/date-time.js";
import { workoutTypes, sessionTimes } from "../../../../utils/workout.js";

export function LogModal({ onSave, onClose, prefill, saving = false }) {
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [type, setType] = useState(prefill?.type ?? "gym");
  const [sessionTime, setSessionTime] = useState(() => getDayPeriod());
  const [duration, setDuration] = useState(prefill?.duration?.toString() ?? "");
  const [calories, setCalories] = useState("");
  const [distance, setDistance] = useState("");
  const [intensity, setIntensity] = useState("low");
  const [feel, setFeel] = useState("");
  const [exercises, setExercises] = useState([
    { name: "Curl", minutes: "", sets: "", reps: "" },
    { name: "Deadlift", minutes: "", sets: "", reps: "" },
  ]);
  const exerciseMinutes = exercises.reduce(
    (sum, item) => sum + (parseInt(item.minutes) || 0),
    0,
  );
  const totalMinutes = exerciseMinutes || parseInt(duration) || 0;

  const updateExercise = (index, key, value) => {
    setExercises((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );
  };

  const addExercise = () => {
    setExercises((current) => [
      ...current,
      { name: "", minutes: "", sets: "", reps: "" },
    ]);
  };

  const removeExercise = (index) => {
    setExercises((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const submit = () => {
    if (!title.trim() || totalMinutes <= 0) return;
    const normalizedExercises = exercises
      .map((item) => ({
        name: item.name.trim(),
        minutes: parseInt(item.minutes) || 0,
        sets: parseInt(item.sets) || null,
        reps: parseInt(item.reps) || null,
      }))
      .filter((item) => item.name || item.minutes > 0);

    onSave({
      title: title.trim(),
      workoutType: type,
      source: "manual",
      durationMinutes: totalMinutes,
      caloriesBurned: calories ? parseInt(calories) || null : null,
      distanceKm: parseFloat(distance) || null,
      intensity,
      notes: {
        sessionTime,
        exercises: normalizedExercises,
        feel: feel.trim() || null,
      },
    });
  };

  return (
    <Modal
      title="Log workout"
      subtitle="Build a session, total the exercise time, then save it for AI overview."
      width="max-w-[720px]"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-[12px] text-slate-500">
            Total session time:{" "}
            <span className="font-mono text-slate-900">{totalMinutes} min</span>
          </div>
          <div className="flex justify-start sm:justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={submit}
              disabled={!title.trim() || totalMinutes <= 0 || saving}
            >
              <Check size={13} /> {saving ? "Saving..." : "Save workout"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 max-h-[68vh] overflow-y-auto pr-1">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1.5">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Morning walk"
            className="w-full h-10 px-3 rounded-lg bg-slate-50 ring-1 ring-slate-200 text-[14px] outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1.5">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-slate-50 ring-1 ring-slate-200 text-[14px] outline-none focus:ring-2 focus:ring-brand-500"
            >
              {workoutTypes.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1.5">
              Session
            </label>
            <select
              value={sessionTime}
              onChange={(e) => setSessionTime(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-slate-50 ring-1 ring-slate-200 text-[14px] capitalize outline-none focus:ring-2 focus:ring-brand-500"
            >
              {sessionTimes.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1.5">
              Intensity
            </label>
            <select
              value={intensity}
              onChange={(e) => setIntensity(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-slate-50 ring-1 ring-slate-200 text-[14px] outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                Exercises
              </div>
              <p className="text-[12px] text-slate-500 mt-0.5">
                Add curls, deadlifts, push work, pull work, or bodyweight moves.
              </p>
            </div>
            <Button variant="line" size="sm" onClick={addExercise}>
              <Plus size={12} /> Add
            </Button>
          </div>
          <div className="space-y-2">
            {exercises.map((exercise, index) => (
              <div
                key={index}
                className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center"
              >
                <input
                  value={exercise.name}
                  onChange={(e) =>
                    updateExercise(index, "name", e.target.value)
                  }
                  placeholder="Exercise"
                  className="lg:col-span-5 h-9 px-3 rounded-lg bg-white ring-1 ring-slate-200 text-[13px] outline-none focus:ring-2 focus:ring-brand-500"
                />
                <input
                  type="number"
                  min="0"
                  value={exercise.minutes}
                  onChange={(e) =>
                    updateExercise(index, "minutes", e.target.value)
                  }
                  placeholder="Min"
                  className="lg:col-span-2 h-9 px-3 rounded-lg bg-white ring-1 ring-slate-200 text-[13px] outline-none focus:ring-2 focus:ring-brand-500"
                />
                <input
                  type="number"
                  min="0"
                  value={exercise.sets}
                  onChange={(e) =>
                    updateExercise(index, "sets", e.target.value)
                  }
                  placeholder="Sets"
                  className="lg:col-span-2 h-9 px-3 rounded-lg bg-white ring-1 ring-slate-200 text-[13px] outline-none focus:ring-2 focus:ring-brand-500"
                />
                <input
                  type="number"
                  min="0"
                  value={exercise.reps}
                  onChange={(e) =>
                    updateExercise(index, "reps", e.target.value)
                  }
                  placeholder="Reps"
                  className="lg:col-span-2 h-9 px-3 rounded-lg bg-white ring-1 ring-slate-200 text-[13px] outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => removeExercise(index)}
                  className="lg:col-span-1 h-9 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition grid place-items-center"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1.5">
              Duration fallback (min)
            </label>
            <input
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="30"
              className="w-full h-10 px-3 rounded-lg bg-slate-50 ring-1 ring-slate-200 text-[14px] outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Used only if exercise minutes are empty.
            </p>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1.5">
              Calories
            </label>
            <input
              type="number"
              min="0"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="120"
              className="w-full h-10 px-3 rounded-lg bg-slate-50 ring-1 ring-slate-200 text-[14px] outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1.5">
              Distance (km)
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="2.5"
              className="w-full h-10 px-3 rounded-lg bg-slate-50 ring-1 ring-slate-200 text-[14px] outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1.5">
            How did it feel? (optional)
          </label>
          <textarea
            value={feel}
            onChange={(e) => setFeel(e.target.value)}
            rows={2}
            placeholder="Write a note…"
            className="w-full px-3 py-2 rounded-lg bg-slate-50 ring-1 ring-slate-200 text-[14px] outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>
      </div>
    </Modal>
  );
}
