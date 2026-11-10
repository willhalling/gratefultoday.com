import type { Metadata } from "next";
import ProsePageLayout from "@/components/prose-page-layout";

export const metadata: Metadata = {
  title: "Terms & Conditions | Grateful Today",
  description: "Terms for using Grateful Today’s gratitude and recovery tools.",
};

export default function TermsPage() {
  return (
    <ProsePageLayout
      title="Terms & Conditions"
      subtitle="Last updated: 18 October 2026"
    >
      <div className="space-y-6">
        <h2>Using Grateful Today</h2>
        <p>
          By using Grateful Today, you agree to these terms. The site provides
          free gratitude, community, and sobriety milestone tools for personal
          use.
        </p>
        <h2>Not professional or emergency care</h2>
        <p>
          Grateful Today is not a substitute for medical advice, therapy,
          addiction treatment, or crisis support. If you need professional help
          or are in immediate danger, contact a qualified provider or your local
          emergency service.
        </p>
        <h2>Your content</h2>
        <p>
          Content you create remains yours. When you publicly post on the
          Gratitude Wall, you give us permission to display and moderate that
          content. Private chip and card links can be opened by anyone who has
          the link, so share them carefully.
        </p>
        <h2>Recording and sharing videos</h2>
        <p>
          Camera recording and video rendering happen on your device. You are
          responsible for what you record and for any destination you choose in
          your share sheet or when sending a downloaded video. Do not record or
          share someone else without their permission.
        </p>
        <h2>Acceptable use</h2>
        <ul>
          <li>Do not post harmful, hateful, unlawful, or abusive content.</li>
          <li>
            Do not interfere with the service or attempt unauthorized access.
          </li>
          <li>
            Do not use the tools to harass, exploit, or endanger another person.
          </li>
        </ul>
        <h2>Availability and liability</h2>
        <p>
          We aim to keep the tools useful and available, but cannot guarantee
          uninterrupted service or that every browser supports every feature. To
          the extent permitted by law, Grateful Today is not liable for indirect
          or consequential loss arising from use of the service.
        </p>
        <h2>Changes and contact</h2>
        <p>
          We may update these terms as the site changes. Continued use after an
          update means you accept the revised terms. Questions can be sent to
          <a href="mailto:support@gratefultoday.com">
            {" "}
            support@gratefultoday.com
          </a>
          .
        </p>
      </div>
    </ProsePageLayout>
  );
}
