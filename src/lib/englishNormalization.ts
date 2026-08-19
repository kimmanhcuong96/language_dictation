const SMALL_CARDINALS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
] as const;
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"] as const;
const SMALL_ORDINALS = [
  "zeroth", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth",
  "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth", "nineteenth",
] as const;
const TENS_ORDINALS = ["", "", "twentieth", "thirtieth", "fortieth", "fiftieth", "sixtieth", "seventieth", "eightieth", "ninetieth"] as const;

function cardinalWords(value: number): string {
  if (value < 20) return SMALL_CARDINALS[value];
  if (value < 100) return `${TENS[Math.floor(value / 10)]}${value % 10 ? ` ${SMALL_CARDINALS[value % 10]}` : ""}`;
  const remainder = value % 100;
  return `${SMALL_CARDINALS[Math.floor(value / 100)]} hundred${remainder ? ` ${cardinalWords(remainder)}` : ""}`;
}

function ordinalWords(value: number): string {
  if (value < 20) return SMALL_ORDINALS[value];
  if (value < 100) return value % 10 ? `${TENS[Math.floor(value / 10)]} ${SMALL_ORDINALS[value % 10]}` : TENS_ORDINALS[Math.floor(value / 10)];
  const remainder = value % 100;
  return remainder ? `${SMALL_CARDINALS[Math.floor(value / 100)]} hundred ${ordinalWords(remainder)}` : `${SMALL_CARDINALS[Math.floor(value / 100)]} hundredth`;
}

const phraseEquivalences: Array<[string, string[]]> = [
  ["be:i", ["i am", "i'm"]], ["have:i", ["i have", "i've"]], ["will:i", ["i will", "i'll"]], ["would-had:i", ["i would", "i had", "i'd"]],
  ["be:you", ["you are", "you're"]], ["have:you", ["you have", "you've"]], ["will:you", ["you will", "you'll"]], ["would-had:you", ["you would", "you had", "you'd"]],
  ["be-have:he", ["he is", "he has", "he's"]], ["be-have:she", ["she is", "she has", "she's"]], ["be-have:it", ["it is", "it has", "it's"]],
  ["will:he", ["he will", "he'll"]], ["would-had:he", ["he would", "he had", "he'd"]], ["will:she", ["she will", "she'll"]], ["would-had:she", ["she would", "she had", "she'd"]],
  ["will:it", ["it will", "it'll"]], ["would-had:it", ["it would", "it had", "it'd"]],
  ["be:we", ["we are", "we're"]], ["have:we", ["we have", "we've"]], ["will:we", ["we will", "we'll"]], ["would-had:we", ["we would", "we had", "we'd"]],
  ["be:they", ["they are", "they're"]], ["have:they", ["they have", "they've"]], ["will:they", ["they will", "they'll"]], ["would-had:they", ["they would", "they had", "they'd"]],
  ["not:can", ["cannot", "can not", "can't"]], ["not:do", ["do not", "don't"]], ["not:does", ["does not", "doesn't"]], ["not:did", ["did not", "didn't"]],
  ["not:is", ["is not", "isn't"]], ["not:are", ["are not", "aren't"]], ["not:was", ["was not", "wasn't"]], ["not:were", ["were not", "weren't"]],
  ["not:have", ["have not", "haven't"]], ["not:has", ["has not", "hasn't"]], ["not:had", ["had not", "hadn't"]],
  ["not:will", ["will not", "won't"]], ["not:would", ["would not", "wouldn't"]], ["not:should", ["should not", "shouldn't"]], ["not:could", ["could not", "couldn't"]],
  ["not:must", ["must not", "mustn't"]], ["not:need", ["need not", "needn't"]], ["not:might", ["might not", "mightn't"]], ["not:shall", ["shall not", "shan't"]],
  ["have:could", ["could have", "could've"]], ["have:would", ["would have", "would've"]], ["have:should", ["should have", "should've"]],
  ["have:might", ["might have", "might've"]], ["have:must", ["must have", "must've"]],
  ["let-us", ["let us", "let's"]], ["here-is", ["here is", "here's"]],
];

const equivalences = new Map<string, string>();
const comparisonDisplay = new Map<string, string>();
for (const [canonical, forms] of phraseEquivalences) {
  const token = `~${canonical}`;
  comparisonDisplay.set(token, forms[0]);
  for (const form of forms) equivalences.set(form, token);
}
for (let value = 0; value <= 999; value += 1) {
  equivalences.set(String(value), `#${value}`);
  equivalences.set(cardinalWords(value), `#${value}`);
  if (value > 100 && value % 100) equivalences.set(cardinalWords(value).replace(" hundred ", " hundred and "), `#${value}`);
  comparisonDisplay.set(`#${value}`, cardinalWords(value));
  const ordinal = `#ordinal:${value}`;
  const lastTwo = value % 100;
  const suffix = lastTwo >= 11 && lastTwo <= 13 ? "th" : value % 10 === 1 ? "st" : value % 10 === 2 ? "nd" : value % 10 === 3 ? "rd" : "th";
  equivalences.set(`${value}${suffix}`, ordinal);
  equivalences.set(ordinalWords(value), ordinal);
  if (value > 100 && value % 100) equivalences.set(ordinalWords(value).replace(" hundred ", " hundred and "), ordinal);
  comparisonDisplay.set(ordinal, ordinalWords(value));
}
const maxPhraseWords = Math.max(...Array.from(equivalences.keys(), phrase => phrase.split(" ").length));

function negativeSubjectForm(source: string, canonical: string): string | undefined {
  const subject = canonical.split(":").at(-1);
  if (!subject) return undefined;
  if (canonical === "~be:i") return "i am not";
  if (canonical.startsWith("~be:")) return `${subject} ~not:are`;
  if (canonical.startsWith("~have:")) return `${subject} ~not:have`;
  if (canonical.startsWith("~will:")) return `${subject} ~not:will`;
  if (canonical.startsWith("~would-had:")) return `${subject} ${source.includes(" had") ? "~not:had" : "~not:would"}`;
  if (canonical.startsWith("~be-have:")) return `${subject} ${source.includes(" has") ? "~not:has" : "~not:is"}`;
  return undefined;
}

export function normalizeEnglishForComparison(text: string): string {
  const prepared = text.normalize("NFKC").toLocaleLowerCase("en").replace(/[\u02bc\u2018\u2019]/gu, "'").replace(/[^\p{L}\p{N}']+/gu, " ").replace(/\s+/gu, " ").trim();
  if (!prepared) return "";
  const words = prepared.split(" "), normalized: string[] = [];
  for (let index = 0; index < words.length;) {
    let match: string | undefined, matchLength = 0;
    for (let length = Math.min(maxPhraseWords, words.length - index); length > 0; length -= 1) {
      const source = words.slice(index, index + length).join(" "), canonical = equivalences.get(source);
      const followedByNot = words[index + length] === "not";
      const negative = canonical && followedByNot ? negativeSubjectForm(source, canonical) : undefined;
      if (negative) { match = negative; matchLength = length + 1; break; }
      if (canonical) { match = canonical; matchLength = length; break; }
    }
    if (match) { normalized.push(match); index += matchLength; }
    else { normalized.push(words[index].replace(/'/gu, "")); index += 1; }
  }
  return normalized.join(" ");
}

export function displayEnglishComparisonToken(token: string): string { return comparisonDisplay.get(token) ?? token; }
