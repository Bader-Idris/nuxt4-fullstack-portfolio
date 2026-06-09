# The Robusten Backup Master Plan 🛡️

Hello! This guide will teach you how to protect your database like a professional. Even if you are not a "computer wizard," you will master this in minutes.

---

## 1. The Golden Rule: "The 3-2-1 Rule" 🏅

Imagine your data is a **precious golden coin**. To keep it safe, you should follow this rule:

*   **3 copies**: Keep your live coin, a local photo of it, and a copy in a safe.
*   **2 different places**: Keep one copy on your laptop and one on a USB stick.
*   **1 copy offsite**: Keep one copy in a different building (The Cloud).

**Our "Robusten" setup does this for you automatically!**

---

## 2. Meet Your Backup Hero: `db-backup` 🦸‍♂️

Inside your project, there is a special worker called the `db-backup` container. 
Its job is to wake up every night, walk over to your databases (**PostgreSQL** and **MongoDB**), and copy everything they know.

### What makes it "Robusten"?
*   **Zstd Compression**: It doesn't just copy; it "shrinks" the data using magic math (Zstd). This makes the files tiny, like vacuum-sealing a big blanket into a small bag.
*   **Health Heartbeat**: Every time it finishes, it "pings" a bell. If the bell doesn't ring, you know something is wrong.
*   **Auto-Cleaning**: It only keeps 7 days of copies. It throws away the old ones so your computer doesn't get full.

---

## 3. How to See Your Backups 🧐

Do you want to see the "vacuum-sealed" bags? Run this command:

```sh
docker exec db-backup ls -lh /backup
```

You will see files ending in `.sql.zst` or `.tar.gz.zst`. These are your precious data coins!

---

## 4. Disaster! How to Restore (The Emergency Button) 🚨

If someone accidentally deletes everything, don't panic! Here is how you bring the data back:

### For PostgreSQL (The Articles DB)
1. Find your latest backup file name (e.g., `articles-20260609.sql.zst`).
2. Run this "unshrinking" command:
```sh
# This takes the sealed bag, unseals it, and pours it back into the DB
docker exec -i db-backup zstd -d /backup/postgres/articles-latest.sql.zst --stdout | docker exec -i psql psql -U postgres -d articles
```

### For MongoDB (The User DB)
```sh
# This tells the backup hero to restore the Mongo data
docker exec -it db-backup /restore.sh /backup/mongo/portfolio-latest.tar.gz.zst
```

---

## 5. Sending Data to the Cloud (Level: Master) ☁️

Local backups are great, but what if the whole server breaks? You need to send the data to **S3 (Cloud Storage)**.

1. Open your `.env.production` file.
2. Add your secret keys:
   ```env
   DEFAULT_S3_BUCKET=my-safe-vault
   DEFAULT_S3_REGION=us-east-1
   DEFAULT_S3_KEY_ID=AKIA...
   DEFAULT_S3_KEY_SECRET=SECRET...
   ```
3. Update `compose.ssl.yaml` to use `S3` as the location.

Now, your data hero will fly to the cloud every night! ✈️

---

## 6. Daily Checklist for Success ✅

*   [ ] **Check the logs**: `docker logs db-backup` (Look for "Backup Success").
*   [ ] **Check the size**: Make sure the files in `/backup` are not 0 bytes.
*   [ ] **Sleep well**: Knowing your data is "Robusten" safe.

---
*Created with ❤️ for your data's safety.*
