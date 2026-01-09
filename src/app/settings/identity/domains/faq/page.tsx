import Link from "next/link";

const dnsProviders = [
  {
    name: "Cloudflare",
    steps: [
      "Log in to your Cloudflare dashboard",
      "Select your domain from the list",
      "Click on 'DNS' in the left sidebar",
      "Click 'Add record'",
      "Select 'TXT' as the record type",
      "Enter '_madeby-verify' in the Name field",
      "Paste the verification value (madeby-verify=...) in the Content field",
      "Leave TTL as 'Auto'",
      "Click 'Save'",
    ],
  },
  {
    name: "GoDaddy",
    steps: [
      "Log in to your GoDaddy account",
      "Go to 'My Products' and find your domain",
      "Click 'DNS' or 'Manage DNS'",
      "Scroll down to the Records section and click 'Add'",
      "Select 'TXT' from the Type dropdown",
      "Enter '_madeby-verify' in the Name/Host field",
      "Paste the verification value in the Value/TXT Value field",
      "Set TTL to 1 hour (or default)",
      "Click 'Save'",
    ],
  },
  {
    name: "Namecheap",
    steps: [
      "Log in to your Namecheap account",
      "Go to 'Domain List' and click 'Manage' next to your domain",
      "Click on 'Advanced DNS' tab",
      "Click 'Add New Record'",
      "Select 'TXT Record' from the dropdown",
      "Enter '_madeby-verify' in the Host field",
      "Paste the verification value in the Value field",
      "Leave TTL as 'Automatic'",
      "Click the green checkmark to save",
    ],
  },
  {
    name: "Google Domains / Squarespace Domains",
    steps: [
      "Log in to Google Domains or Squarespace Domains",
      "Select your domain",
      "Click on 'DNS' in the left menu",
      "Scroll to 'Custom records' section",
      "Click 'Manage custom records'",
      "Enter '_madeby-verify' in the Host name field",
      "Select 'TXT' as the Type",
      "Paste the verification value in the Data field",
      "Click 'Save'",
    ],
  },
  {
    name: "AWS Route 53",
    steps: [
      "Log in to AWS Console and go to Route 53",
      "Click 'Hosted zones' and select your domain",
      "Click 'Create record'",
      "Enter '_madeby-verify' in the Record name field",
      "Select 'TXT' as the Record type",
      "Paste the verification value in the Value field (include quotes)",
      "Leave TTL as default (300)",
      "Click 'Create records'",
    ],
  },
  {
    name: "DigitalOcean",
    steps: [
      "Log in to your DigitalOcean account",
      "Go to 'Networking' > 'Domains'",
      "Click on your domain",
      "Select 'TXT' from the record type dropdown",
      "Enter '_madeby-verify' in the Hostname field",
      "Paste the verification value in the Value field",
      "Set TTL to 3600 (or default)",
      "Click 'Create Record'",
    ],
  },
  {
    name: "Vercel",
    steps: [
      "Log in to your Vercel dashboard",
      "Go to 'Settings' > 'Domains'",
      "Click on your domain",
      "Scroll to 'DNS Records' section",
      "Click 'Add'",
      "Select 'TXT' as the record type",
      "Enter '_madeby-verify' in the Name field",
      "Paste the verification value in the Value field",
      "Click 'Add'",
    ],
  },
  {
    name: "Netlify",
    steps: [
      "Log in to your Netlify account",
      "Go to 'Domains' in the top navigation",
      "Click on your domain",
      "Click 'Add new record'",
      "Select 'TXT' as the record type",
      "Enter '_madeby-verify' in the Name field",
      "Paste the verification value in the Value field",
      "Leave TTL as default",
      "Click 'Add record'",
    ],
  },
  {
    name: "Hover",
    steps: [
      "Log in to your Hover account",
      "Click on your domain",
      "Go to the 'DNS' tab",
      "Click 'Add A Record'",
      "Select 'TXT' from the Record Type dropdown",
      "Enter '_madeby-verify' in the Hostname field",
      "Paste the verification value in the Target Host field",
      "Click 'Add Record'",
    ],
  },
  {
    name: "Bluehost",
    steps: [
      "Log in to your Bluehost account",
      "Go to 'Domains' > 'My Domains'",
      "Click 'Manage' next to your domain",
      "Click on 'DNS' tab",
      "Scroll to TXT records section and click 'Add Record'",
      "Enter '_madeby-verify' in the Host Record field",
      "Paste the verification value in the TXT Value field",
      "Click 'Save'",
    ],
  },
  {
    name: "Hostinger",
    steps: [
      "Log in to your Hostinger account",
      "Go to 'Domains' section",
      "Click 'Manage' on your domain",
      "Go to 'DNS / Nameservers'",
      "Click 'Add Record' in the DNS Records section",
      "Select 'TXT' as the type",
      "Enter '_madeby-verify' in the Name field",
      "Paste the verification value in the TXT Value field",
      "Click 'Add Record'",
    ],
  },
  {
    name: "Porkbun",
    steps: [
      "Log in to your Porkbun account",
      "Click 'Domain Management'",
      "Click the 'DNS' link next to your domain",
      "In the 'Quick DNS Config' section, select 'TXT'",
      "Enter '_madeby-verify' in the Host field",
      "Paste the verification value in the Answer field",
      "Click 'Add'",
    ],
  },
];

