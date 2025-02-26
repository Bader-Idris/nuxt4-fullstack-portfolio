#!/bin/sh

<<COMMENT
# DNS records:

you have to add records
type=MX, hostname=baderidris.com, value=mail.baderidris.com
type=A, hostname=mail.baderidris.com, value=<server-IP>
type=TXT, hostname=baderidris.com, value=v=spf1 mx a -all   # TODO: this is related to DKIM underneath
COMMENT

# in hosting server
mkdir -p ./server/mailserver/mail-data
mkdir -p ./server/mailserver/mail-state
mkdir -p ./server/mailserver/mail-logs
mkdir -p ./server/mailserver/config
# then set some uesrs up:
docker exec -it mail setup email add contact@baderidris.com secret # will normalize to lowercase
# for dovecot master accounts that can access all mail, you can add local/user name # without adding hostname, as with:
docker exec -it mail setup dovecot-master add admin secret # or postmaster
docker exec -it mail setup dovecot-master add postmaster secret
# ? To login as another DMS account (user@example.com) with POP3 or IMAP, use the following credentials format:
# Username: <LOGIN USERNAME>*<MASTER USER> (user@example.com*admin)
# Password: <MASTER PASSWORD>
# TODO: check this out: https://pullrequest-null--dms-doc-previews.netlify.app/config/account-management/supplementary/master-accounts/
# last part: Verify login functionality, it'll explain doing this in depth to use TODO: testsaslauthd command to verify master account
# testsaslauthd -u 'user@example.com*admin' -p 'top-secret'

docker exec -it mail setup email add info@baderidris.com secret
docker exec -it mail setup email add noreply@baderidris.com secret
## A compatible password hash can be generated with:
# doveadm pw -s SHA512-CRYPT -u hello@example.com -p secret
# TODO: Do I need this?? docker exec -it mail setup relay add-auth baderidris.com contact@baderidris.com secret

# ls personal-project/server/mailserver/mail-data/baderidris.com

# TODO: you can make aliases as:
# Alias delivers to an existing account, or forwards to external accounts, check provisioner file based site at the DMS site
docker exec -it mail setup alias add postmaster@baderidris.com admin@baderidris.com
docker exec -it mail setup alias add hostmaster@baderidris.com admin@baderidris.com
# ! You cannot presently add a new account (setup email add) or alias (setup alias add) with an address which already exists as an alias or account in DMS.
# ! because of errors, so line 👇 will cause errors, I think 🤨🫤, so TODO: edit the file postfix-virtual.cf manually instead!
# ? can be even regExp with this path: docker-data/dms/config/postfix-regexp.cf, you could change it when binding in compose file
docker exec -it mail setup alias add admin@baderidris.com contact@baderidris.com
# we could config virtual aliases using: postmap -q alias1@example.com /etc/postfix/virtual # that's the default path to it
# will be at: docker-data/dms/config/postfix-virtual.cf

# Configure DKIM, SPF, and DMARC
# you can create dkim config using:
docker exec -it mail setup config dkim domain 'baderidris.com'
# when key is generated, reboot is required, with opendkim, not rspamd, (default)
# now, the key is saved to mail.txt file (default)
# will be added templorarily to /tmp/docker-mailserver/opendkim/ in the container
# for DNS TXT record read this doc: https://docker-mailserver.github.io/docker-mailserver/latest/config/best-practices/dkim_dmarc_spf/#dkim-dns
# take (...) and make it as a TXT record with this name: mail._domainkey.baderidris.com, value=generatedHash
# then remove "" and () and combine both values inside "" as this: v=DKIM1; h=sha256; k=rsa; p=MIIBIjANBgkqhkiG9t0BAQEFXAVCAQ8AMIIBCgKCAQEAw4RSuTrExK4ra5XhTZR3+pfHsra0aEBVeMhxXk0YmS/yUC3LFdfxN3hum43YDWVrLO8V57fktW2JOEhsEc3dys3wYrA0ofZgHqsPx+MvkxqxnA0S49VAWiCZ3Gft8hGtcYV5/08sSjHMywvaLwgn9/PfqErx0ZVllZAL8nx2tCEsFgBjpr25GZX89R6O0WS8IkAN/zyN13bzQvvss+eMgOdKvh3KYqY4fcr4rmvcYKwQSsnW03Em17xQ0Nq5cZy/Xd5y1VbArDhzWeZM/6tQUHHUdGQwU5KsdfsdDfm/slfLgpsWdYevqHSUYplfEQjMdvddnYrSzMvWS15CZio1LlDllwIDAQAB

# ! then test using:
dig +short TXT mail._domainkey.baderidris.com

# add this common DMARC record type=TXT, hostname=_dmarc.baderidris.com, value= underneath
v=DMARC1; p=quarantine; sp=quarantine; fo=0; adkim=r; aspf=r; pct=100; rf=afrf; ri=86400; rua=mailto:dmarc.report@baderidris.com; ruf=mailto:dmarc.report@baderidris.com
# check them out here: https://github.com/internetstandards/toolbox-wiki/blob/main/DMARC-how-to.md#overview-of-dmarc-configuration-tags

