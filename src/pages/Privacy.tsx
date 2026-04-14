export default function Privacy() {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px", fontFamily: "sans-serif", color: "#111" }}>
      <h1>Privacy Policy</h1>
      <p><strong>Last updated:</strong> April 13, 2026</p>

      <h2>1. Overview</h2>
      <p>
        One Eleven ("we", "us", or "our") operates a SaaS platform that automates business operations via WhatsApp.
        This Privacy Policy explains how we collect, use, and protect information when you connect your TikTok account
        to our platform for the purpose of automated content posting.
      </p>

      <h2>2. Data We Collect</h2>
      <ul>
        <li>TikTok account identifiers and access tokens required for API authorization.</li>
        <li>Content (videos, captions, hashtags) submitted by you for automated posting.</li>
        <li>Basic profile information provided by TikTok after OAuth authorization.</li>
      </ul>

      <h2>3. How We Use Your Data</h2>
      <p>
        All data collected through TikTok integration is used <strong>exclusively</strong> to perform automated
        content posting on your behalf. We do not sell, share, or transfer your data to third parties.
      </p>

      <h2>4. Data Retention</h2>
      <p>
        Access tokens are stored only as long as necessary to fulfill posting automation tasks. You may revoke
        access at any time through your TikTok account settings or by contacting us.
      </p>

      <h2>5. Security</h2>
      <p>
        We implement industry-standard security measures to protect your data. All API communications are
        encrypted via HTTPS/TLS.
      </p>

      <h2>6. Contact</h2>
      <p>
        Questions? Contact us at <a href="mailto:contato@oneelevensaas.com">contato@oneelevensaas.com</a>.
      </p>
    </div>
  );
}
