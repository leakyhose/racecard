const activeCodes = new Set<string>();

export function generateCode(length: number = 4) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";

  do {
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (activeCodes.has(code));

  activeCodes.add(code);
  return code;
}

export function deleteCode(code: string) {
  activeCodes.delete(code);
}
