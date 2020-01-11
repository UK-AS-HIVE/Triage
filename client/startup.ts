import {Meteor} from 'meteor/meteor';

Meteor.startup(function() {
  var ref;
  return document.title = (ref = Meteor.settings["public"]) != null ? ref.siteTitle : void 0;
});
