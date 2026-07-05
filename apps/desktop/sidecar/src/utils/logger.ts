import pino from 'pino'

/**
 * ロガー設定
 * 開発環境では見やすいフォーマット、本番環境ではJSON形式で出力
 */
const isDevelopment = process.env.NODE_ENV !== 'production'
const logDestination =
  process.env.LOUPEDECK_LOG_TO_STDERR === 'true' ? pino.destination(2) : undefined

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    transport: isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        }
      : undefined,
  },
  logDestination
)

/**
 * ロガーのラッパー関数（既存のconsole.logからの移行を容易にする）
 */
export const log = {
  debug: (...args: unknown[]) => logger.debug(args.map(String).join(' ')),
  info: (...args: unknown[]) => logger.info(args.map(String).join(' ')),
  warn: (...args: unknown[]) => logger.warn(args.map(String).join(' ')),
  error: (...args: unknown[]) => logger.error(args.map(String).join(' ')),
}

export default logger
