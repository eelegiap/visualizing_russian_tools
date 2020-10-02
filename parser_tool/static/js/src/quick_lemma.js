(function($) {
  const ApiClient = window.app.ApiClient;
    async function sorted_lemmas() {
      await display('lemma');
    }
    async function sorted_forms() {
      await display('form');
    }
    async function get_forms() {
      await display('lemma_to_forms');
    }
    async function get_rnc_data() {
      await display('rnc');
    }
    async function display(designator) {
        const api = new ApiClient();
        var input_text = $("#contentinput").val();
        try {
          before_display();
          if ((designator == 'lemma') || (designator == 'form')) {
            const jqXhr = api.lemmatizetext(input_text); 
            jqXhr.then(function(result, textStatus) {
              var array = make_array(result, designator);
              after_display(array, designator);
            })
          };
          if (designator == 'lemma_to_forms') {
            const jqXhr = api.getforms(input_text); 
            jqXhr.then(function(result, textStatus) {
              var array = make_array(result, designator);
              after_display(array, designator);
            });
          }
          if (designator == 'rnc') {
            const jqXhr = api.lemmatizetext(input_text); 
            jqXhr.then(function(result, textStatus) {
              var array = make_rnc_array(result);
              after_display(array, designator);
            })
          }
        } catch(err) {
          error(err);
        }
      }; 
      function make_rnc_array(result) {
        var values = result.data.tokens;
        var array = [];
        for (const val of values) {
          if (val.level != "") {
            if (!val.rnc_form_count) {
              var occurrences = 'None found';
            }
            else {
              var occurrences = val.rnc_form_count;
            }
            if (!val.rnc_doc_count) {
              var docs = 'None found';
            }
            else {
              var docs = val.rnc_doc_count;
            }
            array.push({'word' : val.canonical, 'occurrences' : occurrences, 
              'docs' : docs, 'level' : val.level});
          }
        }
        array.sort((a, b) => (a.occurrences < b.occurrences) ? 1 : -1);
        console.log(array);
        return array;
      }

      function make_array(result, designator) {
        if (designator == 'lemma') {
          var values = Object.values(result.data.lemmas);
        }
        if (designator == 'form') {
          var values = Object.values(result.data.forms);
        }
        if (designator == 'lemma_to_forms') {
          var values = Object.values(result.data);
        }
        var array = [];
        let unique_words = new Set();
        for (const val of values) {
          if (designator == 'lemma') {
            var word_label = val.label;
            var frequency = val.count;
            var level = val.level;
            var rank = val.rank;
          }
          if (designator == 'form') {
            var word_label = val.label;
            var frequency = val.sharoff_freq;
            var level = val.level;
            var rank = val.sharoff_rank;
          }
          if (designator == 'lemma_to_forms') {
            var word_label = val.form;
            var frequency = val.sharoff_freq;
            var level = result['level'];
            var rank = val.sharoff_rank;
          }
          if (level != "") {
            if (!unique_words.has(word_label)) {
              array.push({'word' : word_label, 'freq' : frequency, 'level' : level, 'rank' : rank});
              unique_words.add(word_label);
            }
          }
        }
        array.sort((a, b) => (a.freq < b.freq) ? 1 : -1);
        return array;
      }

      function before_display() {
        $("#qlerror").html("").hide();
        $("#outputtable").empty();
        $("#rnc_info").hide();
        $("#ngramtitle").empty();
        $("#ngramviewer").empty();
        $("#results").hide();
      }
      function after_display(array, designator) {
        $("#results").show();
        if (designator == 'form' || designator == 'lemma_to_forms') {
          var col1 = 'Form  Frequency';
          var col2 = 'Form  Rank';
        }
        else if (designator == 'rnc') {
          $("#rnc_info").show();
          var col1 = 'Occurrences in RNC';
          var col2 = 'Documents in RNC';
        }
        else {
          var col1 = 'Lemma  Frequency';
          var col2 = 'Lemma  Rank';
        }
        $("#outputtable").append('<tr style="color:gray"><th> Word </th><th>' + col1 + '</th><th>'+ col2 +'</th></tr>');
        if (array.length == 0) {
          $("#outputtable").text('No input data found or word not found in database.');
        }

        var direct_url = 't1%3B%2C';
        var content = '';
        var index = 0;
        for (const token of array) {
          if (designator == 'rnc') {
            var col1val = token.docs;
            var col2val = token.occurrences;
          }
          else {
            var col1val = token.freq;
            var col2val = token.rank;
          }
          $("#outputtable").append('<tr><th data-level=' + token.level + '>' 
          + token.word + '</th><th>' + col1val + '</th><th>' + col2val + '</th></tr>');
          // for ngram viewer
          if (index != (array.length - 1)) {
            direct_url = direct_url + token.word + '%3B%2Cc0%3B.t1%3B%2C';
            content = content + token.word + '%2C+'}
          else {
            // deal with last element in array (differenr url endings)
            direct_url = direct_url + token.word + '%3B%2Cc0';
            content = content + token.word;
          }
          index += 1;
        }

        // add ngram
        $("#ngramtitle").append('<tr style="color:gray"><th> Google N-Gram Viewer</th><th>');
        $("#ngramviewer").append('<iframe name="ngram_chart" src="https://books.google.com/ngrams/interactive_chart?smoothing=3&direct_url=' + direct_url 
          + '&corpus=36&year_start=1800&content=' + content 
          + '&year_end=2010" width=750 height=400 marginwidth=0 marginheight=0 hspace=0 vspace=0 frameborder=0 scrolling=no></iframe>');
      };

    // practice
    $(document).ready(async function () {
        console.log("ready!");
        $("#rnc_info").hide();
        $("#sortedlemmabtn").on("click", sorted_lemmas);
        $("#sortedformbtn").on("click", sorted_forms);
        $("#getformsbtn").on("click", get_forms);
        $("#rncbtn").on("click", get_rnc_data);
    });

      // Just execute "demo()" in the console to populate the input with sample HTML.
    window.demo = function() {
      var input_list = 'простой, скорый, скучный, сильный, спокойный, старый, строгий, сухой, счастливый, твёрдый';
      $("#contentinput").val(input_list);
    }

})(jQuery);

// простая, простой, простые, простое, простом, простого