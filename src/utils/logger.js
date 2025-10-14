import pino from 'pino'

/**
 * ロガー設定
 * 開発環境では見やすいフォーマット、本番環境ではJSON形式で出力
 */
const isDevelopment = process.env.NODE_ENV !== 'production'

export const logger = pino({
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
})

/**
 * ロガーのラッパー関数（既存のconsole.logからの移行を容易にする）
 */
export const log = {
  debug: (...args) => logger.debug(args.join(' ')),
  info: (...args) => logger.info(args.join(' ')),
  warn: (...args) => logger.warn(args.join(' ')),
  error: (...args) => logger.error(args.join(' ')),
}

export default logger
