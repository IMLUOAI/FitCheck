/**
 * Daily British literature (home-page feature): one quote per day from the
 * British canon, picked deterministically from the calendar date so every
 * user sees the same lines on the same day.
 */

export interface LitQuote {
  text: string;
  author: string;
  work: string;
}

const QUOTES: LitQuote[] = [
  { text: "To be, or not to be: that is the question.", author: "William Shakespeare", work: "Hamlet" },
  { text: "What's in a name? That which we call a rose by any other name would smell as sweet.", author: "William Shakespeare", work: "Romeo and Juliet" },
  { text: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.", author: "Jane Austen", work: "Pride and Prejudice" },
  { text: "I declare after all there is no enjoyment like reading!", author: "Jane Austen", work: "Pride and Prejudice" },
  { text: "If I loved you less, I might be able to talk about it more.", author: "Jane Austen", work: "Emma" },
  { text: "It was the best of times, it was the worst of times.", author: "Charles Dickens", work: "A Tale of Two Cities" },
  { text: "God bless us, every one!", author: "Charles Dickens", work: "A Christmas Carol" },
  { text: "Whether I shall turn out to be the hero of my own life, or whether that station will be held by anybody else, these pages must show.", author: "Charles Dickens", work: "David Copperfield" },
  { text: "Whatever our souls are made of, his and mine are the same.", author: "Emily Brontë", work: "Wuthering Heights" },
  { text: "I am no bird; and no net ensnares me.", author: "Charlotte Brontë", work: "Jane Eyre" },
  { text: "The truth is rarely pure and never simple.", author: "Oscar Wilde", work: "The Importance of Being Earnest" },
  { text: "The only way to get rid of a temptation is to yield to it.", author: "Oscar Wilde", work: "The Picture of Dorian Gray" },
  { text: "To love oneself is the beginning of a lifelong romance.", author: "Oscar Wilde", work: "An Ideal Husband" },
  { text: "Mrs. Dalloway said she would buy the flowers herself.", author: "Virginia Woolf", work: "Mrs Dalloway" },
  { text: "Big Brother is watching you.", author: "George Orwell", work: "Nineteen Eighty-Four" },
  { text: "All animals are equal, but some animals are more equal than others.", author: "George Orwell", work: "Animal Farm" },
  { text: "All we have to decide is what to do with the time that is given us.", author: "J.R.R. Tolkien", work: "The Fellowship of the Ring" },
  { text: "Not all those who wander are lost.", author: "J.R.R. Tolkien", work: "The Fellowship of the Ring" },
  { text: "In a hole in the ground there lived a hobbit.", author: "J.R.R. Tolkien", work: "The Hobbit" },
  { text: "Curiouser and curiouser!", author: "Lewis Carroll", work: "Alice's Adventures in Wonderland" },
  { text: "Why, sometimes I've believed as many as six impossible things before breakfast.", author: "Lewis Carroll", work: "Through the Looking-Glass" },
  { text: "Beware; for I am fearless, and therefore powerful.", author: "Mary Shelley", work: "Frankenstein" },
  { text: "Listen to them, the children of the night. What music they make!", author: "Bram Stoker", work: "Dracula" },
  { text: "Fifteen men on the dead man's chest — Yo-ho-ho, and a bottle of rum!", author: "Robert Louis Stevenson", work: "Treasure Island" },
  { text: "We be of one blood, ye and I.", author: "Rudyard Kipling", work: "The Jungle Book" },
  { text: "All children, except one, grow up.", author: "J.M. Barrie", work: "Peter Pan" },
  { text: "You are braver than you believe, stronger than you seem, and smarter than you think.", author: "A.A. Milne", work: "Winnie-the-Pooh" },
  { text: "Never do anything by halves if you want to get away with it.", author: "Roald Dahl", work: "Matilda" },
  { text: "It does not do to dwell on dreams and forget to live.", author: "J.K. Rowling", work: "Harry Potter and the Philosopher's Stone" },
  { text: "It is never too late to be what you might have been.", author: "George Eliot", work: "Middlemarch" },
  { text: "She walks in beauty, like the night.", author: "Lord Byron", work: "She Walks in Beauty" },
  { text: "I wandered lonely as a cloud.", author: "William Wordsworth", work: "I Wandered Lonely as a Cloud" },
  { text: "Beauty is truth, truth beauty.", author: "John Keats", work: "Ode on a Grecian Urn" },
  { text: "Look on my Works, ye Mighty, and despair!", author: "Percy Bysshe Shelley", work: "Ozymandias" },
  { text: "Tyger Tyger, burning bright.", author: "William Blake", work: "The Tyger" },
  { text: "Water, water, every where, nor any drop to drink.", author: "Samuel Taylor Coleridge", work: "The Rime of the Ancient Mariner" },
  { text: "To strive, to seek, to find, and not to yield.", author: "Alfred Tennyson", work: "Ulysses" },
  { text: "Once a King or Queen of Narnia, always a King or Queen.", author: "C.S. Lewis", work: "The Lion, the Witch and the Wardrobe" },
];

/**
 * Deterministic daily pick — same quote for everyone on a given date.
 * Bucketed by local calendar day so it flips at midnight, not UTC midnight.
 */
export function quoteForDate(date: Date = new Date()): LitQuote {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return QUOTES[(h >>> 0) % QUOTES.length]!;
}

export function quoteCount(): number {
  return QUOTES.length;
}
