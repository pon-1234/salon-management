// エラーオブジェクトから詳細情報を抽出する関数
export function getErrorDetails(error: unknown): string {
  if (error instanceof Error) {
    let details = `${error.name}: ${error.message}`

    // error.cause が存在する場合は追加で表示 (Node.js v16.9+ や一部ブラウザでサポート)
    if (error.cause) {
      details += `\nCause: ${getErrorDetails(error.cause)}` // 再帰的に cause の詳細を取得
    }

    // エラーオブジェクトのプロパティを全て表示
    if (typeof error === 'object' && error !== null) {
      for (const key in error) {
        if (key !== 'name' && key !== 'message' && key !== 'stack' && key !== 'cause') {
          try {
            // プロパティの値を安全に文字列化
            const value = JSON.stringify(error[key as keyof typeof error], null, 2)
            details += `\n${key}: ${value}`
          } catch (stringifyError) {
            // 文字列化に失敗した場合
            details += `\n${key}: (Error during stringify: ${stringifyError})`
          }
        }
      }
    }

    details += `\nStack: ${error.stack || '(no stack trace available)'}`
    return details
  }

  // Error オブジェクトでない場合、オブジェクトの内容を文字列化
  try {
    return typeof error === 'object' && error !== null
      ? JSON.stringify(error, null, 2)
      : String(error)
  } catch (stringifyError) {
    return `Error during stringify: ${stringifyError}`
  }
}

// エラーをコンソールに詳細にログ出力する関数 (改良版)
export function logError(error: unknown, context?: string): void {
  const errorDetails = getErrorDetails(error)
  const fullMessage = `Error${context ? ` in ${context}` : ''}:\n\n${errorDetails}`

  // エラーメッセージを複数行に分割して出力
  fullMessage.split('\n').forEach((line) => console.error(line))

  // エラーオブジェクトをオリジナルのままコンソールに表示
  console.dir(error, { depth: null })
}





