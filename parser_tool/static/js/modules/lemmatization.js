(function(global) {
    "use strict";

    const ApiClient = global.app.ApiClient;

    // utility that returns the distinct or unique values in an array
    const unique = (arr) => {
        let seen = {}, items = [];
        for(let i = 0, len = arr.length; i < len; i++) {
            if(!seen.hasOwnProperty(arr[i])) {
                seen[arr[i]] = true;
                items.push(arr[i]);
            }
        }
        return items;
    }

    class LemmatizedText {
        
        constructor(data) {
            data = data || {tokens: [], forms: {}, lemmas: {}};
            this._tokens = data.tokens;
            this._lemmas = data.lemmas;
            this._forms = data.forms;
            this._cache_forms_of = {}
            this._cache_lemmas_of = {};
        }

        // returns a promise with an instance of a lemmatized text
        static asyncFromString(text) {
            text = text.trim();
            if(!text) {
                return Promise.resolve(new LemmatizedText());
            }
            let api = new ApiClient();
            return api.lemmatizetext(text).then((res) => {
                return new LemmatizedText(res.data);
            });
        }

        // returns a copy of the individual tokens from the lemmatized text
        tokens() {
            return this._tokens.map(o => o.token);
        }

        // returns the words
        words() {
            return this._tokens.filter(o => o.tokentype == "RUS").map(o => o.token);
        }

        // returns the set of lemmas or headwords in the text
        lemmas() {
            let lemmas = Object.values(this._lemmas).map(o => o.label);
            lemmas.sort((a, b) => a.localeCompare(b), "ru-RU", {sensitivity: "base", ignorePunctuation: true});
            return lemmas;
        } 

        // returns the set of unique words in the text
        vocab() {
            let compare_options = {sensitivity: "base", ignorePunctuation: true};
            let vocab = unique(this.words()).sort((a, b) => a.localeCompare(b), "ru-RU", compare_options);
            return vocab;
        } 

        // iterate over each word in the text
        forEachWord(fn) {
            let _tokens = this._tokens;
            for(let i = 0, len = _tokens.length; i < len; i++) {
                if(_tokens[i].tokentype === "RUS") {
                    fn.call(this, _tokens[i].token, i, _tokens);
                }
            }
        }

        // map over each token in the text
        mapTokens(fn) {
            let results = [];
            let _tokens = this._tokens;
            for(let i = 0, len = _tokens.length; i < len; i++) {
                let result = fn.call(this, _tokens[i].token, _tokens[i].tokentype, i, _tokens);
                results.push(result);
            }
            return results;
        }

        // find first index where the word appears in the list of tokens
        indexOf(searchWord, fromIndex) {
            let _tokens = this._tokens;
            fromIndex = parseInt(fromIndex, 10);
            if(Number.isNaN(fromIndex)) {
                fromIndex = 0;
            }
            else if(fromIndex < 0 || fromIndex >= _tokens.length) {
                return -1;
            }
            for(let i = fromIndex; i < _tokens.length; i++) {
                let token = _tokens[i].token;
                if(token === searchWord) {
                    return i;
                }
            }
            return -1;
        }

        // lookup the lemmas of a word in the text 
        lemmasOf(word, options) {
            options = options || {};

            const compare = {
                "level": (a, b) => parseInt(a.level) - parseInt(b.level),
                "rank": (a, b) => a.rank - b.rank
            };
            if(options.sort && !compare.hasOwnProperty(options.sort)) {
                throw new Exception(`invalid option sort=${options.sort}`);
            }
            
            if(this._cache_lemmas_of[word]) {
                let word_lemmas = this._cache_lemmas_of[word];
                if(options.sort) {
                    word_lemmas.sort(compare[options.sort]);
                }
                return word_lemmas;
            } 

           let seen = {};
           let word_lemmas = [];
           
           // Step #1: search forms to find the lemma(s)
           for(let i = 0, word_forms = this.formsOf(word); i < word_forms.length; i++) {
                let lemma_id = word_forms[i].lemma_id;
                let lemma_obj = this._lemmas[lemma_id];
                if(!seen.hasOwnProperty(lemma_id)) {
                    word_lemmas.push(lemma_obj);
                    seen[lemma_id] = true;
                }
           }

           // Step #2: search known lemmas 
            let _lemmas = Object.values(this._lemmas);
            for(let i = 0; i < _lemmas.length; i++) {
                let lemma_obj = _lemmas[i];
                let found_match = lemma_obj.label.localeCompare(word, "ru-RU", {sensitivity: "base", ignorePunctuation: true}) == 0;
                if(found_match && !seen.hasOwnProperty(lemma_obj.id)) {
                    word_lemmas.push(lemma_obj);
                    seen[lemma_obj.id] = true;
                }
            }

            word_lemmas.sort(compare[options.sort]);
            this._cache_lemmas_of[word] = word_lemmas;

            return word_lemmas;
        }

        // return the forms that matched the word in the text (e.g. "его" has two matching forms, one for accusative and one for genitive)
        formsOf(word) {
            if(this._cache_forms_of[word]) {
                return this._cache_forms_of[word];
            }

            let word_forms = [];
            let _forms = Object.values(this._forms);

            for(let i = 0; i < _forms.length; i++) {
                let form_obj = _forms[i];
                if(form_obj.label.localeCompare(word, "ru-RU", {sensitivity: "base", ignorePunctuation: true}) == 0) {
                    word_forms.push(form_obj);
                }
            }

            this._cache_forms_of[word] = word_forms;

            return word_forms;
        }

        // returns true if the form is intended to be capitalized (e.g. proper name)
        isCapitalized(word) {
            let forms = this.formsOf(word);
            if(forms.length == 0) {
                return false;
            }
            forms.sort((a, b) => {
                if(a.label < b.label) {
                    return -1;
                } else if(a.label == b.label) {
                    return 0;
                } else {
                    return 1;
                }
            });
            let first_letter = forms[0].label.charAt(0);
            let is_capitalized = (first_letter === first_letter.toUpperCase());
            return is_capitalized;
        }

        // Returns true if the lemmas are represented in the text, false otherwise.
        containsLemmas(lemmas) {
            for(let i = 0, len = lemmas.length; i < len; i++) {
                let matching_lemmas = this.lemmasOf(lemmas[i]);
                return matching_lemmas.length > 0;
            }
            return false;
        }

        // returns the total number of times each word appears in the text
        vocab_stats() {
            let counter = {};
            this.forEachWord((word) => {
                if(!this.isCapitalized(word)) {
                    word = word.toLowerCase();
                }
                if(!counter.hasOwnProperty(word)) {
                    counter[word] = 0;
                }
                counter[word]++;
            });

            let stats = Object.keys(counter)
                .map((w) => ({word: w, count: counter[w]}))
                .sort((a, b) => b.count - a.count);
        
            return stats;
        }

        // returns the total number of times each lemma appears in the text
        // NOTE: when there a word is associated with multiple lemmas, the default
        // strategy is to select the more frequently occurring lemma based on its "rank" value.
        lemma_stats() {
            let counter = {};
            this.forEachWord((word) => {
                let word_normalized = word.toLowerCase();
                let lemma_records = this.lemmasOf(word, {"sort": "rank"});
                let lemma = (lemma_records.length > 0 ? lemma_records[0] : false);
                if(lemma) {
                    if(!counter.hasOwnProperty(lemma.label)) {
                        counter[lemma.label] = {count: 0, words: {}};
                    }
                    counter[lemma.label].count++
                    if(!counter[lemma.label].words.hasOwnProperty(word_normalized)) {
                        counter[lemma.label].words[word_normalized] = 0;
                    }
                    counter[lemma.label].words[word_normalized]++;
                }
            });

            let stats = Object.keys(counter)
                .map((w) => ({word: w, count: counter[w].count, words: counter[w].words}))
                .sort((a, b) => b.count - a.count);

            return stats;
        }

        // returns the number of times the word appears
        count(word) {
            let count = 0;
            this.forEachWord((iter_word) => {
                if(iter_word.localeCompare(word, "ru-RU", {sensitivity: "base"}) == 0) {
                    count++;
                }
            });
            return count;
        } 

        // returns a non-zero integer reprsenting the difficulty level associated with the word, or zero if no level could be assigned
        levelOf(word) {
            let level_num = 0; // using zero to represent an "unknown" level
            let lemma_records = this.lemmasOf(word, {sort: "level"});
            let lemma = (lemma_records.length > 0 ? lemma_records[0] : false);            
            if(lemma) {
                let parsed_level_num = parseInt(lemma.level, 10);
                if(!Number.isNaN(parsed_level_num)) {
                    level_num = parsed_level_num;
                }
            }
            return level_num;
        }

        // returns an array where the indexes represent the level numbers and the values represent the counts:
        //      Levels[0] = Count of Unparsed
        //      Levels[1] = Count at Level 1E
        //      Levels[2] = Count at Level 2I
        //      Levels[3] = Count at Level 3A
        //      Levels[4] = Count at Level 4S
        levels() {
            let levels = [];
            let max_level = 0;
            let total_words = 0;
            let total_words_with_level = 0;
            
            this.forEachWord((word, index) => {
                let level_num = this.levelOf(word);
                if(level_num >= 0) {
                    if(typeof levels[level_num] == "undefined") {
                        levels[level_num] = 0;
                    }
                    max_level = (level_num > max_level ? level_num : max_level);
                    levels[level_num]++;
                    total_words_with_level++;
                }
                total_words++;
            });

            // ensure values up to max level are zeroed out for convenience
            for(let i = 0; i < max_level; i++) {
                if(typeof levels[i] == "undefined") {
                    levels[i] = 0;
                }
            }

            // level zero doesn't exist, so use this to report any words that could not be assigned a level
            levels[0] = total_words - total_words_with_level;

            return levels;
        }

        // returns an integer between 0-100 representing the precentage of words at the target level
        readability(target_level) {
            if(typeof target_level == "undefined" || target_level < 1 || target_level > 4) {
                target_level = 1;
            }
            
            let words_at_or_below_level = 0;
            let words_above_level = 0;
            let levels = this.levels();

            for(let i = 0; i < levels.length; i++) {
                // TODO: how should we handle unparsed words (e.g. level 0)?
                if(i <= target_level) {
                    words_at_or_below_level += levels[i];
                } else {
                    words_above_level += levels[i];
                }
            }

            let score = Math.round(words_at_or_below_level / (words_at_or_below_level + words_above_level) * 100);
            return score;
        }
    }


    class LemmatizedTextCompare {
        constructor(text_a, text_b) {
            this.text_a = text_a;
            this.text_b = text_b;
        }

        // Returns a dict showing for each lemma in TextA, whether it is also in TextB.
        //      {lemma1:true, lemma2:false, ...}
        intersect_lemmas() {
            let intersect = {};
            let text_a_vocab = this.text_a.vocab();
            let text_b_lemmas = this.text_b.lemmas();

            text_a_vocab.forEach((word_a) => {
                let text_a_lemmas = this.text_a.lemmasOf(word_a);
                // iterate over TextA lemmas
                for(let i = 0, len_a = text_a_lemmas.length; i < len_a; i++) {
                    let lemma_a = text_a_lemmas[i].label;
                    if(!intersect.hasOwnProperty(lemma_a)) {
                        intersect[lemma_a] = false;
                    }
                    // iterate over TextB lemas and match
                    for(let j = 0, len_b = text_b_lemmas.length; j < len_b; j++) {
                        let lemma_b = text_b_lemmas[j];
                        if(lemma_b == lemma_a) {
                            intersect[lemma_a] = true;
                        }
                    }
                }
            });

            return intersect;
        }

        // Returns a dict showing for each vocab word in TextA, its count in TextB.
        //      {word1:count1, word2:count2, ...}
        intersect_vocab() {
            let intersect = {};
            let text_a_vocab = this.text_a.vocab();
            let text_b_vocab = this.text_b.vocab();

            text_a_vocab.forEach((word_a) => {
                if(!intersect.hasOwnProperty(word_a)) {
                    intersect[word_a] = 0;
                }
                for(let i = 0, len = text_b_vocab.length; i < len; i++) {
                    let word_b = text_b_vocab[i];
                    if(word_b.localeCompare(word_a, "ru-RU", {sensitivity: "base"}) == 0) {
                        intersect[word_a]++;
                    }
                }
            });
            
            return intersect;
        }

        // Returns list of all lemmas/vocab in TextA and whether they are in TextB or not.
        leftjoin(word_type) {
            word_type = word_type || "lemmas";

            let intersect = {};
            switch(word_type) {
                case "lemmas":
                    intersect = this.intersect_lemmas();
                    break;
                case "vocab":
                    intersect = this.intersect_vocab();
                    break;
                default:
                    throw new Error("invalid word_type: "+word_type);
            }
            
            let results = Object.keys(intersect)
                .map((w) => ({ word: w, intersects: intersect[w]}))
                .sort((a,b) => {
                    if(a.intersects && b.intersects) {
                        return a.word - b.word;
                    } else if(a.intersects && !b.intersects) {
                        return -1;
                    } else if(!a.intersects && b.intersects) {
                        return 1;
                    } else {
                        return a.word - b.word;
                    }
                });

            return results;
        }

        // Returns only list of lemmas/vocab from TextA that are also in TextB
        innerjoin(word_type) {
            return this.leftjoin(word_type).filter((w) => w.intersects);
        }
    }

    // Exports
    global.app = global.app || {};
    global.app.LemmatizedText = LemmatizedText;
    global.app.LemmatizedTextCompare = LemmatizedTextCompare;
})(window);