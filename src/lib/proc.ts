import { spawn } from "node:child_process";

export interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

/** Async child-process helper with a hard timeout — never blocks the event loop. */
export function run(
  command: string,
  args: string[],
  options: { timeoutMs?: number; cwd?: string; maxBuffer?: number } = {},
): Promise<RunResult> {
  const { timeoutMs = 15000, cwd, maxBuffer = 4 * 1024 * 1024 } = options;
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    let child;
    try {
      child = spawn(command, args, { cwd, windowsHide: true });
    } catch (error) {
      resolve({ code: null, stdout: "", stderr: String(error), timedOut: false });
      return;
    }

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      if (stdout.length < maxBuffer) stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      if (stderr.length < maxBuffer) stderr += chunk.toString();
    });

    const finish = (code: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    };

    child.on("error", (error) => {
      stderr += String(error);
      finish(null);
    });
    child.on("close", (code) => finish(code));
  });
}

export async function binaryExists(command: string): Promise<boolean> {
  try {
    const result = await run(command, ["--version"], { timeoutMs: 2500 });
    return result.code === 0;
  } catch {
    return false;
  }
}
