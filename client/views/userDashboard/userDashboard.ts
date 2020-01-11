import { Meteor } from "meteor/meteor";
import { Template } from "meteor/templating";

import { Queues } from "/lib/collections";

Template.userDashboard.helpers({
  queue: function() {
    return _.map(Queues.find({
      memberIds: Meteor.userId()
    }).fetch(), function(q) {
      return _.extend(q, {
        selected: Meteor.user().defaultQueue === q.name ? 'selected' : void 0
      });
    });
  },
  notificationSettings: function() {
    var ref;
    return (ref = Meteor.user()) != null ? ref.notificationSettings : void 0;
  },
  saved: function() {
    return Template.instance().saved.get();
  },
  user: function() {
    return Meteor.user();
  }
});

Template.userDashboard.events({
  'click button[data-action=submit]': function(e, tpl) {
    var defaultQueue, notificationSettings;
    defaultQueue = tpl.$('select[name=defaultQueue]').val();
    notificationSettings = {};
    _.each(tpl.$('input[type=checkbox]'), function(i) {
      if ($(i).is(':checked')) {
        return notificationSettings[i.name] = true;
      } else {
        return notificationSettings[i.name] = false;
      }
    });
    return Meteor.users.update(Meteor.userId(), {
      $set: {
        defaultQueue: defaultQueue,
        notificationSettings: notificationSettings
      }
    }, function(err, res) {
      if (res) {
        return tpl.saved.set(true);
      }
    });
  }
});

Template.userDashboard.rendered = function() {
  var tpl;
  tpl = this;
  return tpl.find('#saved-message')._uihooks = {
    insertElement: function(node, next) {
      return $(node).hide().insertBefore(next).fadeIn(100).delay(3000).fadeOut(500, function() {
        this.remove();
        return tpl.saved.set(false);
      });
    }
  };
};

Template.userDashboard.onCreated(function() {
  return this.saved = new ReactiveVar(false);
});

Template.settingsCheckbox.helpers({
  checked: function() {
    if (this.setting) {
      return "checked";
    }
  }
});
