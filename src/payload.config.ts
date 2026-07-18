import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Agencies } from './collections/Agencies'
import { Categories } from './collections/Categories'
import { Documents } from './collections/Documents'
import { ServiceCenters } from './collections/ServiceCenters'
import { Sources } from './collections/Sources'
import { Transactions } from './collections/Transactions'
import { Users } from './collections/Users'
import { SiteSettings } from './globals/SiteSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  // No Media/upload collection — Vercel filesystem is ephemeral; identity uploads are out of scope.
  collections: [
    Users,
    Categories,
    Agencies,
    ServiceCenters,
    Documents,
    Sources,
    Transactions,
  ],
  globals: [SiteSettings],
  localization: {
    locales: [
      { code: 'ar', label: 'العربية' },
      { code: 'en', label: 'English' },
    ],
    defaultLocale: 'ar',
    fallback: true,
  },
  editor: lexicalEditor(),
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
      max: 3,
    },
    // Prefer controlled migrations. Local disposable push only when explicitly enabled.
    push: process.env.PAYLOAD_DATABASE_PUSH === '1',
    migrationDir: path.resolve(dirname, '../migrations'),
  }),
  sharp,
  plugins: [],
})
