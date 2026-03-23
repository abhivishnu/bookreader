import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

async function hmac(key: ArrayBuffer, msg: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg))
}

async function getSigningKey(secret: string, date: string, region: string, service: string): Promise<ArrayBuffer> {
  const enc = new TextEncoder()
  let key = await hmac(enc.encode('AWS4' + secret), date)
  key = await hmac(key, region)
  key = await hmac(key, service)
  key = await hmac(key, 'aws4_request')
  return key
}

async function sha256hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function buf2hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function createPresignedUrl(opts: {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  key: string
  contentType: string
  expiresIn: number
}): Promise<string> {
  const { accountId, accessKeyId, secretAccessKey, bucket, key, contentType, expiresIn } = opts
  const region = 'auto'
  const service = 's3'
  const host = `${accountId}.r2.cloudflarestorage.com`
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const datetime = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  const scope = `${date}/${region}/${service}/aws4_request`

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${scope}`,
    'X-Amz-Date': datetime,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
  })
  const sortedQuery = queryParams.toString().split('&').sort().join('&')

  const canonicalRequest = [
    'PUT',
    `/${bucket}/${key}`,
    sortedQuery,
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD'
  ].join('\n')

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    datetime,
    scope,
    await sha256hex(canonicalRequest)
  ].join('\n')

  const signingKey = await getSigningKey(secretAccessKey, date, region, service)
  const signature = buf2hex(await hmac(signingKey, stringToSign))

  return `https://${host}/${bucket}/${key}?${sortedQuery}&X-Amz-Signature=${signature}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { key, contentType } = await req.json()
    console.log('Generating presigned URL for key:', key)

    const presignedUrl = await createPresignedUrl({
      accountId: Deno.env.get('R2_ACCOUNT_ID')!,
      accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID')!,
      secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!,
      bucket: Deno.env.get('R2_BUCKET_NAME')!,
      key,
      contentType,
      expiresIn: 300
    })

    console.log('Success')
    return new Response(
      JSON.stringify({ presignedUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Error:', err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
