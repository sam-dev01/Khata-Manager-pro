/**
 * Robust English to Hindi Transliteration Engine
 * Handles explicit phonetic mappings, matras, and common name patterns.
 */

// Vowels (Independent)
const VOWELS = {
    'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ii': 'ई', 'ee': 'ई', 'u': 'उ', 'uu': 'ऊ', 'oo': 'ऊ',
    'e': 'ए', 'ai': 'ऐ', 'o': 'ओ', 'au': 'औ', 'r': 'ऋ'
};

// Matras (Dependent Vowels) - applied to consonants
const MATRAS = {
    'a': '',      // Schwa deletion rule or implicit 'a'
    'aa': 'ा',
    'i': 'ि',
    'ii': 'ी', 'ee': 'ी',
    'u': 'ु',
    'uu': 'ू', 'oo': 'ू',
    'e': 'े',
    'ai': 'ै',
    'o': 'ो',
    'au': 'ौ',
    'r': 'ृ'
};

// Consonants
const CONSONANTS = {
    'k': 'क', 'kh': 'ख', 'g': 'ग', 'gh': 'घ',
    'ch': 'च', 'chh': 'छ', 'j': 'ज', 'jh': 'झ',
    't': 'ट', 'th': 'ठ', 'd': 'ड', 'dh': 'ढ', 'n': 'ण', // Retroflex
    't_soft': 'त', 'th_soft': 'थ', 'd_soft': 'द', 'dh_soft': 'ध', 'n_soft': 'न', // Dental (default for t/d/n usually)
    'p': 'प', 'ph': 'फ', 'f': 'फ', 'b': 'ब', 'bh': 'भ', 'm': 'म',
    'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'w': 'व',
    'sh': 'श', 'shh': 'ष', 's': 'स', 'h': 'ह',
    'ks': 'क्ष', 'ksh': 'क्ष', 'gy': 'ज्ञ', 'tr': 'त्र', 'shr': 'श्र'
};

// Ambiguity Resolvers (Simple heuristic)
// We default 't' to 'त' (dental) as it's more common in names, but sometimes it's 'ट'. Context needed.
// For now, we use standard Hindi mappings.

const MAP = {
    ...VOWELS,
    ...CONSONANTS,
    // Overrides/Specifics
    'z': 'ज़',
    'q': 'क़',
    // Standard mappings for un-aspirated vs aspirated
    'k': 'क', 'kh': 'ख',
    'g': 'ग', 'gh': 'घ',
    'c': 'क', 'ch': 'च', 'chh': 'छ',
    'j': 'ज', 'jh': 'झ', 'z': 'ज़',
    't': 'त', 'th': 'थ', // defaults
    'T': 'ट', 'Th': 'ठ', 'D': 'ड', 'Dh': 'ढ', 'N': 'ण', // Capital for retroflex if user types carefully, else heuristics
    'd': 'द', 'dh': 'ध',
    'n': 'न',
    'p': 'प', 'ph': 'फ', 'f': 'फ',
    'b': 'ब', 'bh': 'भ',
    'm': 'म',
    'y': 'य',
    'r': 'र',
    'l': 'ल',
    'v': 'व', 'w': 'व',
    's': 'स', 'sh': 'श', 'S': 'ष',
    'h': 'ह'
};

// Sort keys by length descending to match longest prefixes first (e.g. 'ksh' before 'k')
const TOKENS = Object.keys(MAP).sort((a, b) => b.length - a.length);

export const transliterateToHindi = (text) => {
    if (!text) return '';

    // Normalize
    let input = text.toLowerCase();
    let result = '';
    let i = 0;

    while (i < input.length) {
        let match = '';
        let foundChar = '';
        let isConsonant = false;

        // 1. Try to match a multi-char token first
        for (const token of TOKENS) {
            if (input.substr(i).startsWith(token)) {

                // Fix for "Rahul" (r-ah-ul -> r-a-h-u-l) vs "Sah" (s-ah -> s-ah)
                // If we match a special digraph that usually acts as a modifier (like 'ah'->Visarga, 'an'->Anusvara, 'am'->Anusvara)
                // but it is followed by a vowel, we should probably SKIP this greedy match and let it match character by character.
                // Exceptions: 'ai', 'au' are vowels themselves, so we shouldn't skip them.
                const isModifierDigraph = ['ah', 'an', 'am'].includes(token);
                if (isModifierDigraph) {
                    const nextCharIndex = i + token.length;
                    if (nextCharIndex < input.length) {
                        const nextChar = input[nextCharIndex];
                        // If followed by a vowel, it's likely part of the word structure (Ra-hul, Shivan-i)
                        // so we skip this digraph match.
                        // VOWELS keys include 'a', 'e', 'i', 'o', 'u' etc.
                        // Simple check: is nextChar a vowel start?
                        if (['a', 'e', 'i', 'o', 'u'].includes(nextChar)) {
                            continue;
                        }
                    }
                }

                match = token;
                foundChar = MAP[token];
                // Check if it's a consonant
                if (Object.values(CONSONANTS).includes(foundChar)) {
                    isConsonant = true;
                }
                // Special case: 'a' map is 'अ' in VOWELS but we need to check if previous was consonant
                break;
            }
        }

        if (!match) {
            // Fallback: keep original char if no map found (e.g. numbers, punctuation)
            result += input[i];
            i++;
            continue;
        }

        // Contextual handling

        // Check previous char to decide if Vowel or Matra
        // Only apply matra if previous char was a Hindi Consonant
        // Note: This is a simplified state tracking.
        const lastChar = result.slice(-1);
        const isLastHindiConsonant = lastChar >= 'क' && lastChar <= 'ह'; // Rough range check

        if (isLastHindiConsonant && VOWELS[match]) {
            // It's a vowel sound after a consonant -> turn into Matra
            // Exception: 'a' usually deletes the halant if we were explicit, but here we just append nothing or 'aa'

            const matra = MATRAS[match];
            if (matra !== undefined) {
                result += matra;
            } else {
                // Fallback for independent usage if no matra exists (unlikely for defined vowels)
                result += foundChar;
            }
        } else {
            // Start of word or after another vowel -> Independent form
            result += foundChar;
        }

        // Special Handling for implicit 'a' removal or halant? 
        // In this simple engine, we assume consonants are full (with 'a') unless we explicitly handle partials.
        // However, mapping 'k' -> 'क' implies 'ka'.
        // If we type 'kit', we match 'k' -> 'क', then 'i' -> 'ि'. 'क' + 'ि' = 'कि'. Correct.
        // If we type 'kta', 'k' -> 'क', 't' -> 'त'. 'क' + 'त' = 'कत' (Kata). ideally 'क्त' (Kta).
        // To get half-letters, usually phonetic keypads use explicit halant or complex logic.
        // Heuristic: If two consonants are adjacent, English speakers just type 'kt'.
        // For automatic, we might leave it as 'कत' or try to be smart.
        // Let's stick to full characters for now as it's safer than over-halanting.

        i += match.length;
    }

    return result;
};


