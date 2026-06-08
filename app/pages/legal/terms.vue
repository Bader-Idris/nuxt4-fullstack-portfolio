<template>
  <div class="terms-conditions">
    <h1>Terms and Conditions</h1>
    <p class="last-updated">Last updated: May 10, 2026</p>

    <section>
      <h2>1. Introduction</h2>
      <p>
        Welcome to Bader Idris Portfolio ("we," "us," or "our"). These Terms and
        Conditions ("Terms") govern your use of our website, services, and
        goods, including but not limited to full-stack development services,
        digital products, online courses, and blogs. By accessing or using our
        services or purchasing our goods, you agree to be bound by these Terms.
        If you do not agree, please do not use our services or purchase our
        goods.
      </p>
    </section>

    <section>
      <h2>2. Services and Goods</h2>
      <p>
        We provide a range of services and goods as a full-stack developer,
        including but not limited to:
      </p>
      <ul>
        <li>Custom web and mobile application development</li>
        <li>Software solutions and API integrations</li>
        <li>Hosting and managing online courses</li>
        <li>Publishing blogs and technical content</li>
        <li>
          Digital goods such as website templates, plugins, and downloadable
          software
        </li>
        <li>Consulting and technical support services</li>
      </ul>
      <p>
        All services and goods are subject to availability and may be modified
        or discontinued at our discretion.
      </p>
    </section>

    <section>
      <h2>3. User Responsibilities</h2>
      <p>By using our services or purchasing our goods, you agree to:</p>
      <ul>
        <li>
          Provide accurate, complete, and up-to-date information when creating
          an account or placing an order.
        </li>
        <li>
          Use our services and goods only for lawful purposes and in compliance
          with these Terms.
        </li>
        <li>
          Not engage in any activity that may disrupt, harm, or interfere with
          our services, goods, or other users.
        </li>
        <li>
          Comply with all applicable laws, including data protection and
          intellectual property laws.
        </li>
      </ul>
    </section>

    <section>
      <h2>4. Payment Terms</h2>
      <p>
        Payments for services or goods are due as agreed upon in the invoice,
        contract, or order confirmation. We accept payments through secure
        third-party payment processors, including but not limited to PayPal,
        Stripe, and other monetization platforms ("Payment Processors"). By
        making a payment, you authorize us to charge the agreed amount via your
        chosen Payment Processor.
      </p>
      <ul>
        <li>
          All payments are non-refundable unless otherwise stated in a specific
          agreement or required by law.
        </li>
        <li>
          We reserve the right to suspend or terminate access to services or
          delivery of goods if payments are not received promptly.
        </li>
        <li>
          You are responsible for any taxes, fees, or charges imposed by Payment
          Processors or applicable laws.
        </li>
      </ul>
      <p>
        For custom development services, payment schedules (e.g., milestones or
        retainers) will be outlined in a separate agreement. Goods are delivered
        digitally upon successful payment unless otherwise specified.
      </p>
    </section>

    <section>
      <h2>5. Intellectual Property</h2>
      <p>
        All content, code, designs, trademarks, and other intellectual property
        provided through our website, services, or goods are owned by Bader
        Idris Portfolio or our licensors. You may not reproduce, distribute,
        modify, or create derivative works from our intellectual property
        without prior written consent, except as permitted under a specific
        license (e.g., open-source licenses for certain goods).
      </p>
      <p>
        For custom development services, ownership of deliverables will be
        specified in the project agreement. Unless otherwise agreed, we retain
        ownership of all source code and materials until full payment is
        received.
      </p>
    </section>

    <section>
      <h2>6. Delivery of Goods and Services</h2>
      <p>
        Digital goods (e.g., templates, plugins) are delivered electronically
        upon payment confirmation. Custom services are delivered according to
        the timeline and specifications in the project agreement. Delays caused
        by client feedback, third-party dependencies, or unforeseen
        circumstances are not our responsibility, though we will make reasonable
        efforts to meet agreed deadlines.
      </p>
    </section>

    <section>
      <h2>7. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, Bader Idris Portfolio shall not
        be liable for any indirect, incidental, special, consequential, or
        punitive damages arising from your use of our services or goods,
        including but not limited to loss of profits, data, or business
        opportunities. Our total liability shall not exceed the amount paid by
        you for the specific service or good giving rise to the claim.
      </p>
    </section>

    <section>
      <h2>8. Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless Bader Idris Portfolio, its
        affiliates, and employees from any claims, damages, or expenses
        (including reasonable attorney fees) arising from your misuse of our
        services or goods, violation of these Terms, or infringement of
        third-party rights.
      </p>
    </section>

    <section>
      <h2>9. Dispute Resolution</h2>
      <p>
        Any disputes arising from these Terms or your use of our services or
        goods shall be resolved through good-faith negotiation. If unresolved,
        disputes shall be governed by the laws of Delaware, USA, and you agree
        to submit to the exclusive jurisdiction of the courts in Delaware, USA.
      </p>
    </section>

    <section>
      <h2>10. Changes to Terms</h2>
      <p>
        We may update these Terms at any time. Changes will be effective
        immediately upon posting on our website. Your continued use of our
        services or goods after changes constitutes acceptance of the updated
        Terms.
      </p>
    </section>

    <section>
      <h2>11. Contact Information</h2>
      <p>For questions about these Terms, please contact us:</p>
      <ul>
        <li>
          Email:
          <a href="mailto:contact@baderidris.com">contact@baderidris.com</a>
        </li>
        <li>Phone: +970595744368</li>
        <li>
          Contact Page:
          <a href="https://baderidris.com/contact">baderidris.com/contact</a>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup>
useSeoMeta({
  title: "Terms and Conditions - Bader Idris Portfolio",
  description:
    "Read the Terms and Conditions for using Bader Idris Portfolio services and goods, including full-stack development, digital products, and online courses.",
});

if (import.meta.server) {
  useSchemaOrg([
    defineWebPage({
      name: "Terms and Conditions - Bader Idris Portfolio",
      description: "Read the Terms and Conditions for using Bader Idris Portfolio services and goods.",
    })
  ]);
}
</script>

<style lang="scss" scoped>
.terms-conditions {
  background-color: white;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: "Arial", sans-serif;
  color: #333;

  h1 {
    font-size: 2.5rem;
    font-weight: bold;
    color: #222;
    margin-bottom: 1rem;
  }

  .last-updated {
    color: #666;
    font-size: 1rem;
    margin-bottom: 2rem;
  }

  section {
    margin-bottom: 2rem;

    h2 {
      font-size: 1.75rem;
      font-weight: 600;
      color: #222;
      margin-bottom: 1rem;
    }

    p {
      font-size: 1rem;
      line-height: 1.6;
      color: #444;
      margin-bottom: 1rem;
    }

    ul {
      list-style-type: disc;
      padding-left: 1.5rem;
      margin-bottom: 1rem;

      li {
        font-size: 1rem;
        line-height: 1.6;
        color: #444;
        margin-bottom: 0.5rem;
      }
    }

    a {
      color: #007bff;
      text-decoration: none;
      transition: color 0.2s;

      &:hover {
        color: #0056b3;
        text-decoration: underline;
      }
    }
  }
}
</style>