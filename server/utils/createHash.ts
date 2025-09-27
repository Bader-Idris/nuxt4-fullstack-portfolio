// todo: this crypto vs bun bcrypt?
import crypto from 'node:crypto'

export const createHash = (string: string): string => {
  return crypto.createHash('sha256').update(string).digest('hex')
}
