export type LoadErrorKind = 'network' | 'generic'

export class AppLoadError extends Error {
  kind: LoadErrorKind
  originalError: unknown
  attempts: number

  constructor(kind: LoadErrorKind, message: string, originalError: unknown, attempts: number) {
    super(message)
    this.name = 'AppLoadError'
    this.kind = kind
    this.originalError = originalError
    this.attempts = attempts
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${label}_timeout`))
      }, timeoutMs)
    }),
  ])
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'unknown_error'
}

export function isConnectivityError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase()

  return (
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('network error') ||
    message.includes('offline') ||
    message.includes('internet') ||
    message.includes('connection') ||
    message.includes('socket') ||
    message.includes('gateway timeout') ||
    message.includes('_timeout')
  )
}

export async function runWithRetry<T>(
  operation: () => Promise<T>,
  options: {
    timeoutMs: number
    timeoutLabel: string
    retries?: number
    retryDelayMs?: number
    contextLabel?: string
  }
): Promise<T> {
  const retries = options.retries ?? 1
  const retryDelayMs = options.retryDelayMs ?? 1200
  const totalAttempts = retries + 1

  let lastError: unknown

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    try {
      return await withTimeout(operation(), options.timeoutMs, options.timeoutLabel)
    } catch (error) {
      lastError = error

      if (attempt < totalAttempts) {
        await sleep(retryDelayMs)
        continue
      }
    }
  }

  const kind: LoadErrorKind = isConnectivityError(lastError) ? 'network' : 'generic'
  const contextLabel = options.contextLabel ?? 'dados'
  const message =
    kind === 'network'
      ? `Instabilidade na internet ao carregar ${contextLabel}.`
      : `Não foi possível carregar ${contextLabel}.`

  throw new AppLoadError(kind, message, lastError, totalAttempts)
}
