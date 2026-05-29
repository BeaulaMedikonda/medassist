"use client";

import { useMemo, useState } from "react";

type LanguageKey = "telugu" | "hindi";
type Phrase = {
  category: string;
  english: string;
  telugu: string;
  hindi: string;
};

const LANGUAGES: { key: LanguageKey; label: string }[] = [
  { key: "telugu", label: "Telugu" },
  { key: "hindi", label: "Hindi" },
];

const PHRASES: Phrase[] = [
  {
    category: "Reception",
    english: "Please tell me your full name and phone number.",
    telugu: "దయచేసి మీ పూర్తి పేరు మరియు ఫోన్ నంబర్ చెప్పండి.",
    hindi: "कृपया अपना पूरा नाम और फोन नंबर बताइए।",
  },
  {
    category: "Reception",
    english: "Do you have an appointment today?",
    telugu: "ఈ రోజు మీకు అపాయింట్‌మెంట్ ఉందా?",
    hindi: "क्या आज आपकी अपॉइंटमेंट है?",
  },
  {
    category: "Vitals",
    english: "I will check your blood pressure, pulse, temperature, and oxygen level.",
    telugu: "నేను మీ బీపీ, పల్స్, ఉష్ణోగ్రత, ఆక్సిజన్ స్థాయి చూస్తాను.",
    hindi: "मैं आपका बीपी, नाड़ी, तापमान और ऑक्सीजन स्तर जांचूंगा।",
  },
  {
    category: "Vitals",
    english: "Please sit calmly for a minute.",
    telugu: "దయచేసి ఒక నిమిషం ప్రశాంతంగా కూర్చోండి.",
    hindi: "कृपया एक मिनट शांत बैठिए।",
  },
  {
    category: "Symptoms",
    english: "Where do you have pain?",
    telugu: "మీకు ఎక్కడ నొప్పి ఉంది?",
    hindi: "आपको दर्द कहां है?",
  },
  {
    category: "Symptoms",
    english: "How many days have you had these symptoms?",
    telugu: "ఈ లక్షణాలు మీకు ఎన్ని రోజులుగా ఉన్నాయి?",
    hindi: "ये लक्षण आपको कितने दिनों से हैं?",
  },
  {
    category: "Instructions",
    english: "Please wait outside. The doctor will call you shortly.",
    telugu: "దయచేసి బయట వేచి ఉండండి. డాక్టర్ త్వరలో పిలుస్తారు.",
    hindi: "कृपया बाहर प्रतीक्षा करें। डॉक्टर आपको जल्द बुलाएंगे।",
  },
  {
    category: "Instructions",
    english: "Please bring your previous reports and medicines.",
    telugu: "దయచేసి మీ పాత రిపోర్టులు మరియు మందులు తీసుకురండి.",
    hindi: "कृपया अपनी पुरानी रिपोर्ट और दवाएं साथ लाएं।",
  },
];

export function LanguageClient({ clinicName }: { clinicName: string }) {
  const [language, setLanguage] = useState<LanguageKey>("telugu");
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(PHRASES.map((phrase) => phrase.category)))],
    [],
  );

  const visiblePhrases = useMemo(() => {
    const search = query.trim().toLowerCase();

    return PHRASES.filter((phrase) => {
      const matchesCategory = category === "All" || phrase.category === category;
      const translated = phrase[language].toLowerCase();
      const matchesSearch =
        !search ||
        phrase.english.toLowerCase().includes(search) ||
        translated.includes(search);

      return matchesCategory && matchesSearch;
    });
  }, [category, language, query]);

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(text);
    window.setTimeout(() => setCopied(null), 1400);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-ink-100">
          Language
        </h1>
        <p className="text-sm text-slate-500 dark:text-ink-500">
          Quick clinic phrases for {clinicName}.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-ink-800 dark:bg-ink-900">
        <div className="grid gap-4 md:grid-cols-[220px_220px_1fr]">
          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-ink-500">
              Language
            </span>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as LanguageKey)}
              className="input-base"
            >
              {LANGUAGES.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-ink-500">
              Category
            </span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="input-base"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-ink-500">
              Search
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input-base"
              placeholder="Search symptoms, vitals, reception..."
            />
          </label>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {visiblePhrases.map((phrase) => {
          const translated = phrase[language];

          return (
            <article
              key={`${phrase.category}-${phrase.english}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-ink-800 dark:bg-ink-900"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 dark:bg-teal-900/30 dark:text-teal-200">
                  {phrase.category}
                </span>
                <button
                  type="button"
                  onClick={() => void copyText(translated)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800"
                >
                  {copied === translated ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-ink-500">
                {phrase.english}
              </p>
              <p className="mt-3 text-lg font-bold leading-relaxed text-slate-900 dark:text-ink-100">
                {translated}
              </p>
            </article>
          );
        })}
      </section>
    </div>
  );
}
