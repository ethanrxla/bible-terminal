// Expanded Bible dataset with verses, passages, and stories from across the entire Bible
// This represents a more comprehensive selection from all 66 books

interface BibleContent {
  text: string;
  reference: string;
  title?: string;
  type: 'verse' | 'passage' | 'story';
  book: string;
  testament: 'old' | 'new';
}

export const expandedBibleData: BibleContent[] = [
  // Genesis - Creation and Early Stories
  {
    text: "In the beginning God created the heaven and the earth.",
    reference: "Genesis 1:1",
    type: "verse",
    book: "Genesis",
    testament: "old"
  },
  {
    text: "And God said, Let us make man in our image, after our likeness: and let them have dominion over the fish of the sea, and over the fowl of the air, and over the cattle, and over all the earth, and over every creeping thing that creepeth upon the earth. So God created man in his own image, in the image of God created he him; male and female created he them.",
    reference: "Genesis 1:26-27",
    title: "Creation of Mankind",
    type: "passage",
    book: "Genesis",
    testament: "old"
  },
  {
    text: "And the LORD God formed man of the dust of the ground, and breathed into his nostrils the breath of life; and man became a living soul. And the LORD God planted a garden eastward in Eden; and there he put the man whom he had formed. And out of the ground made the LORD God to grow every tree that is pleasant to the sight, and good for food; the tree of life also in the midst of the garden, and the tree of knowledge of good and evil.",
    reference: "Genesis 2:7-9",
    title: "The Garden of Eden",
    type: "story",
    book: "Genesis",
    testament: "old"
  },
  {
    text: "And the LORD said unto Noah, Come thou and all thy house into the ark; for thee have I seen righteous before me in this generation. And Noah did according unto all that the LORD commanded him. And it came to pass after seven days, that the waters of the flood were upon the earth.",
    reference: "Genesis 7:1, 5, 10",
    title: "Noah and the Flood",
    type: "story",
    book: "Genesis",
    testament: "old"
  },

  // Exodus - Moses and the Israelites
  {
    text: "And Moses said unto the people, Fear ye not, stand still, and see the salvation of the LORD, which he will shew to you to day: for the Egyptians whom ye have seen to day, ye shall see them again no more for ever.",
    reference: "Exodus 14:13",
    type: "verse",
    book: "Exodus",
    testament: "old"
  },
  {
    text: "And Moses stretched out his hand over the sea; and the LORD caused the sea to go back by a strong east wind all that night, and made the sea dry land, and the waters were divided. And the children of Israel went into the midst of the sea upon the dry ground: and the waters were a wall unto them on their right hand, and on their left.",
    reference: "Exodus 14:21-22",
    title: "Parting of the Red Sea",
    type: "story",
    book: "Exodus",
    testament: "old"
  },

  // Psalms - Worship and Praise
  {
    text: "The LORD is my shepherd; I shall not want.",
    reference: "Psalm 23:1",
    type: "verse",
    book: "Psalms",
    testament: "old"
  },
  {
    text: "The LORD is my shepherd; I shall not want. He maketh me to lie down in green pastures: he leadeth me beside the still waters. He restoreth my soul: he leadeth me in the paths of righteousness for his name's sake. Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.",
    reference: "Psalm 23:1-4",
    title: "The Good Shepherd",
    type: "passage",
    book: "Psalms",
    testament: "old"
  },
  {
    text: "Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth.",
    reference: "Psalm 46:10",
    type: "verse",
    book: "Psalms",
    testament: "old"
  },
  {
    text: "Make a joyful noise unto the LORD, all ye lands. Serve the LORD with gladness: come before his presence with singing. Know ye that the LORD he is God: it is he that hath made us, and not we ourselves; we are his people, and the sheep of his pasture.",
    reference: "Psalm 100:1-3",
    title: "A Psalm of Praise",
    type: "passage",
    book: "Psalms",
    testament: "old"
  },

  // Proverbs - Wisdom Literature
  {
    text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding.",
    reference: "Proverbs 3:5",
    type: "verse",
    book: "Proverbs",
    testament: "old"
  },
  {
    text: "The fear of the LORD is the beginning of wisdom: and the knowledge of the holy is understanding.",
    reference: "Proverbs 9:10",
    type: "verse",
    book: "Proverbs",
    testament: "old"
  },

  // Isaiah - Prophecy and Hope
  {
    text: "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.",
    reference: "Isaiah 40:31",
    type: "verse",
    book: "Isaiah",
    testament: "old"
  },
  {
    text: "For unto us a child is born, unto us a son is given: and the government shall be upon his shoulder: and his name shall be called Wonderful, Counsellor, The mighty God, The everlasting Father, The Prince of Peace.",
    reference: "Isaiah 9:6",
    type: "verse",
    book: "Isaiah",
    testament: "old"
  },

  // Jeremiah - God's Faithfulness
  {
    text: "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.",
    reference: "Jeremiah 29:11",
    type: "verse",
    book: "Jeremiah",
    testament: "old"
  },

  // Daniel - Faith in Trials
  {
    text: "Then the king commanded, and they brought Daniel, and cast him into the den of lions. Now the king spake and said unto Daniel, Thy God whom thou servest continually, he will deliver thee. And when he came to the den, he cried with a lamentable voice unto Daniel: and the king spake and said to Daniel, O Daniel, servant of the living God, is thy God, whom thou servest continually, able to deliver thee from the lions? Then said Daniel unto the king, O king, live for ever. My God hath sent his angel, and hath shut the lions' mouths, that they have not hurt me.",
    reference: "Daniel 6:16, 20-22",
    title: "Daniel in the Lions' Den",
    type: "story",
    book: "Daniel",
    testament: "old"
  },

  // Matthew - Jesus' Ministry
  {
    text: "And seeing the multitudes, he went up into a mountain: and when he was set, his disciples came unto him: And he opened his mouth, and taught them, saying, Blessed are the poor in spirit: for theirs is the kingdom of heaven. Blessed are they that mourn: for they shall be comforted. Blessed are the meek: for they shall inherit the earth.",
    reference: "Matthew 5:1-5",
    title: "The Beatitudes",
    type: "passage",
    book: "Matthew",
    testament: "new"
  },
  {
    text: "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.",
    reference: "Matthew 6:33",
    type: "verse",
    book: "Matthew",
    testament: "new"
  },
  {
    text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest.",
    reference: "Matthew 11:28",
    type: "verse",
    book: "Matthew",
    testament: "new"
  },

  // Mark - Jesus' Miracles
  {
    text: "And he arose, and rebuked the wind, and said unto the sea, Peace, be still. And the wind ceased, and there was a great calm. And he said unto them, Why are ye so fearful? how is it that ye have no faith?",
    reference: "Mark 4:39-40",
    title: "Jesus Calms the Storm",
    type: "story",
    book: "Mark",
    testament: "new"
  },

  // Luke - Parables and Stories
  {
    text: "And he spake this parable unto them, saying, What man of you, having an hundred sheep, if he lose one of them, doth not leave the ninety and nine in the wilderness, and go after that which is lost, until he find it? And when he hath found it, he layeth it on his shoulders, rejoicing.",
    reference: "Luke 15:3-5",
    title: "The Lost Sheep",
    type: "story",
    book: "Luke",
    testament: "new"
  },
  {
    text: "And Mary said, My soul doth magnify the Lord, And my spirit hath rejoiced in God my Saviour. For he hath regarded the low estate of his handmaiden: for, behold, from henceforth all generations shall call me blessed.",
    reference: "Luke 1:46-48",
    title: "Mary's Song",
    type: "passage",
    book: "Luke",
    testament: "new"
  },

  // John - Love and Eternal Life
  {
    text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
    reference: "John 3:16",
    type: "verse",
    book: "John",
    testament: "new"
  },
  {
    text: "Jesus said unto her, I am the resurrection, and the life: he that believeth in me, though he were dead, yet shall he live: And whosoever liveth and believeth in me shall never die.",
    reference: "John 11:25-26",
    type: "verse",
    book: "John",
    testament: "new"
  },
  {
    text: "In the beginning was the Word, and the Word was with God, and the Word was God. The same was in the beginning with God. All things were made by him; and without him was not any thing made that was made. In him was life; and the life was the light of men.",
    reference: "John 1:1-4",
    title: "The Word Made Flesh",
    type: "passage",
    book: "John",
    testament: "new"
  },

  // Acts - Early Church
  {
    text: "But ye shall receive power, after that the Holy Ghost is come upon you: and ye shall be witnesses unto me both in Jerusalem, and in all Judaea, and in Samaria, and unto the uttermost part of the earth.",
    reference: "Acts 1:8",
    type: "verse",
    book: "Acts",
    testament: "new"
  },
  {
    text: "And suddenly there came a sound from heaven as of a rushing mighty wind, and it filled all the house where they were sitting. And there appeared unto them cloven tongues like as of fire, and it sat upon each of them. And they were all filled with the Holy Ghost, and began to speak with other tongues, as the Spirit gave them utterance.",
    reference: "Acts 2:2-4",
    title: "Pentecost",
    type: "story",
    book: "Acts",
    testament: "new"
  },

  // Romans - Salvation and Grace
  {
    text: "For all have sinned, and come short of the glory of God.",
    reference: "Romans 3:23",
    type: "verse",
    book: "Romans",
    testament: "new"
  },
  {
    text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.",
    reference: "Romans 8:28",
    type: "verse",
    book: "Romans",
    testament: "new"
  },

  // 1 Corinthians - Love and Unity
  {
    text: "Though I speak with the tongues of men and of angels, and have not charity, I am become as sounding brass, or a tinkling cymbal. Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up. Charity never faileth.",
    reference: "1 Corinthians 13:1, 4, 8",
    title: "The Love Chapter",
    type: "passage",
    book: "1 Corinthians",
    testament: "new"
  },

  // Ephesians - Spiritual Warfare
  {
    text: "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of works, lest any man should boast.",
    reference: "Ephesians 2:8-9",
    type: "verse",
    book: "Ephesians",
    testament: "new"
  },
  {
    text: "Finally, my brethren, be strong in the Lord, and in the power of his might. Put on the whole armour of God, that ye may be able to stand against the wiles of the devil.",
    reference: "Ephesians 6:10-11",
    title: "Armor of God",
    type: "passage",
    book: "Ephesians",
    testament: "new"
  },

  // Philippians - Joy and Peace
  {
    text: "I can do all things through Christ which strengtheneth me.",
    reference: "Philippians 4:13",
    type: "verse",
    book: "Philippians",
    testament: "new"
  },
  {
    text: "Rejoice in the Lord alway: and again I say, Rejoice. Let your moderation be known unto all men. The Lord is at hand. Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.",
    reference: "Philippians 4:4-6",
    title: "Rejoice Always",
    type: "passage",
    book: "Philippians",
    testament: "new"
  },

  // Hebrews - Faith
  {
    text: "Now faith is the substance of things hoped for, the evidence of things not seen.",
    reference: "Hebrews 11:1",
    type: "verse",
    book: "Hebrews",
    testament: "new"
  },

  // James - Practical Faith
  {
    text: "If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him.",
    reference: "James 1:5",
    type: "verse",
    book: "James",
    testament: "new"
  },

  // 1 Peter - Hope in Suffering
  {
    text: "Casting all your care upon him; for he careth for you.",
    reference: "1 Peter 5:7",
    type: "verse",
    book: "1 Peter",
    testament: "new"
  },

  // 1 John - God's Love
  {
    text: "Beloved, let us love one another: for love is of God; and every one that loveth is born of God, and knoweth God. He that loveth not knoweth not God; for God is love.",
    reference: "1 John 4:7-8",
    type: "verse",
    book: "1 John",
    testament: "new"
  },

  // Revelation - Hope and Victory
  {
    text: "And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain: for the former things are passed away.",
    reference: "Revelation 21:4",
    type: "verse",
    book: "Revelation",
    testament: "new"
  },

  // Additional Old Testament Stories
  {
    text: "And David put his hand in his bag, and took thence a stone, and slang it, and smote the Philistine in his forehead, that the stone sunk into his forehead; and he fell upon his face to the earth. So David prevailed over the Philistine with a sling and with a stone, and smote the Philistine, and slew him; but there was no sword in the hand of David.",
    reference: "1 Samuel 17:49-50",
    title: "David and Goliath",
    type: "story",
    book: "1 Samuel",
    testament: "old"
  },
  {
    text: "And Elijah said unto the prophets of Baal, Choose you one bullock for yourselves, and dress it first; for ye are many; and call on the name of your gods, but put no fire under. Then the fire of the LORD fell, and consumed the burnt sacrifice, and the wood, and the stones, and the dust, and licked up the water that was in the trench.",
    reference: "1 Kings 18:25, 38",
    title: "Elijah and the Prophets of Baal",
    type: "story",
    book: "1 Kings",
    testament: "old"
  },
  {
    text: "And Ruth said, Intreat me not to leave thee, or to return from following after thee: for whither thou goest, I will go; and where thou lodgest, I will lodge: thy people shall be my people, and thy God my God.",
    reference: "Ruth 1:16",
    title: "Ruth's Loyalty",
    type: "story",
    book: "Ruth",
    testament: "old"
  }
];

