/**
 * Generates a random 6-character alphanumeric party code (uppercase)
 */
export function generatePartyCode(): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";

  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }

  return code;
}

/**
 * Validates a party code format (6 alphanumeric characters, uppercase)
 */
export function isValidPartyCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code);
}
