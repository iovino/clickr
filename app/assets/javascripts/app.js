$(function () {			   
	Layout.init ();
	Menu.init ();
	Nav.init ();

    sites = $("#mainNav").html();

	if ($.fn.dataTable) { $('.data-table').dataTable ({ "bJQueryUI": true,
		"sPaginationType": "full_numbers",
		 }); };

	drawChart ();

	$(document).bind ('layout.resize', function () {
		drawChart ();
	});

	if ($('.chartHelperChart').length < 1) {
		$(document).unbind ('layout.resize');
	}

	$('.uniformForm').find ("select, input:checkbox, input:radio, input:file").uniform();
	
	$('.validateForm').validationEngine ();
	
	$('#reveal-nav').live ('click', toggleNav);

	$('.notify').find ('.close').live ('click', notifyClose);

	$('.tooltip').tipsy ();

    $("#searchField").keyup(function(e) {
        if ($("#searchField").val()) {
            perform_search();
        } else {
            $("#mainNav").html(sites);
        }

    }).bind("paste", function(e) {
        perform_search();
    });

    $("#site_tag").click(function() {
        this.select(); return false;
    });

    $(".ad_unit_tag").click(function(){
        this.select(); return false;
    });

});

function notifyClose (e) {
	e.preventDefault ();

	$(this).parents ('.notify').slideUp ('medium', function () { $(this).remove (); });
}

function toggleNav (e) {
	e.preventDefault ();

	$('#sidebar').toggleClass ('revealShow');
}

function drawChart () {
	$('.chartHelperChart').remove ();
	ChartHelper.visualize ({ el: $('table.stats') });
}

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