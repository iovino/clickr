$(function(){
    $('#dart_instructions').live ('click', function (e) {
        e.preventDefault ();

        $.modal ({
            title: 'DART Tag Instructions',
            ajax: '/ad_units/instructions'
        });
    });
});