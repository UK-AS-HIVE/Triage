import {Meteor} from 'meteor/meteor';
import {Template} from 'meteor/templating';
import {FileRegistry} from 'meteor/hive:file-registry';
import _ from 'underscore';

Template.attachmentModal.helpers({
  attachment: function() {
    return FileRegistry.findOne(this.attachmentId);
  },
  fileIsImage: function() {
    return _.contains(['jpg', 'jpeg', 'gif', 'bmp', 'png', 'tiff', 'tif', 'cr2', 'tga'], this.filename.substr(this.filename.lastIndexOf('.') + 1).toLowerCase());
  },
  fileIsPdf: function() {
    return this.filename.toLowerCase().endsWith('.pdf');
  },
  encodedURI: function() {
    return Meteor.absoluteUrl() + 'file/' + encodeURIComponent(this.filenameOnDisk);
  },
  encodedDownloadURI: function() {
    return Meteor.absoluteUrl() + 'download/' + encodeURIComponent(this.filenameOnDisk);
  }
});

Template.attachmentModal.events({
  'hidden.bs.modal': function(e, tpl) {
    Iron.query.set('attachmentId', null);
    Blaze.remove(tpl.view);
    if ($('.modal:visible').length) {
      return $(document.body).addClass('modal-open');
    }
  },
  'show.bs.modal': function(e, tpl) {
    var zIndex;
    zIndex = 1040 + (10 * $('.modal:visible').length);
    $(e.target).css('z-index', zIndex);
    return setTimeout(function() {
      return $('.modal-backdrop').not('.modal-stack').css('z-index', zIndex - 1).addClass('modal-stack');
    }, 10);
  }
});
