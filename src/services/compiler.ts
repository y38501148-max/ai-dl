export interface CompileResult {
  success: boolean
  stage: 'compile' | 'run' | 'timeout' | 'web'
  stdout: string
  stderr: string
  exitCode?: number | null
}

async function invokeTauri<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const invoke = window.__TAURI__?.core?.invoke ?? window.__TAURI_INTERNALS__?.invoke
  if (typeof invoke !== 'function') throw new Error('Tauri runtime is unavailable')
  return invoke(command, args) as Promise<T>
}

async function runInBrowser(source: string, stdin: string): Promise<CompileResult> {
  const response = await fetch('https://wandbox.org/api/compile.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      compiler: 'gcc-head-c',
      code: source,
      stdin,
      options: 'warning,gnu11',
    }),
  })
  if (!response.ok) throw new Error('网页端编译服务暂时不可用')
  const result = (await response.json()) as {
    status?: string
    program_output?: string
    compiler_output?: string
    compiler_error?: string
    program_error?: string
    signal?: string
  }
  const stderr = [result.compiler_error, result.compiler_output, result.program_error, result.signal]
    .filter(Boolean)
    .join('\n')
  return {
    success: result.status === '0',
    stage: 'web',
    stdout: result.program_output ?? '',
    stderr,
    exitCode: result.status ? Number(result.status) : null,
  }
}

export async function runCCode(source: string, stdin = ''): Promise<CompileResult> {
  if (window.__TAURI__ || window.__TAURI_INTERNALS__) {
    return invokeTauri<CompileResult>('run_c_code', { source, stdin })
  }
  return runInBrowser(source, stdin)
}
