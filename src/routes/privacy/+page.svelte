<script>
  const lastUpdated = 'March 25, 2026';
</script>

<svelte:head>
  <title>Privacy Policy | REID</title>
  <meta name="description" content="REID SMS Vehicle Service Records - Privacy Policy" />
</svelte:head>

<div class="privacy-wrapper">
  <div class="privacy-container">
    <h1>Privacy Policy</h1>
    <p class="subtitle">REID — Vehicle Service Record System</p>
    <p class="updated">Last updated: {lastUpdated}</p>

    <section>
      <h2>What is REID?</h2>
      <p>
        REID is an SMS and MMS-based vehicle service record tool operated by REID ("we," "us," or "our"). 
        Mechanics text a VIN (Vehicle Identification Number) to look up service history, log repairs, and 
        check recalls. Users can also send photos of VIN plates for automatic lookup.
      </p>
    </section>

    <section>
      <h2>Information We Collect</h2>
      <p>
        When you text our number, we collect your phone number, the content of your messages (including 
        VINs, service records, mileage data, and any photos you send), and timestamps of your messages. 
        We also store vehicle service records you submit, including work performed, mileage, and parts used.
      </p>
    </section>

    <section>
      <h2>How We Use Your Information</h2>
      <p>
        We use your information solely to provide the REID service. This includes looking up vehicle 
        service history, storing service records you submit, decoding VINs, checking for manufacturer 
        recalls, verifying mechanic accounts, and responding to your requests.
      </p>
    </section>

    <section>
      <h2>Information Sharing</h2>
      <p>
        We do not sell, rent, or share your personal information with third parties for marketing purposes. 
        Vehicle service records may be visible to other verified mechanics who look up the same VIN, as 
        the purpose of REID is to maintain a shared vehicle service history. Your phone number is never 
        shared with other users.
      </p>
    </section>

    <section>
      <h2>Data Security</h2>
      <p>
        We take reasonable measures to protect your information from unauthorized access, alteration, 
        or destruction. Data is stored securely using industry-standard encryption and hosted on 
        secure cloud infrastructure.
      </p>
    </section>

    <section>
      <h2>Data Retention</h2>
      <p>
        We retain your information for as long as your account is active or as needed to provide 
        the REID service. Vehicle service records are retained indefinitely to maintain a complete 
        service history for each vehicle. You may request deletion of your personal data by contacting 
        us at the email below.
      </p>
    </section>

    <section>
      <h2>Your Choices</h2>
      <p>
        You can opt out of all messages at any time by texting STOP to our number. You may also 
        text HELP for assistance. All messaging is user-initiated — we will never send you unsolicited 
        messages. Message and data rates may apply.
      </p>
    </section>

    <section>
      <h2>Children's Privacy</h2>
      <p>
        REID is intended for use by automotive professionals and is not directed at individuals 
        under the age of 13. We do not knowingly collect personal information from children.
      </p>
    </section>

    <section>
      <h2>Changes to This Policy</h2>
      <p>
        We may update this privacy policy from time to time. Any changes will be reflected on this 
        page with an updated date.
      </p>
    </section>

    <section>
      <h2>Contact Us</h2>
      <p>
        If you have questions about this privacy policy or your data, contact us at:
      </p>
      <p class="contact-info">
        Email: presalestickets@gmail.com<br />
        REID 
      </p>
    </section>
  </div>
</div>

<style>
  .privacy-wrapper {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    padding: 3rem 1.5rem;
  }

  .privacy-container {
    max-width: 720px;
    width: 100%;
  }

  h1 {
    font-size: 2.25rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
  }

  .subtitle {
    font-size: 1rem;
    opacity: 0.7;
    margin-bottom: 0.25rem;
  }

  .updated {
    font-size: 0.875rem;
    opacity: 0.5;
    margin-bottom: 2.5rem;
  }

  section {
    margin-bottom: 2rem;
  }

  h2 {
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }

  p {
    line-height: 1.75;
    opacity: 0.85;
  }

  .contact-info {
    margin-top: 0.5rem;
    opacity: 1;
    font-weight: 500;
  }
</style>