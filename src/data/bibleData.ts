// This is a simplified dataset with selected verses and passages
// In a production app, this would be a complete Bible dataset or an API connection

interface Verse {
  text: string;
  reference: string;
}

interface Passage {
  text: string;
  reference: string;
  title?: string;
}

export const bibleData = {
  verses: [
    {
      text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
      reference: "John 3:16"
    },
    {
      text: "The LORD is my shepherd; I shall not want.",
      reference: "Psalm 23:1"
    },
    {
      text: "I can do all things through Christ which strengtheneth me.",
      reference: "Philippians 4:13"
    },
    {
      text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding.",
      reference: "Proverbs 3:5"
    },
    {
      text: "Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth.",
      reference: "Psalm 46:10"
    },
    {
      text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.",
      reference: "Romans 8:28"
    },
    {
      text: "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.",
      reference: "Jeremiah 29:11"
    },
    {
      text: "In the beginning God created the heaven and the earth.",
      reference: "Genesis 1:1"
    },
    {
      text: "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.",
      reference: "Isaiah 40:31"
    },
    {
      text: "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of works, lest any man should boast.",
      reference: "Ephesians 2:8-9"
    },
    {
      text: "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.",
      reference: "Matthew 6:33"
    },
    {
      text: "But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, Meekness, temperance: against such there is no law.",
      reference: "Galatians 5:22-23"
    },
    {
      text: "Finally, brethren, whatsoever things are true, whatsoever things are honest, whatsoever things are just, whatsoever things are pure, whatsoever things are lovely, whatsoever things are of good report; if there be any virtue, and if there be any praise, think on these things.",
      reference: "Philippians 4:8"
    },
    {
      text: "Let not your heart be troubled: ye believe in God, believe also in me.",
      reference: "John 14:1"
    },
    {
      text: "This is the day which the LORD hath made; we will rejoice and be glad in it.",
      reference: "Psalm 118:24"
    },
    {
      text: "And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ's sake hath forgiven you.",
      reference: "Ephesians 4:32"
    },
    {
      text: "Thy word is a lamp unto my feet, and a light unto my path.",
      reference: "Psalm 119:105"
    },
    {
      text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest.",
      reference: "Matthew 11:28"
    },
    {
      text: "For all have sinned, and come short of the glory of God.",
      reference: "Romans 3:23"
    },
    {
      text: "For the wages of sin is death; but the gift of God is eternal life through Jesus Christ our Lord.",
      reference: "Romans 6:23"
    }
  ],
  passages: [
    {
      title: "The Beatitudes",
      text: "And seeing the multitudes, he went up into a mountain: and when he was set, his disciples came unto him: And he opened his mouth, and taught them, saying,\n\nBlessed are the poor in spirit: for theirs is the kingdom of heaven.\n\nBlessed are they that mourn: for they shall be comforted.\n\nBlessed are the meek: for they shall inherit the earth.\n\nBlessed are they which do hunger and thirst after righteousness: for they shall be filled.\n\nBlessed are the merciful: for they shall obtain mercy.\n\nBlessed are the pure in heart: for they shall see God.\n\nBlessed are the peacemakers: for they shall be called the children of God.\n\nBlessed are they which are persecuted for righteousness' sake: for theirs is the kingdom of heaven.",
      reference: "Matthew 5:1-10"
    },
    {
      title: "The Lord's Prayer",
      text: "After this manner therefore pray ye: Our Father which art in heaven, Hallowed be thy name.\n\nThy kingdom come, Thy will be done in earth, as it is in heaven.\n\nGive us this day our daily bread.\n\nAnd forgive us our debts, as we forgive our debtors.\n\nAnd lead us not into temptation, but deliver us from evil: For thine is the kingdom, and the power, and the glory, for ever. Amen.",
      reference: "Matthew 6:9-13"
    },
    {
      title: "The Creation",
      text: "In the beginning God created the heaven and the earth. And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters.\n\nAnd God said, Let there be light: and there was light. And God saw the light, that it was good: and God divided the light from the darkness. And God called the light Day, and the darkness he called Night. And the evening and the morning were the first day.",
      reference: "Genesis 1:1-5"
    },
    {
      title: "The Good Shepherd",
      text: "The LORD is my shepherd; I shall not want. He maketh me to lie down in green pastures: he leadeth me beside the still waters. He restoreth my soul: he leadeth me in the paths of righteousness for his name's sake.\n\nYea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.\n\nThou preparest a table before me in the presence of mine enemies: thou anointest my head with oil; my cup runneth over. Surely goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the LORD for ever.",
      reference: "Psalm 23"
    },
    {
      title: "Love Chapter",
      text: "Though I speak with the tongues of men and of angels, and have not charity, I am become as sounding brass, or a tinkling cymbal. And though I have the gift of prophecy, and understand all mysteries, and all knowledge; and though I have all faith, so that I could remove mountains, and have not charity, I am nothing.\n\nAnd though I bestow all my goods to feed the poor, and though I give my body to be burned, and have not charity, it profiteth me nothing.\n\nCharity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up, Doth not behave itself unseemly, seeketh not her own, is not easily provoked, thinketh no evil; Rejoiceth not in iniquity, but rejoiceth in the truth;\n\nBeareth all things, believeth all things, hopeth all things, endureth all things.\n\nCharity never faileth: but whether there be prophecies, they shall fail; whether there be tongues, they shall cease; whether there be knowledge, it shall vanish away.",
      reference: "1 Corinthians 13:1-8"
    },
    {
      title: "The Ten Commandments",
      text: "And God spake all these words, saying, I am the LORD thy God, which have brought thee out of the land of Egypt, out of the house of bondage.\n\nThou shalt have no other gods before me.\n\nThou shalt not make unto thee any graven image, or any likeness of any thing that is in heaven above, or that is in the earth beneath, or that is in the water under the earth.\n\nThou shalt not take the name of the LORD thy God in vain.\n\nRemember the sabbath day, to keep it holy.\n\nHonour thy father and thy mother.\n\nThou shalt not kill.\n\nThou shalt not commit adultery.\n\nThou shalt not steal.\n\nThou shalt not bear false witness against thy neighbour.\n\nThou shalt not covet.",
      reference: "Exodus 20:1-17"
    },
    {
      title: "Faith Chapter",
      text: "Now faith is the substance of things hoped for, the evidence of things not seen. For by it the elders obtained a good report.\n\nThrough faith we understand that the worlds were framed by the word of God, so that things which are seen were not made of things which do appear.\n\nBy faith Abel offered unto God a more excellent sacrifice than Cain, by which he obtained witness that he was righteous, God testifying of his gifts: and by it he being dead yet speaketh.\n\nBy faith Enoch was translated that he should not see death; and was not found, because God had translated him: for before his translation he had this testimony, that he pleased God.\n\nBut without faith it is impossible to please him: for he that cometh to God must believe that he is, and that he is a rewarder of them that diligently seek him.",
      reference: "Hebrews 11:1-6"
    },
    {
      title: "Armor of God",
      text: "Finally, my brethren, be strong in the Lord, and in the power of his might. Put on the whole armour of God, that ye may be able to stand against the wiles of the devil.\n\nFor we wrestle not against flesh and blood, but against principalities, against powers, against the rulers of the darkness of this world, against spiritual wickedness in high places.\n\nWherefore take unto you the whole armour of God, that ye may be able to withstand in the evil day, and having done all, to stand.\n\nStand therefore, having your loins girt about with truth, and having on the breastplate of righteousness; And your feet shod with the preparation of the gospel of peace;\n\nAbove all, taking the shield of faith, wherewith ye shall be able to quench all the fiery darts of the wicked. And take the helmet of salvation, and the sword of the Spirit, which is the word of God.",
      reference: "Ephesians 6:10-17"
    }
  ]
};