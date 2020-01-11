import { Meteor } from "meteor/meteor";
import { Template } from "meteor/templating";

import { Tickets } from "/lib/collections";

Template.userPortrait.helpers({
  user: function() {
    return Meteor.users.findOne(this.userId);
  },
  online: function() {
    var ref, ref1;
    if (this.fadeIfOffline) {
      if (((ref = Meteor.users.findOne(this.userId).status) != null ? ref.idle : void 0) || !((ref1 = Meteor.users.findOne(this.userId).status) != null ? ref1.online : void 0)) {
        return "offline";
      }
    }
  }
});

Template.userPortrait.events({
  'click a[data-action=removeUser]': function(e, tpl) {
    var ticketId;
    e.stopPropagation();
    ticketId = Template.parentData(2)._id;
    return Tickets.update({
      _id: ticketId
    }, {
      $pull: {
        associatedUserIds: this.userId
      }
    });
  }
});

Template.userPortrait.rendered = function() {
  return this.$('img').error(function() {
    return $(this).attr('src', 'http://www.as.uky.edu/sites/all/themes/bartikmod/images/missingpic.png');
  });
};