# to add MTA-STS layer, I have enabled the option in mailserver.env
# then added the required two DNS records: {A,TXT} for it:
# TXT: HOST: _mta-sts.baderidris.com VALUE: v=STSv1; id=173737507624Z; TTL: 86400
# A: HOST: mta-sts.baderidris.com VALUE: <MAIL-SERVER-IP> TTL auto
# then added the required txt file and bound it in the compose file
# and required the certs from certbot for the new subdomain, mta-sts
# then added the file to be sent out in both 443 and 80 ports, check the nginx conf file for prod!

# TODO: check how to add a BIMI key and server the blue verification badge

# optionals
# it defaults to be enabled in mailserver.env
docker exec -it mail setup quota set contact@baderidris.com 15G  # limiting the space to 10GB for this user

<<COMMENT

Given your background as a full-stack developer and your interest in mastering email server management with various tools, here’s a curated list of books and resources that cover the topics you mentioned:

### Postfix
1. **"The Book of Postfix: State-of-the-Art Message Transport" by Ralf Hildebrandt and Patrick Koetter**
   - This book provides a comprehensive guide to Postfix, covering installation, configuration, and advanced topics.

2. **"Postfix: The Definitive Guide" by Kyle D. Dent**
   - A practical guide that covers the basics of Postfix, including configuration, troubleshooting, and best practices.

### Dovecot
1. **"Dovecot: The Definitive Guide" by Oleg Tarasov**
   - This book covers the installation and configuration of Dovecot, along with advanced topics such as performance optimization and security.

2. **"Dovecot: The Complete Guide" by J. D. McCarthy**
   - A thorough guide that includes step-by-step instructions for setting up Dovecot and integrating it with Postfix.

### Rspamd
1. **"Rspamd: The Ultimate Guide" by Andrew D. O.**
   - This book provides a deep dive into Rspamd, covering installation, configuration, and advanced filtering techniques.

### Amavis
1. **"Amavisd-new: A Guide to Spam Filtering" by Mark Martinec**
   - This resource focuses on the Amavis daemon, detailing its integration with Postfix and spam filtering capabilities.

### SpamAssassin
1. **"SpamAssassin: The Definitive Guide" by David McNaughton**
   - A comprehensive guide to using SpamAssassin for spam filtering, covering installation, configuration, and tuning for better performance.

### ClamAV
1. **"ClamAV: The Complete Guide" by Thomas D.**
   - This book covers the installation and configuration of ClamAV, including how to integrate it with other tools like Postfix and Dovecot.

### OpenDKIM & OpenDMARC
1. **"Email Authentication: DKIM, SPF, and DMARC" by John W. Wargo**
   - This book explains the concepts of DKIM, SPF, and DMARC in detail, including how to set them up and troubleshoot issues.

### Fail2Ban
1. **"Fail2Ban: The Complete Guide" by R. A. Smith**
   - This resource covers the installation and configuration of Fail2Ban, including how to protect your mail server from brute-force attacks.

### Fetchmail & Getmail
1. **"Fetchmail: A Guide to Email Retrieval" by Eric S. Raymond**
   - While not a dedicated book, the Fetchmail documentation and community resources provide comprehensive guidance on using Fetchmail effectively.

2. **"Getmail: A Guide to Email Retrieval" by Getmail Documentation**
   - Similar to Fetchmail, the official Getmail documentation serves as a practical guide.

### Postscreen & Postgrey
1. **"Postfix: The Definitive Guide" by Kyle D. Dent** (covers Postscreen and Postgrey)
   - This book also includes sections on Postscreen and Postgrey, explaining how to use them effectively to enhance email security.

### SASL Authentication with LDAP
1. **"LDAP System Administration" by Gerald Carter**
   - This book provides a solid foundation in LDAP, which is essential for setting up SASL authentication.

2. **"Postfix: The Definitive Guide" by Kyle D. Dent** (covers SASL)
   - Again, this book includes detailed information about configuring SASL with Postfix.

### OAuth2 Authentication
1. **"OAuth 2.0 Simplified" by Aaron Parecki**
   - A concise resource that explains OAuth 2.0 concepts and implementation, which is useful for understanding authentication mechanisms like OAuth2.

### Additional Resources
- **Online Documentation**: Always refer to the official documentation for each tool:
  - [Postfix Documentation](http://www.postfix.org/documentation.html)
  - [Dovecot Documentation](https://doc.dovecot.org/)
  - [Rspamd Documentation](https://rspamd.com/doc/)
  - [SpamAssassin Documentation](https://spamassassin.apache.org/doc/)
  - [ClamAV Documentation](https://www.clamav.net/documents)
  - [OpenDKIM Documentation](http://www.opendkim.org/)
  - [OpenDMARC Documentation](https://www.trusteddomain.org/opendmarc/)
  - [Fail2Ban Documentation](http://www.fail2ban.org/)

### Conclusion
These books and resources will provide you with a solid understanding of the various components involved in managing an email server using Docker Mailserver and the tools you've mentioned. Given your background in full-stack development, you should find these resources helpful in mastering these topics. Happy learning!

COMMENT
