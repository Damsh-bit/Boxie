import { NextResponse } from 'next/server'
import { getUsdExchangeRate } from '@/server/currency'

export async function GET() {
  const rateData = await getUsdExchangeRate()
  return NextResponse.json(rateData, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
