export const DUEL_TEXT =
  "Speed comes from rhythm, calm focus, and clean accuracy. Stay loose, read ahead, and let your hands move with confidence all the way to the finish.";

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
