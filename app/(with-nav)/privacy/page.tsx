import type { Metadata } from "next";
import ProsePageLayout from "@/components/prose-page-layout";

export const metadata: Metadata = {
  title: "Privacy Policy | Grateful Today",
  description:
    "How Grateful Today collects, uses, and protects personal information.",
};

export default function PrivacyPage() {
  return (
    <ProsePageLayout
      title="Privacy Policy"
      subtitle="Last updated: 18 October 2026"
    >
      <div className="space-y-6">
        <h2>Our commitment to privacy</h2>
        <p>
          Recovery and gratitude can be personal. This policy explains what
          information Grateful Today collects, why we use it, and the choices
          available to you.
        </p>
        <h2>Information we collect</h2>
        <ul>
          <li>
            Email address, name, frequency, and optional sobriety date when you
            subscribe or set preferences.
          </li>
          <li>Text you choose to post publicly on the Gratitude Wall.</li>
          <li>
            Names, messages, and design choices you save in a shareable chip or
            card link.
          </li>
          <li>Basic usage, device, browser, IP, and analytics information.</li>
        </ul>
        <h2>Camera, microphone, and gratitude videos</h2>
        <p>
          The wall video maker requests camera and microphone access only after
          you choose to record. Recording, previewing, and MP4 rendering happen
          in your browser. We do not upload the recording or finished video to
          Grateful Today, Firebase Storage, or the Gratitude Wall. A video
          leaves your device only if you choose a destination in your
          device&apos;s share sheet or send the downloaded file yourself.
        </p>
        <h2>How we use information</h2>
        <ul>
          <li>Provide the wall, daily email, chips, cards, and counter.</li>
          <li>Deliver requested emails and milestone reminders.</li>
          <li>Keep the community safe, moderate content, and prevent abuse.</li>
          <li>Understand which features are useful and improve them.</li>
        </ul>
        <h2>Sharing and visibility</h2>
        <p>
          Wall posts are public. Saved chips and cards are available to anyone
          with their private link, so share those links only with people you
          trust. We do not sell personal information. Trusted providers help us
          with hosting, analytics, email delivery, and community infrastructure.
        </p>
        <h2>Security and retention</h2>
        <p>
          We use encrypted transmission and restrict staff access to personal
          data. Information is kept while needed to provide the service and meet
          safety or legal obligations.
        </p>
        <h2>Your choices</h2>
        <p>
          You can update newsletter preferences or unsubscribe using the links
          in our emails. You can control cookies and camera/microphone
          permissions in your browser. To request access, correction, or
          deletion of personal information, contact us.
        </p>
        <h2>Contact</h2>
        <p>
          Privacy questions:{" "}
          <a href="mailto:privacy@gratefultoday.com">
            privacy@gratefultoday.com
          </a>
          <br />
          General support:{" "}
          <a href="mailto:support@gratefultoday.com">
            support@gratefultoday.com
          </a>
        </p>
      </div>
    </ProsePageLayout>
  );
}
