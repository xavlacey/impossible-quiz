# Deployment Guide - Vercel

This guide will help you deploy the Impossible Quiz app to Vercel.

---

## 🚀 Quick Deployment

**Use this section if you've deployed this app before and just need a quick checklist.**

### Pre-Deployment Checklist

- [ ] Migrations are committed to git
- [ ] Code is pushed to GitHub
- [ ] Database connection string ready
- [ ] Pusher credentials ready

### Deployment Steps

1. **Import Project**: [vercel.com/new](https://vercel.com/new) → Import Git repository

2. **Set Environment Variables** (Settings → Environment Variables):

   ```
   DB_DATABASE_URL=postgresql://...
   PUSHER_APP_ID=...
   PUSHER_SECRET=...
   NEXT_PUBLIC_PUSHER_KEY=...
   NEXT_PUBLIC_PUSHER_CLUSTER=...
   ```

3. **Deploy**: Click Deploy → Wait for build (~2-3 minutes)

4. **Run Migrations**:

   ```bash
   DB_DATABASE_URL="your_production_url" npx prisma migrate deploy
   ```

5. **Test**: Visit Vercel URL → Create quiz party → Test real-time updates

### Quick Notes

- **Migrations**: Must be committed to git
- **Environment Variables**: Redeploy after adding new ones
- **Pusher**: Free tier supports up to 100 concurrent connections
- **Database**: Use pooled connections for serverless

### Quick Troubleshooting

- **Build fails?** → Check `prisma` in `devDependencies`, verify `postinstall` script
- **Database fails?** → Use pooled connection string, add `?sslmode=require`
- **Pusher fails?** → Verify all env vars set (including `NEXT_PUBLIC_*`), redeploy
