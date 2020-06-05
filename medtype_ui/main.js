colors = ['orange ', 'tan', 'cobalt', 'green', 'purple', 'orange', 'blue', 'cobalt',  'brown', 'red', 'gray']
// 'teal'

$( document ).ready(function() {
    $("#loader").hide();
    $("#initial").show();
});


function hash(s) {
    /* Simple hash function. */
    var a = 1, c = 0, h, o;
    if (s) {
        a = 0;
        /*jshint plusplus:false bitwise:false*/
        for (h = s.length - 1; h >= 0; h--) {
            o = s.charCodeAt(h);
            a = (a<<6&268435455) + o + (o<<14);
            c = a & 266338304;
            a = c!==0?a^c>>21:a;
        }
    }
    return a;
};

function add_token(token, info, is_annotated){
    console.log(token, info, is_annotated)
    var tag = document.createElement("span");

    if (is_annotated && info['filtered_candidates'].length != 0){
        if (info['pred_type'] == '') {
            color = 'slate'
        }
        else {
            hash_code = hash(info['pred_type'][0])
            color     = colors[hash_code % colors.length]
        }

        var rand_color = colors[Math.floor(Math.random() * colors.length)]
        var cui = info['filtered_candidates'][0][0]
        var sem_type = info['pred_type']

        token = _.trim(token)

        ele = `<span class="highlight bottom ${color}" data-label="LOC" onclick="copyToClipboard('${cui}')"> \
                    <span class="highlight__content">${token} </span> \
                    <span class="highlight__label"> <strong>${cui}</strong> </span> \
                    <span class="highlight__label"> <strong>${sem_type}</strong> </span> \
                    <span class="highlight__tooltip">${cui}</span> \
               </span>`

        $("#results").append(ele);
    }
    else{
        $("#results").append('<span>' + token + ' </span>');
    }
}

function update_results(resp){
     console.log(resp)

    $( "#results" ).empty();

    mentions = resp['result']['elinks'][0]['mentions']
    text     = resp['result']['elinks'][0]['text']
    offsets  = []

    if (mentions.length == 0){
        add_token(text, null, false)
    }

    else{
        mentions = _.sortBy(mentions, [function(x) {return x['end_offset'];} ])

        console.log('before')
        console.log(mentions)
        // Remove overlapping mentions
        for (i = mentions.length-1; i > 0 && i < mentions.length; i--){
            curr = mentions[i]
            prev = mentions[i-1]

            if (curr['end_offset'] == prev['end_offset']){
                if ((curr['end_offset'] - curr['start_offset']) > (prev['end_offset'] - prev['start_offset'])){
                    mentions.splice(i-1, 1)
                }
                else {
                    mentions.splice(i, 1)
                }
            }
        }


        mentions = _.sortBy(mentions, [function(x) {return x['start_offset'];} ])

        console.log('before')
        console.log(mentions)
        // Remove overlapping mentions
        for (i = mentions.length-1; i > 0 && i < mentions.length; i--){
            curr = mentions[i]
            prev = mentions[i-1]

            if (curr['start_offset'] == prev['start_offset']){
                if ((curr['end_offset'] - curr['start_offset']) > (prev['end_offset'] - prev['start_offset'])){
                    mentions.splice(i-1, 1)
                }
                else {
                    mentions.splice(i, 1)
                }
            }
        }

        console.log('after')
        console.log(mentions)

        for (i=0; i < mentions.length; i++){
            offsets.push([mentions[i]['start_offset'], mentions[i]['end_offset']])
        }
        console.log(offsets)

        console.log('beginning')
        first_start = offsets[0][0]
        if (first_start != 0){
            tokens = text.substring(0, first_start).split(' ')
            for (j=0; j < tokens.length; j++){
                add_token(tokens[j], null, false)
            }
        }

        console.log('middle')
        for (i=0; i < offsets.length - 1; i++){
            start     = offsets[i][0]
            end       = offsets[i][1]
            start_nxt = offsets[i+1][0]
            end_nxt   = offsets[i+1][1]

            add_token(text.substring(start, end), mentions[i], true)
            tokens = text.substring(end, start_nxt).split(' ')
            for (j=0; j < tokens.length; j++){
                add_token(tokens[j], null, false)
            }
        }

        console.log('end')

        last_start = offsets[offsets.length - 1][0]
        last_end   = offsets[offsets.length - 1][1]
        add_token(text.substring(last_start, last_end), mentions[mentions.length - 1], true)

        tokens = text.substring(last_end, text.length).split(' ')
        for (j=0; j < tokens.length; j++){
            add_token(tokens[j], null, false)
        }
    }

    endRun()
    
}

function startRun() {  
    $("#loader").show();  
    $("#initial").hide();
    $("#do-stuff").prop('disabled', true);
    $.notify("Loading", {autoHide: false, className: "info"});

    document.getElementById('model_picker').disabled = true;
    document.getElementById('linker_picker').disabled = true;
}

function endRun() {  
    $("#loader").hide();
    $("#initial").show();
    $("#do-stuff").prop('disabled', false);
    document.getElementById('model_picker').disabled = false;
    document.getElementById('linker_picker').disabled = false;
    $('.notifyjs-wrapper').trigger('notify-hide');
}

function call_linker(){
    startRun()

    text   = document.getElementById('text_input').value
    model  = document.getElementById('model_picker').value.toLowerCase()
    linker = document.getElementById('linker_picker').value.toLowerCase()

    msg  = {
        "id": Math.floor(Math.random() *  100000),
        "data": {
            "text": [text],
            "entity_linker": linker
        }
    }

    model2url = {
        'general_model': 'https://128.2.204.127:8124/run_linker',
        'pubmed_model' : 'https://128.2.204.127:8125/run_linker',
        'ehr_model'    : 'https://128.2.204.127:8126/run_linker'
    }

    console.log(model2url[model])
    $.ajax({
        type: "POST",
        url: model2url[model],
        success: update_results,
        data: JSON.stringify(msg),
        dataType: "json",
        contentType: "application/json",
        error: function(e) {
            $.notify("Error encoutered while accessing the server");
            alert('Need to accept the self-signed certificate first before accessing the demo. Press Ok to continue. Come back to this page once done! NOTE: In case your browser does not give the option to accept the certificate, please try with another browser. Thanks!')
            window.open("https://128.2.204.127:8124/run_linker");
        },
    });
}

function copyToClipboard(text) {
    var $temp = $("<input>");
    $("body").append($temp);
    $temp.val(text).select();
    document.execCommand("copy");
    $temp.remove();
    $.notify("Copied " + text, "success");
}

function launch_umls(){
    window.open("https://uts.nlm.nih.gov/metathesaurus.html");
}

$(document).keydown(function(event) {            
    if ((event.ctrlKey && event.keyCode === 13) || (event.metaKey && event.keyCode === 13)) {
        call_linker()
    }
})