import * as packwiz from './packwiz.ts'
import { config } from 'dotenv'
await import('./logLevel.ts')

//logLevel="log"

config({quiet:true})
const cfKey = process.env['CF_API_KEY']
if (!cfKey) {
    throw new Error('missing cf api key')
}
await packwiz.cfDetect('pack.toml', cfKey)
await packwiz.cfUrl('pack.toml',cfKey)
await packwiz.mrDetect('pack.toml')