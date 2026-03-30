import { NextResponse } from 'next/server'
import dns from 'node:dns/promises'
import net from 'node:net'

const PYTHON_API_URL =
  process.env.PYTHON_API_INTERNAL_URL ||
  process.env.PYTHON_API_URL ||
  'http://localhost:5000'

function checkTcpConnection(host: string, port: number, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()

    const onError = (err: Error) => {
      socket.destroy()
      reject(err)
    }

    socket.setTimeout(timeoutMs)
    socket.once('error', onError)
    socket.once('timeout', () => onError(new Error(`TCP timeout after ${timeoutMs}ms`)))
    socket.connect(port, host, () => {
      socket.end()
      resolve()
    })
  })
}

export async function GET() {
  const startedAt = Date.now()

  try {
    const url = new URL(PYTHON_API_URL)
    const host = url.hostname
    const port = Number(url.port || (url.protocol === 'https:' ? 443 : 80))

    const dnsStart = Date.now()
    let dnsResult: { addresses: string[]; duration_ms: number } | { error: string; duration_ms: number }
    try {
      const addresses = await dns.lookup(host, { all: true })
      dnsResult = {
        addresses: addresses.map((item) => item.address),
        duration_ms: Date.now() - dnsStart
      }
    } catch (error) {
      dnsResult = {
        error: error instanceof Error ? error.message : 'DNS lookup failed',
        duration_ms: Date.now() - dnsStart
      }
    }

    const tcpStart = Date.now()
    let tcpResult: { ok: boolean; duration_ms: number; error?: string } = { ok: true, duration_ms: 0 }
    try {
      await checkTcpConnection(host, port)
      tcpResult = { ok: true, duration_ms: Date.now() - tcpStart }
    } catch (error) {
      tcpResult = {
        ok: false,
        duration_ms: Date.now() - tcpStart,
        error: error instanceof Error ? error.message : 'TCP check failed'
      }
    }

    const fetchStart = Date.now()
    let fetchResult: { ok: boolean; status?: number; duration_ms: number; error?: string } = { ok: true, duration_ms: 0 }
    try {
      const response = await fetch(PYTHON_API_URL, {
        method: 'GET',
        signal: AbortSignal.timeout(8000)
      })

      fetchResult = {
        ok: response.ok,
        status: response.status,
        duration_ms: Date.now() - fetchStart
      }
    } catch (error) {
      fetchResult = {
        ok: false,
        duration_ms: Date.now() - fetchStart,
        error: error instanceof Error ? error.message : 'Fetch failed'
      }
    }

    return NextResponse.json({
      success: true,
      target_url: PYTHON_API_URL,
      parsed_target: { host, port, protocol: url.protocol },
      checks: {
        dns: dnsResult,
        tcp: tcpResult,
        fetch: fetchResult
      },
      total_duration_ms: Date.now() - startedAt
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        target_url: PYTHON_API_URL,
        error: error instanceof Error ? error.message : 'Invalid PYTHON_API_URL'
      },
      { status: 500 }
    )
  }
}
