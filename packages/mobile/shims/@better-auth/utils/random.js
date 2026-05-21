// Shim for @better-auth/utils/random - Metro-compatible version
function expandAlphabet(alphabet) {
  switch (alphabet) {
    case "a-z": return "abcdefghijklmnopqrstuvwxyz";
    case "A-Z": return "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    case "0-9": return "0123456789";
    case "-_": return "-_";
    default: throw new Error("Unsupported alphabet: " + alphabet);
  }
}

function createRandomStringGenerator(...baseAlphabets) {
  const baseCharSet = baseAlphabets.map(expandAlphabet).join("");
  const baseCharSetLength = baseCharSet.length;
  return (length, ...alphabets) => {
    let charSet = baseCharSet;
    let charSetLength = baseCharSetLength;
    if (alphabets.length > 0) {
      charSet = alphabets.map(expandAlphabet).join("");
      charSetLength = charSet.length;
    }
    const maxValid = Math.floor(256 / charSetLength) * charSetLength;
    const buf = new Uint8Array(length * 2);
    let result = "";
    let bufIndex = buf.length;
    let rand;
    while (result.length < length) {
      if (bufIndex >= buf.length) {
        crypto.getRandomValues(buf);
        bufIndex = 0;
      }
      rand = buf[bufIndex++];
      if (rand < maxValid) result += charSet[rand % charSetLength];
    }
    return result;
  };
}

module.exports = { createRandomStringGenerator };
