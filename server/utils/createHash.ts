// todo: this crypto vs bun bcrypt?
import crypto from 'node:crypto'

export const createHash = (string: string): string => {
  return crypto.createHash('md5').update(string).digest('hex')
}
