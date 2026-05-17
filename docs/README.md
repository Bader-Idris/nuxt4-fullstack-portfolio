# Mail Server Documentation

This document provides detailed information on the configuration, management, and security of the project's mail server, which is built using [Docker Mailserver](https://docker-mailserver.github.io/docker-mailserver/latest/).

The mail server is currently running at `mail.baderidris.com`.

## DNS Configuration

To ensure proper mail delivery and security, the following DNS records are required:

| Type    | Hostname                         | Value                                                                                                           |
| :------ | :------------------------------- | :-------------------------------------------------------------------------------------------------------------- |
| **MX**  | `baderidris.com`                 | `mail.baderidris.com`                                                                                           |
| **A**   | `mail.baderidris.com`            | `<your-server-IP>`                                                                                              |
| **TXT** | `baderidris.com`                 | `v=spf1 mx a -all`                                                                                              |
| **TXT** | `mail._domainkey.baderidris.com` | `v=DKIM1; h=sha256; k=rsa; p=<generated-hash>`                                                                  |
| **TXT** | `_dmarc.baderidris.com`          | `v=DMARC1; p=quarantine; sp=quarantine; fo=0; adkim=r; aspf=r; pct=100; rua=mailto:dmarc.report@baderidris.com` |
| **TXT** | `_mta-sts.baderidris.com`        | `v=STSv1; id=<timestamp>;`                                                                                      |
| **A**   | `mta-sts.baderidris.com`         | `<your-server-IP>`                                                                                              |

## User Management

You can manage email accounts and master accounts using the `setup` script within the container.

### Adding Email Accounts

```bash
docker exec -it mail setup email add contact@baderidris.com <password>
docker exec -it mail setup email add info@baderidris.com <password>
docker exec -it mail setup email add noreply@baderidris.com <password>
```

### Dovecot Master Accounts

Master accounts can access all mailboxes.

```bash
docker exec -it mail setup dovecot-master add admin <password>
```

**Login Format:** `user@example.com*admin`

### Aliases

```bash
docker exec -it mail setup alias add postmaster@baderidris.com admin@baderidris.com
docker exec -it mail setup alias add hostmaster@baderidris.com admin@baderidris.com
```

## Security & Best Practices

### DKIM (DomainKeys Identified Mail)

Generate DKIM keys for your domain:

```bash
docker exec -it mail setup config dkim domain 'baderidris.com'
```

Reboot the container after generation. The public key will be saved to the `config/opendkim/keys/` directory.

### MTA-STS (Mail Transfer Agent Strict Transport Security)

MTA-STS is enabled to enforce TLS encryption for incoming emails.

1. Add DNS records as shown in the table above.
2. Serve the `mta-sts.txt` file via HTTPS on `mta-sts.baderidris.com`.

### Fail2Ban

The mail server is protected by Fail2Ban to prevent brute-force attacks. Configuration files are located at `server/config/fail2ban/`.

### Quotas

Set storage limits for users:

```bash
docker exec -it mail setup quota set contact@baderidris.com 15G
```

## Maintenance

The mail server stores data in the following directories (relative to the project root):

- `./server/mailserver/mail-data`: Email storage
- `./server/mailserver/mail-state`: Internal state (PostgreSQL/Redis if used)
- `./server/mailserver/mail-logs`: Logs
- `./server/mailserver/config`: Configuration files

## Recommended Resources

For advanced management, consider these resources:

- **Postfix:** _The Book of Postfix_ by Ralf Hildebrandt
- **Dovecot:** _Dovecot: The Definitive Guide_ by Oleg Tarasov
- **Security:** _Email Authentication: DKIM, SPF, and DMARC_ by John W. Wargo
- **Official Docs:** [Docker Mailserver Documentation](https://docker-mailserver.github.io/docker-mailserver/latest/)

---

_Note: For a quick reference of commands, see the [whatToDoOnMailserver.sh](../server/config/mailserver/whatToDoOnMailserver.sh) script._