/**
 * Advanced heuristic-based transliteration
 * Iterates through the string and builds syllabics options.
 */
export const smartTransliterate = (str) => {
    if (!str) return '';

    const tokens = [];
    let i = 0;

    // Custom dictionary overrides for common names
    const DICTIONARY = {
        // Surnames / Titles
        'sharma': 'शर्मा',
        'verma': 'वर्मा',
        'gupta': 'गुप्ता',
        'singh': 'सिंह',
        'kumar': 'कुमार',
        'mishra': 'मिश्रा',
        'yadav': 'यादव',
        'devi': 'देवी',
        'ali': 'अली',
        'khan': 'खान',
        'ahmed': 'अहमद',
        'jain': 'जैन',
        'agarwal': 'अग्रवाल',
        'reddy': 'रेड्डी',
        'patel': 'पटेल',
        'mehta': 'मेहता',
        'joshi': 'जोशी',
        'rawat': 'रावत',
        'bhai': 'भाई',
        'ji': 'जी',

        // Common Names
        'shivam': 'शिवम',
        'amit': 'अमित',
        'rahul': 'राहुल',
        'raj': 'राज',
        'aman': 'अमन',
        'ramesh': 'रमेश',
        'sanjay': 'संजय',
        'anil': 'अनिल',
        'sunil': 'सुनील',
        'vijay': 'विजय',
        'ajay': 'अजय',
        'deepak': 'दीपक',
        'sandeep': 'संदीप',
        'manoj': 'मनोज',
        'rajesh': 'राजेश',
        'dinesh': 'दिनेश',
        'suresh': 'सुरेश',
        'kamal': 'कमल',
        'pawan': 'पवन',
        'vikas': 'विकास',
        'abhishek': 'अभिषेक',
        'rohit': 'रोहित',
        'rahim': 'रहीम',
        'anand': 'आनंद',
        'arvind': 'अरविंद',
        'ashok': 'अशोक',
        'harish': 'हरीश',
        'kishore': 'किशोर',
        'lalit': 'ललित',
        'mohan': 'मोहन',
        'sohan': 'सोहन',
        'ravi': 'रवि',
        'pradeep': 'प्रदीप',
        'prakash': 'प्रकाश',
        'prem': 'प्रेम',
        'ram': 'राम',
        'shyam': 'श्याम',
        'vinod': 'विनोद',
        'kapil': 'कपिल',
        'arun': 'अरुण',
        'santosh': 'संतोष',
        'ashish': 'आशीष',
        'vivek': 'विवेक',
        'karan': 'करण',
        'vikram': 'विक्रम',

        // Local Locations / Villages / Regions
        'sleemnabad': 'सलीमनबाद',
        'katni': 'कटनी',
        'jabalpur': 'जबलपुर',
        'madhya': 'मध्य',
        'pradesh': 'प्रदेश'
    };

    // Check whole word dictionary first (case insensitive)
    const lower = str.toLowerCase();
    if (DICTIONARY[lower]) return DICTIONARY[lower];

    // Tokenize
    // We want to greedy match longest consonant/vowel clusters from our map.
    // Then apply logic.

    // Simplified logic using the previously defined map but improved for half-letters
    // If we see Consonant + Consonant, the first one *might* be half.
    // But in Hindi 'Kamal', we type 'kamal'. k-a-m-a-l. 
    // 'Gupta' -> g-u-p-t-a. 
    // g->ग, u-> ु (matra), p->प, since 't' follows immediately, 'p' should be half?
    // p->प, then t->त. 'Gupta'. 
    // If we map 'p' to 'प', it's 'Gu p ta' -> 'गु पता' (Gupata). Users usually read that fine.
    // To get 'गुप्त', we need 'p' to handle lack of 'a'.

    return transliterateToHindi(str); // Use the baseline function for now, enhanced via dictionary
};