export default function DomainVerificationFAQPage() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-white">
      <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative py-12 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/settings/identity/domains"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Domains
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">How to Add a DNS TXT Record</h1>
            <p className="text-gray-600 mt-2">
              Step-by-step instructions for adding TXT records to verify your domain ownership
            </p>
          </div>

          {/* General Info */}
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-purple-900 mb-3">What you need to add</h2>
            <div className="bg-white rounded-xl p-4 border border-purple-200 font-mono text-sm mb-4">
              <p className="text-gray-500 mb-1">Record Type:</p>
              <p className="text-gray-900 font-semibold mb-3">TXT</p>
              <p className="text-gray-500 mb-1">Host / Name:</p>
              <p className="text-gray-900 font-semibold mb-3">_madeby-verify</p>
              <p className="text-gray-500 mb-1">Value / Content:</p>
              <p className="text-gray-900 font-semibold">madeby-verify=<span className="text-purple-600">[your-unique-token]</span></p>
            </div>
            <p className="text-sm text-purple-700">
              You can find your unique verification token on the domains settings page next to each domain you want to verify.
            </p>
          </div>

          {/* Important Notes */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-amber-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Important Notes
            </h2>
            <ul className="space-y-2 text-sm text-amber-800">
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-1">•</span>
                <span><strong>DNS propagation takes time.</strong> Changes can take anywhere from a few minutes to 48 hours to propagate globally. Most changes are visible within 1-4 hours.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-1">•</span>
                <span><strong>Don&apos;t include your domain</strong> in the host/name field. Just enter <code className="bg-amber-100 px-1 rounded">_madeby-verify</code> — your DNS provider will automatically append your domain.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-1">•</span>
                <span><strong>Some providers require quotes</strong> around the TXT value (especially AWS Route 53). If verification fails, try adding quotes around the value.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-1">•</span>
                <span><strong>Keep the TXT record</strong> after verification. Removing it may cause your domain to become unverified in future checks.</span>
              </li>
            </ul>
          </div>

          {/* Provider Instructions */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Instructions by Provider</h2>

            {dnsProviders.map((provider) => (
              <details
                key={provider.name}
                className="group bg-white rounded-2xl border border-gray-200 overflow-hidden"
              >
                <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors">
                  <span className="text-lg font-semibold text-gray-900">{provider.name}</span>
                  <svg
                    className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-5 border-t border-gray-100">
                  <ol className="mt-4 space-y-3">
                    {provider.steps.map((step, index) => (
                      <li key={index} className="flex gap-3 text-gray-700">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-sm font-medium flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </details>
            ))}
          </div>

          {/* Still Need Help */}
          <div className="mt-8 bg-gray-50 border border-gray-200 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Don&apos;t see your provider?</h2>
            <p className="text-gray-600 text-sm">
              The general process is the same for most DNS providers: find your DNS settings, add a new TXT record with the host <code className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-800">_madeby-verify</code> and paste your verification token as the value. If you&apos;re having trouble, check your provider&apos;s documentation or contact their support.
            </p>
          </div>

          {/* Troubleshooting */}
          <div className="mt-8 bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Troubleshooting</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Verification keeps failing</h3>
                <p className="text-gray-600 text-sm">
                  DNS changes can take up to 48 hours to propagate. Wait a few hours and try again. You can also use a tool like <a href="https://toolbox.googleapps.com/apps/dig/#TXT/" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">Google&apos;s Dig tool</a> to check if your TXT record is visible.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Record exists but not found</h3>
                <p className="text-gray-600 text-sm">
                  Make sure the host/name field contains exactly <code className="bg-gray-100 px-1.5 py-0.5 rounded">_madeby-verify</code> (with the underscore). Some providers may have added your domain automatically, resulting in something like <code className="bg-gray-100 px-1.5 py-0.5 rounded">_madeby-verify.example.com</code> which is correct.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Multiple TXT records</h3>
                <p className="text-gray-600 text-sm">
                  It&apos;s fine to have multiple TXT records for the same domain. Our verification system will look for the specific <code className="bg-gray-100 px-1.5 py-0.5 rounded">_madeby-verify</code> record and won&apos;t be affected by other TXT records.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
