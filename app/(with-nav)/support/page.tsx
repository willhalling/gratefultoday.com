import type { Metadata } from "next";
import ProsePageLayout from "@/components/prose-page-layout";

export const metadata: Metadata = {
  title: "Support | Grateful Today",
  description:
    "Free, confidential places to find crisis, recovery, and community support.",
};

const resources = [
  {
    name: "988 Suicide & Crisis Lifeline",
    description:
      "Call or text 988 in the United States. Free, confidential support is available 24/7.",
    href: "tel:988",
    action: "Call 988",
  },
  {
    name: "SAMHSA National Helpline",
    description:
      "Treatment referral and information, in English and Spanish, available 24/7.",
    href: "tel:18006624357",
    action: "1-800-662-4357",
  },
  {
    name: "Alcoholics Anonymous",
    description: "Find A.A. meetings and local recovery support near you.",
    href: "https://www.aa.org/find-aa",
    action: "Find a meeting",
  },
];

export default function SupportPage() {
  return (
    <ProsePageLayout
      title="You don't have to do today alone"
      subtitle="Reach out to a real person when things feel heavy. Support is free and confidential."
      maxWidth="wide"
    >
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900">
        <h2 className="mt-0">If you are in immediate danger</h2>
        <p className="mb-0">
          Call your local emergency number now, or go to the nearest emergency
          room. In the United States, call or text <strong>988</strong> for
          crisis support.
        </p>
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {resources.map((resource) => (
          <section
            key={resource.name}
            className="rounded-xl border border-primary-100 bg-white p-5 shadow-sm"
          >
            <h2 className="mt-0 text-xl">{resource.name}</h2>
            <p>{resource.description}</p>
            <a
              href={resource.href}
              target={resource.href.startsWith("http") ? "_blank" : undefined}
              rel={
                resource.href.startsWith("http")
                  ? "noopener noreferrer"
                  : undefined
              }
              className="font-semibold"
            >
              {resource.action} →
            </a>
          </section>
        ))}
      </div>
      <div className="mt-8 space-y-4">
        <h2>Someone you trust can be enough for the next hour</h2>
        <p>
          A friend, sponsor, family member, therapist, doctor, or someone in
          your recovery group. You do not need the perfect words. “I am having a
          hard time and do not want to be alone” is enough.
        </p>
        <p>
          Grateful Today offers gratitude and milestone tools, not medical care,
          therapy, or crisis counselling. Please use the services above when you
          need more support.
        </p>
      </div>
    </ProsePageLayout>
  );
}
