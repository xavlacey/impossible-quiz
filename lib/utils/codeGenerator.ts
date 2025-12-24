/**
 * Generates a random 4-character alphanumeric party code (uppercase)
 */
export function generatePartyCode(): string {
  const characters = "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789";
  let code = "";

  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }

  return code;
}

/**
 * Validates a party code format (4 alphanumeric characters, uppercase)
 */
export function isValidPartyCode(code: string): boolean {
  return /^[A-Z0-9]{4}$/.test(code);
}
