import { Template } from "meteor/templating";
import { Blaze } from "meteor/blaze";

import { Tickets, Queues } from "/lib/collections";

Template.sendToAnotherQueueModal.events({
  'shown.bs.modal': function(e, tpl) {
    return tpl.$('select').focus();
  },
  'show.bs.modal': function(e, tpl) {
    var zIndex;
    zIndex = 1040 + (10 * $('.modal:visible').length);
    $(e.target).css('z-index', zIndex);
    return setTimeout(function() {
      return $('.modal-backdrop').not('.modal-stack').css('z-index', zIndex - 1).addClass('modal-stack');
    }, 10);
  },
  'hidden.bs.modal': function(e, tpl) {
    Blaze.remove(tpl.view);
    if ($('.modal:visible').length) {
      return $(document.body).addClass('modal-open');
    }
  },
  'click button[name=cancel]': function(e, tpl) {
    return tpl.$('#sendToAnotherQueueModal').modal('hide');
  },
  'click button[name=send]': function(e, tpl) {
    Tickets.update({
      _id: this.ticketId
    }, {
      $set: {
        queueName: tpl.$('select[name=queue]').val()
      }
    });
    return tpl.$('#sendToAnotherQueueModal').modal('hide');
  }
});

Template.sendToAnotherQueueModal.helpers({
  originalTicket: function() {
    return Tickets.findOne(this.ticketId);
  },
  queues: function() {
    var ref;
    return Queues.find({
      name: {
        $nin: [(ref = Tickets.findOne(this.ticketId)) != null ? ref.queueName : void 0]
      }
    });
  }
});