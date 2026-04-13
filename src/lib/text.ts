export const DUEL_TEXT =
  "Thunder rolled across the valley as two young raptors sprinted between ferns, sharp claws kicking up dust while they chased the same distant beacon through the prehistoric dawn.";

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
