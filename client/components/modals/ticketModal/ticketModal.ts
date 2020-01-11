import { Meteor } from "meteor/meteor";
import { Template } from "meteor/templating";
import { Blaze } from "meteor/blaze";
import { Tickets } from "/lib/collections";

Template.ticketModal.events({
  'show.bs.modal': function(e, tpl) {
    var zIndex;
    zIndex = 1040 + (10 * $('.modal:visible').length);
    $(e.target).css('z-index', zIndex);
    return setTimeout(function() {
      return $('.modal-backdrop').not('.modal-stack').css('z-index', zIndex - 1).addClass('modal-stack');
    }, 0);
  },
  'hidden.bs.modal': function(e, tpl) {
    Iron.query.set('ticket', null);
    Blaze.remove(tpl.view);
    if ($('.modal:visible').length) {
      return $('body').addClass('modal-open');
    }
  },
  'click a[name=ticketLink]': function(e, tpl) {
    return tpl.$('#ticketModal').modal('hide');
  }
});

Template.ticketModal.helpers({
  ticket: function() {
    return Tickets.findOne(this.ticketId);
  },
  bodyParagraph: function() {
    return this.body.split('\n');
  }
});

Template.ticketModal.rendered = function() {
  var ref;
  return Meteor.call('removeFlag', Meteor.userId(), (ref = this.data) != null ? ref.ticketId : void 0, 'unread');
};
