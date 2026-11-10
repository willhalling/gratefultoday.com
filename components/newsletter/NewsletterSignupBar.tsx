"use client";

import { useState, type FormEvent } from "react";

export function NewsletterSignupBar() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong.");
      setMessage({
        type: "success",
        text:
          data.message === "Already subscribed"
            ? "You're already signed up. Check your email tomorrow morning."
            : "Signed up. Check your email tomorrow morning.",
      });
      setEmail("");
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to sign up. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="homepage-email" className="sr-only">
          Email address
        </label>
        <input
          id="homepage-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="your@email.com"
          required
          disabled={isSubmitting}
          className="min-w-0 flex-1 rounded-full border border-primary-200 bg-white px-5 py-3 text-neutral-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
        />
        <button
          type="submit"
          disabled={isSubmitting || !email}
          className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-50 transition-colors hover:bg-primary-500 disabled:opacity-50"
        >
          {isSubmitting ? "Signing up…" : "Sign up"}
        </button>
      </form>
      {message && (
        <p
          className={`mt-3 text-sm ${message.type === "success" ? "text-green-800" : "text-red-700"}`}
          role="status"
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
