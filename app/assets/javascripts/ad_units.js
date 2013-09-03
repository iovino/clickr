$(function(){
    $(document).on('click', '#dart_instructions', function(e){
        e.preventDefault ();

        $.modal ({
            title: 'DART Tag Instructions',
            ajax: '/ad_units/instructions'
        });
    });
});