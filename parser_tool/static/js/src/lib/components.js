(function(global) {
    "use strict";

    // StressPatternTableComponent
    //
    // Stress patterns are represented as 2 letter codes with:
    //      S = stem stress
    //      E = end stress
    //      M = mixed stress in plural only (stem stress in NA, end stress in GLDI)
    //      U = u-retraction, stress moves back to stem for the fem ACCsg ending -у (-u)
    //
    // There are 8 types: SS, EE, SE, ES, EM, SM, US, UM
    // We also have S_. E_. _E. _M, _S for nouns that only occur in sg or pls
    // In the 2 letter codes, the first letter represents the position of stress 
    // in the Singular cases and the second represents stress in the Plural cases.
    class StressPatternTableComponent {

        // For each case (N,A,G,L,D,I), 0=stem, 1=end 
        static patterns = {
            UM: [
                {N:1,A:0,G:1,L:1,D:1,I:1},
                {N:0,A:0,G:1,L:1,D:1,I:1}
            ],
            US: [
                {N:1,A:0,G:1,L:1,D:1,I:1},
                {N:0,A:0,G:0,L:0,D:0,I:0}
            ],
            EM: [
                {N:1,A:1,G:1,L:1,D:1,I:1},
                {N:0,A:0,G:1,L:1,D:1,I:1}
            ],
            SM: [
                {N:0,A:0,G:0,L:0,D:0,I:0},
                {N:0,A:0,G:1,L:1,D:1,I:1}
            ],
            ES: [
                {N:1,A:1,G:1,L:1,D:1,I:1},
                {N:0,A:0,G:0,L:0,D:0,I:0}
            ],
            SE: [
                {N:0,A:0,G:0,L:0,D:0,I:0},
                {N:1,A:1,G:1,L:1,D:1,I:1}
            ],
            SS: [
                {N:0,A:0,G:0,L:0,D:0,I:0},
                {N:0,A:0,G:0,L:0,D:0,I:0}
            ],
            EE: [
                {N:1,A:1,G:1,L:1,D:1,I:1},
                {N:1,A:1,G:1,L:1,D:1,I:1}
            ],
            S_: [
                {N:0,A:0,G:0,L:0,D:0,I:0},
                false
            ],
            E_: [
                {N:1,A:1,G:1,L:1,D:1,I:1},
                false
            ],
            _E: [
                false,
                {N:1,A:1,G:1,L:1,D:1,I:1}
            ],
            _M: [
                false,
                {N:0,A:0,G:1,L:1,D:1,I:1}
            ],
            _S: [
                false,
                {N:0,A:0,G:0,L:0,D:0,I:0}
            ]
        }

        constructor({ selector, props }) {
            this.selector = selector;
            this.props = props;
        }

        // This function returns a 2-element array with the stress pattern for
        // singular and plural nouns, and further subdivided for each case (N,A,G,L,D,I).
        getPattern(stress_pattern_semu) {
            const pair = StressPatternTableComponent.patterns[stress_pattern_semu];
            if(!Array.isArray(pair) || pair.length != 2) {
                return [];
            }
            return pair;
        }

        template({ stress_pattern_semu }) {
            const [singular, plural] = this.getPattern(stress_pattern_semu);
            if(!singular && !plural) {
                return '';
            }

            const cases = ['N','A','G','L','D','I'];
            const thead = `<thead><tr><th colspan="2">[${stress_pattern_semu}]</th></tr></thead>`;
            const trs = cases.map((c) => {
                let col1 = "", col2 = "";
                if(singular) {
                    col1 = `<th scope="row" class="singular">${c}</td><td><span class="stem ${singular[c]?'':'stress'}"></span>-<span class="end ${singular[c]?'stress':''}"></span></td>`;
                }
                if(plural) {
                    col2 = `<th scope="row" class="plural">${c}</td><td><span class="stem ${plural[c]?'':'stress'}"></span>-<span class="end ${plural[c]?'stress':''}"></span></td>`;
                }
                return `<tr>${col1}${col2}</tr>`;
            }).join("");
            const table = `<table class="stress-pattern">${thead}${trs}</table>`;
            return table;
        }

        render() {
            document.querySelector(this.selector).innerHTML = this.template(this.props);
        }
    }


    // Exports
    global.app = global.app || {};
    global.app.StressPatternTableComponent = StressPatternTableComponent;

})(window);