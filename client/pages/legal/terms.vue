<template>
  <div class="terms-conditions">
    <h1>Terms and Conditions</h1>
    <p>Last updated: {{ lastUpdated }}</p>

    <h2>1. Introduction</h2>
    <p>
      Welcome to Bader Idris Portfolio. These Terms and Conditions govern your
      use of our website and services, including the hosting of courses and
      blogs. By accessing or using our services, you agree to be bound by these
      Terms.
    </p>

    <h2>2. Services</h2>
    <p>
      Bader Idris Portfolio provides various services, including but not limited
      to:
    <ul>
      <li>Hosting online courses</li>
      <li>Publishing blogs</li>
      <li>Receiving payments from clients for services rendered</li>
    </ul>
    </p>

    <h2>3. User Responsibilities</h2>
    <p>
      As a user of our services, you agree to:
    <ul>
      <li>Provide accurate and complete information when creating an account.
      </li>
      <li>Use our services only for lawful purposes and in accordance with these
        Terms.</li>
      <li>Not engage in any activity that may harm our services or other users.
      </li>
    </ul>
    </p>

    <h2>4. Payment Terms</h2>
    <p>
      Payments for services are due upon receipt of the invoice. We reserve the
      right to suspend or terminate your access to our services if payments are
      not made in a timely manner.
    </p>

    <h2>5. Intellectual Property</h2>
    <p>
      All content, trademarks, and other intellectual property on our website
      are the property of Bader Idris Portfolio or our licensors. You may not
      use any of our intellectual property without our prior written consent.
    </p>

    <h2>6. Limitation of Liability</h2>
    <p>
      In no event shall Bader Idris Portfolio be liable for any indirect,
      incidental, special, consequential, or punitive damages arising from your
      use of our services.
    </p>

    <h2>7. Changes to Terms</h2>
    <p>
      We reserve the right to modify these Terms at any time. Changes will be
      effective immediately upon posting on our website. Your continued use of
      our services after any changes constitutes your acceptance of the new
      Terms.
    </p>

    <h2>8. Contact Information</h2>
    <p>If you have any questions about these Terms, please contact us:</p>
    <ul>
      <li>Email: <a
          href="mailto:contact@baderidirs.com">contact@baderidirs.com</a></li>
      <li>Phone: 00970595744368</li>
      <li>Contact Page: <a
          href="https://baderidirs.com/contact">baderidirs.com/contact</a></li>
    </ul>
  </div>
</template>

<script>
export default {
  data() {
    return {
      lastUpdated: 'October 2023',
    };
  },
};
</script>

<style scoped>
.terms-conditions {
  max-width: 800px;
  margin: auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

h1,
h2 {
  color: #333;
}

p,
ul {
  color: #555;
}
</style>
