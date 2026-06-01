"use client";

import { useState } from "react";
import type { EventScale } from "@/lib/types";

interface SpeakerRow {
  name: string;
  role: string;
  bio: string;
}

interface FormData {
  title: string;
  scale: EventScale;
  start_date: string;
  end_date: string;
  source_url: string;
  summary: string;
  description: string;
  country: string;
  city: string;
  venue: string;
  is_online: boolean;
  tokens: string;
  pricing: string;
  audience: string;
  speakers: SpeakerRow[];
}

const EMPTY: FormData = {
  title: "",
  scale: "local",
  start_date: "",
  end_date: "",
  source_url: "",
  summary: "",
  description: "",
  country: "",
  city: "",
  venue: "",
  is_online: false,
  tokens: "",
  pricing: "",
  audience: "",
  speakers: [],
};

const inputCls =
  "w-full bg-panel2 dark:bg-panel2-dark border border-border dark:border-border-dark rounded-md px-3 py-2 outline-none focus:border-accent text-fg dark:text-fg-dark placeholder:text-muted dark:placeholder:text-muted-dark";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wide text-muted dark:text-muted-dark mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export function AddEventModal({ onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const addSpeaker = () =>
    setForm((f) => ({ ...f, speakers: [...f.speakers, { name: "", role: "", bio: "" }] }));

  const setSpeaker = (i: number, k: keyof SpeakerRow, v: string) =>
    setForm((f) => ({
      ...f,
      speakers: f.speakers.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)),
    }));

  const removeSpeaker = (i: number) =>
    setForm((f) => ({ ...f, speakers: f.speakers.filter((_, idx) => idx !== i) }));

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.start_date || !form.summary.trim()) {
      setError("Обязательные поля: название, дата начала, описание");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        ...form,
        tokens: form.tokens
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        speakers: form.speakers.filter((s) => s.name.trim()),
      };
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-panel dark:bg-panel-dark border border-border dark:border-border-dark rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-border dark:border-border-dark flex items-center justify-between sticky top-0 bg-panel dark:bg-panel-dark z-10">
          <h2 className="text-lg font-semibold text-fg dark:text-fg-dark">Новый ивент</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted dark:text-muted-dark hover:text-fg dark:hover:text-fg-dark text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm text-fg dark:text-fg-dark">
          <Field label="Название *">
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className={inputCls}
              placeholder="ETHGlobal Bangkok 2026"
            />
          </Field>

          <Field label="Масштаб *">
            <select
              value={form.scale}
              onChange={(e) => set("scale", e.target.value as EventScale)}
              className={inputCls}
            >
              <option value="major">Major — крупный мировой</option>
              <option value="local">Local — локальный / митап</option>
              <option value="niche">Niche — узкая тема / токен</option>
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Дата начала *">
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Дата окончания">
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => set("end_date", e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Страна">
              <input
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
                className={inputCls}
                placeholder="Germany"
              />
            </Field>
            <Field label="Город">
              <input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                className={inputCls}
                placeholder="Berlin"
              />
            </Field>
          </div>

          <Field label="Площадка / Venue">
            <input
              value={form.venue}
              onChange={(e) => set("venue", e.target.value)}
              className={inputCls}
              placeholder="Berlin Congress Center"
            />
          </Field>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_online}
              onChange={(e) => set("is_online", e.target.checked)}
              className="accent-accent"
            />
            <span>Онлайн-ивент</span>
          </label>

          <Field label="Ссылка (URL)">
            <input
              value={form.source_url}
              onChange={(e) => set("source_url", e.target.value)}
              className={inputCls}
              placeholder="https://..."
            />
          </Field>

          <Field label="Краткое описание *">
            <textarea
              value={form.summary}
              onChange={(e) => set("summary", e.target.value)}
              rows={2}
              className={inputCls}
              placeholder="Одна-две фразы о чём ивент"
            />
          </Field>

          <Field label="Полное описание">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className={inputCls}
              placeholder="Подробности..."
            />
          </Field>

          <Field label="Токены (через запятую)">
            <input
              value={form.tokens}
              onChange={(e) => set("tokens", e.target.value)}
              className={inputCls}
              placeholder="ETH, BTC, SOL"
            />
          </Field>

          <Field label="Тарифы / Pricing">
            <input
              value={form.pricing}
              onChange={(e) => set("pricing", e.target.value)}
              className={inputCls}
              placeholder="Free / $499 Early Bird"
            />
          </Field>

          <Field label="Аудитория">
            <input
              value={form.audience}
              onChange={(e) => set("audience", e.target.value)}
              className={inputCls}
              placeholder="Developers, investors..."
            />
          </Field>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wide text-muted dark:text-muted-dark">
                Спикеры
              </span>
              <button
                type="button"
                onClick={addSpeaker}
                className="text-xs text-accent hover:underline underline-offset-2"
              >
                + добавить
              </button>
            </div>
            {form.speakers.map((s, i) => (
              <div
                key={i}
                className="bg-panel2 dark:bg-panel2-dark border border-border dark:border-border-dark rounded-md p-3 mb-2 space-y-2"
              >
                <div className="flex gap-2 items-center">
                  <input
                    value={s.name}
                    onChange={(e) => setSpeaker(i, "name", e.target.value)}
                    placeholder="Имя *"
                    className={`${inputCls} flex-1`}
                  />
                  <input
                    value={s.role}
                    onChange={(e) => setSpeaker(i, "role", e.target.value)}
                    placeholder="Роль"
                    className={`${inputCls} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => removeSpeaker(i)}
                    className="text-muted dark:text-muted-dark hover:text-rose-400 text-xl leading-none px-1 shrink-0"
                  >
                    ×
                  </button>
                </div>
                <input
                  value={s.bio}
                  onChange={(e) => setSpeaker(i, "bio", e.target.value)}
                  placeholder="Краткое bio"
                  className={inputCls}
                />
              </div>
            ))}
          </div>

          {error && <p className="text-rose-400 text-xs">{error}</p>}
        </div>

        <div className="p-5 border-t border-border dark:border-border-dark flex justify-end gap-2 sticky bottom-0 bg-panel dark:bg-panel-dark">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm border border-border dark:border-border-dark text-muted dark:text-muted-dark hover:text-fg dark:hover:text-fg-dark"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 rounded-md text-sm bg-accent text-black font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Сохраняется..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
