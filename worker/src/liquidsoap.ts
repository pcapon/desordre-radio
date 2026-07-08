import net from 'node:net'
import { config } from './config.js'

/**
 * Send a single command to the Liquidsoap telnet server and return its
 * response. Liquidsoap terminates each response with a line containing "END".
 */
export function liquidsoapCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    let buffer = ''
    const timeout = setTimeout(() => {
      socket.destroy()
      reject(new Error(`Liquidsoap command timed out: ${command}`))
    }, 4000)

    socket.connect(config.liquidsoapTelnetPort, config.liquidsoapHost, () => {
      socket.write(`${command}\nquit\n`)
    })

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8')
    })
    socket.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })
    socket.on('close', () => {
      clearTimeout(timeout)
      resolve(buffer.trim())
    })
  })
}

/**
 * Force the autoDJ to drop the current track and request a fresh one.
 * `request.dynamic.list` registers `<id>.flush_and_skip` (not `<id>.skip`),
 * which clears the current request and pulls the next — so a queued forced /
 * scheduled track cuts in immediately instead of waiting for the track to end.
 */
export async function skipAutoDj(): Promise<void> {
  try {
    await liquidsoapCommand('autodj.flush_and_skip')
  } catch (err) {
    console.warn('[liquidsoap] skip failed:', (err as Error).message)
  }
}
