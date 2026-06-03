interface NewsletterSuccessMessageProps {
  downloadUrl?: string;
}

export default function NewsletterSuccessMessage({ downloadUrl }: NewsletterSuccessMessageProps) {
  return (
    <div className="bg-secondary-50 border border-secondary-300 rounded-lg p-6 text-center">
      <h3 className="text-2xl font-bold text-neutral-900 mb-2">Check Your Email! ✓</h3>
      <p className="text-neutral-800">
        {downloadUrl
          ? 'We sent you an email with a link to confirm and download your PDF. Check your inbox (and spam folder)!'
          : 'We sent you a confirmation email. Please check your inbox to confirm your subscription.'}
      </p>
    </div>
  );
}
