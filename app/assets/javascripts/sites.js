$(function() {
    $("#site_tag").click(function() {
        this.select(); return false;
    });

    $(".ad_unit_tag").click(function(){
        this.select(); return false;
    });

    $("#krux-control").click(function(){
        if ($("#krux-control").prop('checked')) {
            check_krux_control_state();
        } else {
            check_krux_control_state();
        }
    });

    check_krux_control_state();

    // toggles the visibility of the krux input field depending on the state of the checkbox
    function check_krux_control_state() {
        if ($("#krux-control").prop('checked')) {
            $("#krux-control-group").hide();
        } else {
            $("#krux-control-group").show();
        }
    }

});
