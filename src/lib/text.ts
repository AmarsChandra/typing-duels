export const DUEL_TEXT =
  "Typing duels reward rhythm, control, and nerves. Keep your eyes forward, stay loose, and trust your hands to carry you to the finish before your opponent does.";

export function countTypedCharacters(input: string) {
  let count = 0;

  for (let index = 0; index < input.length; index += 1) {
    if (input[index] === DUEL_TEXT[index]) {
      count += 1;
    } else {
      break;
    }
  }

  return count;
}