// Helper functions for random selection
export function getRandomBibleContent(): BibleContent {
  const randomIndex = Math.floor(Math.random() * expandedBibleData.length);
  return expandedBibleData[randomIndex];
}

export function getDailyBibleContent(dayOfYear: number): { verse: BibleContent; passage: BibleContent } {
  // Use deterministic but seemingly random selection based on day
  const verseIndex = (dayOfYear * 7 + 13) % expandedBibleData.length;
  const passageIndex = (dayOfYear * 11 + 29) % expandedBibleData.length;
  
  // Ensure we get different content for verse and passage
  let verse = expandedBibleData[verseIndex];
  let passage = expandedBibleData[passageIndex];
  
  // If they're the same, offset the passage
  if (verseIndex === passageIndex) {
    passage = expandedBibleData[(passageIndex + 1) % expandedBibleData.length];
  }
  
  return { verse, passage };
}

export function getBibleContentByType(type: 'verse' | 'passage' | 'story'): BibleContent[] {
  return expandedBibleData.filter(content => content.type === type);
}

export function getBibleContentByBook(book: string): BibleContent[] {
  return expandedBibleData.filter(content => content.book === book);
}

export function getBibleContentByTestament(testament: 'old' | 'new'): BibleContent[] {
  return expandedBibleData.filter(content => content.testament === testament);
}