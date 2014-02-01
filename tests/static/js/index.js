(function($) {
	"use strict";

	function init() {
        $('button[role="user-info"]').on('click', onUserInfoClicked);
	}

    function onUserInfoClicked() {
        $.ajax({
            url: '/user/' + this.getAttribute('data-user') + '.json',
            dataType : 'json',
            success: function onSuccess(data) {
                var modal = $('#userInfoModal');
                modal.find('#userInfoLabel').html(data.name);
                modal.find('#userInfoEmail').html(data.email).attr('href', 'mailto:' + data.email);
                modal.find('#userInfoDescription').html(data.about);
                modal.modal();
            }
        });
    }

	$(document).ready(init);
})($);