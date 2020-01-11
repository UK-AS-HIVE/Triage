import { Template } from "meteor/templating";

Template.layout.onCreated(function() {
  return $(window).on('keydown', function(e) {
    var $modal, maxZ;
    if (e.keyCode === 27) {
      maxZ = 0;
      $modal = null;
      $('.modal:visible').each(function() {
        var curZ;
        curZ = $(this).css('z-index');
        if (curZ >= maxZ) {
          maxZ = curZ;
          return $modal = $(this);
        }
      });
      return setTimeout(function() {
        return $modal != null ? $modal.modal('hide') : void 0;
      }, 10);
    }
  });
});