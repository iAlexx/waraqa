import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  // Phase 1: minimal auth collection only. Domain collections begin in Phase 3.
  // No Media/upload collection — Vercel filesystem is ephemeral; identity uploads are out of scope.
  collections: [Users],
  editor: lexicalEditor(),
  // GraphQL is optional in Payload. Waraqa Phase 1 uses REST/Local API only.
  // Scaffold route files were removed; disable to avoid exposing a GraphQL surface.
  graphQL: {
    disable: true,
  },
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
      // Documented node-postgres Pool option. Keep small for serverless-friendly defaults.
      max: 3,
    },
    // Local disposable development may use Drizzle push.
    // Preview/production schema changes use controlled migrations later — never migrate on boot.
    push: process.env.NODE_ENV !== 'production',
  }),
  sharp,
  plugins: [],
})
