import { config as loadEnv } from 'dotenv'
import path from 'path'

loadEnv({ path: path.resolve(process.cwd(), '.env.local') })
loadEnv({ path: path.resolve(process.cwd(), '.env') })
