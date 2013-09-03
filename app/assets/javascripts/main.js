$(function () {			   
    sites = $("#mainNav").html();

    $("#searchField").keyup(function(e) {
        if ($("#searchField").val()) {
            perform_search();
        } else {
            $("#mainNav").html(sites);
        }

    }).bind("paste", function(e) {
        perform_search();
    });

});

function perform_search() {
    var words   = $("#searchField").val().split(/[.,&\/ -]/);
    var results = [];

    results.push(build_nav_add_link());

    $(".nav").each(function(i){
        for (var i = 0; i < words.length; i++) {
            searhTerms = String(this.getAttribute('search-data'));
            searchRegx = new RegExp(words[i], "i");

            // if a match was found, add it to the results array
            if (searhTerms.search(searchRegx) != '-1') {
                results.push(build_search_result(this));
            }
        }
    });

    $("#mainNav").html(build_search_results(results));
}

function build_search_results(results) {
    html = "";
    for (var i=0; i < results.length; i++) {
        html += results[i];
    }

    return html;
}

function build_nav_add_link() {
    html  = "<li id=\"addNav\" class=\"nav\">";
    html += $("#addNav").html() + "</li>";

    return html;
}

function build_search_result(object) {
    html   = "<li class=\"nav\" id=\""+ object.getAttribute('id') +"\" search-data=\""+ object.getAttribute('search-data') +"\">";
    html  += object.innerHTML;
    html  += "</li>";

    return html;
}